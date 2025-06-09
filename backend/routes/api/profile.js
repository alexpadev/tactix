const express = require('express');
const authenticateJWT = require('../../middleware/auth');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.user.id}${ext}`);
  }
});
const upload = multer({ storage });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

module.exports = (pool) => {
  const router = express.Router();
  router.use(authenticateJWT);

  router.get('/', async (req, res, next) => {
    try {
      const userId = req.user.id;
      const rows = await pool.query(
        `SELECT id, nombre AS name, email, foto AS avatar, fecha_nacimiento AS birthdate
           FROM usuarios
          WHERE id = ?`,
        [userId]
      );
      if (rows.length === 0) {
        return res.status(401).json({ message: 'Usuario no encontrado' });
      }
      const user = rows[0];
      user.avatar = user.avatar ? `${BASE_URL}${user.avatar}` : null;
      res.json(user);
    } catch (err) {
      next(err);
    }
  });

  router.get('/team', async (req, res, next) => {
    try {
      const userId = req.user.id;
      const rows = await pool.query(
        `SELECT
           e.id,
           e.nombre           AS teamName,
           e.foto             AS teamPhoto,
           e.limite_miembros  AS teamLimit,
           e.premium          AS teamPremium,
           COUNT(me.usuario_id) AS memberCount,
           GREATEST(COUNT(me.usuario_id) - e.limite_miembros, 0) AS overLimit
         FROM miembros_equipo m
         JOIN equipos e
           ON m.equipo_id = e.id
          AND e.pseudoequipo = 0
          AND e.hidden = 0
         JOIN miembros_equipo me
           ON me.equipo_id = e.id AND me.activo = 1
         WHERE m.usuario_id = ?
           AND m.activo = 1
         GROUP BY e.id
         LIMIT 1`,
        [userId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Usuario sin equipo' });
      }
      const row = rows[0];
      res.json({
        id:          row.id,
        name:        row.teamName,
        photoPath:   row.teamPhoto ? `${BASE_URL}${row.teamPhoto}` : null,
        limit:       Number(row.teamLimit),
        premium:     Boolean(row.teamPremium),
        memberCount: Number(row.memberCount),
        overLimit:   Number(row.overLimit),
      });
    } catch (err) {
      next(err);
    }
  });

  router.put('/', upload.single('avatar'), async (req, res, next) => {
    try {
      const userId   = req.user.id;
      const { name, email, birthdate, password } = req.body;
      const avatar   = req.file ? `/uploads/${req.file.filename}` : null;
      let query = `UPDATE usuarios SET nombre = ?, email = ?, fecha_nacimiento = ?`;
      const values = [name, email, birthdate];
      if (avatar) {
        query += `, foto = ?`;
        values.push(avatar);
      }
      if (password && password.trim()) {
        const hashed = await bcrypt.hash(password, 10);
        query += `, contraseña = ?`;
        values.push(hashed);
      }
      query += ` WHERE id = ?`;
      values.push(userId);
      await pool.query(query, values);
      res.json({ message: 'Perfil actualizado correctamente' });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
