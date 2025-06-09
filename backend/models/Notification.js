const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  usuario_id: { type: Number, required: true },
  titulo:     { type: String, required: true },
  contenido:  { type: String, required: true },
  fecha:      { type: Date, default: Date.now },
  leida:      { type: Boolean, default: false },
  url:        { type: String, required: true },
});

module.exports = mongoose.model('Notification', NotificationSchema);
