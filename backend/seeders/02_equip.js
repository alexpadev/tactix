const teams = [
  { nombre: 'Straw Hat Pirates', premium: 1 },
  { nombre: 'Blackbeard Pirates', premium: 0 },
  { nombre: 'Whitebeard Pirates', premium: 0 },
  { nombre: 'Red Hair Pirates', premium: 0 },
  { nombre: 'Heart Pirates', premium: 0 },
  { nombre: 'Roger Pirates', premium: 0 },
  { nombre: 'Revolutionary Army', premium: 1 },
  { nombre: 'Marines (Navy)', premium: 0 },
  { nombre: 'World Government', premium: 0 }
];
module.exports = {
  up: async (db) => {
    const values = teams
      .map(t => `('${t.nombre}', 15, ${t.premium}, "/uploads/default-team.png", 0)`)
      .join(",\n      ");
    await db.query(`
      INSERT INTO equipos (nombre, limite_miembros, premium, foto, hidden) VALUES
        ${values};
    `);
  },
  down: async (db) => {
    const namesList = teams.map(t => `'${t.nombre}'`).join(', ');
    await db.query(`
      DELETE ev
      FROM estadisticas_votos AS ev
      JOIN estadisticas   AS e  ON ev.estadistica_id = e.id
      JOIN partidos       AS p  ON e.partido_id      = p.id
      WHERE p.equipo1_id IN (SELECT id FROM equipos WHERE nombre IN (${namesList}))
         OR p.equipo2_id IN (SELECT id FROM equipos WHERE nombre IN (${namesList}));
    `);
    await db.query(`
      DELETE e
      FROM estadisticas AS e
      JOIN partidos     AS p ON e.partido_id = p.id
      WHERE p.equipo1_id IN (SELECT id FROM equipos WHERE nombre IN (${namesList}))
         OR p.equipo2_id IN (SELECT id FROM equipos WHERE nombre IN (${namesList}));
    `);
    await db.query(`
      DELETE p
      FROM partidos AS p
      WHERE p.equipo1_id IN (SELECT id FROM equipos WHERE nombre IN (${namesList}))
         OR p.equipo2_id IN (SELECT id FROM equipos WHERE nombre IN (${namesList}));
    `);
    await db.query(`
      DELETE FROM equipos;
    `);
  }
};
