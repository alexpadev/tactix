module.exports = {
  up: async (db) => {
    await db.query(`
      INSERT INTO torneo_partidos (torneo_id, ronda, equipo1_id, equipo2_id, fecha_program, created_at, updated_at) VALUES
        ((SELECT id FROM torneos WHERE nombre='Grand Line Cup'),1,(SELECT id FROM equipos WHERE nombre='Straw Hat Pirates'),(SELECT id FROM equipos WHERE nombre='Heart Pirates'),'2025-07-02 15:00:00',NOW(),NOW());
    `);
  },
  down: async (db) => {
    await db.query(`
      DELETE tp
      FROM torneo_partidos tp
      JOIN torneos t ON tp.torneo_id=t.id;
    `);
  }
};
