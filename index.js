const rules = require('./gameLogic.js');
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


// I refactored the game logic to represent the state in a different
// format. I should update the client side to use the new format, but
// I really want to get on to writing a that can be played
// against. For now, I'll just add a function that converts the new
// game state format to the old format so that I don't have to change
// the client side code.


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
      console.log(`Login msg ${JSON.stringify(m)}`);
      const playerToStats = JSON.parse(fs.readFileSync(`${__dirname}/players`));
      console.log(`players: ${JSON.stringify(playerToStats)}`);
      if (playerToStats[m.username] &&
	  m.password === playerToStats[m.username].password) {
	const token = Math.random().toString().substring(2);
	playerToToken[m.username] = token;
	console.log(`Player to token = ${JSON.stringify(playerToToken)}`);
	playerToSocket[m.username] = socket;
	socket.emit('token', token);
	io.emit('update-users-online', listPlayersOnline());
      } else {
	console.log(`Invalid password ${m.password} for ${m.username}`);
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
      console.log('received challenge msg', m);
      if (playerToToken[m.p1] == m.token
          && m.p1 != m.p2) {
        playerToChallenge[m.p1] = m.p2; // If no socket for p2, should remove from playerToChallenge
	
	tryEmit(m.p2, 'challenge', { p1: m.p1 });
      } else {
	console.log(
	  `Ignoring challenge because supplied token ${m.token} ` +
	    `for supposed user ${m.p1} does not ` +
	    `match ${JSON.stringify(playerToToken)}`
	);
      }
    }
  );
  socket.on(
    'challenge-accepted',
    m => {
      console.log('received challenge-accepted msg', m);
      if (playerToToken[m.p2]==m.token
          && playerToChallenge[m.p1]==m.p2) {
        playerToChallenge[m.p1] = null;
        const gameId = Math.random().toString().substring(2);
        games[gameId] = newGame(m.p1, m.p2);
        playerToGame[m.p1] = gameId;
        playerToGame[m.p2] = gameId;
        socket.emit('start-game', { gameId: gameId, player: "black" }); // sending gameId busts cache
        tryEmit(m.p1, 'start-game', { gameId: gameId, player: "white" });
      } else { console.log('Challenge accepted ignored'); }
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
      console.log(`Looking up game ${m.gameId} in games = ${JSON.stringify(games)}`);
      socket.emit('initial-game-state', games[m.gameId].state);
    }
  );
  socket.on(
    'move',
    function (m) {
      console.log('received move: ', m);
      const game = games[m.gameId];
      //const activePlayer = (game.state.turnNumber%2==0 ? game.white : game.black);

      activeColor = game.state.active;
      activePlayer = game[activeColor];
      const requiredToken = playerToToken[activePlayer];
      console.log(
	`Active player ${game.state.active}, `
	+`tokens ${JSON.stringify(playerToToken)}`);
      if (m.token==requiredToken
          && isLegalMove(game.state, m.from, m.to)) {
        console.log("Legal move confirmed");
        var newState = moveToken(game.state, m.from, m.to);
        game.state = newState;
        const winner = gameOver(game.state); // null if game is not over
        if (winner) {
          sendGameOver(game, winner);
        } else {
          sendGameState(game);
          console.log(
	    `After move, state is ${JSON.stringify(game.state)}`);
          // make this a function
          var retriesRemaining = 10;
          while (!legalMoveExists(newState)
                 && retriesRemaining > 0) {
            //throw "FAIL";
            retriesRemaining -= 1;
            console.log("No legal move", newState);
            sendToPlayers(game,
			  'chat-message',
			  `Roll = ${newState.dice}; no legal move`);
            newState = deepCopy(newState);
            newState.turnNumber += 1;
            newState.active = pone(newState); // create nextTurn function
            rollDice(newState);
            sendGameState(game);
          };
        }
      } else {
        console.log(
	  `Got ${m.token==requiredToken} for `
	  + `${m.token} == ${requiredToken}.`);
        console.log(
	  `Got ${isLegalMove(game.state, m.from, m.to)} `
	  + `for legal move `
	  + `${[JSON.stringify(game.state), m.from, m.to]}? `);
      }
    }
  );
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
