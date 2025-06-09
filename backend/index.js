require("dotenv").config();
const express = require("express");
const path = require("path");
const mariadb = require("mariadb");
const cookieParser = require("cookie-parser");
const methodOverride = require("method-override");
const errorHandler = require('./middleware/errors');
const ChatServer = require('./chat/chat');
const mongoose = require('mongoose');
const jwt = require("jsonwebtoken");
const cors = require("cors");
const session = require('express-session');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride("_method"));

app.use(session({
  secret: 'tu_clave_secreta_aqui',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60000 }
}));

app.use((req, res, next) => {
  res.locals.success = req.session.flash;
  delete req.session.flash;
  next();
});

app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:8000"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
}));

app.use((req, res, next) => {
  let user = null;
  const token = req.cookies.token;
  if (token) {
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.error("Error al verificar el token:", err);
      user = null;
      if (err.name === 'TokenExpiredError') {
        console.warn("Token expirado, redirigiendo o pidiendo nuevo login");
        res.clearCookie('token');
      }
    }
  }
  res.locals.user = user;
  next();
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "static", "views"));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const pool = mariadb.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  user:     process.env.DB_USER,
  password: process.env.DB_PSWD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
  connectTimeout: 3000,
  acquireTimeout: 3000,
});

const MONGODB_URI = process.env.MONGODB_URI;

app.use("/",       require("./routes/auth")(pool));
app.use("/users",  require("./routes/users")(pool));
app.use("/teams",  require("./routes/teams")(pool));
app.use("/games",  require("./routes/games")(pool));
app.use("/tournaments",  require("./routes/tournaments")(pool));

app.use("/api/auth",       require("./routes/api/auth")(pool));
app.use("/api/users",      require("./routes/api/users")(pool));
app.use("/api/files",      require("./routes/api/files")(pool));
app.use('/api/games',      require('./routes/api/games')(pool));
app.use("/api/tournaments",  require("./routes/api/tournaments")(pool));
app.use('/api/statistics', require('./routes/api/statistics')(pool));

const { router: geocodeRouter } = require('./routes/api/geocode');
app.use('/api/geocode', geocodeRouter);


app.get("/", (req, res) => {
  res.render("home", { user: res.locals.user });
});

app.use(errorHandler);

async function startServer() {
  let websocket;
  try {
    websocket = new ChatServer({ host: 'localhost', port: 8080 });
    console.log("🟢 Websocket server started on ws://localhost:8080");
  } catch (err) {
    console.error("❌ Error starting WebSocket:", err);
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Conectado a MongoDB");
  } catch (err) {
    console.error("❌ Error conectando a MongoDB:", err);
    process.exit(1);
  }

  let conn;
  try {
    conn = await pool.getConnection();
    console.log("✅ Conectado a MariaDB");

    app.use("/api/teams", require("./routes/api/teams")(pool, websocket));
    app.use("/api/chats", require("./routes/api/chats")(pool, websocket));
    app.use("/api/profile", require("./routes/api/profile")(pool, websocket));
    app.use('/api/notifications', require('./routes/api/notifications')(pool, websocket));
    

    const PORT = process.env.PORT;
    app.listen(PORT, () => {
      console.log(`🌐 Servidor escuchando en http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error("❌ Error conectando a MariaDB:", err);
    process.exit(1);
  } finally {
    if (conn) conn.release();
  }
}

startServer();
