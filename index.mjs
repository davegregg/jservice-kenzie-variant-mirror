import Koa from 'koa';
import parser from 'koa-bodyparser';
import route from 'koa-route';
import pg from 'pg';

const app = new Koa();
const pool = new pg.Pool({
  connectionString: 'postgresql://jservice:jservice@localhost:5432/jservice',
});

app.use(parser());

app.use(route.get('/api/categories', async ctx => {
  const result = await pool.query('SELECT * FROM categories');
  ctx.body = result.rows;
}));

app.use(route.get('/api/categories/:id', async (ctx, id) => {
  const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
  ctx.body = result.rows;
}));

app.use(route.post('/api/categories', async (ctx) => {
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
}));

app.use(route.get('/api/clues', async ctx => {
  const offset = ctx.query.offset || 0;
  const category = ctx.query.category || 0;
  const value = ctx.query.value || 0;

  const params = [offset];
  let wheres = [];
  if (category) {
    params.push(category);
    wheres.push('AND category_id = $2');
  }
  if (value) {
    params.push(value);
    wheres.push(`AND value = $${params.length}`)
  }
  const cluesResult = await pool.query(`
    SELECT clues.id, clues.answer, clues.question, clues.value, clues.category_id, clues.invalid_count
         , categories.title
    FROM clues
    JOIN categories ON(clues.category_id = categories.id)
    WHERE clues.id IS NOT NULL
    ${wheres.join('\n')}
    ORDER BY clues.id LIMIT 100 OFFSET $1
  `, params);
  ctx.body = cluesResult.rows.map(row => ({
    id: row.id,
    answer: row.answer,
    question: row.question,
    value: row.value,
    category_id: row.category_id,
    invalid_count: row.invalid_count,
    category: {
      id: row.category_id,
      title: row.title
    }
  }));
}));

app.use(route.get('/api/clues/:id', async (ctx, id) => {
  const result = await pool.query(`
    SELECT clues.id, clues.answer, clues.question, clues.value, clues.category_id, clues.invalid_count
      , categories.title
    FROM clues
    JOIN categories ON(clues.category_id = categories.id)
    WHERE clues.id = $1
  `, [id]);
  const row = result.rows[0];
  ctx.body = {
    id: row.id,
    answer: row.answer,
    question: row.question,
    value: row.value,
    category_id: row.category_id,
    invalid_count: row.invalid_count,
    category: {
      id: row.category_id,
      title: row.title
    }
  };
}));

app.use(route.post('/api/clues', async (ctx, id) => {
  const { answer, question, value, category_id } = ctx.request.body;
  if (answer && question && value && category_id) {
    try {
      const insertResult = await pool.query(`
        INSERT INTO clues(id, answer, question, value, category_id, invalid_count)
        VALUES ((SELECT MAX(id) + 1 FROM clues), $1, $2, $3, $4, null)
        RETURNING id
      `, [answer, question, value, category_id]);
      const categoryResult = await pool.query('SELECT title FROM categories WHERE id = $1', [category_id]);
      ctx.body = {
        id: insertResult.rows[0].id,
        answer,
        question,
        value,
        category_id,
        category: {
          id: category_id,
          title: categoryResult.rows[0].title
        }
      };
    } catch (e) {
      ctx.status = 400;
      ctx.body = {
        message: 'You provided an invalid category_id value.'
      };
    }
  } else {
    ctx.status = 400;
    ctx.body = {
      message: 'You must supply an answer, question, value, and category_id'
    };
  }
}));

app.listen(8182);
