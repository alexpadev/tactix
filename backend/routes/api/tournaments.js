const express = require('express');
const authenticateJWT = require('../../middleware/auth');
const { reverseGeocode } = require('./geocode');

module.exports = (pool) => {
  const router = express.Router();
  router.use(express.json());

  router.use(authenticateJWT);


  router.get('/', async (req, res, next) => {
    try {
      const rawRows = await pool.query(
        `SELECT
          t.id,
          t.nombre,
          t.fecha,
          t.estado,
          t.max_equipos,
          t.ubicacion_x,
          t.ubicacion_y,
          t.direccion AS address,
          COUNT(te.equipo_id) AS inscritos
         FROM torneos t
         LEFT JOIN torneo_equipos te
           ON te.torneo_id = t.id
           AND te.aprobado = 1
         GROUP BY t.id, t.nombre, t.fecha, t.estado, t.max_equipos, t.ubicacion_x, t.ubicacion_y
         ORDER BY t.fecha DESC`
      );

      const rows = rawRows.map(r => ({
        ...r,
        inscritos: Number(r.inscritos)
      }));

      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    const torneoId = Number(req.params.id);
    if (!Number.isInteger(torneoId) || torneoId <= 0) {
      return res.status(400).json({ error: 'ID de torneo inválido' });
    }
    try {
      const [t] = await pool.query(
        `SELECT *, direccion AS address FROM torneos WHERE id = ?`,
        [torneoId]
      );
      if (!t) {
        return res.status(404).json({ error: 'Torneo no encontrado' });
      }

      const equipos = await pool.query(
        `SELECT
           te.equipo_id,
           e.nombre,
           e.foto,
           te.fecha_join
         FROM torneo_equipos te
         JOIN equipos e
           ON te.equipo_id = e.id
         WHERE te.torneo_id = ?`,
        [torneoId]
      );

      res.json({ torneo: t, equipos });
    } catch (err) {
      next(err);
    }
  });

  router.get('/miembros-equipo/capitan', authenticateJWT, async (req, res, next) => {
    const userId = req.user.id;
    try {
      const [row] = await pool.query(`
        SELECT e.id, e.nombre, e.foto
          FROM miembros_equipo me
          JOIN equipos e ON me.equipo_id = e.id
         WHERE me.usuario_id = ? AND me.titulo = 'capitan'
         LIMIT 1
      `, [userId]);
      if (!row) {
        return res.json({ equipo: null, inscrito: false });
      }

      const [{ count }] = await pool.query(`
        SELECT COUNT(*) AS count
          FROM torneo_equipos
         WHERE equipo_id = ?
      `, [row.id]);

      res.json({
        equipo: row,
        inscrito: count > 0
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/join', authenticateJWT, async (req, res, next) => {
    const torneoId = Number(req.params.id);
    const { equipo_id } = req.body;
    const userId = req.user.id;

    if (![torneoId, equipo_id].every(n => Number.isInteger(n) && n > 0)) {
      return res.status(400).json({ error: 'IDs inválidos' });
    }

    try {
      const [t] = await pool.query(
        `SELECT estado, max_equipos FROM torneos WHERE id = ?`,
        [torneoId]
      );
      if (!t) return res.status(404).json({ error: 'Torneo no encontrado' });
      if (t.estado !== 'abierto') {
        return res.status(403).json({ error: 'Inscripciones cerradas' });
      }

      const miembros = await pool.query(`
        SELECT titulo FROM miembros_equipo
         WHERE equipo_id = ? AND usuario_id = ?
      `, [equipo_id, userId]);
      if (!miembros.length || miembros[0].titulo !== 'capitan') {
        return res.status(403).json({ error: 'Solo el capitán puede inscribir al equipo' });
      }

      const existing = await pool.query(`
        SELECT 1 FROM torneo_equipos
         WHERE torneo_id = ? AND equipo_id = ?
      `, [torneoId, equipo_id]);
      if (existing.length) {
        return res.status(409).json({ error: 'Equipo ya inscrito en este torneo' });
      }

      const [{ count }] = await pool.query(`
        SELECT COUNT(*) AS count
          FROM torneo_equipos
         WHERE torneo_id = ?
      `, [torneoId]);
      if (count >= t.max_equipos) {
        return res.status(403).json({ error: 'Torneo lleno' });
      }

      await pool.query(`
        INSERT INTO torneo_equipos (torneo_id, equipo_id, fecha_join)
         VALUES (?, ?, NOW())
      `, [torneoId, equipo_id]);

      res.status(201).json({ message: 'Equipo inscrito correctamente' });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id/join', authenticateJWT, async (req, res, next) => {
    const torneoId = Number(req.params.id);
    const { equipo_id } = req.body;
    const userId = req.user.id;

    if (![torneoId, equipo_id].every(n => Number.isInteger(n) && n > 0)) {
      return res.status(400).json({ error: 'IDs inválidos' });
    }

    try {
      const miembros = await pool.query(`
        SELECT titulo FROM miembros_equipo
         WHERE equipo_id = ? AND usuario_id = ?
      `, [equipo_id, userId]);
      if (!miembros.length || miembros[0].titulo !== 'capitan') {
        return res.status(403).json({ error: 'Solo el capitán puede quitar al equipo' });
      }

      const existing = await pool.query(`
        SELECT 1 FROM torneo_equipos
         WHERE torneo_id = ? AND equipo_id = ?
      `, [torneoId, equipo_id]);
      if (!existing.length) {
        return res.status(404).json({ error: 'Inscripción no encontrada' });
      }

      await pool.query(`
        DELETE FROM torneo_equipos
         WHERE torneo_id = ? AND equipo_id = ?
      `, [torneoId, equipo_id]);



      res.json({ message: 'Equipo salido del torneo' });
    } catch (err) {
      next(err);
    }
  });

  router.post('/', authenticateJWT, async (req, res, next) => {
    const { nombre, descripcion, fecha, ubicacion_x, ubicacion_y, max_equipos } = req.body;

    if (
      !nombre ||
      !fecha ||
      isNaN(Date.parse(fecha)) ||
      !max_equipos ||
      max_equipos < 2
    ) {
      return res.status(400).json({
        error: 'Nombre, fecha válida y max_equipos ≥ 2 son obligatorios',
        datos: req.body
      });
    }

    if (req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Sólo administradores pueden crear torneos' });
    }

    try {
      let direccion = null;
      if (ubicacion_x != null && ubicacion_y != null) {
        direccion = await reverseGeocode(ubicacion_x, ubicacion_y);
      }
      await pool.query(
         `INSERT INTO torneos
          (nombre, descripcion, fecha, ubicacion_x, ubicacion_y, direccion, max_equipos, estado, creado_por)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'abierto', ?)`,
      [
        nombre,
        descripcion || null,
        new Date(fecha),
        ubicacion_x || null,
        ubicacion_y || null,
        direccion,
        parseInt(max_equipos, 10),
        req.user.id
      ]
      );

      res.status(201).json({ message: 'Torneo creado con éxito' });
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id/bracket", authenticateJWT, async (req, res, next) => {
    const torneoId = Number(req.params.id);
    if (!Number.isInteger(torneoId) || torneoId <= 0) {
      return res.status(400).json({ error: 'ID de torneo inválido' });
    }
    try {
      const [t] = await pool.query(
        `SELECT * FROM torneos WHERE id = ?`,
        [torneoId]
      );
      if (!t) {
        return res.status(404).json({ error: 'Torneo no encontrado' });
      }

      const equipos = await pool.query(
        `SELECT
           te.equipo_id,
           e.nombre,
           e.foto,
           te.fecha_join
         FROM torneo_equipos te
         JOIN equipos e
           ON te.equipo_id = e.id
         WHERE te.torneo_id = ?`,
        [torneoId]
      );

      res.json({ torneo: t, equipos });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
