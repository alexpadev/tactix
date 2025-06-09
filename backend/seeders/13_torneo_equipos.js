module.exports = {
  up: async (db) => {
    await db.query(`
      INSERT INTO torneo_equipos (torneo_id, equipo_id, aprobado, fecha_join) VALUES
        ((SELECT id FROM torneos WHERE nombre='Grand Line Cup'),(SELECT id FROM equipos WHERE nombre='Straw Hat Pirates'),1,NOW()),
        ((SELECT id FROM torneos WHERE nombre='Grand Line Cup'),(SELECT id FROM equipos WHERE nombre='Heart Pirates'),1,NOW());
    `);
  },
  down: async (db) => {
    await db.query(`
      DELETE te
      FROM torneo_equipos te
      JOIN torneos t ON te.torneo_id=t.id;
    `);
  }
};
