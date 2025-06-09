module.exports = {
  up: async (db) => {
    await db.query(`
      INSERT INTO torneos (nombre, descripcion, max_equipos, estado, fecha, ubicacion_x, ubicacion_y, creado_por, direccion) VALUES
        ('Grand Line Cup','Torneo anual de la Grand Line',8,'abierto','2025-07-01 09:00:00',20.593684,78.962880,(SELECT id FROM usuarios WHERE nombre='Monkey D Luffy'),'CASA DEL MARC');
    `);
  },
  down: async (db) => {
    await db.query(`
      DELETE FROM torneos;
    `);
  }
};
