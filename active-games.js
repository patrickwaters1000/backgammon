const sqlite = require('sqlite3').verbose();
const Game = require('./game.js');
const { connect } = require('./sql-utils.js');
const games = {};
const { deepCopy,
	authenticate } = require('./utils.js');

function writeGame (game) {
  let db = connect();
  const sql = `
INSERT INTO games(white, black, winner, history)
VALUES (?, ?, ?, ?)`
  db.run(
    sql,
    [game.white,
     game.black,
     game.winner,
     JSON.stringify(game.history)],
  );
  db.close();
}

function getGame(id) {
  const game = games[id];
  if (!game) {
    console.log(`Game ${id} not found.`);
  }
  return game;
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
  return id;
};

exports.getAudience = (id) => {
  let game = getGame(id);
  if (game) {
    return [game.white, game.black, ...game.audience];
  }
};

exports.getGameInfoMsg = (id) => {
  let game = getGame(id);
  if (game) {
    return {
      gameId: id,
      white: game.white,
      black: game.black
    };
  } else {
    console.log(`Can't find game ${id}`);
  }
};

exports.getGameStateMsg = (id) => {
  let game = getGame(id);
  if (game) {
    return {
      gameId: id,
      state: game.state
    };
  } else {
    console.log(`Can't find game ${id}`);
  }
};

exports.canRoll = (id, player) => {
  let game = getGame(id);
  if (!game) {
    console.log(`Can't find game ${id}`);
    return false;
  } else {
    let activeColor = game.state.active;
    let rtp = game.state.rollsToPlay;
    if (game[activeColor] != player) {
      console.log((`Wrong player ${player} is trying to roll; `
 		   + `expected ${game[activeColor]}`));
      return false;
    } else if (rtp != null && rtp.length > 0) {
      console.log(("Can't roll with rolls to play "
		   + JSON.stringify(rtp)));
      return false;
    } else {
      return true;
    }
  }
};

exports.roll = function (gameId) {
  const game = getGame(gameId);
  if (game) {
    const state = game.state;
    const dice = Game.roll(state);
    Game.nextTurnIfNoMove(state);
    game.history.push(['roll', dice]);
    console.log(`Rolled ${JSON.stringify(dice)}`);
  }
};

// Just checks whether it's the player's turn
exports.canMove = (id, player) => {
  let game = getGame(id);
  if (game) {
    let activeColor = game.state.active;
    let rtp = game.state.rollsToPlay;
    if (game[activeColor] != player) {
      console.log((`Wrong player ${player} is trying to roll; `
		   + `expected ${game[activeColor]}`));
      return false;
    } else if (rtp == null || rtp.length == 0) {
      console.log(("Can't move with rolls to play "
                   + JSON.stringify(game.rollsToPlay)));
      return false;
    } else {
      return true;
    }
  }
};

exports.move = function (gameId, from, to) {
  const game = getGame(gameId);
  if (game) {
    activeColor = game.state.active;

    var state = deepCopy(game.state);
    const move = { from: from, to: to };
    Game.move(state, move);
    Game.nextTurnIfNoMove(state);
    game.state = state;
    game.history.push(['move',[from, to]]);
    
    winner = Game.winner(state);
    if (winner) {
      game.winner = winner;
      writeGame(game);
      delete games.gameId;
    }
    return winner;
  }
}

exports.resign = function (token, gameId) {
  return null; // TODO
}

// TODO: Support specifying which game to watch
exports.watchGame = function (user) {
  let gameId = Object.keys(games)[0];
  let game = games[gameId]
  if (game) {
    game.audience.push(user);
    user.socket.emit(
      'game-state',
      {gameId: gameId,
       state: game.state}
    );
  }
};
