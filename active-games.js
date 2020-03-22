const sqlite = require('sqlite3').verbose();
const Game = require('./game.js');
const games = {};
const { authenticate } = require('./utils.js');

/* API
- new game (token1, token2)
- roll
- move
- resign
*/

function connect () {
  let db = new sqlite.Database(
    './db/primary.db',
    sqlite.OPEN_READWRITE,
    err => {
      if (err) {
	console.log(err);
      }
    }
  );
  return db;
};

function writeGame (game) {
  let db = connect();
  const sql = `
INSERT INTO games(white, black, winner, history)
VALUES (?, ?, ?, ?)`
  db.run(
    sql,
    [game.white.name,
     game.black.name,
     game.winner,
     JSON.stringify(game.history)],
  );
  db.close();
}

class GameNotFound extends Error {
  constructor (msg) {
    super(msg);
    this.name = "GameNotFound";
  }
};
exports.GameNotFound = GameNotFound;

function getGame(id) {
  const game = games[id];
  if (!game) {
    throw new GameNotFound(`Game ${id} not found.`);
  }
  return game;
}


// handle authentication and getting users in index.

function send(game, msg, data) {
  //console.log('Sending game:', JSON.stringify(game));
  const users = [game.white, game.black, ...game.audience];
  users.forEach( user => {
    user.socket.emit(msg, data);
  });		 
}

// No authentication because called after 'acceptChallenge'
exports.newGame = function (user1, user2) {
  const id = Math.random().toString().substring(2);
  const state = Game.newGame();
  const game = {
    id: id,
    white: user1,
    black: user2,
    audience: [],
    state: state,
    history: [],
    winner: null
  };
  games[id] = game;
  send(
    game,
    'new-game',
    { gameId: id,
      white: user1.name,
      black: user2.name }
  );
};

exports.roll = function (token, gameId) {
  const game = getGame(gameId);
  const state = game.state;
  const dice = Game.roll(state);
  Game.nextTurnIfNoMove(state);
  game.history.push(['roll', dice]);
  send(game, 'roll', {
    gameId: gameId,
    dice: dice,
  });
};

exports.move = function (token, gameId, from, to) {
  const game = getGame(gameId);
  activeColor = game.state.active;
  requiredToken = game[activeColor].token;
  authenticate(requiredToken, token);
  const state = game.state;
  const move = { from: from, to: to };
  Game.move(state, move);
  Game.nextTurnIfNoMove(state);
  game.history.push(['move',[from, to]]);
  send(game, 'move', {
    gameId: gameId,
    ...move
  });
  console.log('State:', JSON.stringify(game.state));
  winner = Game.winner(state);
  if (winner) {
    game.winner = winner;
    writeGame(game);
    delete games.gameId; // Check that this doesn't destroy the game
    send(game, 'game-over', {
      gameId: gameId,
      winner: winner
    });
  }
}

exports.resign = function (token, gameId) {
  return null; // TODO
}
