module.exports = {
  up: async (db) => {
    const rows = await db.query(`
      SELECT equipo_id, usuario_id
      FROM miembros_equipo
      WHERE activo = 1;
    `);
    if (rows.length === 0) return;
    for (const r of rows) {
      await db.query(
        'UPDATE usuarios SET equip_id = ? WHERE id = ?',
        [r.equipo_id, r.usuario_id]
      );
    }
  },
  down: async (db) => {
    await db.query(`UPDATE usuarios SET equip_id = NULL;`);
  }
};
