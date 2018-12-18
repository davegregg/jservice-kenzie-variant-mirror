export const games = {
  async get(ctx, pool) {
    const result = await pool.query('SELECT * FROM games');
    const rows = result.rows.map(row => ({
      id: row.id,
      episodeId: row.episode_id,
      aired: row.aired,
      canon: true
    }));
    ctx.body = rows;  
  }
};