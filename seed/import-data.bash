query=$(cat <<SQL
BEGIN TRANSACTION;

DELETE FROM clues;
DELETE FROM categories;
DELETE FROM games;

COPY games (id, episode_id, aired)
FROM '`pwd`/games.csv'
WITH CSV HEADER;

COPY categories (id, title)
FROM '`pwd`/categories.csv'
WITH CSV HEADER;

COPY clues (id, row_index, column_index, answer, question, game_id, board_index, value, category_id)
FROM '`pwd`/clues.csv'
WITH CSV HEADER;

INSERT INTO games (id, episode_id, aired)
SELECT DISTINCT game_id, 0, ''
FROM clues
WHERE game_id NOT IN (SELECT id FROM games);

SELECT SETVAL('games_id_seq', COALESCE(MAX(id), 1)) FROM games;
SELECT SETVAL('categories_id_seq', COALESCE(MAX(id), 1)) FROM categories;
SELECT SETVAL('clues_id_seq', COALESCE(MAX(id), 1)) FROM clues;

COMMIT;
SQL
)

psql $1 -c "$query"
