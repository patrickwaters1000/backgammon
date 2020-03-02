const Game = require('./game.js');
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var playerToToken = {}; // in memory
var playerToSocket = {}; // in memory
var playerToGame = {}; // in memory
var playerToChallenge = {}; // p1 maps to p2 if p1 has an open challenge
// to p2, in memory
// var playerToStats = {}; // read and write to disk
var games = {}; // gameId to object with keys white, black, state; in
// memory

var fs = require("fs");

// TODO: refactor code for authenticating messages
// TODO: something better for players "db"
// TODO: move code for managing active players to separate ns
// TODO: move code for managing active games to separate ns
// TODO: use "from" in messages for challenge-accepted, etc. (The p1
// and p2 convention is extremely confusing)

// I refactored the game logic to represent the state in a different
// format. I should update the client side to use the new format, but
// I really want to get on to writing a that can be played
// against. For now, I'll just add a function that converts the new
// game state format to the old format so that I don't have to change
// the client side code.
function toOldGameFormat (s) {
  const whiteTokens = s.tokens.map(
    x => (x > 0 ? x : 0)
  );
  const blackTokens = s.tokens.map(
    x => (x < 0 ? -x : 0)
  );
  return {
    state: {
      tokensPerPip: {
	white: whiteTokens,
	black: blackTokens
      },
      dice: s.dice,
      movesToPlay: s.rollsToPlay,
      active: s.active,
      turnNumber: s.turnNumber
    },
    white: s.players.white,
    black: s.players.black
  };
  // I forgot that the new format doesn't keep track of the numbers of
  // tokens in the home areas.
}

function toNewGameFormat (s_) {
  const s = JSON.parse(JSON.stringify(s_));
  const tokens = s.state.tokensPerPip.white;
  s.state.tokensPerPip.black.forEach( (x,i) => {
    if (x > 0) {
      tokens[i] = -x;
    }
  });
  return {
    tokens: tokens,
    active: s.state.active,
    dice: s.state.dice,
    rollsToPlay: s.state.movesToPlay,
    turnNumber: s.state.turnNumber,
    players: {
      white: s.white,
      black: s.black
    }
  };
}

function checkLogin (m, socket) {
  console.log(`msg ${JSON.stringify(m)}`);
  const playerToStats = JSON.parse(
    fs.readFileSync(`${__dirname}/players`));
  const info = playerToStats[m.username];
  if (!info) {
    console.log(`Player ${m.username} not found.`);
  } else {
    return m.password === info.password;
  }
}

function handleLogin (m, socket) {
  const token = Math.random().toString().substring(2);
  playerToToken[m.username] = token;
  console.log(`Gave token ${token} to ${m.username}`);
  playerToSocket[m.username] = socket;
  socket.emit('token', token);
  io.emit('update-users-online', listPlayersOnline());
} 

function checkChallenge (m) {
  const authentic = (playerToToken[m.p1] == m.token);
  if (!authentic) {
    console.log(
      `Ignoring challenge because supplied token ${m.token} `
	+ `for supposed user ${m.p1} does not `
	+ `match ${JSON.stringify(playerToToken)}`
    );
  }
  return (authentic && m.p1 != m.p2);
}

function handleChallenge (m) {
  // If no socket for p2, should remove from playerToChallenge
  playerToChallenge[m.p1] = m.p2; 
  tryEmit(m.p2, 'challenge', { p1: m.p1 });	
}

function checkChallengeAccepted (m) {
  const valid = (playerToToken[m.p2]==m.token
		 && playerToChallenge[m.p1]==m.p2);
  if (!valid) {
    console.log('Challenge accepted ignored');
  }
  return valid;
}

function handleChallengeAccepted (m, socket) {
  playerToChallenge[m.p1] = null;
  const gameId = Math.random().toString().substring(2);
  games[gameId] = toOldGameFormat(
    Game.newGame(m.p1, m.p2));
  playerToGame[m.p1] = gameId;
  playerToGame[m.p2] = gameId;
  // sending gameId busts cache
  socket.emit('start-game', { gameId: gameId, player: "black" });
  tryEmit(m.p1, 'start-game', { gameId: gameId, player: "white" });
}

const maxNextTurnRetries = 10;
function nextTurnUntilLegalMoveExists (oldFormatGame) {
  const game = toNewGameFormat(oldFormatGame);
  var retries = maxNextTurnRetries;
  while (retries > 0
	 && !Game.legalMoveExistsOrNextTurn(game)) {
    retries -= 1;
    sendGameState(oldFormatGame);
    sendToPlayers(
      oldFormatGame,
      'chat-message',
      `Roll = ${newState.dice}; no legal move`
    );
  }
}

function checkMoveMessage (m) {
  console.log('received msg: ', m);
  const game = games[m.gameId];
  if (!game) {
    console.log('Game not found');
  } else {
    const activeColor = game.state.active;
    const activePlayer = game[activeColor];
    const requiredToken = playerToToken[activePlayer];
    const authentic = (m.token==requiredToken);
    if (!authentic) {
      console.log(`Want token ${requiredToken},`
		  + `but got token ${m.token}`);
    }
    return authentic;
  }
}

function handleMoveMessage (m) {
  const oldFormatGame = games[m.gameId];
  const game = toNewGameFormat(oldFormatGame);
  var moved, reasons;
  [moved, reasons] = Game.moveIfLegal(
    game,
    { from: m.from, to: m.to }
  );
  if (moved) {
    games[m.gameId] = toOldGameFormat(game);
  } else {
    console.log("Move is illegal because\n"
		+ reasons.join("\n"));
  }
  var winner = null;
  if (Game.activePlayerHasWon(game)) {
    winner = game.active;
    sendGameOver(toOldGameFormat(game), winner);
  } else {
    sendGameState(toOldGameFormat(game));
  }
  nextTurnUntilLegalMoveExists(toOldGameFormat(game));
}

function tryEmit (player, msgType, msgData) {
  const socket = playerToSocket[player];
  if (socket) {
    console.log(
      `Sending ${msgType} ${JSON.stringify(msgData)} to ${player}`);
    socket.emit(msgType, msgData);
  }
  else { console.log(`No socket for ${player}`); }
}

function sendToPlayers(game, msgType, msgData) {
  ["white","black"].forEach( color => {
    tryEmit(game[color], msgType, msgData);
  });
}

// Shouldn't need this. All messages should send username.
// If the client doesn't known its username the server doesn't either.
function tokenToPlayer (token) {
  for (player in playerToToken) {
    if (playerToToken[player]==token) { return player; }
  }
  console.log(`Couldn't find token ${token}`);
}

app.use(express.static('public'));

app.get('/', function(req, res) {
  res.sendFile(`${__dirname}/public/login.html`);
});

function sendGameOver(game, winningColor) {
  const winningPlayer = game[winningColor];
  const losingColor = (winningColor === "white" ? "black" : "white");
  const losingPlayer = game[losingColor];
  const data = fs.readFileSync(`${__dirname}/players`);
  const playerToStats = JSON.parse(data);
  playerToStats[winningPlayer].wins += 1;
  playerToStats[losingPlayer].losses += 1;
  fs.writeFileSync(`${__dirname}/players`,
		   JSON.stringify(playerToStats));
  sendToPlayers(
    game,
    'game-over',
    {
      winner: game[winningColor],
    }
  );  
}

function sendGameState(game) {
  sendToPlayers(game, 'game-state', game.state);
}

function listPlayersOnline() {
  const data = fs.readFileSync(`${__dirname}/players`);
  const playerToStats = JSON.parse(data);
  return [...Object.keys(playerToToken)].map(
    player => ({
      player: player,
      wins: playerToStats[player].wins,
      losses: playerToStats[player].losses
    })
  );
}

io.on('connection', function(socket) {

  socket.on(
    'chat-message',
    function(m){
      try {
	const player = tokenToPlayer(m.token); // throws if not found
	const gameId = playerToGame[player];
	const game = games[gameId];
	sendToPlayers(game, 'chat-message', `(${player}) ${m.message}`);
      } catch (err) {
	console.log(err);
      }
    }
  );
  socket.on(
    'login',
    m => {
      if (checkLogin(m, socket)) {
	handleLogin(m, socket);
      } else {
	socket.emit('login-failed',null);
      }
    }
  );
  socket.on(
    'request-players-online',
    m => { io.emit('update-users-online', listPlayersOnline()); }
  );
  socket.on(
    'challenge',
    m => {
      console.log('received msg: ', m);
      if (checkChallenge(m)) {
	handleChallenge(m);
      }
    }
  );
  socket.on(
    'challenge-accepted',
    m => {
      console.log('received msg: ', m);
      if (checkChallengeAccepted(m)) {
	handleChallengeAccepted(m, socket);
      }
    }
  );

  socket.on(
    'challenge-declined',
    m => {
      console.log('received challenge-declined msg', m);
      if (playerToToken[m.p2]==m.token
          && playerToChallenge[m.p1]==m.p2) {
        playerToChallenge[m.p1] = null;
        tryEmit(m.p1, 'challenge-declined', null);
      } else { console.log('Challenge declined ignored'); }
    }
  );
  
  socket.on('update-socket', token => { // when transitioning from the
  // ante-room to the game, need new socket
    var player = tokenToPlayer(token);
    playerToSocket[player] = socket;
    console.log(`Updated socket for ${player}`);
  });
  socket.on(
    'request-game-state',
    m => { socket.emit('game-state', games[m.gameId].state); }
  );
  socket.on( // we don't actually need this, right?
    'request-initial-game-state',
    m => {
      console.log(`Looking up game ${m.gameId} `
		  + `in games = ${JSON.stringify(games)}`);
      const game = games[m.gameId];
      const state = ( game ? game.state : null);
      socket.emit('initial-game-state', state);
    }
  );
  socket.on(
    'move',
    function (m) {
      
      if (checkMoveMessage(m)) {
	handleMoveMessage(m);
      }
    }
  );
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
