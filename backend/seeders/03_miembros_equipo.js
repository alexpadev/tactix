// 03_miembros_equipo.js

module.exports = {
  up: async (db) => {
    await db.query(`
      INSERT INTO miembros_equipo (equipo_id, usuario_id, titulo, fecha_entrada, activo) VALUES
        ((SELECT id FROM equipos WHERE nombre='Straw Hat Pirates'), (SELECT id FROM usuarios WHERE nombre='Monkey D Luffy'), 'capitan', CURRENT_TIMESTAMP, 1),
        ((SELECT id FROM equipos WHERE nombre='Straw Hat Pirates'), (SELECT id FROM usuarios WHERE nombre='Roronoa Zoro'), 'jugador', CURRENT_TIMESTAMP, 1),
        ((SELECT id FROM equipos WHERE nombre='Straw Hat Pirates'), (SELECT id FROM usuarios WHERE nombre='Nami'), 'jugador', CURRENT_TIMESTAMP, 1),
        ((SELECT id FROM equipos WHERE nombre='Straw Hat Pirates'), (SELECT id FROM usuarios WHERE nombre='Usopp'), 'jugador', CURRENT_TIMESTAMP, 1),
        ((SELECT id FROM equipos WHERE nombre='Straw Hat Pirates'), (SELECT id FROM usuarios WHERE nombre='Sanji'), 'jugador', CURRENT_TIMESTAMP, 1),
        ((SELECT id FROM equipos WHERE nombre='Straw Hat Pirates'), (SELECT id FROM usuarios WHERE nombre='Tony Tony Chopper'), 'jugador', CURRENT_TIMESTAMP, 1),
        ((SELECT id FROM equipos WHERE nombre='Straw Hat Pirates'), (SELECT id FROM usuarios WHERE nombre='Nico Robin'), 'jugador', CURRENT_TIMESTAMP, 1),
        ((SELECT id FROM equipos WHERE nombre='Straw Hat Pirates'), (SELECT id FROM usuarios WHERE nombre='Franky'), 'jugador', CURRENT_TIMESTAMP, 1),
        ((SELECT id FROM equipos WHERE nombre='Straw Hat Pirates'), (SELECT id FROM usuarios WHERE nombre='Brook'), 'jugador', CURRENT_TIMESTAMP, 1),
        ((SELECT id FROM equipos WHERE nombre='Straw Hat Pirates'), (SELECT id FROM usuarios WHERE nombre='Jinbe'), 'jugador', CURRENT_TIMESTAMP, 1),

        ((SELECT id FROM equipos WHERE nombre='Blackbeard Pirates'), (SELECT id FROM usuarios WHERE nombre='Marshall D Teach'), 'capitan', CURRENT_TIMESTAMP, 1),
        ((SELECT id FROM equipos WHERE nombre='Blackbeard Pirates'), (SELECT id FROM usuarios WHERE nombre='Jesus Burgess'), 'jugador', CURRENT_TIMESTAMP, 1),
        ((SELECT id FROM equipos WHERE nombre='Blackbeard Pirates'), (SELECT id FROM usuarios WHERE nombre='Van Augur'), 'jugador', CURRENT_TIMESTAMP, 1),
        ((SELECT id FROM equipos WHERE nombre='Blackbeard Pirates'), (SELECT id FROM usuarios WHERE nombre='Lafitte'), 'jugador', CURRENT_TIMESTAMP, 1),

        ((SELECT id FROM equipos WHERE nombre='Whitebeard Pirates'), (SELECT id FROM usuarios WHERE nombre='Edward Newgate'), 'capitan', CURRENT_TIMESTAMP, 1),
        ((SELECT id FROM equipos WHERE nombre='Whitebeard Pirates'), (SELECT id FROM usuarios WHERE nombre='Jozu'), 'jugador', CURRENT_TIMESTAMP, 1),
        ((SELECT id FROM equipos WHERE nombre='Whitebeard Pirates'), (SELECT id FROM usuarios WHERE nombre='Vista'), 'jugador', CURRENT_TIMESTAMP, 1),

        ((SELECT id FROM equipos WHERE nombre='Red Hair Pirates'), (SELECT id FROM usuarios WHERE nombre='Shanks'), 'capitan', CURRENT_TIMESTAMP, 1),
        ((SELECT id FROM equipos WHERE nombre='Red Hair Pirates'), (SELECT id FROM usuarios WHERE nombre='Buggy'), 'jugador', CURRENT_TIMESTAMP, 1),

        ((SELECT id FROM equipos WHERE nombre='Heart Pirates'), (SELECT id FROM usuarios WHERE nombre='Trafalgar D Water Law'), 'capitan', CURRENT_TIMESTAMP, 1),
        ((SELECT id FROM equipos WHERE nombre='Heart Pirates'), (SELECT id FROM usuarios WHERE nombre='Bepo'), 'jugador', CURRENT_TIMESTAMP, 1),

        ((SELECT id FROM equipos WHERE nombre='Roger Pirates'), (SELECT id FROM usuarios WHERE nombre='Gol D Roger'), 'capitan', CURRENT_TIMESTAMP, 1),
        ((SELECT id FROM equipos WHERE nombre='Roger Pirates'), (SELECT id FROM usuarios WHERE nombre='Silvers Rayleigh'), 'jugador', CURRENT_TIMESTAMP, 1),

        ((SELECT id FROM equipos WHERE nombre='Revolutionary Army'), (SELECT id FROM usuarios WHERE nombre='Sabo'), 'capitan', CURRENT_TIMESTAMP, 1),
        ((SELECT id FROM equipos WHERE nombre='Revolutionary Army'), (SELECT id FROM usuarios WHERE nombre='Koala'), 'jugador', CURRENT_TIMESTAMP, 1),
        ((SELECT id FROM equipos WHERE nombre='Revolutionary Army'), (SELECT id FROM usuarios WHERE nombre='Hack'), 'jugador', CURRENT_TIMESTAMP, 1),

        ((SELECT id FROM equipos WHERE nombre='Marines (Navy)'), (SELECT id FROM usuarios WHERE nombre='Smoker'), 'capitan', CURRENT_TIMESTAMP, 1),
        ((SELECT id FROM equipos WHERE nombre='Marines (Navy)'), (SELECT id FROM usuarios WHERE nombre='Kizaru'), 'jugador', CURRENT_TIMESTAMP, 1),
        ((SELECT id FROM equipos WHERE nombre='Marines (Navy)'), (SELECT id FROM usuarios WHERE nombre='Aokiji'), 'jugador', CURRENT_TIMESTAMP, 1),
        ((SELECT id FROM equipos WHERE nombre='Marines (Navy)'), (SELECT id FROM usuarios WHERE nombre='Akainu'), 'jugador', CURRENT_TIMESTAMP, 1),

        ((SELECT id FROM equipos WHERE nombre='World Government'), (SELECT id FROM usuarios WHERE nombre='Dr Vegapunk'), 'capitan', CURRENT_TIMESTAMP, 1),
        ((SELECT id FROM equipos WHERE nombre='World Government'), (SELECT id FROM usuarios WHERE nombre='Tsuru'), 'jugador', CURRENT_TIMESTAMP, 1),
        ((SELECT id FROM equipos WHERE nombre='World Government'), (SELECT id FROM usuarios WHERE nombre='Sentomaru'), 'jugador', CURRENT_TIMESTAMP, 1)
    `);
  },
  down: async (db) => {
    await db.query(`
      DELETE FROM miembros_equipo;
    `);
  }
};
