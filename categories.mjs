export const categories = {
  async get(ctx, pool) {
    const result = await pool.query('SELECT * FROM categories');
    ctx.body = result.rows;  
  },
  async getOne(ctx, id, pool) {
    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    if (result.rows.length) {
      ctx.body = result.rows[0];
    } else {
      ctx.status = 404;
      ctx.body = { message: 'That category does not exist.' };
    }
  },
  async post(ctx, pool) {
    try {
      const { title } = ctx.request.body;
  
      if (title) {
        const result = await pool.query('INSERT INTO categories (id, title) VALUES ((SELECT MAX(id) + 1 FROM categories), $1) RETURNING id', [title]);
        ctx.body = {
          id: result.rows[0].id,
          title
        };
      } else {
        ctx.status = 400;
        ctx.body = { message: 'You must supply a title.' };
      }
    } catch (e) {
      ctx.status = 409;
      ctx.body = { message: 'That category already exists.' };
    }  
  }
};
