module.exports = {
  up: async (db) => {
    await db.query(`
      INSERT INTO anuncios (equipo_id, usuario_id, contenido) VALUES
        ((SELECT id FROM equipos WHERE nombre='Straw Hat Pirates'), (SELECT id FROM usuarios WHERE nombre='Monkey D Luffy'), '¡Reunión de tripulación a las 18:00 en cubierta!'),
        ((SELECT id FROM equipos WHERE nombre='Blackbeard Pirates'), (SELECT id FROM usuarios WHERE nombre='Marshall D. Teach'), 'Buscando nuevos tripulantes con gran ambición.');
    `);
  },
  down: async (db) => {
    await db.query(`
      DELETE FROM anuncios;
    `);
  }
};
