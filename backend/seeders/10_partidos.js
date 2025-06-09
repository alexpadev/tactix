module.exports = {
  up: async (db) => {
    await db.query(`
      INSERT INTO partidos (equipo1_id, equipo2_id, player_num, fecha_inicio, ubicacion_x, ubicacion_y, direccion) VALUES
        ((SELECT id FROM equipos WHERE nombre='Straw Hat Pirates'),(SELECT id FROM equipos WHERE nombre='Blackbeard Pirates'),11,'2025-06-10 16:00:00',40.712776,-74.005974,'CASA DEL ALEX'),
        ((SELECT id FROM equipos WHERE nombre='Heart Pirates'),(SELECT id FROM equipos WHERE nombre='Roger Pirates'),11,'2025-06-12 18:00:00',34.689487,135.526203,'CASA DEL PAU');
    `);
  },
  down: async (db) => {
    await db.query(`
      DELETE FROM partidos;
    `);
  }
};
