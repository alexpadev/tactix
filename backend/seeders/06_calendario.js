module.exports = {
  up: async (db) => {
    await db.query(`
      INSERT INTO calendario (equipo_id, titulo, descripcion, fecha_inicio, fecha_fin, creado_por) VALUES
        ((SELECT id FROM equipos WHERE nombre='Straw Hat Pirates'),
         'Entrenamiento de esgrima',
         'Práctica de maniobras con la espada',
         '2025-06-01 10:00:00',
         '2025-06-01 12:00:00',
         (SELECT id FROM usuarios WHERE nombre='Roronoa Zoro')),
        ((SELECT id FROM equipos WHERE nombre='Heart Pirates'),
         'Reunión estratégica',
         'Planificación de la próxima misión',
         '2025-06-03 14:00:00',
         '2025-06-03 15:30:00',
         (SELECT id FROM usuarios WHERE nombre='Trafalgar D Water Law'));
    `);
  },
  down: async (db) => {
    await db.query(`
      DELETE FROM calendario;
    `);
  }
};
