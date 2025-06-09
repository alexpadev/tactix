module.exports = {
  up: async (db) => {
    await db.query(`
      INSERT INTO join_requests (equipo_id, usuario_id, creado_en) VALUES
        ((SELECT id FROM equipos WHERE nombre='Red Hair Pirates'),(SELECT id FROM usuarios WHERE nombre='Koala'),NOW()),
        ((SELECT id FROM equipos WHERE nombre='World Government'),(SELECT id FROM usuarios WHERE nombre='Sabo'),NOW());
    `);
  },
  down: async (db) => {
    await db.query(`
      DELETE FROM join_requests;
    `);
  }
};
