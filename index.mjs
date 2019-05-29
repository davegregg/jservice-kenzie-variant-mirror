import fs from 'fs';
import Koa from 'koa';
import parser from 'koa-bodyparser';
import cors from '@koa/cors';
import route from 'koa-route';
import path from 'path';
import pg from 'pg';

import { categories } from './categories';
import { clues } from './clues';
import { games } from './games';

const app = new Koa();
const pool = new pg.Pool({
  connectionString: 'postgresql://jservice:jservice@localhost:5432/jservice',
});

app.use(cors());
app.use(parser());

app.use(route.get('/', async ctx => {
  let readFile = async () => new Promise((good, bad) => {
    fs.readFile(path.join(process.cwd(), 'index.html'), 'utf8', (err, data) => {
      if (err) { return bad(err); }
      good(data);
    });
  });
  ctx.type = 'html';
  ctx.body = await readFile();
}));

app.use(route.get('/api/games', async ctx => games.get(ctx, pool)));
app.use(route.post('/api/random-games', async ctx => games.createRandomGame(ctx, pool)));
app.use(route.get('/api/random-games/:id', async (ctx, id) => games.getRandomGame(ctx, id, pool)));

app.use(route.get('/api/categories', async ctx => categories.get(ctx, pool)));
app.use(route.get('/api/categories/:id', async (ctx, id) => categories.getOne(ctx, id, pool)));
app.use(route.post('/api/categories', async (ctx) => categories.post(ctx, pool)));

app.use(route.get('/api/clues', async ctx => clues.get(ctx, pool)));
app.use(route.get('/api/clues/:id', async (ctx, id) => clues.getOne(ctx, id, pool)));
app.use(route.put('/api/clues/:id', async (ctx, id) => clues.put(ctx, id, pool)));
app.use(route.post('/api/clues', async ctx => clues.post(ctx, pool)));
app.use(route.delete('/api/clues/:id', async (ctx, id) => clues.destroy(ctx, id, pool)));
app.use(route.get('/api/random-clue', async ctx => clues.getRandom(ctx, pool)));

app.listen(8182);
