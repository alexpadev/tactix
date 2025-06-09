const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  type:      { type: String, enum: ['chat','file'], default: 'chat' },
  from:      { type: Number, required: true },
  to:        { type: Number },
  content:   { type: String },
  filename:  { type: String },
  filesize:  { type: Number },
  timestamp: { type: Date, default: Date.now }
});

const ChatSchema = new mongoose.Schema({
  teamId:       { type: Number, index: true, sparse: true },
  participants: [{ type: Number, required: true }],
  isGroup:      { type: Boolean, default: false },
  messages:     [MessageSchema]
});

ChatSchema.index({ participants: 1 });
ChatSchema.index({ teamId: 1 });
ChatSchema.index({ 'messages.timestamp': 1 });

module.exports = mongoose.model('Chat', ChatSchema);
