const express = require('express');
const multer  = require('multer');
const path    = require('path');
const router  = express.Router();

const MAX_SIZE = 4 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const name = `${Date.now()}_${file.originalname}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE }
});

router.post(
  '/',
  (req, res, next) => {
    upload.single('file')(req, res, err => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res
            .status(413)
            .json({ error: 'El archivo supera el tamaño máximo de 4 MB.' });
        }
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No hay fichero.' });
    }
    const url = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
    res.json({
      filename: file.originalname,
      url,
      filesize: file.size
    });
  }
);

module.exports = () => router;
