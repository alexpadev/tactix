const express = require('express');
const multer = require('multer');
const path = require('path');
const authenticateJWT = require('../../middleware/auth');
const Chat = require('../../models/Chat');

module.exports = (pool, websocket) => {
  const router = express.Router();
  router.use(express.json());
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

  const storage = multer.diskStorage({
    destination: (req, file, cb) =>
      cb(null, path.join(__dirname, '../../uploads/')),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `team-${Date.now()}${ext}`);
    }
  });
  const upload = multer({ storage });


  router.get('/', async (req, res, next) => {
    try {
      const rows = await pool.query(`
        SELECT
          e.id,
          e.nombre,
          e.limite_miembros,
          e.premium,
          e.foto AS foto_equipo,
          JSON_ARRAYAGG(
            IF(u.id IS NULL, NULL, JSON_OBJECT(
              'usuario_id',    m.usuario_id,
              'nombre',        u.nombre,
              'foto',          u.foto,
              'titulo',        m.titulo,
              'fecha_entrada', DATE_FORMAT(m.fecha_entrada, '%Y-%m-%d %H:%i:%s')
            ))
          ) AS miembros
        FROM equipos e
        LEFT JOIN miembros_equipo m
          ON m.equipo_id = e.id AND m.activo = 1
        LEFT JOIN usuarios u
          ON u.id = m.usuario_id
        WHERE (e.pseudoequipo = 0 OR e.pseudoequipo IS NULL)
          AND e.hidden = 0
        GROUP BY e.id, e.nombre, e.limite_miembros, e.premium, e.foto
        ORDER BY e.nombre;
      `);

      const equipos = rows.map(team => {
        let raw = team.miembros, miembros = [];
        if (Array.isArray(raw)) {
          miembros = raw.filter(m => m !== null);
        } else if (typeof raw === 'string') {
          try { miembros = JSON.parse(raw).filter(m => m !== null); }
          catch { miembros = []; }
        }
        miembros = miembros.map(m => ({ ...m, foto: m.foto }));

        return {
          id: team.id,
          nombre: team.nombre,
          limite_miembros: team.limite_miembros,
          premium: team.premium === 1,
          foto: team.foto_equipo,
          miembros
        };
      });

      res.json(equipos);
    } catch (err) {
      next(err);
    }
  });

  router.get('/my', authenticateJWT, async (req, res, next) => {
    try {
      const userId = req.user.id;

      const [own] = await pool.query(
        `SELECT me.equipo_id
        FROM miembros_equipo me
        JOIN equipos e ON me.equipo_id = e.id
        WHERE me.usuario_id = ?
          AND me.activo = 1
          AND (e.pseudoequipo = 0 OR e.pseudoequipo IS NULL)
          AND (e.hidden = 0 OR e.hidden IS NULL)
        LIMIT 1`,
        [userId]
      );

      if (!own) {
        return res.status(204).end();
      }
      const teamId = own.equipo_id;

      const rows = await pool.query(
        `SELECT
          e.id,
          e.nombre,
          e.limite_miembros,
          e.premium,
          e.foto AS foto_equipo,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'usuario_id',    m.usuario_id,
              'nombre',        u.nombre,
              'foto',          u.foto,
              'titulo',        m.titulo,
              'fecha_entrada', DATE_FORMAT(m.fecha_entrada, '%Y-%m-%dT%H:%i:%s')
            )
          ) AS miembros
        FROM equipos e
        LEFT JOIN miembros_equipo m
          ON m.equipo_id = e.id
          AND m.activo = 1
        LEFT JOIN usuarios u
          ON u.id = m.usuario_id
        WHERE e.id = ?
          AND (e.pseudoequipo = 0 OR e.pseudoequipo IS NULL)
          AND e.hidden = 0
        GROUP BY e.id, e.nombre, e.limite_miembros, e.premium, e.foto`,
        [teamId]
      );

      if (rows.length === 0) {
        return res.status(204).end();
      }

      const team = rows[0];

      res.json(team);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const rows = await pool.query(`
        SELECT
          e.id,
          e.nombre,
          e.limite_miembros,
          e.premium,
          e.foto AS foto_equipo,
          JSON_ARRAYAGG(
            IF(u.id IS NULL, NULL, JSON_OBJECT(
              'usuario_id',    m.usuario_id,
              'nombre',        u.nombre,
              'foto',          u.foto,
              'titulo',        m.titulo,
              'fecha_entrada', DATE_FORMAT(m.fecha_entrada, '%Y-%m-%d %H:%i:%s')
            ))
          ) AS miembros
        FROM equipos e
        LEFT JOIN miembros_equipo m
          ON m.equipo_id = e.id AND m.activo = 1
        LEFT JOIN usuarios u
          ON u.id = m.usuario_id
        WHERE e.id = ?
          AND (e.pseudoequipo = 0 OR e.pseudoequipo IS NULL)
          AND e.hidden = 0
        GROUP BY e.id, e.nombre, e.limite_miembros, e.premium, e.foto
      `, [req.params.id]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Equipo no encontrado' });
      }

      const team = rows[0];
      let raw = team.miembros, miembros = [];
      if (Array.isArray(raw)) {
        miembros = raw.filter(m => m !== null);
      } else if (typeof raw === 'string') {
        try { miembros = JSON.parse(raw).filter(m => m !== null); }
        catch { miembros = []; }
      }
      miembros = miembros.map(m => ({ ...m, foto: m.foto }));

      res.json({
        id: team.id,
        nombre: team.nombre,
        limite_miembros: team.limite_miembros,
        premium: team.premium === 1,
        foto: team.foto_equipo,
        miembros
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/', authenticateJWT, upload.single('foto'), async (req, res, next) => {
    try {
      const creatorId = req.user.id;
      const { nombre, limite_miembros, premium } = req.body;
      const fotoPath = req.file ? `/uploads/${req.file.filename}` : null;

      if (!nombre || limite_miembros == null || premium == null) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      }
      if (limite_miembros < 5 || limite_miembros > 20) {
        return res.status(400).json({ error: 'El límite de miembros debe estar entre 5 y 20' });
      }

      const exists = await pool.query(
        `SELECT id FROM equipos WHERE nombre = ?`, [nombre]
      );
      if (exists.length) {
        return res.status(409).json({ error: 'Ya existe ese nombre de equipo' });
      }

      const result = await pool.query(
        `INSERT INTO equipos (nombre, limite_miembros, premium, foto)
         VALUES (?, ?, ?, ?)`,
        [
          nombre,
          Number(limite_miembros),
          premium === '1' || premium === 'true' ? 1 : 0,
          fotoPath
        ]
      );
      const newTeamId = result.insertId;

      await pool.query(
        `INSERT INTO miembros_equipo (equipo_id, usuario_id, titulo, fecha_entrada, activo)
         VALUES (?, ?, 'capitan', NOW(), 1)`,
        [newTeamId, creatorId]
      );
      await pool.query(
        `UPDATE usuarios SET equip_id = ? WHERE id = ?`,
        [newTeamId, creatorId]
      );
      await pool.query(
        `DELETE FROM join_requests WHERE usuario_id = ?`,
        [creatorId]
      );

      const newEqRows = await pool.query(
        `SELECT * FROM equipos WHERE id = ?`, [newTeamId]
      );
      const newEq = newEqRows[0];
      newEq.foto = newEq.foto;

      res.status(201).json(newEq);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/join/status', authenticateJWT, async (req, res, next) => {
    try {
      const equipoId = Number(req.params.id);
      const usuarioId = req.user.id;
      const pending = await pool.query(
        `SELECT 1 FROM join_requests WHERE equipo_id = ? AND usuario_id = ?`,
        [equipoId, usuarioId]
      );
      res.json({ pending: Boolean(pending.length) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/join', authenticateJWT, async (req, res, next) => {
    try {
      const equipoId = Number(req.params.id);
      const usuarioId = req.user.id;

      const already = await pool.query(
        `SELECT 1 FROM miembros_equipo
        WHERE equipo_id = ? AND usuario_id = ? AND activo = 1`,
        [equipoId, usuarioId]
      );

      if (already.length) return res.status(409).json({ error: 'Ya eres miembro' });

      const pending = await pool.query(
        `SELECT 1 FROM join_requests WHERE equipo_id = ? AND usuario_id = ?`,
        [equipoId, usuarioId]
      );
      if (pending.length) return res.status(409).json({ error: 'Solicitud ya pendiente' });

      await pool.query(
        `INSERT INTO join_requests (equipo_id, usuario_id, creado_en)
         VALUES (?, ?, NOW())`,
        [equipoId, usuarioId]
      );

      res.status(201).json({ message: 'Solicitud enviada' });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/requests', authenticateJWT, async (req, res, next) => {
    try {
      const equipoId = Number(req.params.id);
      const userId = req.user.id;
      const roleRows = await pool.query(
        `SELECT titulo FROM miembros_equipo WHERE equipo_id = ? AND usuario_id = ?`,
        [equipoId, userId]
      );
      if (!roleRows.length || roleRows[0].titulo !== 'capitan') {
        return res.status(403).json({ error: 'Sólo el capitán puede ver solicitudes' });
      }
      const rows = await pool.query(
        `SELECT jr.usuario_id, u.nombre, u.foto, jr.creado_en
         FROM join_requests jr
         JOIN usuarios u ON u.id = jr.usuario_id
         WHERE jr.equipo_id = ?
         ORDER BY jr.creado_en ASC`,
        [equipoId]
      );
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/requests/:userId/approve', authenticateJWT, async (req, res, next) => {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const equipoId = Number(req.params.id);
      const captainId = req.user.id;
      const nuevoId = Number(req.params.userId);

      const roleRows = await connection.query(
        `SELECT titulo FROM miembros_equipo WHERE equipo_id = ? AND usuario_id = ?`,
        [equipoId, captainId]
      );
      if (!roleRows.length || roleRows[0].titulo !== 'capitan') {
        await connection.rollback();
        return res.status(403).json({ error: 'Sólo el capitán puede aprobar solicitudes' });
      }

      const reqRow = await connection.query(
        `SELECT 1 FROM join_requests WHERE equipo_id = ? AND usuario_id = ?`,
        [equipoId, nuevoId]
      );
      if (!reqRow.length) {
        await connection.rollback();
        return res.status(404).json({ error: 'Solicitud no encontrada' });
      }

      const teamRows = await connection.query(
        `SELECT limite_miembros FROM equipos WHERE id = ?`, [equipoId]
      );
      const team = teamRows[0];
      const countRow = await connection.query(
        `SELECT COUNT(*) AS cnt FROM miembros_equipo WHERE equipo_id = ? AND activo = 1`,
        [equipoId]
      );
      if (countRow[0].cnt >= team.limite_miembros) {
        await connection.rollback();
        return res.status(403).json({ error: 'Equipo lleno' });
      }

      const [existingMember] = await connection.query(
        `SELECT 1 FROM miembros_equipo WHERE equipo_id = ? AND usuario_id = ?`,
        [equipoId, nuevoId]
      );


      if (existingMember) {
        await connection.query(
          `UPDATE miembros_equipo
          SET activo = 1,
              titulo = 'jugador',
              fecha_entrada = NOW(),
              fecha_salida = NULL
          WHERE equipo_id = ? AND usuario_id = ?`,
          [equipoId, nuevoId]
        );
      } else {
        await connection.query(
          `INSERT INTO miembros_equipo (equipo_id, usuario_id, titulo, fecha_entrada, activo)
          VALUES (?, ?, 'jugador', NOW(), 1)`,
          [equipoId, nuevoId]
        );
      }

      await connection.query(
        `UPDATE usuarios SET equip_id = ? WHERE id = ?`,
        [equipoId, nuevoId]
      );

      await connection.query(
        `DELETE FROM join_requests WHERE usuario_id = ?`,
        [nuevoId]
      );

      await connection.commit();
      res.json({ message: 'Usuario añadido y solicitudes limpiadas' });
    } catch (err) {
      await connection.rollback();
      next(err);
    } finally {
      connection.release();
    }
  });

  router.post('/:id/requests/:userId/reject', authenticateJWT, async (req, res, next) => {
    try {
      const equipoId = Number(req.params.id);
      const userId = req.user.id;
      const badId = Number(req.params.userId);

      const roleRows = await pool.query(
        `SELECT titulo FROM miembros_equipo WHERE equipo_id = ? AND usuario_id = ?`,
        [equipoId, userId]
      );
      if (!roleRows.length || roleRows[0].titulo !== 'capitan') {
        return res.status(403).json({ error: 'Sólo el capitán puede rechazar solicitudes' });
      }

      const result = await pool.query(
        `DELETE FROM join_requests WHERE equipo_id = ? AND usuario_id = ?`,
        [equipoId, badId]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Solicitud no encontrada' });
      }
      res.json({ message: 'Solicitud rechazada' });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:teamId/kick/:userId', authenticateJWT, async (req, res) => {
    const { teamId, userId } = req.params;
    const currentUserId = req.user.id;

    try {
      const roleRows = await pool.query(
        'SELECT titulo FROM miembros_equipo WHERE equipo_id = ? AND usuario_id = ?',
        [teamId, currentUserId]
      );
      if (!roleRows.length || roleRows[0].titulo !== 'capitan') {
        return res.status(403).json({ message: 'No autorizado' });
      }

      if (Number(userId) === currentUserId) {
        return res.status(400).json({ message: 'No puedes expulsarte a ti mismo' });
      }

      const result = await pool.query(
        `UPDATE miembros_equipo
           SET fecha_salida = NOW(), activo = 0
         WHERE equipo_id = ? AND usuario_id = ?`,
        [teamId, userId]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado en el equipo' });
      }

      await pool.query(
        'UPDATE usuarios SET equip_id = NULL WHERE id = ?',
        [userId]
      );

      res.json({ message: 'Usuario expulsado correctamente' });
    } catch (err) {
      console.error('Error al expulsar:', err);
      res.status(500).json({ message: 'Error del servidor' });
    }
  });

  router.post('/:id/leave', authenticateJWT, async (req, res, next) => {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const equipoId  = Number(req.params.id);
      const usuarioId = req.user.id;

      const membershipRows = await connection.query(
        `SELECT titulo FROM miembros_equipo WHERE equipo_id = ? AND usuario_id = ? AND activo = 1`,
        [equipoId, usuarioId]
      );
      if (membershipRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'No eras miembro de ese equipo' });
      }
      const wasCaptain = membershipRows[0].titulo === 'capitan';

      await connection.query(
        `UPDATE miembros_equipo
           SET fecha_salida = NOW(), activo = 0
         WHERE equipo_id = ? AND usuario_id = ?`,
        [equipoId, usuarioId]
      );
      await connection.query(
        `UPDATE usuarios SET equip_id = NULL WHERE id = ?`,
        [usuarioId]
      );

      const countRows = await connection.query(
        `SELECT COUNT(*) AS count FROM miembros_equipo WHERE equipo_id = ? AND activo = 1`,
        [equipoId]
      );
      const remaining = Number(countRows[0].count);

      if (remaining === 0) {
        await connection.query(
          `UPDATE equipos SET hidden = 1 WHERE id = ?`,
          [equipoId]
        );
        await connection.commit();
        return res.json({
          message: 'Has salido y el equipo se ocultó porque quedó vacío'
        });
      }

      let newCapitanId = null;
      if (wasCaptain && remaining > 0) {
        const pickRows = await connection.query(
          `SELECT usuario_id FROM miembros_equipo WHERE equipo_id = ? AND activo = 1 ORDER BY RAND() LIMIT 1`,
          [equipoId]
        );
        if (pickRows.length > 0) {
          newCapitanId = pickRows[0].usuario_id;
          await connection.query(
            `UPDATE miembros_equipo
               SET titulo = 'capitan'
             WHERE equipo_id = ? AND usuario_id = ?`,
            [equipoId, newCapitanId]
          );
        }
      }

      await connection.commit();

      if (wasCaptain && newCapitanId) {
        return res.json({
          message: 'Has salido. Nuevo capitán asignado.',
          newCapitanId
        });
      } else {
        return res.json({ message: 'Has salido del equipo.' });
      }
    } catch (err) {
      await connection.rollback();
      next(err);
    } finally {
      connection.release();
    }
  });

  router.put('/:id', authenticateJWT, async (req, res, next) => {
    try {
      const { nombre, limite_miembros, premium, foto } = req.body;
      if (!nombre || limite_miembros == null || premium == null) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      }
      const result = await pool.query(
        `UPDATE equipos
           SET nombre = ?, limite_miembros = ?, premium = ?, foto = ?
         WHERE id = ?`,
        [nombre, limite_miembros, premium ? 1 : 0, foto || null, req.params.id]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Equipo no encontrado' });
      }
      const updatedRows = await pool.query(`SELECT * FROM equipos WHERE id = ?`, [req.params.id]);
      const updated = updatedRows[0];
      updated.foto = updated.foto;
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', authenticateJWT, async (req, res, next) => {
    try {
      const result = await pool.query(
        `UPDATE equipos SET hidden = 1 WHERE id = ?`,
        [req.params.id]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Equipo no encontrado' });
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/announcements', authenticateJWT, async (req, res) => {
    try {
      const teamId = Number(req.params.id);
      const rows = await pool.query(
        `SELECT a.id, a.fecha, a.contenido, COALESCE(u.nombre,'Anónimo') AS autor
         FROM anuncios a
         LEFT JOIN usuarios u ON u.id = a.usuario_id
         WHERE a.equipo_id = ?
         ORDER BY a.fecha DESC`,
        [teamId]
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/:id/announcements', authenticateJWT, async (req, res) => {
    try {
      const teamId = Number(req.params.id);
      const userId = req.user.id;
      const { contenido } = req.body;
      if (!contenido || !contenido.trim()) {
        return res.status(400).json({ error: 'El contenido es obligatorio.' });
      }
      const roleRows = await pool.query(
        `SELECT titulo FROM miembros_equipo WHERE equipo_id = ? AND usuario_id = ? AND activo = 1`,
        [teamId, userId]
      );
      if (!roleRows.length || roleRows[0].titulo !== 'capitan') {
        return res.status(403).json({ error: 'Solo el capitán puede crear anuncios.' });
      }
      await pool.query(
        `INSERT INTO anuncios (equipo_id, usuario_id, contenido)
         VALUES (?, ?, ?)`,
        [teamId, userId, contenido.trim()]
      );
      res.status(201).json({ message: 'Anuncio creado.' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/:id/chat', authenticateJWT, async (req, res, next) => {
    try {
      const teamId = Number(req.params.id);
      const userId = req.user.id;
      const teamRows = await pool.query(
        `SELECT pseudoequipo, hidden FROM equipos WHERE id = ?`,
        [teamId]
      );
      if (!teamRows.length || teamRows[0].pseudoequipo === 1 || teamRows[0].hidden === 1) {
        return res.status(404).json({ error: 'Equipo no encontrado' });
      }
      const memberRows = await pool.query(
        `SELECT 1 FROM miembros_equipo WHERE equipo_id = ? AND usuario_id = ? AND activo = 1`,
        [teamId, userId]
      );
      if (!memberRows.length) {
        return res.status(403).json({ error: 'No perteneces a este equipo' });
      }
      const members = await pool.query(
        `SELECT usuario_id FROM miembros_equipo WHERE equipo_id = ? AND activo = 1`,
        [teamId]
      );
      const participants = members.map(m => m.usuario_id);
      let chat = await Chat.findOne({ teamId });
      if (!chat) {
        chat = new Chat({ teamId, participants, isGroup: true, messages: [] });
      } else {
        chat.participants = participants;
      }
      await chat.save();
      res.json({ chatId: chat._id, participants });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/calendar', authenticateJWT, async (req, res, next) => {
    try {
      const teamId = Number(req.params.id);
      const userId = req.user.id;
      const memberRows = await pool.query(
        `SELECT 1 FROM miembros_equipo WHERE equipo_id = ? AND usuario_id = ? AND activo = 1`,
        [teamId, userId]
      );
      if (!memberRows.length) {
        return res.status(403).json({ error: 'No perteneces a este equipo' });
      }
      const events = await pool.query(
        `SELECT id, titulo, descripcion,
                DATE_FORMAT(fecha_inicio, '%Y-%m-%dT%H:%i') AS fecha_inicio,
                DATE_FORMAT(fecha_fin, '%Y-%m-%dT%H:%i')   AS fecha_fin,
                creado_por,
                DATE_FORMAT(creado_en, '%Y-%m-%d %H:%i:%s') AS creado_en
         FROM calendario
         WHERE equipo_id = ?
         ORDER BY fecha_inicio`,
        [teamId]
      );
      res.json(events);
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/calendar', authenticateJWT, async (req, res, next) => {
    try {
      const teamId = Number(req.params.id);
      const userId = req.user.id;
      const { titulo, descripcion, fecha_inicio, fecha_fin } = req.body;
      if (!titulo || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'Título, fecha inicio y fin obligatorios.' });
      }
      const roleRows = await pool.query(
        `SELECT titulo FROM miembros_equipo WHERE equipo_id = ? AND usuario_id = ? AND activo = 1`,
        [teamId, userId]
      );
      if (!roleRows.length || roleRows[0].titulo !== 'capitan') {
        return res.status(403).json({ error: 'Solo el capitán puede crear eventos.' });
      }
      await pool.query(
        `INSERT INTO calendario (equipo_id, titulo, descripcion, fecha_inicio, fecha_fin, creado_por)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [teamId, titulo.trim(), descripcion || null, fecha_inicio, fecha_fin, userId]
      );
      res.status(201).json({ message: 'Evento creado.' });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/polls', authenticateJWT, async (req, res, next) => {
    try {
      const teamId = Number(req.params.id);
      const userId = req.user.id;
      const memRows = await pool.query(
        `SELECT 1 FROM miembros_equipo WHERE equipo_id = ? AND usuario_id = ? AND activo = 1`,
        [teamId, userId]
      );
      if (!memRows.length) return res.status(403).json({ error: 'No perteneces a este equipo' });

      const polls = await pool.query(
        `SELECT id, pregunta, creado_por, UNIX_TIMESTAMP(creado_en) AS creado_ts
         FROM encuestas
         WHERE equipo_id = ?
         ORDER BY creado_en DESC`,
        [teamId]
      );
      for (const p of polls) {
        p.id = Number(p.id);
        p.creado_por = Number(p.creado_por);
        p.creado_en = new Date(Number(p.creado_ts) * 1000).toISOString();
        delete p.creado_ts;

        const opts = await pool.query(
          `SELECT o.id, o.texto, COUNT(v.id) AS votos
           FROM opciones_encuesta o
           LEFT JOIN votos_encuesta v ON v.opcion_id = o.id
           WHERE o.encuesta_id = ?
           GROUP BY o.id, o.texto`,
          [p.id]
        );
        p.opciones = opts.map(o => ({
          id: Number(o.id),
          texto: o.texto,
          votos: Number(o.votos)
        }));

        const my = await pool.query(
          `SELECT opcion_id FROM votos_encuesta WHERE encuesta_id = ? AND usuario_id = ?`,
          [p.id, userId]
        );
        p.miVoto = my.length ? Number(my[0].opcion_id) : null;
      }

      res.json(polls);
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/polls', authenticateJWT, async (req, res, next) => {
    try {
      const teamId = Number(req.params.id);
      const userId = req.user.id;
      const { pregunta, opciones } = req.body;
      if (!pregunta || !Array.isArray(opciones) || opciones.length < 2) {
        return res.status(400).json({ error: 'Pregunta y ≥2 opciones obligatorias.' });
      }
      const rolRows = await pool.query(
        `SELECT titulo FROM miembros_equipo WHERE equipo_id = ? AND usuario_id = ? AND activo = 1`,
        [teamId, userId]
      );
      if (!rolRows.length || rolRows[0].titulo !== 'capitan') {
        return res.status(403).json({ error: 'Solo el capitán puede crear encuestas.' });
      }
      const r1 = await pool.query(
        `INSERT INTO encuestas (pregunta, equipo_id, creado_por)
         VALUES (?, ?, ?)`,
        [pregunta.trim(), teamId, userId]
      );
      const pollId = Number(r1.insertId);
      const tuples = opciones.map(() => '(?,?)').join(',');
      const params = opciones.flatMap(texto => [pollId, texto.trim()]);
      await pool.query(
        `INSERT INTO opciones_encuesta (encuesta_id, texto) VALUES ${tuples}`,
        params
      );
      res.status(201).json({ message: 'Encuesta creada.', pollId });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/polls/:pollId/vote', authenticateJWT, async (req, res, next) => {
    try {
      const teamId = Number(req.params.id);
      const pollId = Number(req.params.pollId);
      const userId = req.user.id;
      const { opcion_id } = req.body;
      const mem = await pool.query(
        `SELECT 1 FROM miembros_equipo WHERE equipo_id = ? AND usuario_id = ? AND activo = 1`,
        [teamId, userId]
      );
      if (!mem.length) return res.status(403).json({ error: 'No perteneces a este equipo' });

      const e = await pool.query(
        `SELECT 1 FROM encuestas WHERE id = ? AND equipo_id = ?`,
        [pollId, teamId]
      );
      if (!e.length) return res.status(404).json({ error: 'Encuesta no encontrada' });

      const o = await pool.query(
        `SELECT 1 FROM opciones_encuesta WHERE id = ? AND encuesta_id = ?`,
        [opcion_id, pollId]
      );
      if (!o.length) return res.status(400).json({ error: 'Opción inválida' });

      await pool.query(
        `INSERT INTO votos_encuesta (encuesta_id, opcion_id, usuario_id)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE opcion_id = VALUES(opcion_id)`,
        [pollId, opcion_id, userId]
      );

      res.json({ message: 'Voto registrado.' });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
