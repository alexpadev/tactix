module.exports = {
  up: async (db) => {
    await db.query(`
      INSERT INTO estadisticas (partido_id, jugador_id, timestamp, tipo) VALUES
        ((SELECT p.id FROM partidos p JOIN equipos e1 ON p.equipo1_id=e1.id AND e1.nombre='Straw Hat Pirates' JOIN equipos e2 ON p.equipo2_id=e2.id AND e2.nombre='Blackbeard Pirates' LIMIT 1),(SELECT id FROM usuarios WHERE nombre='Monkey D Luffy'),CURRENT_TIMESTAMP,'assist');
    `);
  },
  down: async (db) => {
    await db.query(`
      DELETE ev
      FROM estadisticas_votos ev
      JOIN estadisticas e ON ev.estadistica_id=e.id;
    `);
    await db.query(`
      DELETE FROM estadisticas;
    `);
  }
};
