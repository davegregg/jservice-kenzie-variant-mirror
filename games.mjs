export const games = {
  async get(ctx, pool) {
    const result = await pool.query('SELECT * FROM games');
    const rows = result.rows.map(row => ({
      id: row.id,
      episodeId: row.episode_id,
      aired: row.aired,
      canon: true
    }));
    ctx.body = { games: rows };
  },
  async createRandomGame(ctx, pool) {
    const createGameResult = await pool.query(`
      INSERT INTO game_definitions (created_on)
      VALUES ($1)
      RETURNING id
    `, [new Date()]);
    const queries = [];
    for (let i = 0; i < 20; i += 1) {
      queries.push(this._getRandomCluePromise(pool));
    }
    try {
      const results = (await Promise.all(queries))
        .map(clueRecord => clueRecord.rows[0]);
      await this._insertRandomGame(createGameResult.rows[0].id, results, pool);
      ctx.body = {
        id: createGameResult.rows[0].id,
        clues: results.map(row => ({
          id: row.id,
          answer: row.answer,
          question: row.question,
          value: row.value,
          categoryId: row.category_id,
          invalidCount: row.invalid_count,
          category: {
            id: row.category_id,
            title: row.title,
            canon: row.canonical_category
          },
          canon: row.canon
        }))
      }
    } catch (e) {
      ctx.status = 500;
      ctx.body = { message: 'An error occurred that prevented the game from being created.'}
      console.error(e);
    }
  },
  async getRandomGame(ctx, id, pool) {
    const result = await pool.query(`
      SELECT clues.id, clues.answer, clues.question, clues.value, clues.category_id, clues.invalid_count, clues.game_id, clues.canon
        , categories.title, categories.canon AS canonical_category
      FROM clues
      JOIN game_definition_clues ON(clues.id = game_definition_clues.clue_id)
      JOIN categories ON(clues.category_id = categories.id)
      WHERE game_definition_clues.game_definition_id = $1
      ORDER BY clues.id
    `, [id]);
    if (result.rows.length) {
      ctx.body = {
        id,
        clues: result.rows.map(row => ({
          id: row.id,
          answer: row.answer,
          question: row.question,
          value: row.value,
          categoryId: row.category_id,
          invalidCount: row.invalid_count,
          category: {
            id: row.category_id,
            title: row.title,
            canon: row.canonical_category
          },
          canon: row.canon
        }))
      };
    } else {
      ctx.status = 404;
      ctx.body = { message: 'That game does not exist.' };
    }
  },

  _insertRandomGame(id, clues, pool) {
    const values = [];
    for (let clue of clues) {
      values.push(`(${id}, ${clue.id})`);
    }
    pool.query(`
      INSERT INTO game_definition_clues(game_definition_id, clue_id)
      VALUES ${values.join(',')}
    `);
  },
  _getRandomCluePromise(pool) {
    return pool.query(`
      SELECT FLOOR(RANDOM() * clue_id.MAX_CLUE_ID + 1)::int AS random_id
      FROM (
        SELECT MAX(id) AS MAX_CLUE_ID
        FROM clues
        WHERE clues.invalid_count = 0 AND clues.canon = TRUE
      ) clue_id
    `)
    .then(result => console.log(result) || result.rows[0].random_id)
    .then(randomNumber => {
      console.log(randomNumber);
      return pool.query(`
        SELECT clues.id, clues.answer, clues.question, clues.value, clues.category_id, clues.invalid_count, clues.game_id, clues.canon
          , categories.title, categories.canon AS canonical_category
        FROM clues
        JOIN categories ON(clues.category_id = categories.id)
        JOIN games ON(clues.game_id = games.id)
        WHERE clues.id = $1
      `, [randomNumber]);
    });
  }
};
