CREATE TABLE users (
  name STRING UNIQUE PRIMARY KEY NOT NULL,
  password STRING NOT NULL
);

INSERT 
  INTO users(name, password)
VALUES 
  ('patrick', 'hello'),
  ('guest', '1234'),
  ('random-bot-1', 'gigabyte'),
  ('random-bot-2', 'kilojoule');

CREATE TABLE games (
  id INTEGER PRIMARY KEY,
  white STRING NOT NULL,
  black STRING NOT NULL,
  winner STRING NOT NULL,
  history TEXT,
  FOREIGN KEY (white)
    REFERENCES users (name),
  FOREIGN KEY (black)
    REFERENCES users (name)
);
