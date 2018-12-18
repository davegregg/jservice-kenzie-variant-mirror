export const clues = {
  async get(ctx, pool) {
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
      SELECT clues.id, clues.answer, clues.question, clues.value, clues.category_id, clues.invalid_count, clues.game_id, clues.canon
           , categories.title, categories.canon AS canonical_category
           , games.aired, games.canon AS canonical_game
      FROM clues
      JOIN categories ON(clues.category_id = categories.id)
      JOIN games ON(clues.game_id = games.id)
      WHERE clues.id IS NOT NULL
      ${wheres.join('\n')}
      ORDER BY clues.id LIMIT 100 OFFSET $1
    `, params);
    ctx.body = cluesResult.rows.map(row => ({
      id: row.id,
      answer: row.answer,
      question: row.question,
      value: row.value,
      categoryId: row.category_id,
      gameId: row.game_id,
      invalidCount: row.invalid_count,
      category: {
        id: row.category_id,
        title: row.title,
        canon: row.canonical_category
      },
      game: {
        aired: row.aired,
        canon: row.canonical_game
      },
      canon: row.canon
    }));
  },
  async getOne(ctx, id, pool) {
    const result = await pool.query(`
      SELECT clues.id, clues.answer, clues.question, clues.value, clues.category_id, clues.invalid_count, clues.game_id, clues.canon
        , categories.title, categories.canon AS canonical_category
        , games.aired, games.canon AS canonical_game
      FROM clues
      JOIN categories ON(clues.category_id = categories.id)
      JOIN games ON(clues.game_id = games.id)
      WHERE clues.id = $1
    `, [id]);
    if (result.rows.length) {
      const row = result.rows[0];
      ctx.body = {
        id: row.id,
        answer: row.answer,
        question: row.question,
        value: row.value,
        categoryId: row.category_id,
        gameId: row.game_id,
        invalidCount: row.invalid_count,
        category: {
          id: row.category_id,
          title: row.title,
          canon: row.canonical_category
        },
        game: {
          aired: row.aired,
          canon: row.canonical_game
        },
        canon: row.canon
      };
    } else {
      ctx.status = 404;
      ctx.body = { message: 'That clue does not exist.' };
    }
  },
  async post(ctx, pool) {
    const { answer, question, value, categoryId } = ctx.request.body;
    if (answer && question && value && categoryId) {
      try {
        const insertResult = await pool.query(`
          INSERT INTO clues(id, answer, question, value, category_id, invalid_count)
          VALUES ((SELECT MAX(id) + 1 FROM clues), $1, $2, $3, $4, null)
          RETURNING id
        `, [answer, question, value, categoryId]);
        const categoryResult = await pool.query('SELECT title FROM categories WHERE id = $1', [category_id]);
        ctx.body = {
          id: insertResult.rows[0].id,
          answer,
          question,
          value,
          categoryId,
          category: {
            id: category_id,
            title: categoryResult.rows[0].title
          },
          canon: false
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
  },
  async put(ctx, id, pool) {
    const { answer, question, value } = ctx.request.body;
    let result = await pool.query(`
      UPDATE clues
         SET answer = $1
           , question = $2
           , value = $3
       WHERE id = $4
       AND canon = false
       RETURNING *
    `, [answer, question, value, id]);
    if (result.rows.length) {
      const result = await pool.query(`
        SELECT clues.id, clues.answer, clues.question, clues.value, clues.category_id, clues.invalid_count, clues.game_id, clues.canon
          , categories.title, categories.canon AS canonical_category
          , games.aired, games.canon AS canonical_game
        FROM clues
        JOIN categories ON(clues.category_id = categories.id)
        JOIN games ON(clues.game_id = games.id)
        WHERE clues.id = $1
      `, [id]);
      if (result.rows.length) {
        const row = result.rows[0];
        ctx.body = {
          id: row.id,
          answer: row.answer,
          question: row.question,
          value: row.value,
          categoryId: row.category_id,
          gameId: row.game_id,
          invalidCount: row.invalid_count,
          category: {
            id: row.category_id,
            title: row.title,
            canon: row.canonical_category
          },
          game: {
            aired: row.aired,
            canon: row.canonical_game
          },
          canon: row.canon
        };
      } else {
        ctx.status = 404;
        ctx.body = { message: 'That clue does not exist.' };
      }
    } else {
      ctx.status = 404;
      ctx.body = { message: 'That clue does not exist or you may not update it.' };
    }
  },
  async destroy(ctx, id, pool) {
    await pool.query(`
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
  }
};