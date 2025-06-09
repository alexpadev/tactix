module.exports = {
  up: async (db) => {
    await db.query(`
      INSERT INTO opciones_encuesta (encuesta_id, texto) VALUES
        ((SELECT id FROM encuestas WHERE pregunta='¿Quién es el mejor capitán?'),'Monkey D Luffy'),
        ((SELECT id FROM encuestas WHERE pregunta='¿Quién es el mejor capitán?'),'Shanks'),
        ((SELECT id FROM encuestas WHERE pregunta='¿Cuál es nuestro próximo destino?'),'Grand Line'),
        ((SELECT id FROM encuestas WHERE pregunta='¿Cuál es nuestro próximo destino?'),'New World');
    `);
  },
  down: async (db) => {
    await db.query(`
      DELETE oe
      FROM opciones_encuesta oe
      JOIN encuestas e ON oe.encuesta_id=e.id;
    `);
  }
};
