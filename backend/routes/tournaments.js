const express = require('express');
const authenticateJWT = require('../middleware/auth');

module.exports = (pool) => {
  const router = express.Router();

  async function generateBracket(torneoId) {
    const equipos = await pool.query(
      `SELECT equipo_id FROM torneo_equipos WHERE torneo_id = ?`,
      [torneoId]
    );
    const ids = equipos.map(e => e.equipo_id);

    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }

    const rondaMax = Math.ceil(Math.log2(ids.length));
    let partidoIndex = 0;
    const inserts = [];

    for (let r = 1; r <= rondaMax; r++) {
      const gamesInRound = Math.pow(2, rondaMax - r);
      for (let g = 0; g < gamesInRound; g++) {
        const e1 = ids[2 * partidoIndex]     || null;
        const e2 = ids[2 * partidoIndex + 1] || null;
        inserts.push([torneoId, r, e1, e2]);
        partidoIndex++;
      }
    }

    await pool.query(
      `INSERT INTO torneo_partidos (torneo_id, ronda, equipo1_id, equipo2_id)
       VALUES ?`,
      [inserts]
    );
    await pool.query(
      `UPDATE torneos SET estado = 'en_progreso' WHERE id = ?`,
      [torneoId]
    );
  }

  router.use(authenticateJWT);

  router.use((req, res, next) => {
    if (req.user.rol !== 'admin') {
      return res.status(403).render('errors/403', { user: req.user });
    }
    next();
  });

  router.get('/', async (req, res, next) => {
    try {
      const { q = '', sort = 'desc', page = 1 } = req.query;

      const torneos = await pool.query(`
        SELECT t.*,
               u.nombre AS creado_por_nombre,
               (SELECT COUNT(*) FROM torneo_equipos te WHERE te.torneo_id = t.id) AS inscritos
          FROM torneos t
          JOIN usuarios u ON t.creado_por = u.id
         WHERE t.nombre LIKE ?
         ORDER BY t.nombre ${sort === 'asc' ? 'ASC' : 'DESC'}
      `, [`%${q}%`]);

      const perPage = 10;
      const currentPage = parseInt(page, 10) || 1;
      const totalPages = Math.ceil(torneos.length / perPage);
      const paginated = torneos.slice(
        (currentPage - 1) * perPage,
        currentPage * perPage
      );

      res.render('tournaments/index', {
        torneos: paginated,
        user: req.user,
        q,
        sort,
        currentPage,
        totalPages
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/new', (req, res) => {
    res.render('tournaments/new', { user: req.user, error: null, torneo: {} });
  });

  router.post('/', async (req, res, next) => {
    const {
      nombre,
      descripcion,
      fecha,
      ubicacion_x,
      ubicacion_y,
      max_equipos,
      direccion      
    } = req.body;

    if (
      !nombre ||
      !fecha ||
      isNaN(Date.parse(fecha)) ||
      !max_equipos ||
      max_equipos < 2
    ) {
      return res.render('tournaments/new', {
        user: req.user,
        error: 'Nombre, fecha válida y max_equipos ≥ 2 son obligatorios',
        torneo: req.body
      });
    }

    try {
      await pool.query(
        `INSERT INTO torneos
           (nombre, descripcion, fecha, ubicacion_x, ubicacion_y, max_equipos, direccion, estado, creado_por)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'abierto', ?)`,
        [
          nombre,
          descripcion || null,
          new Date(fecha),
          ubicacion_x || null,
          ubicacion_y || null,
          parseInt(max_equipos, 10),
          direccion   || '',   
          req.user.id
        ]
      );
      req.session.flash = 'Torneo creado con éxito';
      res.redirect('/tournaments');
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/join', async (req, res, next) => {
    const torneoId = Number(req.params.id);
    const { equipo_id } = req.body;
    const userId = req.user.id;

    if (
      !Number.isInteger(torneoId) ||
      torneoId <= 0 ||
      !Number.isInteger(equipo_id) ||
      equipo_id <= 0
    ) {
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

      const miembros = await pool.query(
        `SELECT titulo FROM miembros_equipo
         WHERE equipo_id = ? AND usuario_id = ?`,
        [equipo_id, userId]
      );
      if (!miembros.length || miembros[0].titulo !== 'capitan') {
        return res.status(403).json({ error: 'Solo el capitán puede inscribir' });
      }

      const existing = await pool.query(
        `SELECT 1 FROM torneo_equipos WHERE torneo_id = ? AND equipo_id = ?`,
        [torneoId, equipo_id]
      );
      if (existing.length) {
        return res.status(409).json({ error: 'Equipo ya inscrito' });
      }

      const [{ count }] = await pool.query(
        `SELECT COUNT(*) AS count FROM torneo_equipos WHERE torneo_id = ?`,
        [torneoId]
      );
      if (count >= t.max_equipos) {
        return res.status(403).json({ error: 'Torneo lleno' });
      }

      await pool.query(
        `INSERT INTO torneo_equipos (torneo_id, equipo_id, fecha_join)
         VALUES (?, ?, NOW())`,
        [torneoId, equipo_id]
      );

      if (count + 1 === t.max_equipos) {
        try {
          await generateBracket(torneoId);
        } catch (errGen) {
          console.error('Error generando bracket automático:', errGen);
        }
      }

      res.status(201).json({ message: 'Equipo inscrito correctamente' });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const [t] = await pool.query(`SELECT * FROM torneos WHERE id = ?`, [req.params.id]);
      if (!t) return res.status(404).render('errors/404', { user: req.user });
      const inscritos = await pool.query(
        `SELECT te.equipo_id, e.nombre
           FROM torneo_equipos te
           JOIN equipos e ON te.equipo_id = e.id
          WHERE te.torneo_id = ?`,
        [req.params.id]
      );
      res.render('tournaments/show', { user: req.user, torneo: t, inscritos });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/edit', async (req, res, next) => {
    try {
      const [t] = await pool.query(`SELECT * FROM torneos WHERE id = ?`, [req.params.id]);
      if (!t) return res.status(404).render('errors/404', { user: req.user });
      res.render('tournaments/edit', { user: req.user, error: null, torneo: t });
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', async (req, res, next) => {
    const { nombre, descripcion, fecha, ubicacion_x, ubicacion_y, max_equipos, estado } = req.body;
    const fields = [];
    const params = [];

    if (nombre) {
      fields.push('nombre = ?');
      params.push(nombre);
    }
    if (descripcion !== undefined) {
      fields.push('descripcion = ?');
      params.push(descripcion || null);
    }
    if (fecha && !isNaN(Date.parse(fecha))) {
      fields.push('fecha = ?');
      params.push(new Date(fecha));
    }
    if (ubicacion_x !== undefined) {
      fields.push('ubicacion_x = ?');
      params.push(ubicacion_x || null);
    }
    if (ubicacion_y !== undefined) {
      fields.push('ubicacion_y = ?');
      params.push(ubicacion_y || null);
    }
    if (max_equipos) {
      fields.push('max_equipos = ?');
      params.push(parseInt(max_equipos, 10));
    }
    if (estado && ['abierto', 'en_progreso', 'finalizado'].includes(estado)) {
      fields.push('estado = ?');
      params.push(estado);
    }

    if (fields.length === 0) {
      return res.render('tournaments/edit', {
        user: req.user,
        error: 'Nada para actualizar',
        torneo: { id: req.params.id, ...req.body }
      });
    }

    try {
      params.push(req.params.id);
      await pool.query(`UPDATE torneos SET ${fields.join(', ')} WHERE id = ?`, params);
      req.session.flash = 'Torneo actualizado con éxito';
      res.redirect(`/tournaments/${req.params.id}`);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      await pool.query(`DELETE FROM torneos WHERE id = ?`, [req.params.id]);
      req.session.flash = 'Torneo eliminado con éxito';
      res.redirect('/tournaments');
    } catch (err) {
      next(err);
    }
  });

  return router;
};
