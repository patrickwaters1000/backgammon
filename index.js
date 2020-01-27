var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var playerToToken = {}; // in memory
var playerToSocket = {}; // in memory
var playerToGame = {}; // in memory
var playerToChallenge = {}; // p1 maps to p2 if p1 has an open challenge to p2, in memory
// var playerToStats = {}; // read and write to disk
var games = {}; // gameId to object with keys white, black, state; in memory

var fs = require("fs");

function tryEmit (player, msgType, msgData) {
  const socket = playerToSocket[player];
  if (socket) {
    console.log(`Sending ${msgType} ${JSON.stringify(msgData)} to ${player}`);
    socket.emit(msgType, msgData);
  }
  else { console.log(`No socket for ${player}`); }
}

function sendToPlayers(game, msgType, msgData) {
  ["white","black"].forEach( color => {
    tryEmit(game[color], msgType, msgData);
  });
}

function range (i,j) {
  return (j
          ? Array(j-i).fill(0).map( (_, idx) => idx+i )
          : Array(i).fill(0).map( (_, idx) => idx ) );
}

// Shouldn't need this. All messages should send username.
// If the client doesn't known its username the server doesn't either.
function tokenToPlayer (token) {
  for (player in playerToToken) {
    if (playerToToken[player]==token) { return player; }
  }
  console.log(`Couldn't find token ${token}`);
}

var initialWhiteTokensPerPip =
    [
      0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 2,
      2, 0, 0, 0, 0, 0,
      0
    ];
/*[
  0, // bar area for white, home area for black
  2, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 5,
  0, 0, 0, 0, 3, 0,
  5, 0, 0, 0, 0, 0,
  0 // home area for white, bar area for black
  ];
*/

const initialGameState = {
  tokensPerPip: {
    white: initialWhiteTokensPerPip,
    black: range(26).map(
      i => initialWhiteTokensPerPip[25-i]
    )
  },
  turnNumber: 0,
  selectedToken: null,
  dice: [0,0],
  movesToPlay: null,
  active: "white"
};

function pone(s) { // 'pone' is opponent of active player
  return (s.active=="white" ? "black" : "white");
}

function bar(s) {
  return (s.active=="white" ? 0 : 25);
}

function home(s) {
  return (s.active=="white" ? 25 : 0);
}

function homeQuadrant(s, pip) {
  return (s.active=="white" ? (pip > 18) : (pip < 7));
}

function sign(s) { // I am sad that this fn exists
  return (s.active=="white" ? 1 : -1);
}

function rollDice(s) {
  s.dice = s.dice.map( x => Math.ceil(6 * Math.random()) );
  s.movesToPlay = (s.dice[0]==s.dice[1]
                   ? Array(4).fill(s.dice[0])
                   : deepCopy(s.dice));
}

function newGame(white, black) {
  var state = initialGameState;
  rollDice(state);
  return {
    white: white,
    black: black,
    state: state
  };
}

function deepCopy(s) {
  return JSON.parse(JSON.stringify(s));
}

function diceSupportMove(s, from, to) {
  const diff = sign(s) * (to - from);
  return s.movesToPlay.includes(diff); // case of not bearing out exactly handled in bearOutrulesupportsmove
}

function tokensSupportMove(s, from, to) {
  return (s.tokensPerPip[s.active][from] > 0
          && s.tokensPerPip[pone(s)][to] < 2);
}

function barRuleSupportsMove(s, from) {
  return s.tokensPerPip[s.active][bar(s)]==0 || from==bar(s);
}

function bearOutRuleSupportsMove(s, from) {
  const exactRoll = s.movesToPlay.includes(sign(s)*(home(s) - from));
  const furthestPip = s.tokensPerPip[s.active].reduce(
    (m, numTokens, pip) => ((numTokens>0
                             && sign(s) * (pip - m) < 0)
                            ? pip
                            : m),
    home(s)
  );
  const allTokensInHomeQuadrant = homeQuadrant(s, furthestPip);
  const longestMove = Math.max(...s.movesToPlay);
  return (allTokensInHomeQuadrant
          && (exactRoll
              || (from == furthestPip
                  && (longestMove > sign(s) * (home(s) - furthestPip)))));
}


function sendToBarIfNecessary(s, pip) {
  b = s.tokensPerPip[pone(s)]
  if (b[pip] == 1) {
    b[pip] = 0;
    b[home(s)] += 1; // home(s) is bar of pone
  }
}

function getIdxOfMove(movesToPlay, dist) {
  const largestMove = Math.max(...movesToPlay);
  if (movesToPlay.includes(dist)) {
    console.log(`Making an exact move, because ${JSON.stringify(movesToPlay)} includes ${dist}`);
    return movesToPlay.indexOf(dist);
  } else {
    console.log(`Using the largest roll to bear out since ${JSON.stringify(movesToPlay)} does not include ${dist}.`);
    return movesToPlay.indexOf(largestMove);
  }
}


// Currently some functions return a deep copy, and others mutate state.
// Choose one paradigm and stick to it
function moveToken(gameState, from, to) {
  var s = deepCopy(gameState);
  sendToBarIfNecessary(s, to);
  s.tokensPerPip[s.active][from] -= 1;
  s.tokensPerPip[s.active][to] += 1;
  const idx = getIdxOfMove(s.movesToPlay, sign(s)*(to-from));
  s.movesToPlay.splice(idx, 1);
  if (s.movesToPlay.length == 0) {
    s.turnNumber += 1;
    rollDice(s);
    s.active = pone(s);
  }
  s.selectedToken = null;
  return s;
}

function isLegalMove(s, from, to) {
  if (!barRuleSupportsMove(s, from)) {
    console.log("Bar rule forbids move");
    return false;
  } else if (!tokensSupportMove(s, from, to)) {
    console.log("Move forbidden because pone controls 'to' pip");
    return false;
  } else {
    if (to == home(s)) {
      if (!bearOutRuleSupportsMove(s, from)) {
        console.log("Bear out rule forbids move");
        return false;
      } else { return true; }
    } else {
      if (!diceSupportMove(s, from, to)) {
        console.log("Dice don't support move");
        return false;
      } else { return true; }
    }
  }
}

function legalMoveExists(s) {
  console.log("Checking if a legal move exists");
  let fromPips = range(26).filter(i => (s.tokensPerPip[s.active][i] > 0));
  console.log(`Active player has tokens on the following pips ${fromPips}`);
  var foundLegalMove = false;
  fromPips.forEach( from => {
    let toPips = s.movesToPlay.map( dist => from + sign(s)*dist).concat([home(s)]);
    console.log(`From pip ${from}, gonna check if legal move to ${toPips}`);
    toPips.forEach( to => {
      if (isLegalMove(s, from, to)) { foundLegalMove = true; }
      else { console.log(`From ${from} to ${to} is not legal`); }
    });
  });
  return foundLegalMove;
}

app.use(express.static('public'));

app.get('/', function(req, res){
  // var token = Math.random().toString().substring(2);
  res.sendFile(`${__dirname}/public/login.html`);
});

function hasWon(state, color) {
  const home = (color === "white" ? 25 : 0);
  return state.tokensPerPip[color].reduce(
    (m, tokens, pip) => (m && (tokens === 0 || pip === home)),
    true
  );
}

function gameOver(s) {
  if (hasWon(s, "white")) {
    return "white";
  } else if (hasWon(s, "black")) {
    return "black";
  } else {
    return null;
  }
}

function sendGameOver(game, winningColor) {
  const winningPlayer = game[winningColor];
  const losingColor = (winningColor === "white" ? "black" : "white");
  const losingPlayer = game[losingColor];
  const data = fs.readFileSync(`${__dirname}/players`);
  const playerToStats = JSON.parse(data);
  playerToStats[winningPlayer].wins += 1;
  playerToStats[losingPlayer].losses += 1;
  fs.writeFileSync(`${__dirname}/players`, JSON.stringify(playerToStats));
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
  
  socket.on('update-socket', token => { // when transitioning from the ante-room to the game, need new socket
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
      console.log(`Active player ${game.state.active}, tokens ${JSON.stringify(playerToToken)}`);
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
          console.log(`After move, state is ${JSON.stringify(game.state)}`);
          // make this a function
          var retriesRemaining = 10;
          while (!legalMoveExists(newState)
                 && retriesRemaining > 0) {
            //throw "FAIL";
            retriesRemaining -= 1;
            console.log("No legal move", newState);
            sendToPlayers(game, 'chat-message',`Roll = ${newState.dice}; no legal move`);
            newState = deepCopy(newState);
            newState.turnNumber += 1;
            newState.active = pone(newState); // create nextTurn function
            rollDice(newState);
            sendGameState(game);
          };
        }
      } else {
        console.log(`Got ${m.token==requiredToken} for ${m.token} == ${requiredToken}.`);
        console.log(`Got ${isLegalMove(game.state, m.from, m.to)} for legal move ${[JSON.stringify(game.state), m.from, m.to]}? `);
      }
    }
  );
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
