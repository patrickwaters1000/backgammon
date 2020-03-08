const Game = require('./game.js');
var socket = require('socket.io-client')('http://localhost:3000');

var token = null;
var gameId = null;
// currently assuming player = black
// The bot currently trusts that it is receiving messages from the game
// server. Since it makes random moves anyway, this doesn't seem like a big
// deal.

function randomMove (state) {
  const moves = Game.legalMoves(state);
  console.log(`candidate moves ${JSON.stringify(moves)}`);
  const n = moves.length;
  if (n > 0) {
    const i = Math.floor( Math.random() * n );
    const move = moves[i];
    const msg = { 'token': token,
		  'gameId': gameId,
		  ...move };
    setTimeout(
      () => { socket.emit('move', msg); },
      1000
    );
  }
}

socket.on('token', m => { token = m; } );

socket.on('start-game', m => { gameId = m.gameId; } );

socket.on('challenge', m => {
  socket.emit(
    'challenge-accepted',
    { p1: m.p1,
      p2: 'random-bot-1',
      token: token });
});

socket.on(
  'game-state', state => {
    console.log("Received state", JSON.stringify(state));
    if (state.active == "black") {
      randomMove(state);
    }
  }
);

socket.emit(
  'login', { username: 'random-bot-1',
	     password: 'gigabyte'}
);
