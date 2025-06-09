const bcrypt = require('bcrypt');

module.exports = {
  up: async (db) => {
    const characters = [
      "Monkey D Luffy", "Roronoa Zoro", "Nami", "Usopp", "Sanji", "Tony Tony Chopper",
      "Nico Robin", "Franky", "Brook", "Jinbe", "Portgas D. Ace", "Sabo",
      "Shanks", "Marshall D. Teach", "Dracule Mihawk", "Boa Hancock", "Trafalgar D. Water Law",
      "Eustass Kid", "Charlotte Linlin", "Kaido", "Edward Newgate", "Gol D. Roger",
      "Silvers Rayleigh", "Donquixote Doflamingo", "Crocodile", "Magellan", "Enel",
      "Bartholomew Kuma", "Jewelry Bonney", "Trafalgar Law", "Kuzan", "Sengoku",
      "Smoker", "Tashigi", "Buggy", "Perona", "X Drake", "Basil Hawkins",
      "Capone Bege", "Charlotte Katakuri", "Charlotte Cracker", "Charlotte Smoothie",
      "Charlotte Oven", "Marco", "Vista", "Jozu", "Kizaru", "Aokiji",
      "Akainu", "Dr. Hogback", "Kaku", "Mr. 2 Bon Clay", "Vinsmoke Sanji",
      "Vinsmoke Reiju", "Vinsmoke Ichiji", "Vinsmoke Niji", "Vinsmoke Yonji",
      "Carrot", "Pell", "Pedro", "Kinemon", "Raizo", "Kanjuro", "Oden Kozuki",
      "Shirahoshi", "Fujitora", "Ryokugyu", "Sentomaru", "Iceburg",
      "Coby", "Helmeppo", "Kaya", "Bell-mere", "Koala", "Hina",
      "Dr. Vegapunk", "Tsuru", "T-Bone", "Dalmatian", "Fullbody", "Mr. 5",
      "Mr. 9", "Miss Valentine", "Miss Wednesday", "Mohji", "Cabaji", "Galdino",
      "Hatchan", "Arlong", "Kuro", "Gin", "Alvida", "Don Krieg",
      "Igaram", "Jaguar D. Saul", "Curly Dadan", "Shakuyaku", "Bentham",
      "Blamenco", "Mad Monk Urouge", "Jesus Burgess", "Van Augur", "Lafitte",
      "Enero", "Sicilian", "Avalo Pizarro", "Whos-Who", "Black Maria",
      "Sasaki", "King", "Queen", "Jack", "Ulti", "Page One", "Perospero",
      "Ashura Doji", "Kiku", "Hiyori Kozuki", "Kamazou", "Saldeath",
      "Shiliew", "Coldman", "Moria", "Oars Jr.", "Absalom", "Lao G",
      "Baroque Works Agent", "Mr. 1 Daz Bones", "Mr. 3 Galdino",
      "Nezumi", "Mr. 13", "Mr. 4", "Miss Merry Christmas", "Miss Goldenweek",
      "Mr. 7", "Miss Fathers Day", "Stansen", "Don Chinjao", "Foxy",
      "Drogo", "Kappa", "Giant Hunter Dalton", "Salome", "Marines Vice Admiral Onigumo",
      "Catarina Devon", "Hack", "Berry Good", "Borsalino", "Inebriate Judge", "Gotti",
      "Bepo"
    ];
    const hash = await bcrypt.hash('a', 10);
    const values = characters.map((name, i) => {
      const cleanName = name.replace(/[\(\)'’]/g, '').replace(/[^a-zA-Z0-9 ]/g, '');
      let local = cleanName.toLowerCase().split(/\s+/).slice(0, 3).join('.');
      if (local.length > 50) local = local.slice(0, 50);
      const email = `${local}${i + 1}@one.piece`;
      const foto = "/uploads/default-user.jpg";
      const birth = `199${i % 10}-01-0${(i % 9) + 1}`;
      // const rol = 'user';
      const rol = ["Monkey D Luffy", "Roronoa Zoro", "Nami"].includes(name) ? 'admin' : 'user';
      return `('${cleanName}', '${email}', '${hash}', '${foto}', '${birth}', '${rol}', NULL)`;
    }).join(',\n        ');
    await db.query(`
      INSERT INTO usuarios
        (nombre, email, contraseña, foto, fecha_nacimiento, rol, equip_id)
      VALUES
        ${values};
    `);
  },
  down: async (db) => {
    await db.query(`
      DELETE ev
      FROM estadisticas_votos AS ev
      JOIN estadisticas AS e ON ev.estadistica_id = e.id
      WHERE e.jugador_id IN (SELECT id FROM usuarios);
    `);
    await db.query(`
      DELETE FROM estadisticas
      WHERE jugador_id IN (SELECT id FROM usuarios);
    `);
    await db.query(`
      DELETE re
      FROM respuestas_encuesta AS re
      JOIN usuarios AS u ON re.usuario_id = u.id;
    `);
    await db.query(`
      DELETE FROM usuarios;
    `);
  }
};
