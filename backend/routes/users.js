const express = require("express");
const bcrypt = require('bcrypt');
const authenticateJWT = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = file.fieldname + '-' + Date.now() + ext;
    cb(null, name);
  }
});

const upload = multer({ storage });

module.exports = (pool) => {
  const router = express.Router();

  router.use(authenticateJWT);

  router.get("/", async (req, res, next) => {
    try {
      const { q = "", sort = "asc", page = "1", limit = "10" } = req.query;
      const params = [];
      let where = "";

      if (q) {
        where = `
          WHERE u.nombre LIKE ?
            OR u.email LIKE ?
            OR u.id LIKE ?
        `;
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }

      const countSql = `SELECT COUNT(*) AS cnt FROM usuarios u ${where}`;
      const countRows = await pool.query(countSql, params);
      const totalCount = Number(countRows[0]?.cnt || 0);

      const parsedLimit = Math.max(1, parseInt(limit, 10) || 10);
      const totalPages  = Math.max(1, Math.ceil(totalCount / parsedLimit));
      const parsedPage  = Math.max(1, Math.min(parseInt(page, 10) || 1, totalPages));

      const offset = (parsedPage - 1) * parsedLimit;
      const order = sort.toLowerCase() === "desc" ? "DESC" : "ASC";

      const sql = `
        SELECT 
          u.*,
          e.nombre AS equipo_nombre
        FROM usuarios u
        LEFT JOIN equipos e ON u.equip_id = e.id
        ${where}
        ORDER BY u.nombre ${order}
        LIMIT ? OFFSET ?
      `;
      const dataParams = params.concat([parsedLimit, offset]);
      const usuarios = await pool.query(sql, dataParams);

      res.render("users/index", {
        usuarios,
        q,
        sort,
        currentPage: parsedPage,
        totalPages
      });

    } catch (err) {
      next(err);
    }
  });

  router.get("/new", (req, res) => {
    res.render("users/new", { 
      user: req.user,
      error: null    
    });
  });

  router.post("/", upload.single('foto'), async (req, res, next) => {
    try {
      const { nombre, email, password, fecha_nacimiento, rol } = req.body;
      if (!nombre || !email || !password || !fecha_nacimiento || !rol) {
        return res.render("users/new", {
          error: "Todos los campos son obligatorios",
          user: req.user
        });
      }

      const hash = await bcrypt.hash(password, 10);

      let fotoPath = '';
      if (req.file) {
        fotoPath = '/uploads/' + req.file.filename;
      }

      await pool.query(
        `INSERT INTO usuarios 
          (nombre, email, contraseña, foto, fecha_nacimiento, rol)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nombre, email, hash, fotoPath, fecha_nacimiento, rol]
      );

      req.session.flash = 'Usuario creado con éxito';
      res.redirect("/users");
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const sql = `
        SELECT 
          u.*,
          e.nombre AS equipo_nombre
        FROM usuarios u
        LEFT JOIN equipos e
          ON u.equip_id = e.id
        WHERE u.id = ?
      `;
      const rows = await pool.query(sql, [req.params.id]);
      const usuario = rows[0];
      if (!usuario) return res.status(404).render("errors/404");

      res.render("users/show", { usuario, user: req.user });
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id/edit", async (req, res, next) => {
    try {
      const usuarioRows = await pool.query("SELECT * FROM usuarios WHERE id = ?", [req.params.id]);
      const usuario = usuarioRows[0];
      if (!usuario) return res.status(404).render("errors/404");
      res.render("users/edit", { usuario, user: req.user });
    } catch (err) {
      next(err);
    }
  });

  router.put("/:id", upload.single('foto'), async (req, res, next) => {
    try {
      const { nombre, email, contraseña, fecha_nacimiento, rol } = req.body;
      let hash = null;
      if (contraseña) {
        hash = await bcrypt.hash(contraseña, 10);
      }

      let fotoPath = null;
      if (req.file) {
        fotoPath = '/uploads/' + req.file.filename;
      }

      const fields = [];
      const paramsUpdate = [];
      if (nombre)            { fields.push("nombre = ?");           paramsUpdate.push(nombre); }
      if (email)             { fields.push("email = ?");            paramsUpdate.push(email); }
      if (hash)              { fields.push("contraseña = ?");       paramsUpdate.push(hash); }
      if (fotoPath !== null) { fields.push("foto = ?");             paramsUpdate.push(fotoPath); }
      if (fecha_nacimiento)  { fields.push("fecha_nacimiento = ?"); paramsUpdate.push(fecha_nacimiento); }
      if (rol)               { fields.push("rol = ?");              paramsUpdate.push(rol); }
      paramsUpdate.push(req.params.id);

      await pool.query(
        `UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`,
        paramsUpdate
      );

      req.session.flash = 'Usuario actualizado con éxito';
      res.redirect(`/users/${req.params.id}`);
    } catch (err) {
      next(err);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      await pool.query("DELETE FROM usuarios WHERE id = ?", [req.params.id]);
      
      req.session.flash = 'Usuario eliminado con éxito'
      res.redirect("/users");
    } catch (err) {
      next(err);
    }
  });

  return router;
};
