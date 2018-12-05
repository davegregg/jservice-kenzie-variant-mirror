import fetch from 'node-fetch';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://jservice:jservice@localhost:5432/jservice',
});

const fetches = [];

function* ids() {
  for (let i = 1; i <= 50; i += 1) {
    yield i;
  }
}

for (let categoryId of ids()) {
  fetches.push(fetch(`http://jservice.io/api/category?id=${categoryId}`))
}

Promise.all(fetches)
  .then(responses => Promise.all(responses.map(response => response.json())))
  .then(categoryLists => categoryLists.map(c => [{id: c.id, title: c.title}, c.clues]))
  .then(categoryClueLists => categoryClueLists.reduce(([total_c, total_clues], [c, clues]) => {
    total_c.push(c);
    return [total_c, total_clues.concat(clues)];
  }, [[], []]))
  .then(values => {
    return Promise.all([
      values,
      pool.query('CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY, title VARCHAR(250) NOT NULL UNIQUE)'),
      pool.query('CREATE TABLE IF NOT EXISTS clues (id INTEGER PRIMARY KEY, answer TEXT NOT NULL, question TEXT NOT NULL, value INTEGER NOT NULL, category_id INTEGER NOT NULL REFERENCES categories(id), invalid_count INTEGER)'),
    ]);
  })
  .then(([values]) => {
    return Promise.all([
      values,
      pool.query('DELETE FROM categories'),
      pool.query('DELETE FROM clues'),
    ]);
  })
  .then(([[categories, clues]]) => {
    const sqls = [];
    categories.forEach(category => {
      sqls.push(pool.query('INSERT INTO categories(id, title) VALUES ($1, $2)', [category.id, category.title]));
    });
    clues.forEach(clue => {
      if (clue.id && clue.answer && clue.question && clue.value && clue.category_id) {
        sqls.push(pool.query(`
          INSERT INTO clues(id, answer, question, value, category_id, invalid_count)
          VALUES($1, $2, $3, $4, $5, $6)
        `, [clue.id, clue.answer.replace(/<\/?[^>]+>/g, ''), clue.question, clue.value, clue.category_id, clue.invalid_count]));
      }
    })
    return Promise.all(sqls);
  })
  .catch(console.error);
