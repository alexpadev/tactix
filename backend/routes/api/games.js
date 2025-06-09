const express         = require('express');
const authenticateJWT = require('../../middleware/auth');
const { reverseGeocode } = require('./geocode');

module.exports = (pool) => {
  const router = express.Router();
  router.use(express.json());

  const isPositiveInt = (value) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0;
  };
  const isFloat = (value) => !isNaN(parseFloat(value));

  router.get('/', async (req, res, next) => {
    try {
      const rows = await pool.query(`
        SELECT g.*,
               t1.nombre       AS equipo1,
               t1.pseudoequipo AS equipo1_pseudo,
               t2.nombre       AS equipo2,
               t2.pseudoequipo AS equipo2_pseudo,
               g.direccion AS address,
               (SELECT COUNT(*) FROM miembros_equipo m1 WHERE m1.equipo_id = g.equipo1_id AND m1.activo = 1) AS equipo1_count,
               (SELECT COUNT(*) FROM miembros_equipo m2 WHERE m2.equipo_id = g.equipo2_id AND m2.activo = 1) AS equipo2_count
          FROM partidos g
          LEFT JOIN equipos t1 ON g.equipo1_id = t1.id AND t1.hidden = 0
          LEFT JOIN equipos t2 ON g.equipo2_id = t2.id AND t2.hidden = 0
         ORDER BY g.fecha_inicio DESC
      `);
      const fixedRows = rows.map(row => ({
        ...row,
        equipo1_count: Number(row.equipo1_count),
        equipo2_count: Number(row.equipo2_count)
      }));
      res.json(fixedRows);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    const gameId = Number(req.params.id);
    if (!isPositiveInt(gameId)) {
      return res.status(400).json({ error: 'Invalid game ID' });
    }
    try {
      const rows = await pool.query(`
        SELECT g.*,
               t1.nombre       AS equipo1,
               t1.pseudoequipo AS equipo1_pseudo,
               t2.nombre       AS equipo2,
               t2.pseudoequipo AS equipo2_pseudo,
               g.direccion AS address
          FROM partidos g
          LEFT JOIN equipos t1 ON g.equipo1_id = t1.id AND t1.hidden = 0
          LEFT JOIN equipos t2 ON g.equipo2_id = t2.id AND t2.hidden = 0
         WHERE g.id = ?
      `, [gameId]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }
      const game = rows[0];

      const members1 = await pool.query(`
        SELECT u.id AS usuario_id, u.nombre, u.foto, m.titulo, m.fecha_entrada
          FROM miembros_equipo m
          JOIN usuarios u ON u.id = m.usuario_id
         WHERE m.equipo_id = ? AND m.activo = 1
         ORDER BY m.fecha_entrada
      `, [game.equipo1_id]);

      let members2 = [];
      if (game.equipo2_id) {
        members2 = await pool.query(`
          SELECT u.id AS usuario_id, u.nombre, u.foto, m.titulo, m.fecha_entrada
            FROM miembros_equipo m
            JOIN usuarios u ON u.id = m.usuario_id
           WHERE m.equipo_id = ? AND m.activo = 1
           ORDER BY m.fecha_entrada
        `, [game.equipo2_id]);
      }

      res.json({ ...game, members1, members2 });
    } catch (err) {
      next(err);
    }
  });

  router.post('/', authenticateJWT, async (req, res, next) => {
    const { fecha_inicio, ubicacion_x, ubicacion_y, player_num, asUser, equipo1_id } = req.body;
    if (!fecha_inicio || isNaN(Date.parse(fecha_inicio))) {
      return res.status(400).json({ error: 'Valid fecha_inicio is required' });
    }
    if (!isPositiveInt(player_num)) {
      return res.status(400).json({ error: 'player_num must be a positive integer' });
    }
    if (ubicacion_x !== undefined && !isFloat(ubicacion_x)) {
      return res.status(400).json({ error: 'ubicacion_x must be a number' });
    }
    if (ubicacion_y !== undefined && !isFloat(ubicacion_y)) {
      return res.status(400).json({ error: 'ubicacion_y must be a number' });
    }

    let direccion = null;
     if (ubicacion_x != null && ubicacion_y != null) {
       direccion = await reverseGeocode(ubicacion_x, ubicacion_y);
     }

    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      const userId = req.user.id;
      let te1, te2;

      if (asUser) {
        const r1 = await conn.query(
          `INSERT INTO equipos (nombre, limite_miembros, premium, pseudoequipo) VALUES (?, ?, 0, 1)`,
          [`Pseudo A user#${userId}`, player_num]
        );
        const r2 = await conn.query(
          `INSERT INTO equipos (nombre, limite_miembros, premium, pseudoequipo) VALUES (?, ?, 0, 1)`,
          [`Pseudo B user#${userId}`, player_num]
        );
        te1 = r1.insertId;
        te2 = r2.insertId;
      } else {
        if (!isPositiveInt(equipo1_id)) {
          await conn.rollback();
          return res.status(400).json({ error: 'Valid equipo1_id required' });
        }
        const roleRows = await conn.query(
          `SELECT titulo FROM miembros_equipo WHERE equipo_id = ? AND usuario_id = ? AND activo = 1`,
          [equipo1_id, userId]
        );
        if (roleRows.length === 0 || roleRows[0].titulo !== 'capitan') {
          await conn.rollback();
          return res.status(403).json({ error: 'Only captain may create' });
        }
        te1 = equipo1_id;
        const r2 = await conn.query(
          `INSERT INTO equipos (nombre, limite_miembros, premium, pseudoequipo) VALUES (?, ?, 0, 1)`,
          [`Pseudo rival for team#${te1}`, player_num]
        );
        te2 = r2.insertId;
      }

      const ins = await conn.query(
        `INSERT INTO partidos
          (fecha_inicio, ubicacion_x, ubicacion_y, direccion, player_num, equipo1_id, equipo2_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          new Date(fecha_inicio),
          ubicacion_x || null,
          ubicacion_y || null,
          direccion,
          player_num,
          te1,
          te2
        ]
      );
      await conn.commit();

      const newMatchRows = await pool.query(`SELECT * FROM partidos WHERE id = ?`, [ins.insertId]);
      if (newMatchRows.length === 0) {
        throw new Error('Match not found after creation');
      }
      res.status(201).json(newMatchRows[0]);
    } catch (err) {
      await conn.rollback();
      next(err);
    } finally {
      conn.release();
    }
  });

  router.post('/:id/join', authenticateJWT, async (req, res, next) => {
    const userId  = req.user.id;
    const gameId  = Number(req.params.id);
    const { asTeam = false, realTeamId, slotId, equipo_id } = req.body;
    if (!isPositiveInt(gameId)) {
      return res.status(400).json({ error: 'Invalid game ID' });
    }
    if (asTeam) {
      if (!isPositiveInt(realTeamId) || !isPositiveInt(slotId)) {
        return res.status(400).json({ error: 'Valid realTeamId & slotId required' });
      }
    } else {
      if (!isPositiveInt(equipo_id)) {
        return res.status(400).json({ error: 'Valid equipo_id required' });
      }
    }
  
    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      const gameRows = await conn.query(`
        SELECT g.equipo1_id, g.equipo2_id, g.player_num, g.fecha_inicio,
               t1.pseudoequipo AS p1, t2.pseudoequipo AS p2
          FROM partidos g
          JOIN equipos t1 ON g.equipo1_id = t1.id
          JOIN equipos t2 ON g.equipo2_id = t2.id
         WHERE g.id = ?
      `, [gameId]);
      if (gameRows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ error: 'Game not found' });
      }
      const game = gameRows[0];
      if (new Date(game.fecha_inicio) <= new Date()) {
        await conn.rollback();
        return res.status(403).json({ error: 'Cannot join started match' });
      }
  
      const cnt1Rows = await conn.query(
        `SELECT COUNT(*) AS cnt FROM miembros_equipo WHERE equipo_id = ? AND activo = 1`,
        [game.equipo1_id]
      );
      const cnt2Rows = await conn.query(
        `SELECT COUNT(*) AS cnt FROM miembros_equipo WHERE equipo_id = ? AND activo = 1`,
        [game.equipo2_id]
      );
      const cnt1 = cnt1Rows[0].cnt;
      const cnt2 = cnt2Rows[0].cnt;
  
      if (!asTeam) {
        const already = await conn.query(
          `SELECT 1 FROM miembros_equipo WHERE usuario_id = ? AND equipo_id IN (?, ?) AND activo = 1`,
          [userId, game.equipo1_id, game.equipo2_id]
        );
        if (already.length) {
          await conn.rollback();
          return res.status(409).json({ error: 'Already joined' });
        }
  
        const validSides = [];
        if (!game.p1 && cnt1 < game.player_num) validSides.push(game.equipo1_id);
        if (game.p1 && cnt1 == Number(0)) validSides.push(game.equipo1_id);
        if (!game.p2 && cnt2 < game.player_num) validSides.push(game.equipo2_id);
        if (game.p2 && cnt2 == Number(0)) validSides.push(game.equipo2_id);
        
        if (!validSides.includes(equipo_id)) {
          await conn.rollback();
          return res.status(400).json({ error: 'Invalid or full slot' });
        }
  
        await conn.query(
          `INSERT INTO miembros_equipo (equipo_id, usuario_id, titulo, fecha_entrada, activo)
           VALUES (?, ?, 'jugador', NOW(), 1)`,
          [equipo_id, userId]
        );
        await conn.commit();
        return res.status(201).json({ message: 'Joined solo' });
      }
  
      const capRows = await conn.query(
        `SELECT titulo FROM miembros_equipo WHERE equipo_id = ? AND usuario_id = ? AND activo = 1`,
        [realTeamId, userId]
      );
      if (capRows.length === 0 || capRows[0].titulo !== 'capitan') {
        await conn.rollback();
        return res.status(403).json({ error: 'Only captain' });
      }
      
      console.log(`realTeamId: ${realTeamId}, slotId: ${slotId}, cnt1: ${cnt1}, cnt2: ${cnt2}`);
      console.log(game)
      console.log("Number(slotId)) == game.equipo1_id", Number(slotId) == game.equipo1_id);
      console.log("game.p1", game.p1);
      console.log("Number(slotId)) == game.equipo2_id", Number(slotId) == game.equipo2_id);
      console.log("game.p2", game.p2);

      let whichCol = null;
      console.log(whichCol);

      if (Number(slotId) == game.equipo1_id && game.p1 && cnt1 == 0) {
        whichCol = 'equipo1_id';
      }
      if (Number(slotId) == game.equipo2_id && game.p2 && cnt2 == 0) {
        whichCol = 'equipo2_id';
      }
      console.log(whichCol);
      if (!whichCol) {
        await conn.rollback();
        return res.status(403).json({ error: 'Invalid or non-empty slot' });
      }
  
      await conn.query(
        `UPDATE partidos SET ${whichCol} = ? WHERE id = ?`,
        [realTeamId, gameId]
      );
      await conn.query(
        `UPDATE equipos SET hidden = 1 WHERE id = ?`,
        [Number(slotId)]
      );
      await conn.commit();
      return res.status(200).json({ message: 'Team replaced & pseudoteam hidden' });
    } catch (err) {
      await conn.rollback();
      next(err);
    } finally {
      conn.release();
    }
  });
  

  router.delete('/:id/leave', authenticateJWT, async (req, res, next) => {
    const userId = req.user.id;
    const gameId = Number(req.params.id);
    if (!isPositiveInt(gameId)) {
      return res.status(400).json({ error: 'Invalid game ID' });
    }
    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      const gameRows = await conn.query(
        `SELECT equipo1_id, equipo2_id, player_num FROM partidos WHERE id = ?`,
        [gameId]
      );
      if (gameRows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ error: 'Game not found' });
      }
      const game = gameRows[0];

      const memRows = await conn.query(
        `SELECT m.equipo_id, m.titulo FROM miembros_equipo m WHERE m.usuario_id = ? AND m.equipo_id IN (?, ?) AND m.activo = 1`,
        [userId, game.equipo1_id, game.equipo2_id]
      );
      if (memRows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ error: 'Not in this game' });
      }
      const mem = memRows[0];

      if (mem.titulo === 'capitan') {
        let slotCol;
        if (mem.equipo_id === game.equipo1_id) slotCol = 'equipo1_id';
        else if (mem.equipo_id === game.equipo2_id) slotCol = 'equipo2_id';
        else {
          await conn.rollback();
          return res.status(400).json({ error: 'Slot mismatch' });
        }
        const pseudoName = `Pseudo_for_game${gameId}_${slotCol}_${Date.now()}`;
        const r = await conn.query(
          `INSERT INTO equipos (nombre, limite_miembros, premium, pseudoequipo) VALUES (?, ?, 0, 1)`,
          [pseudoName, game.player_num]
        );
        const newPseudoId = r.insertId;
        await conn.query(
          `UPDATE partidos SET ${slotCol} = ? WHERE id = ?`,
          [newPseudoId, gameId]
        );
      } else {
        await conn.query(
          `UPDATE miembros_equipo SET fecha_salida = NOW(), activo = 0
           WHERE usuario_id = ? AND equipo_id IN (?, ?)`,
          [userId, game.equipo1_id, game.equipo2_id]
        );
      }

      const orphans = await conn.query(`
        SELECT e.id FROM equipos e
         WHERE e.pseudoequipo = 1
           AND NOT EXISTS (SELECT 1 FROM miembros_equipo m WHERE m.equipo_id = e.id AND m.activo = 1)
           AND NOT EXISTS (SELECT 1 FROM partidos p WHERE p.equipo1_id = e.id OR p.equipo2_id = e.id)
      `);
      if (orphans.length) {
        const ids = orphans.map(r => r.id);
        await conn.query(`UPDATE equipos SET hidden = 1 WHERE id IN (?)`, [ids]);
      }

      await conn.commit();
      res.json({ message: 'Left game (captain slot replaced with pseudoteam)' });
    } catch (err) {
      await conn.rollback();
      next(err);
    } finally {
      conn.release();
    }
  });

  router.delete('/:id', authenticateJWT, async (req, res, next) => {
    const gameId = Number(req.params.id);
    if (!isPositiveInt(gameId)) {
      return res.status(400).json({ error: 'Invalid game ID' });
    }
    const userId = req.user.id;
    try {
      const gRows = await pool.query(`SELECT equipo1_id, equipo2_id FROM partidos WHERE id = ?`, [gameId]);
      if (gRows.length === 0) return res.status(404).json({ error: 'Game not found' });
      const g = gRows[0];

      const isCap = async teamId => {
        const r = await pool.query(
          `SELECT 1 FROM miembros_equipo WHERE equipo_id = ? AND usuario_id = ? AND titulo = 'capitan' AND activo = 1`,
          [teamId, userId]
        );
        return r.length > 0;
      };
      if (!(await isCap(g.equipo1_id)) && !(await isCap(g.equipo2_id))) {
        return res.status(403).json({ error: 'Only captains may cancel' });
      }

      await pool.query(
        `UPDATE equipos SET hidden = 1 WHERE pseudoequipo = 1 AND id IN (?, ?)`,
        [g.equipo1_id, g.equipo2_id]
      );
      await pool.query(`DELETE FROM partidos WHERE id = ?`, [gameId]);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
};
