const Game = require('./game.js');
var shell = require('shelljs');
const fs = require('fs');
var socket = require('socket.io-client')('http://localhost:3000');
const { deepCopy } = require('./utils.js');
const F = require('./ml/feature-lib.js');
var argv = require('minimist')(process.argv.slice(2));

// This bot should perhaps use js-csp

const challenge = argv['c'];
const accept = argv['a'];
const delay = argv['d'];
const name = argv['u'];
const password = {
  "linear-bot-3": "winner",
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

function bestChoice (f, choices) {
  bestC = choices[0];
  bestV = f(choices[0]);
  choices.forEach( c => {
    const v = f(c);
    if (bestV < v) {
      bestV = v;
      bestC = c;
    }
  });
  return bestC;
}

function scoreMove(state, move) {
  const newState = deepCopy(state);
  Game.move(newState, move);
  const transition = { from: deepCopy(state), to: newState };
  transition.sdfr = 0;
  F.extractFeatures(transition);
  const VWLine = F.getVWLine(transition);
  fs.writeFileSync('./tmp/input', VWLine);
  const resp = shell.exec('vw -i ./model.vw -t ./tmp/input -p ./tmp/output --quiet');
  if (resp.code!== 0) { throw Error(result); }
  return parseFloat(fs.readFileSync('./tmp/output'));
}

exports.scoreMove = scoreMove;

function move () {
  const moves = Game.legalMoves(state);
  moves.forEach( m => { m.score = scoreMove(state, m); });
  console.log('candidate moves:', JSON.stringify(moves));
  const move = bestChoice( x => x.score, moves);
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
    Game.nextTurnIfNoMove(state);
    console.log('State:', JSON.stringify(state));
    if (gameId == m.gameId
	&& state.active == color) {
      if (!state.dice) {
	console.log('Sending roll');
	socket.emit('roll', { token: token, gameId: gameId });
      } else {
	move();
      }
    }
  }
);

socket.on(
  'move', m => {
    console.log("Received move", JSON.stringify(m));
    Game.move(state, m);
    Game.nextTurnIfNoMove(state);
    console.log('State:', JSON.stringify(state));
    if (gameId == m.gameId
	&& state.active == color) {
      if (!state.dice) {
	socket.emit('Sending roll');
	socket.emit('roll', { token: token, gameId: gameId });
      } else {
	move();
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
