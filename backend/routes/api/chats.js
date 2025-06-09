const express = require('express');
const Chat    = require('../../models/Chat');
const authenticateJWT = require('../../middleware/auth');

module.exports = (pool, websocket) => {
  const router = express.Router();

  router.post('/', authenticateJWT, async (req, res, next) => {
    try {
      const userA = req.user.id;
      const { userB } = req.body;
      if (!userB || userB === userA) {
        return res.status(400).json({ error: 'userB inválido' });
      }
      const participants = [userA, userB].sort();
      let chat = await Chat.findOne({ participants });
      if (!chat) {
        chat = new Chat({ participants, messages: [] });
        await chat.save();
      }
      res.json(chat);
    } catch (err) {
      next(err);
    }
  });

  router.get('/', authenticateJWT, async (req, res) => {
    const { userId } = req.query;
    try {
      const chats = await Chat.find({ participants: userId }).lean();
      const filtered = [];
      for (const chat of chats) {
        if (chat.isGroup && chat.teamId) {
          const [teamRow] = await pool.query(
            `SELECT pseudoequipo, hidden FROM equipos WHERE id = ?`,
            [chat.teamId]
          );
          if (teamRow.pseudoequipo === 1 || teamRow.hidden === 1) {
            continue;
          }
        }
        filtered.push(chat);
      }
      const result = await Promise.all(filtered.map(async chat => {
        let teamPhoto = null;
        if (chat.isGroup && chat.teamId) {
          const teamRows = await pool.query(
            `SELECT foto FROM equipos WHERE id = ? AND hidden = 0`,
            [chat.teamId]
          );
          if (teamRows.length) {
            const raw = teamRows[0].foto;
            teamPhoto = raw && raw.startsWith('/')
              ? `${process.env.BASE_URL || 'http://localhost:3000'}${raw}`
              : raw;
          }
        }
        const placeholders = chat.participants.map(() => '?').join(',');
        const rows = await pool.query(
          `SELECT id, nombre, foto FROM usuarios WHERE id IN (${placeholders})`,
          chat.participants
        );
        return {
          _id:            chat._id,
          participants:   chat.participants,
          isGroup:        !!chat.isGroup,
          teamId:         chat.teamId || null,
          teamPhoto,
          participantsInfo: rows,
          messages:       chat.messages
        };
      }));
      res.json(result);
    } catch (err) {
      console.error('Error al cargar chats:', err);
      res.status(500).json({ error: 'Error de servidor' });
    }
  });

  router.get('/:chatId', authenticateJWT, async (req, res, next) => {
    try {
      const chat = await Chat.findById(req.params.chatId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat no existe' });
      }
      if (!chat.participants.includes(req.user.id)) {
        return res.status(403).json({ error: 'Acceso denegado' });
      }
      res.json(chat);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:chatId/messages', authenticateJWT, async (req, res, next) => {
    try {
      const chat = await Chat.findById(req.params.chatId);
      if (!chat) {
        return res.status(404).send('Chat not found');
      }
      if (!chat.participants.includes(req.user.id)) {
        return res.status(403).send('Forbidden');
      }
      res.json(chat.messages);
    } catch (err) {
      next(err);
    }
  });

  router.post('/:chatId/messages', authenticateJWT, async (req, res, next) => {
    try {
      const chat = await Chat.findById(req.params.chatId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat no existe' });
      }
      if (!chat.participants.includes(req.user.id)) {
        return res.status(403).json({ error: 'Acceso denegado' });
      }
      const { text } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Mensaje vacío o inválido' });
      }
      const message = {
        type: 'chat',
        from: req.user.id,
        content: text.trim(),
        timestamp: new Date()
      };
      chat.messages.push(message);
      await chat.save();
      const subs = websocket.chatRooms.get(chat._id.toString()) || new Set();
      subs.forEach(client => {
        client.send({
          chatId: chat._id.toString(),
          ...message
        });
      });
      res.status(201).json(message);
    } catch (err) {
      next(err);
    }
  });

  return router;
};
