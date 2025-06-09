const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authenticateJWT = require("../../middleware/auth");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `foto-${Date.now()}${ext}`);
  },
});
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png/;
  const okExt = allowed.test(path.extname(file.originalname).toLowerCase());
  const okMime = allowed.test(file.mimetype);
  if (okExt && okMime) cb(null, true);
  else cb(new Error("Sólo se permiten imágenes jpg/jpeg/png"));
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, 
});

module.exports = (pool) => {
  const validateEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePassword = (password) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/.test(password);

  router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password || !validateEmail(email)) {
      return res.status(400).json({ error: "Datos inválidos" });
    }

    try {
      const result = await pool.query(
        "SELECT * FROM usuarios WHERE email = ?",
        [email]
      );

      if (result.length === 0) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }

      const user = result[0];
      const isValid = await bcrypt.compare(password, user.contraseña);

      if (!isValid) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }

      const token = jwt.sign(
        { id: user.id, name: user.nombre, email: user.email, rol: user.rol },
        process.env.JWT_SECRET,
        { expiresIn: "2 days" }
      );

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
        })
        .json({
          token,
          user: { id: user.id, name: user.nombre, email: user.email, rol: user.rol },
        });
    } catch (err) {
      console.error("Error al iniciar sesión:", err);
      res.status(500).json({ error: "Error del servidor" });
    }
  });

  router.post("/register", upload.single("foto"), async (req, res) => {
    const { nombre, email, password, fecha_nacimiento } = req.body;
    const foto = req.file ? `/uploads/${req.file.filename}` : null;

    if (
      !nombre ||
      !email ||
      !password ||
      !fecha_nacimiento ||
      !validateEmail(email) ||
      !validatePassword(password)
    ) {
      return res.status(400).json({
        error:
          "Datos inválidos. Asegúrate de que el email sea válido y la contraseña tenga al menos 8 caracteres, incluyendo mayúsculas, minúsculas y números.",
      });
    }

    try {
      const existingUser = await pool.query(
        "SELECT * FROM usuarios WHERE nombre = ? OR email = ?",
        [nombre, email]
      );

      if (existingUser.length > 0) {
        return res.status(400).json({ error: "El usuario o email ya existe" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await pool.query(
        "INSERT INTO usuarios (nombre, email, `contraseña`, foto, fecha_nacimiento, rol) VALUES (?, ?, ?, ?, ?, ?)",
        [
          nombre.trim(),
          email.toLowerCase().trim(),
          hashedPassword,
          foto,
          fecha_nacimiento,
          "user",
        ]
      );

      const userId = Number(result.insertId);

      const token = jwt.sign(
        { id: userId, name: nombre, rol: "user", email: email },
        process.env.JWT_SECRET,
        { expiresIn: "2 days" }
      );

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
        })
        .json({
          token,
          user: { id: userId, name: nombre, email: email, rol: "user" },
        });
    } catch (err) {
      console.error("Error de registro:", err);
      res.status(500).json({ error: "Error del servidor" });
    }
  });

  router.get("/my", authenticateJWT, async (req, res) => {
    const userId = req.user.id;

    try {
      const result = await pool.query(
        "SELECT foto, nombre, email, rol FROM usuarios WHERE id = ?",
        [userId]
      );

      if (result.length === 0) {
        return res.status(401).json({ error: "Usuario no encontrado" });
      }

      const user = result[0];
      res.json({ avatar: user.foto, nombre: user.nombre, email: user.email, rol: user.rol });
    } catch (err) {
      console.error("Error al obtener datos del usuario:", err);
      res.status(500).json({ error: "Error del servidor" });
    }
  });

  return router;
};
