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

function randomMove (gameState) {
  const moves = Game.legalMoves(gameState);
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
socket.on('active-users', users => {
  let otherUsers = users.filter( u => (u != name ) );
  if (gameId == null
      && challenge
      && otherUsers.length > 0) {
    const pone = randomChoice(otherUsers);
    if (pone) {
      socket.emit(
	'update-challenges',
	{ action: 'open',
	  to: pone,
	  token: token }
      );
    }
  }
});

socket.on('challenges', m => {
  console.log(m);
  let users = m.incoming;
  if (!gameId
      && accept
      && users.length > 0) {
    socket.emit(
      'update-challenges',
      { action: 'accept',
	to: users[0],
	token: token });
  }
});

socket.on('game-info', m => {
  if (!gameId) {
    console.log('Game info:', JSON.stringify(m));
    gameId = m.gameId;
    color = (m.white == name ? 'white' : 'black');
  }
});

socket.on('game-state', m => {
  if (m.gameId != gameId) {
    console.log('Unexpected game id', m.gameId);
  }
  if (gameId == m.gameId
      && m.state.active == color) {
    if (!m.state.dice) {
      console.log('Sending roll');
      socket.emit('roll', { token: token, gameId: gameId });
    } else {
      randomMove(m.state);
    }
  }
});

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
      socket.emit(
	'request-active-users',
	{token: token}
      );
      // on response, will issue challenge
    }
  },
  1000
);
