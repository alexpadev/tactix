const jwt = require('jsonwebtoken');

function authenticateJWT(req, res, next) {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    if (req.originalUrl.startsWith('/api')) { 
      return res.status(401).json({ message: 'No autenticado' });
    } else {
      console.log('Redirigiendo a login');
      return res.redirect('/login');
    }
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    if (req.user.rol != "admin" && !req.originalUrl.startsWith('/api')) {
      return res.status(403).json({ message: 'No tienes permisos para acceder al backoffice' });
    }
    next();
  } catch (err) {
    console.error(err)
    if (req.originalUrl.startsWith('/api')) {
      return res.status(401).json({ message: 'Token inválido' });
    } else {
      return res.redirect('/login');
    }
  }
}

module.exports = authenticateJWT;