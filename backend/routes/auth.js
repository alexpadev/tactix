const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require("dotenv").config();

module.exports = (pool) => {
  const router = express.Router();
  
  router.get("/login", (req, res) => {
    res.render("login");
  });
  
  router.post("/login", async (req, res, next) => {
    const { email, password } = req.body;
    try {
      const rows = await pool.query("SELECT id, nombre, email, contraseña, rol FROM usuarios WHERE email = ?", [email]);
      const user = rows[0];
      if (!user) {
        console.log(email, password)
        return res.status(401).render("login", { error: "Credenciales inválidas" });
      }

      const match = await bcrypt.compare(password, user.contraseña);
      if (!match) {
        console.log(email, password)
        return res.status(401).render("login", { error: "Credenciales inválidas" });
      }

      if (user.rol !== "admin") {
        return res.status(403).render("login", { error: "Acceso denegado: solo administradores" });
      }

      const payload = {
        id: user.id,
        email: user.email,
        rol: user.rol
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 3600000 
      });

      res.redirect("/");

    } catch (err) {
      next(err);
    }
  });

  router.post("/logout", (req, res) => {
    res.clearCookie("token");
    res.redirect("/");
  });

  return router;
};
