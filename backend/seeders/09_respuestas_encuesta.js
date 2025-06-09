module.exports = {
  up: async (db) => {
    await db.query(`
      INSERT INTO respuestas_encuesta (encuesta_id, usuario_id, respuesta) VALUES
        ((SELECT id FROM encuestas WHERE pregunta='¿Quién es el mejor capitán?'),(SELECT id FROM usuarios WHERE nombre='Brook'),'Monkey D Luffy'),
        ((SELECT id FROM encuestas WHERE pregunta='¿Cuál es nuestro próximo destino?'),(SELECT id FROM usuarios WHERE nombre='Bepo'),'New World');
    `);
  },
  down: async (db) => {
    await db.query(`
      DELETE FROM respuestas_encuesta;
    `);
  }
};
