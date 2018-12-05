import Koa from 'koa';
import parser from 'koa-bodyparser';
import route from 'koa-route';
import pg from 'pg';

const app = new Koa();
const pool = new pg.Pool({
  connectionString: 'postgresql://jservice:jservice@localhost:5432/jservice',
});

app.use(parser());

app.use(route.get('/', async ctx => {
  ctx.type = 'html';
  ctx.body = `
    <html>
      <head>
        <title>jService.xyz - An https alternative</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="https://unpkg.com/purecss@1.0.0/build/pure-min.css" integrity="sha384-nn4HPE8lTHyVtfCBi5yW9d20FjT8BJwUXyWZT9InLYax14RDjBj46LmSztkmNP9w" crossorigin="anonymous">
        <style>
          main { width: 800px; margin: auto; }
          h2 { font-family: monospace; border-top: 1px solid #999; padding-top: .5em; }
          footer { width: 800px; margin: auto; font-size: .75em; }
        </style>
      </head>
      <body>
        <main>
          <h1>API</h1>
          <h2>GET /api/categories</h2>
          <p>Returns a list of categories.</p>
          <pre>
[
  {
    "id": number,
    "title": string
  }
]
          </pre>
          <h2>GET /api/categories/:id</h2>
          <p>Returns a category with the specified id.</p>
          <pre>
[
  {
    "id": number,
    "title": string
  }
]
          </pre>
          <h2>POST /api/categories</h2>
          <p>Creates a new category.</p>
          <p>Send a title</p>
          <pre>
{ "title": string }
          </pre>
          <p>Returns a category object with an id if it succeeds.</p>
          <pre>
{
  "id": number,
  "title": string
}
          </pre>
          <h2>GET /api/clues</h2>
          <p>Gets a list of 100 clues.</p>
          <p>
            You can filter by query parameters.
            <ul>
              <li><b>value</b>: The value of the clue.</li>
              <li><b>category</b>: The id of the clue's category.</li>
              <li><b>offset</b>: The offset of the clue, useful for pagination.</li>
            </ul>
          </p>
          <pre>
[
  {
    "id": number,
    "answer": string,
    "question": string,
    "value": number,
    "category_id": number,
    "category": {
      "id": number,
      "title": string
    },
    "invalid_count"?: number
  }
]
          </pre>
          <h2>GET /api/clues/:id</h2>
          <p>Gets the clue specified by id.</p>
          <pre>
{
  "id": number,
  "answer": string,
  "question": string,
  "value": number,
  "category_id": number,
  "category": {
    "id": number,
    "title": string
  },
  "invalid_count"?: number
}
          </pre>
          <h2>POST /api/clues</h2>
          <p>Creates a new clue.</p>
          <p>Send an answer, question, value, and category id.</p>
          <pre>
{
  "answer": string,
  "question": string,
  "value": number,
  "category_id": number
}
          </pre>
          <p>Returns a clue with an id and category object if it succeeds.</p>
          <pre>
{
  "id": number,
  "answer": string,
  "question": string,
  "value": number,
  "category_id": number,
  "category": {
    "id": number,
    "title": string
  },
  "invalid_count"?: number
}
          </pre>
          <h2>DELETE /api/clues/:id</h2>
          <p>Increments the invalid_count value by 1, if the clue exists.</p>
          <p>Returns the clue.</p>
          <pre>
{
  "id": number,
  "answer": string,
  "question": string,
  "value": number,
  "category_id": number,
  "category": {
    "id": number,
    "title": string
  },
  "invalid_count"?: number
}
          </pre>
        </main>
        <footer>
          <p>
            Copyright 2018 Curtis Schlak. All rights reserved.
          </p>
          <p>
            There are no guarantees that this service will contain data or be accessible.
          </p>
          <p>
            Thank you for your support.
          </p>
        </footer>
      </body>
    </html>
  `;
}));

app.use(route.get('/api/categories', async ctx => {
  const result = await pool.query('SELECT * FROM categories');
  ctx.body = result.rows;
}));

app.use(route.get('/api/categories/:id', async (ctx, id) => {
  const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
  if (result.rows.length) {
    ctx.body = result.rows[0];
  } else {
    ctx.status = 404;
    ctx.body = { message: 'That category does not exist.' };
  }
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
  if (result.rows.length) {
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
  } else {
    ctx.status = 404;
    ctx.body = { message: 'That clue does not exist.' };
  }
}));

app.use(route.post('/api/clues', async ctx => {
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

app.use(route.delete('/api/clues/:id', async (ctx, id) => {
  const deleteResult = await pool.query(`
    UPDATE clues
    SET invalid_count = COALESCE(invalid_count, 0) + 1
    WHERE id = $1
  `, [id]);
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

app.listen(8182);
