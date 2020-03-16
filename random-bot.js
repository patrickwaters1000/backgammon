const Game = require('./game.js');
var socket = require('socket.io-client')('http://localhost:3000');
var argv = require('minimist')(process.argv.slice(2));

// This bot should perhaps use js-csp

const challenge = argv['c'];
const accept = argv['a'];
const delay = argv['d'];
const name = argv['u'];
const password = {
  "random-bot-1": "gigabyte",
  "random-bot-2": "kilojoule"
}[argv['u']];
console.log("argv", JSON.stringify(argv));

var token = null;
var gameId = null;
var state = null;
var color = null;
var mode = null; // whether the bot is in a game 
// currently assuming player = black
// The bot currently trusts that it is receiving messages from the game
// server.

function randomChoice (choices) {
  const n = choices.length;
  if (n > 0) {
    const i = Math.floor( Math.random() * n );
    return choices[i];
  }
}

function randomMove () {
  const moves = Game.legalMoves(state);
  console.log('candidate moves:', JSON.stringify(moves));
  const move = randomChoice(moves);
  if (move) {
    const msg = { 'token': token,
		  'gameId': gameId,
		  ...move };
    setTimeout(
      () => {
	console.log('Sending move:', JSON.stringify(msg));
	socket.emit('move', msg);
      },
      (delay || 1000)
    );
  }
}

socket.on('token', m => { token = m; } );

// Listening for this so to send challenges.
// Really should be using channels instead.
socket.on('active-users', m => {
  if (gameId == null && challenge) {
    const players = m.filter( player => (player != name));
    const pone = randomChoice(players);
    socket.emit(
      'challenge',
      { to: pone,
	token: token }
    );
  }
});

socket.on('challenge', m => {
  if (!gameId && accept) {
    socket.emit(
      'challenge-accepted',
      { to: m.from,
	token: token });
  }
});

socket.on('new-game', m => {
  if (!gameId) {
    console.log('New game:', JSON.stringify(m));
    gameId = m.gameId;
    state = Game.newGame();
    console.log('New game state:', state);
    color = (m.white == name ? 'white' : 'black');
    if (state.active == color) {
      socket.emit('roll', { token: token, gameId: gameId });
    }
  }
});

socket.on(
  'roll', m => {
    console.log("Received roll", JSON.stringify(m));
    Game.setDice(state, m.dice);
    console.log('State:', JSON.stringify(state));
    if (gameId == m.gameId
	&& state.active == color) {
      if (!state.dice) {
	console.log('Sending roll');
	socket.emit('roll', { token: token, gameId: gameId });
      } else {
	randomMove();
      }
    }
  }
);

socket.on(
  'move', m => {
    console.log("Received move", JSON.stringify(m));
    Game.move(state, m);
    console.log('State:', JSON.stringify(state));
    if (gameId == m.gameId
	&& state.active == color) {
      if (!state.dice) {
	socket.emit('Sending roll');
	socket.emit('roll', { token: token, gameId: gameId });
      } else {
	randomMove();
      }
    }
  }
);

socket.on(
  'game-over', m => {
    gameId=null;
  }
);

socket.emit(
  'login', { name: name,
	     password: password }
);

setInterval(
  () => {
    if (!gameId && challenge) {
      socket.emit('request-active-users', null);
      // on response, will issue challenge
    }
  },
  1000
);
