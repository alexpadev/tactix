const express = require("express");
const authenticateJWT = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

module.exports = (pool) => {

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
      const ext  = path.extname(file.originalname);
      const name = file.fieldname + '-' + Date.now() + ext;
      cb(null, name);
    }
  });
  const upload = multer({ storage });

  const router = express.Router();

  router.use(authenticateJWT);

  router.get("/", async (req, res, next) => {
    try {
      const { q = "", sort = "asc", page = "1", limit = "10" } = req.query;
      const params = [];
      let where = "";

      if (q) {
        where = `WHERE nombre LIKE ? OR id LIKE ?`;
        params.push(`%${q}%`, `%${q}%`);
      }

      const countSql = `SELECT COUNT(*) AS cnt FROM equipos ${where}`;
      const countRows = await pool.query(countSql, params);
      const totalCount = Number(countRows[0]?.cnt || 0);

      const parsedLimit = Math.max(1, parseInt(limit, 10) || 10);
      const totalPages  = Math.max(1, Math.ceil(totalCount / parsedLimit));
      const parsedPage  = Math.max(1, Math.min(parseInt(page, 10) || 1, totalPages));
      const offset      = (parsedPage - 1) * parsedLimit;
      const order       = sort.toLowerCase() === "desc" ? "DESC" : "ASC";

      const sql = `
        SELECT *
          FROM equipos
          ${where}
         ORDER BY nombre ${order}
         LIMIT ? OFFSET ?
      `;
      const dataParams = params.concat([parsedLimit, offset]);
      const equipos = await pool.query(sql, dataParams);

      res.render("teams/index", {
        equipos,
        q,
        sort,
        currentPage: parsedPage,
        totalPages,
        limit: parsedLimit,
        user: req.user
      });
    } catch (err) {
      next(err);
    }
  });

  router.get("/new", (req, res) => {
    res.render("teams/new", { user: req.user, error: null, data: {} });
  });

  router.post("/", upload.single("foto"), async (req, res, next) => {
    try {
      const { nombre, limite_miembros, premium } = req.body;

      if (!nombre || limite_miembros == null) {
        return res.render("teams/new", {
          error: "Nombre y límite de miembros son obligatorios",
          user: req.user,
          data: req.body
        });
      }

      const limite = parseInt(limite_miembros, 10);
      if (isNaN(limite) || limite < 1) {
        return res.render("teams/new", {
          error: "El límite de miembros debe ser un número entero ≥ 1",
          user: req.user,
          data: req.body
        });
      }

      let fotoPath = "";
      if (req.file) {
        fotoPath = "/uploads/" + req.file.filename;
      }

      await pool.query(
        `INSERT INTO equipos
           (nombre, limite_miembros, premium, foto)
         VALUES (?, ?, ?, ?)`,
        [
          nombre.trim(),
          limite,
          premium === "on" ? 1 : 0,  
          fotoPath
        ]
      );

      req.session.flash = 'Equipo creado con éxito';
      res.redirect("/teams");

    } catch (err) {
      next(err);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const [equipo] = await pool.query(
        "SELECT * FROM equipos WHERE id = ?",
        [req.params.id]
      );
      if (!equipo) return res.status(404).render("errors/404", { user: req.user });
      res.render("teams/show", { equipo, user: req.user });
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id/edit", async (req, res, next) => {
    try {
      const [equipo] = await pool.query(
        "SELECT * FROM equipos WHERE id = ?",
        [req.params.id]
      );
      if (!equipo) return res.status(404).render("errors/404", { user: req.user });
      res.render("teams/edit", { equipo, user: req.user, error: null });
    } catch (err) {
      next(err);
    }
  });

  // ACTUALIZAR EQUIPO
  router.put("/:id", upload.single('foto'), async (req, res, next) => {
    try {
      const { nombre, limite_miembros, premium } = req.body;
      const fields = [];
      const params = [];

      if (nombre) {
        fields.push("nombre = ?");
        params.push(nombre.trim());
      }

      if (limite_miembros != null) {
        const limiteUp = parseInt(limite_miembros, 10);
        if (isNaN(limiteUp) || limiteUp < 1) {
          return res.render("teams/edit", {
            error: "El límite de miembros debe ser un número entero ≥ 1",
            equipo: { id: req.params.id, ...req.body },
            user: req.user
          });
        }
        fields.push("limite_miembros = ?");
        params.push(limiteUp);
      }

      if (premium != null) {
        fields.push("premium = ?");
        params.push(premium === "on" ? 1 : 0);
      }

      if (req.file) {
        const fotoPath = '/uploads/' + req.file.filename;
        fields.push("foto = ?");
        params.push(fotoPath);
      }

      if (fields.length === 0) {
        return res.redirect(`/teams/${req.params.id}/edit`);
      }

      params.push(req.params.id);
      const sql = `UPDATE equipos SET ${fields.join(", ")} WHERE id = ?`;
      await pool.query(sql, params);

      req.session.flash = 'Equipo actualizado con éxito';
      res.redirect(`/teams/${req.params.id}`);
    } catch (err) {
      next(err);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      await pool.query("DELETE FROM equipos WHERE id = ?", [req.params.id]);
      req.session.flash = 'Equipo eliminado con éxito';
      res.redirect("/teams");
    } catch (err) {
      next(err);
    }
  });

  return router;
};
