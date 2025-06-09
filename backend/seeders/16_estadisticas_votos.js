module.exports = {
  up: async (db) => {
    await db.query(`
      INSERT INTO estadisticas_votos (partido_id, estadistica_id, usuario_id, valido) VALUES
        ((SELECT p.id FROM partidos p JOIN equipos e1 ON p.equipo1_id=e1.id AND e1.nombre='Straw Hat Pirates' JOIN equipos e2 ON p.equipo2_id=e2.id AND e2.nombre='Blackbeard Pirates' LIMIT 1),(SELECT id FROM estadisticas WHERE tipo='assist' AND partido_id=(SELECT p2.id FROM partidos p2 JOIN equipos e3 ON p2.equipo1_id=e3.id AND e3.nombre='Straw Hat Pirates' JOIN equipos e4 ON p2.equipo2_id=e4.id AND e4.nombre='Blackbeard Pirates' LIMIT 1) LIMIT 1),(SELECT id FROM usuarios WHERE nombre='Nami'),1);
    `);
  },
  down: async (db) => {
    await db.query(`
      DELETE ev
      FROM estadisticas_votos ev
      JOIN estadisticas e ON ev.estadistica_id=e.id;
    `);
  }
};
