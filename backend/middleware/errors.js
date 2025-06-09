module.exports = (err, req, res, next) => {
    console.error(err);
  
    const status = err.status || 500;
    const message = err.message || 'Error interno del servidor';
  
    if (req.xhr || req.get('Accept')?.includes('application/json')) {
      return res.status(status).json({
        error: {
          message,
          ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
      });
    }
  
    res.status(status).render('error', {
      user: req.user,
      status,
      message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : null
    });
  };
  