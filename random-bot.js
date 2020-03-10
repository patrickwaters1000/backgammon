const Game = require('./game.js');
var socket = require('socket.io-client')('http://localhost:3000');
var argv = require('minimist')(process.argv.slice(2));

// This bot should really use js-csp

const challenge = argv['c'];
const accept = argv['a'];
const delay = argv['d'];
const userName = argv['u'];
const password = {
  "random-bot-1": "gigabyte",
  "random-bot-2": "kilojoule"
}[argv['u']];
console.log("argv", JSON.stringify(argv));

var token = null;
var gameId = null;
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

function randomMove (state) {
  const moves = Game.legalMoves(state);
  console.log(`candidate moves ${JSON.stringify(moves)}`);
  const move = randomChoice(moves);
  if (move) {
    const msg = { 'token': token,
		  'gameId': gameId,
		  ...move };
    setTimeout(
      () => { socket.emit('move', msg); },
      (delay || 1000)
    );
  }
}

socket.on('token', m => { token = m; } );

// Listening for this so to send challenges.
// Really should be using channels instead.
socket.on('update-users-online', m => {
  if (gameId == null && challenge) {
    const players = m
	  .map( info => info.player )
	  .filter( player => (player != userName));
    const pone = randomChoice(players);
    socket.emit(
      'challenge',
      { p1: userName,
	p2: pone,
	token: token }
    );
  }
});

socket.on('challenge', m => {
  if (!gameId && accept) {
    socket.emit(
      'challenge-accepted',
      { p1: m.p1,
	p2: 'random-bot-1',
	token: token });
  }
});

socket.on('start-game', m => {
  if (!gameId) {
    gameId = m.gameId;
    color = m.player;
    socket.emit('request-game-state', {gameId: gameId});
  }
});

socket.on(
  'game-state', state => {
    console.log("Received state", JSON.stringify(state));
    if (state.active == color) {
      randomMove(state);
    }
  }
);

socket.on(
  'game-over', m => {
    gameId=null;
  }
);

socket.emit(
  'login', { username: userName,
	     password: password }
);

setInterval(
  () => {
    if (!gameId && challenge) {
      socket.emit('request-players-online', null);
      // on response, will issue challenge
    }
  },
  1000
);
