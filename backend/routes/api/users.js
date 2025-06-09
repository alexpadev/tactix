const express = require("express");
const authenticateJWT = require("../../middleware/auth");

module.exports = (pool) => {
  const router = express.Router();
  router.use(express.json());

  router.get("/", async (req, res, next) => {
    try {
      const page  = Math.max(parseInt(req.query.page, 10)  || 1, 1);
      const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
      const offset = (page - 1) * limit;
      const search = (req.query.search || "").trim();
      const sort   = req.query.sort || "";

      const whereClauses = [];
      const params = [];
      if (search) {
        whereClauses.push("nombre LIKE ?");
        params.push(`%${search}%`);
      }
      const whereSQL = whereClauses.length
        ? "WHERE " + whereClauses.join(" AND ")
        : "";

      let orderSQL = "";
      if (sort === "alpha-asc") {
        orderSQL = "ORDER BY nombre ASC";
      } else if (sort === "alpha-desc") {
        orderSQL = "ORDER BY nombre DESC";
      } else if (sort === "with-team-first") {
        orderSQL = "ORDER BY (equip_id IS NOT NULL) DESC";
      } else if (sort === "without-team-first") {
        orderSQL = "ORDER BY (equip_id IS NULL) DESC";
      } else {
        orderSQL = "ORDER BY id ASC";
      }

      const countResult = await pool.query(
        `SELECT COUNT(*) AS total FROM usuarios ${whereSQL}`,
        params
      );
      const total = Number(countResult[0].total);

      const users = await pool.query(
        `SELECT * 
         FROM usuarios
         ${whereSQL}
         ${orderSQL}
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const totalPages = Math.ceil(total / limit);
      res.json({ total, page, totalPages, users });
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const rows = await pool.query(
        "SELECT * FROM usuarios WHERE id = ?",
        [req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/stats', async (req, res, next) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    const [{ gamesPlayed }] = await pool.query(
      `SELECT COUNT(DISTINCT p.id) AS gamesPlayed
         FROM partidos p
         JOIN miembros_equipo m
           ON m.equipo_id IN (p.equipo1_id, p.equipo2_id)
        WHERE m.usuario_id = ?
          AND m.activo = 1`,
      [userId]
    );

    const [{ gamesWon }] = await pool.query(
      `SELECT COUNT(*) AS gamesWon
         FROM partidos p
         -- 2a) Asociamos al usuario con el partido
         JOIN miembros_equipo m
           ON m.usuario_id = ? 
          AND m.activo = 1
          AND m.equipo_id IN (p.equipo1_id, p.equipo2_id)
        WHERE
          (
            -- Si jugó con equipo1
            m.equipo_id = p.equipo1_id
            AND (
              /* Goles válidos equipo1 */ 
              (SELECT COUNT(*) 
                 FROM estadisticas s 
                WHERE s.partido_id = p.id
                  AND s.tipo = 'goal'
                  AND s.valido = 1
                  AND EXISTS (
                    SELECT 1 FROM miembros_equipo m2
                     WHERE m2.usuario_id = s.jugador_id
                       AND m2.equipo_id = p.equipo1_id
                       AND m2.activo = 1
                  )
              )
              >
              /* Goles válidos equipo2 */
              (SELECT COUNT(*) 
                 FROM estadisticas s 
                WHERE s.partido_id = p.id
                  AND s.tipo = 'goal'
                  AND s.valido = 1
                  AND EXISTS (
                    SELECT 1 FROM miembros_equipo m2
                     WHERE m2.usuario_id = s.jugador_id
                       AND m2.equipo_id = p.equipo2_id
                       AND m2.activo = 1
                  )
              )
            )
          )
          OR
          (
            -- Si jugó con equipo2
            m.equipo_id = p.equipo2_id
            AND (
              /* Goles válidos equipo2 */
              (SELECT COUNT(*) 
                 FROM estadisticas s 
                WHERE s.partido_id = p.id
                  AND s.tipo = 'goal'
                  AND s.valido = 1
                  AND EXISTS (
                    SELECT 1 FROM miembros_equipo m2
                     WHERE m2.usuario_id = s.jugador_id
                       AND m2.equipo_id = p.equipo2_id
                       AND m2.activo = 1
                  )
              )
              >
              /* Goles válidos equipo1 */
              (SELECT COUNT(*) 
                 FROM estadisticas s 
                WHERE s.partido_id = p.id
                  AND s.tipo = 'goal'
                  AND s.valido = 1
                  AND EXISTS (
                    SELECT 1 FROM miembros_equipo m2
                     WHERE m2.usuario_id = s.jugador_id
                       AND m2.equipo_id = p.equipo1_id
                       AND m2.activo = 1
                  )
              )
            )
          )
      `,
      [userId]
    );

    const [{ timesMvp }] = await pool.query(
      `SELECT COUNT(*) AS timesMvp
         FROM estadisticas s
        WHERE s.jugador_id = ?
          AND s.tipo = 'mvp'
          AND s.valido = 1`,
      [userId]
    );

    const [{ totalGoals }] = await pool.query(
      `SELECT COUNT(*) AS totalGoals
         FROM estadisticas s
        WHERE s.jugador_id = ?
          AND s.tipo = 'goal'
          AND s.valido = 1`,
      [userId]
    );

    const [{ totalAssists }] = await pool.query(
      `SELECT COUNT(*) AS totalAssists
         FROM estadisticas s
        WHERE s.jugador_id = ?
          AND s.tipo = 'assist'
          AND s.valido = 1`,
      [userId]
    );

    res.json({
      gamesPlayed:   Number(gamesPlayed) || 0,
      gamesWon:      Number(gamesWon)    || 0,
      timesMvp:      Number(timesMvp)    || 0,
      totalGoals:    Number(totalGoals)  || 0,
      totalAssists:  Number(totalAssists) || 0,
    });
  } catch (err) {
    next(err);
  }
});


  

  router.get("/me/team", authenticateJWT, async (req, res, next) => {
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
          AND (e.hidden = 0 OR e.hidden IS NULL)
        GROUP BY e.id, e.nombre, e.limite_miembros, e.premium, e.foto`,
        [teamId]
      );

      if (rows.length === 0) {
        return res.status(204).end();
      }

      const team = rows[0];

      res.json(team);
    } catch (err) {
      console.error("Error al obtener el equipo del usuario:", err);
      next(err);
    }
  });


  router.get('/:id/team', async (req, res, next) => {
    try {
      const userId = Number(req.params.id);
      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      const rows = await pool.query(`
        SELECT
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
          AND (e.pseudoequipo = 0 OR e.pseudoequipo IS NULL)
          AND e.hidden = 0
        JOIN miembros_equipo me
          ON me.equipo_id = e.id AND me.activo = 1
        WHERE m.usuario_id = ? AND m.activo = 1
        GROUP BY e.id
        LIMIT 1
      `, [userId]);      
      if (!rows.length) {
        return res.status(404).json({ error: 'Usuario sin equipo' });
      }
      const row = rows[0];
      res.json({
        id:          row.id,
        name:        row.teamName,
        photoPath:   row.teamPhoto,
        limit:       Number(row.teamLimit),
        premium:     row.teamPremium === 1,
        memberCount: Number(row.memberCount),
        overLimit:   Number(row.overLimit),
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
