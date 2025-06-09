const express      = require('express');
const authenticate = require('../../middleware/auth');
const Notification = require('../../models/Notification');

module.exports = (pool, websocket) => {
  const router = express.Router();

  router.get('/', authenticate, async (req, res, next) => {
    try {
      const notifs = await Notification
        .find({ usuario_id: req.user.id })
        .sort({ fecha: -1 })
        .lean();
      res.json(notifs);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id/read', authenticate, async (req, res, next) => {
    try {
      const notif = await Notification.findOneAndUpdate(
        { _id: req.params.id, usuario_id: req.user.id },
        { leida: true },
        { new: true }
      );
      if (!notif) return res.status(404).json({ error: 'Notificación no encontrada' });
      res.json(notif);
    } catch (err) {
      next(err);
    }
  });

  return router;
};
