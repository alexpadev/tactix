require('dotenv').config();
const mariadb = require('mariadb');
const fs = require('fs');
const path = require('path');

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PSWD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
});

async function runDown() {
  let conn;
  try {
    conn = await pool.getConnection();
    const parentDir = path.resolve(__dirname, '..');
    const files = fs.readdirSync(parentDir)
      .filter(file => file.endsWith('.js') && !file.startsWith('_'))
      .sort()
      .reverse();

    for (const file of files) {
      const modulePath = path.join(parentDir, file);
      try {
        const seeder = require(modulePath);
        if (typeof seeder.down === 'function') {
          console.log(`🔄 Ejecutando down: ${file}...`);
          await seeder.down(conn);
          console.log(`✅ Borrado completado: ${file}`);
        } else {
          console.warn(`⚠️  Saltando ${file}: no tiene función "down"`);
        }
      } catch (modErr) {
        console.error(`❌ Error al procesar ${file}:`, modErr.message);
      }
    }
  } catch (err) {
    console.error('❌ Error general al ejecutar down seeders:', err);
  } finally {
    if (conn) conn.release();
    await pool.end();
    process.exit();
  }
}

runDown();
