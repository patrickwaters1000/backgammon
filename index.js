const Game = require('./game.js');
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const { login,
	logout,
	getUserName,
	getActiveUsers } = require('./authentication.js');
const { prepareActiveUsersMsg,
	openChallenge,
	closeChallenge,
	challengeIsOpen,
	prepareChallengesMsg } = require('./active-users.js');
const { newGame,
	canRoll,
	roll,
	canMove,
	move,
	resign,
	getGameInfoMsg,
	getGameStateMsg,
	getGamesSummaryMsg,
	getAudience,
        watchGame } = require('./active-games.js');
const { connect,
        query } = require('./sql-utils.js');

/*
NOTE: there could be a "sync" every 10s where the server checks
whether users are still there and then sends updates activeUsers to
each activeUser

NOTE: when making a move, the user should send game id, since in
principle we could support a single user playing multiple games

TODO: Doubling cube and bank rolls
TODO: Each player rolls one die at start of game
TODO: refactor code for authenticating messages
TODO: something better for players "db"
TODO: WHAT ABOUT USERNAME COLLISIONS? (What if two copies of the
same bot log in or a player logs in twice?)
TODO: Use https
TODO: log out inactive players

Nice to have
* Unit tests for ative-users and active-games
* Use get-user fn that throws user not found exception instead of 
  checking whether the user is null
* SQLite tables for games etc.
*/

userNameToSocket = {};
const getSocket = (userName) => {
  const socket = userNameToSocket[userName];
  if (socket == null) {
    console.log(`Can't find socket for ${userName}`);
  }
  return socket;
};

function send (userName, header, msg) {
  let socket = userNameToSocket[userName];
  if (socket != null) {
    socket.emit(header, msg);
  } else {
    console.log(`Failed to send to ${userName} (null socket)`);
  }
}

app.use(express.static('dist'));

app.get('/', function(req, res) {
  res.sendFile(`${__dirname}/dist/backgammon.html`);
});

app.get('/watch', function(req, res) {
  res.sendFile(`${__dirname}/dist/watchGame.html`);
});

io.on('connection', function(socket) {
  console.log('Connection!');

  socket.on('watch-game', msg => {
    const { token, gameId } = msg;
    user = getUserName(token);
    watchGame(user, gameId);
  });

  socket.on('replay-game', gameId => {
    const db = connect();
    const sql = `SELECT history FROM games WHERE id=${gameId}`;
    query(db, sql)
      .then( rows => {
	console.log(rows);
	const history = JSON.parse(rows[0].history);
	socket.emit('history', history);
	//res.setHeader('Content-Type', 'application/json');
	//res.end(rows[0].history);
      });
    db.close();
  });
  
  socket.on(
    'login',
    msg => {
      console.log('received login:', JSON.stringify(msg));
      login(msg, (success, token) => {
	if (success) {
	  userNameToSocket[msg.name] = socket;
	  socket.emit('token', token);
	  io.emit('active-users', getActiveUsers());
	} else {
	  console.log('Login failed');
	  socket.emit('login-failed');
	}
      });
    }
  );

  // TODO: Check that the token is valid when handling each msg.
  socket.on('logout', m => {
    console.log('received logout:', JSON.stringify(m));
    logout(m.token);
  });

  socket.on('request-active-users', m => {
    socket.emit('active-users', getActiveUsers());
  });

  socket.on('request-current-games', m => {
    console.log(
      'Sending current games ',
      JSON.stringify(getGamesSummaryMsg()));
    socket.emit('current-games', getGamesSummaryMsg());
  });

  socket.on('request-challenges', msg => {
    let userName = getUserName(msg.token);
    if (userName != null) {
      let resp = prepareChallengesMsg(user);
      console.log(`sending active users ${JSON.stringify(resp)}`);
      socket.emit('challenges', resp);
    }
  });
  
  socket.on('update-challenges', m => {
    let { token, to, action } = m;
    let from = getUserName(token)
    if (from != null) {
      console.log('received: ', JSON.stringify(m));
      switch (action) {
      case 'open':
	openChallenge(from, to);
	break;
      case 'cancel':
	closeChallenge(from, to);
	break;
      case 'decline':
	closeChallenge(to, from);
	break;
      case 'accept':
	if (challengeIsOpen(to, from)) {
	  closeChallenge(to, from);
	  let gameId = newGame(from, to);
	  let gameInfoMsg = getGameInfoMsg(gameId);
	  console.log(JSON.stringify(gameInfoMsg));
	  socket.emit('game-info', gameInfoMsg);
	  send(to, 'game-info', gameInfoMsg);
	  let gameStateMsg = getGameStateMsg(gameId);
	  socket.emit('game-state', gameStateMsg);
	  send(to, 'game-state', gameStateMsg);
	  io.emit('current-games', getGamesSummaryMsg());
	}
	break;
      }
      socket.emit('challenges', prepareChallengesMsg(from));
      send(to, 'challenges', prepareChallengesMsg(to));
    }
  });
  
  socket.on('roll', msg => {
    console.log('received roll:', JSON.stringify(msg));
    let { token, gameId } = msg;
    user = getUserName(token);
    if (user && canRoll(gameId, user)) {
      roll(gameId);
      msg = getGameStateMsg(gameId);
      getAudience(gameId).forEach(user => {
	send(user, 'game-state', msg);
      });
    } else {
      console.log('Failed to roll');
    }
  });
  
  socket.on('move', msg => {
    console.log('received move:', JSON.stringify(msg));
    let { token, gameId, from, to } = msg;
    user = getUserName(token);
    if (user && canMove(gameId, user)) {
      try {
	winner = move(gameId, from, to);
	msg = getGameStateMsg(gameId);
	getAudience(gameId).forEach(user => {
	  send(user, 'game-state', msg);
	  if (winner) {
	    let gameOverMsg = {gameId: gameId, winner: winner};
	    send(user, 'game-over', gameOverMsg);
	    io.emit('current-games', getGamesSummaryMsg());
	  }
	});
      } catch (err) {
	if (err.name == "IllegalMove") {
	  console.log(err);
	} else {
	  throw err;
	}
      }
    }
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
