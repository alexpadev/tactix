const express         = require('express'); 
const authenticateJWT = require('../middleware/auth');

module.exports = (pool) => {
  const router = express.Router();

  router.use(authenticateJWT);

  router.get('/', async (req, res, next) => {
    try {
      const games = await pool.query(`
        SELECT g.*,
               t1.nombre AS equipo1,
               t2.nombre AS equipo2
          FROM partidos g
          LEFT JOIN equipos t1 ON g.equipo1_id = t1.id
          LEFT JOIN equipos t2 ON g.equipo2_id = t2.id
         ORDER BY g.fecha_inicio DESC
      `);
      res.render('games/index', { games, user: req.user });
    } catch (err) {
      next(err);
    }
  });

  router.get('/new', (req, res) => {
    res.render('games/new', { user: req.user });
  });

  router.post('/', async (req, res, next) => {
    const {
      fecha_inicio,
      ubicacion_x,
      ubicacion_y,
      equipo1_id,
      equipo2_id,
      direccion,
      player_num
    } = req.body;

    if (!fecha_inicio || !equipo1_id || !equipo2_id) {
      return res.render('games/new', {
        error: 'Fecha y ambos equipos son obligatorios',
        user: req.user
      });
    }

    try {
      await pool.query(
        `INSERT INTO partidos
           (fecha_inicio, ubicacion_x, ubicacion_y, equipo1_id, equipo2_id, direccion, player_num)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          fecha_inicio,
          ubicacion_x  || null,
          ubicacion_y  || null,
          equipo1_id,
          equipo2_id,
          direccion    || null,
          player_num   || null
        ]
      );
      res.redirect('/games');
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const [g] = await pool.query(`
        SELECT g.*,
               t1.nombre AS equipo1,
               t2.nombre AS equipo2
          FROM partidos g
          LEFT JOIN equipos t1 ON g.equipo1_id = t1.id
          LEFT JOIN equipos t2 ON g.equipo2_id = t2.id
         WHERE g.id = ?
      `, [req.params.id]);
      if (!g) return res.status(404).render('errors/404');
      res.render('games/show', { game: g, user: req.user });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/edit', async (req, res, next) => {
    try {
      const [g] = await pool.query('SELECT * FROM partidos WHERE id = ?', [req.params.id]);
      if (!g) return res.status(404).render('errors/404');
      res.render('games/edit', { game: g, user: req.user });
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', async (req, res, next) => {
    const {
      fecha_inicio,
      ubicacion_x,
      ubicacion_y,
      equipo1_id,
      equipo2_id,
      direccion,
      player_num
    } = req.body;

    try {
      await pool.query(
        `UPDATE partidos SET
           fecha_inicio = ?,
           ubicacion_x  = ?,
           ubicacion_y  = ?,
           equipo1_id   = ?,
           equipo2_id   = ?,
           direccion    = ?,
           player_num   = ?
         WHERE id = ?`,
        [
          fecha_inicio,
          ubicacion_x  || null,
          ubicacion_y  || null,
          equipo1_id,
          equipo2_id,
          direccion    || null,
          player_num   || null,
          req.params.id
        ]
      );
      res.redirect('/games');
    } catch (err) {
      next(err);
    }
  });

  // BORRAR PARTIDO
  router.delete('/:id', async (req, res, next) => {
    try {
      await pool.query('DELETE FROM partidos WHERE id = ?', [req.params.id]);
      res.redirect('/games');
    } catch (err) {
      next(err);
    }
  });

  return router;
};
