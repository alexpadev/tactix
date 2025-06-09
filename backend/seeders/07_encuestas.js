module.exports = {
  up: async (db) => {
    await db.query(`
      INSERT INTO encuestas (pregunta, equipo_id, creado_por, creado_en) VALUES
        ('¿Quién es el mejor capitán?',(SELECT id FROM equipos WHERE nombre='Straw Hat Pirates'),(SELECT id FROM usuarios WHERE nombre='Nami'),NOW()),
        ('¿Cuál es nuestro próximo destino?',(SELECT id FROM equipos WHERE nombre='Heart Pirates'),(SELECT id FROM usuarios WHERE nombre='Bepo'),NOW());
    `);
  },
  down: async (db) => {
    await db.query(`
      DELETE FROM encuestas;
    `);
  }
};
