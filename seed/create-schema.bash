query=$(cat <<SQL
BEGIN TRANSACTION;

DROP TABLE IF EXISTS clues;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS games;

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL NOT NULL PRIMARY KEY,
  title VARCHAR(250) NOT NULL UNIQUE,
  canon BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS games (
  id SERIAL NOT NULL PRIMARY KEY,
  episode_id INTEGER NOT NULL,
  aired CHAR(10),
  canon BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS clues (
  id SERIAL NOT NULL PRIMARY KEY,
  row_index INTEGER NOT NULL,
  column_index INTEGER NOT NULL,
  answer TEXT NOT NULL,
  question TEXT NOT NULL,
  game_id INTEGER,
  board_index INTEGER NOT NULL,
  value INTEGER NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  invalid_count INTEGER DEFAULT 0,
  canon BOOLEAN DEFAULT TRUE
);

COMMIT;
SQL
)

psql -U $1 -h $2 $3 -c "$query"
