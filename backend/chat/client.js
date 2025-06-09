const WebSocket = require('ws');

class Client {
  constructor(ws) {
    this.id = -1;
    this.ws = ws;
  }

  setId(id) {
    this.id = id;
    console.log(`Client with id ${this.id} is connected.`);
  }

  send(payload) {
    if (this.ws.readyState === WebSocket.OPEN && this.id >= 0) {
      this.ws.send(JSON.stringify(payload));
      return true;
    } else {
      console.log(`Cannot send to client ${this.id}: not open or not authenticated.`);
      return false;
    }
  }
}

module.exports = Client;
