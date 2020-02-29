var socket = require('socket.io-client')('http://localhost:3000');

var token = null;
var gameId = null;
// currently assuming player = black
// The bot currently trusts that it is receiving messages from the game
// server. Since it makes random moves anyway, this doesn't seem like a big
// deal.

socket.on('token', m => { token = m; } );

socket.on('start-game', m = { gameId = m.gameId; } );

socket.on('challenge', m => {
  socket.emit(
    'challenge-accepted',
    { p1: m.p1,
      p2: 'random-bot-1',
      token: token });
});

function candidateMovesFromPip (tokensPerPip, pip, dice) {
  
}

function candidateMoves (state) {
  
}

// must retry if invalid, or be sure is valid      
socket.on(
  'game-state', state => {
    if (state.activePlayer == "black") {
      const candidateMoves = state.tokensPerPip.black.reduce(
	(moves, pip, tokens) => {
	  return ( tokens > 0
		   : moves.concat(dice.map( die => ({ from: pip, to: pip + die })));
		   ? moves ); 
	},
	[]
      );
      const n = candidateMoves.length;
      const idx = Math.floor( Math.random() * n );
      socket.emit(
	'move',
	{ 'token': token,
	  ...candidateMoves[idx] }
      );
		  
    }
  });

socket.emit(
  'login', { username: 'random-bot-1',
	     password: 'gigabyte'}
);
