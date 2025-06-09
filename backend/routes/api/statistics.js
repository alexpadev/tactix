const express = require('express');
const authenticateJWT = require('../../middleware/auth');

module.exports = (pool) => {
  const router = express.Router();
  router.use(express.json());

  router.get('/match/:id', authenticateJWT, async (req, res, next) => {
    const matchId = Number(req.params.id);
    if (!Number.isInteger(matchId) || matchId <= 0) {
      return res.status(400).json({ error: 'Invalid match ID' });
    }
    try {
      const userId = req.user.id;
      const rows = await pool.query(
        `SELECT
           s.id,
           s.partido_id,
           s.jugador_id,
           s.timestamp,
           s.tipo,
           SUM(CASE WHEN v.valido = 1 THEN 1 ELSE 0 END)       AS valid_votes,
           SUM(CASE WHEN v.valido = 0 THEN 1 ELSE 0 END)       AS invalid_votes,
           MAX(CASE WHEN v.usuario_id = ? THEN v.valido END)   AS my_vote
         FROM estadisticas s
         LEFT JOIN estadisticas_votos v
           ON v.estadistica_id = s.id
         WHERE s.partido_id = ?
         GROUP BY s.id, s.partido_id, s.jugador_id, s.timestamp, s.tipo
         ORDER BY s.timestamp DESC`,
        [userId, matchId]
      );
      const result = rows.map(row =>
        Object.fromEntries(
          Object.entries(row).map(([k, v]) =>
            typeof v === 'bigint' ? [k, v.toString()] : [k, v]
          )
        )
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', authenticateJWT, async (req, res, next) => {
    const { partido_id, jugador_id, tipo } = req.body;
    if (!partido_id || !tipo) {
      return res.status(400).json({ error: 'partido_id y tipo son obligatorios' });
    }
    try {
      const insert = await pool.query(
        `INSERT INTO estadisticas
           (partido_id, jugador_id, tipo, timestamp)
         VALUES (?, ?, ?, NOW())`,
        [partido_id, jugador_id || null, tipo]
      );
      const rows = await pool.query(
        `SELECT id, partido_id, jugador_id, timestamp, tipo
           FROM estadisticas
          WHERE id = ?`,
        [insert.insertId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Estadística no encontrada' });
      }
      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/vote', authenticateJWT, async (req, res, next) => {
    const statId = Number(req.params.id);
    const { valido } = req.body;
    const userId = req.user.id;

    if (!Number.isInteger(statId) || statId <= 0) {
      return res.status(400).json({ error: 'Invalid statistic ID' });
    }
    if (valido !== 0 && valido !== 1) {
      return res.status(400).json({ error: 'valido debe ser 0 o 1' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const existingRows = await conn.query(
        `SELECT 1
          FROM estadisticas_votos
          WHERE estadistica_id = ?
            AND usuario_id = ?`,
        [statId, userId]
      );
      if (existingRows.length) {
        await conn.rollback();
        return res.status(409).json({ error: 'Ya has votado esta estadística' });
      }

      await conn.query(
        `INSERT INTO estadisticas_votos
          (partido_id, estadistica_id, usuario_id, valido)
        SELECT partido_id, id, ?, ?
          FROM estadisticas
          WHERE id = ?`,
        [userId, valido, statId]
      );

      const [{ total, valid }] = await conn.query(
        `SELECT 
          COUNT(*) AS total, 
          SUM(valido) AS valid 
        FROM estadisticas_votos 
        WHERE estadistica_id = ?`,
        [statId]
      );

      console.log('Total:', total, 'Valid:', valid);

      const porcentaje = Number(valid) / Number(total);
      const nuevoValido = porcentaje >= 0.75 ? 1 : 0;

      await conn.query(
        `UPDATE estadisticas
            SET valido = ?
          WHERE id = ?`,
        [nuevoValido, statId]
      );

      await conn.commit();
      res.json({
        message: 'Voto registrado',
        estadistica: {
          id: statId,
          totalVotes: Number(total),
          validVotes: Number(valid),
          porcentajeValidos: Number(porcentaje),
          marcadoValido: Boolean(nuevoValido)
        }
      });
    } catch (err) {
      await conn.rollback();
      next(err);
    } finally {
      conn.release();
    }
  });


  return router;
};
