const WebSocket     = require('ws');
const jwt           = require('jsonwebtoken');
const Chat          = require('../models/Chat');
const Notification  = require('../models/Notification');
const Client        = require('./client');

class ChatServer {
  constructor({ host, port }) {
    this.clients     = new Map();
    this.chatRooms   = new Map();
    this.notifRooms  = new Map();
    this.wss         = new WebSocket.Server({ host, port });

    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      if (!token) {
        ws.close(4001, 'Authentication required');
        return;
      }

      let payload;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        ws.close(4002, 'Invalid token');
        return;
      }

      const userId = payload.id || payload.userId || payload.sub;
      if (!userId) {
        ws.close(4003, 'Invalid user ID');
        return;
      }

      const client = new Client(ws);
      client.setId(userId);
      this.clients.set(client.id, client);

      ws.on('message', raw => this._onMessage(client, raw));
      ws.on('close', () => this._onClose(client));
    });
  }

  _onClose(client) {
    this.clients.delete(client.id);
    for (const subs of this.chatRooms.values()) {
      subs.delete(client);
    }
    for (const subs of this.notifRooms.values()) {
      subs.delete(client);
    }
  }

  async _onMessage(client, raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      console.error('Invalid JSON:', raw);
      return;
    }

    switch (msg.type) {
      case 'subscribe': {
        const roomId = msg.chatId.toString();
        const chat = await Chat.findOne({ _id: roomId, participants: client.id });
        if (!chat) {
          client.send({ error: 'Access denied to chat' });
          return;
        }

        if (!this.chatRooms.has(roomId)) {
          this.chatRooms.set(roomId, new Set());
        }
        this.chatRooms.get(roomId).add(client);
        console.log(`Client #${client.id} subscribed to chat ${roomId}`);
        break;
      }

      case 'subscribeNotif': {
        const uid = client.id.toString();

        if (!this.notifRooms.has(uid)) {
          this.notifRooms.set(uid, new Set());
        }
        this.notifRooms.get(uid).add(client);
        console.log(`Client #${uid} subscribed to notifications`);

        const existing = await Notification
          .find({ usuario_id: client.id })
          .sort({ fecha: -1 })
          .lean();
        client.send({
          type: 'initNotifs',
          notifications: existing
        });
        break;
      }

      case 'chat':
      case 'file': {
        const chatId = msg.chatId.toString();
        const subs   = this.chatRooms.get(chatId);
        if (!subs || !subs.has(client)) {
          console.error(`Client #${client.id} not subscribed to ${chatId}`);
          return;
        }

        try {
          const chat = await Chat.findOne({ _id: chatId, participants: client.id });
          if (!chat) {
            console.error('Chat not found or user not participant');
            return;
          }

          const messageData = {
            type:      msg.type,
            from:      client.id,
            content:   msg.content,
            timestamp: new Date()
          };
          if (!chat.isGroup) {
            const other = chat.participants
              .map(pid => pid.toString())
              .find(pid => pid !== client.id.toString());
            messageData.to = Number(other);
          }
          if (msg.type === 'file') {
            messageData.filename = msg.filename;
            messageData.filesize = msg.filesize;
          }

          chat.messages.push(messageData);
          await chat.save();

          for (const c of subs) {
            if (c.ws.readyState === WebSocket.OPEN) {
              c.send({ chatId, ...messageData });
            }
          }

       
          const destinatarios = chat.isGroup
            ? chat.participants.map(pid => pid.toString()).filter(pid => pid !== client.id.toString())
            : [ messageData.to.toString() ];

          for (const uid of destinatarios) {
            let tituloNotif;
            if (msg.type === 'chat') {
              tituloNotif = chat.isGroup
                ? `Nuevo mensaje en "${chat.name || 'grupo'}"`
                : 'Mensaje recibido';
            } else { 
              tituloNotif = chat.isGroup
                ? `Nuevo archivo en "${chat.name || 'grupo'}"`
                : 'Archivo recibido';
            }
            
            const notif = new Notification({
              usuario_id: uid,
              titulo:     tituloNotif,
              contenido:  messageData.content,
              url:        `/chats/${chatId}`,
            });
            await notif.save();

            const notifSubs = this.notifRooms.get(uid);
            if (notifSubs) {
              for (const c of notifSubs) {
                if (c.ws.readyState === WebSocket.OPEN) {
                  c.send({
                    type:         'notification',
                    notification: notif
                  });
                }
              }
            }
          }
        } catch (err) {
          console.error('Error processing message:', err);
        }
        break;
      }

      default:
        console.warn('Unknown message type', msg.type);
    }
  }
}

module.exports = ChatServer;
