const Game = require('./game.js');
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const { getUser,
	login,
	logout,
	updateSocket,
	listActiveUsers,
	prepareActiveUsersMsg,
	announceActiveUsersToAll,
	challenge,
	cancelChallenge,
	acceptChallenge,
	declineChallenge } = require('./active-users.js');
const { newGame,
	roll,
	move,
	resign,
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

app.use(express.static('dist'));

app.get('/', function(req, res) {
  res.sendFile(`${__dirname}/dist/backgammon.html`);
});

app.get('/replay', function(req, res) {
  res.sendFile(`${__dirname}/dist/replayGame.html`);
});

io.on('connection', function(socket) {
  console.log('Connection!');

  socket.on('watch', token => {
    user = getUser(token);
    watchGame(user);
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
    m => {
      console.log('received login:', JSON.stringify(m));
      login(socket, m, success => {
	if (success) {
	  announceActiveUsersToAll();
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
    let user = getUser(m.token);
    let resp = prepareActiveUsersMsg(user);
    console.log(`sending active users ${JSON.stringify(resp)}`);
    socket.emit('active-users', resp);
  });
  
  socket.on('challenge', m => {
    console.log('received challenge:', JSON.stringify(m));
    challenge(m.token, m.to);
  });

  socket.on('cancel-challenge', m => {
    console.log('received cancel-challenge:', JSON.stringify(m));
    cancelChallenge(m.token, m.to);
  });

  socket.on('challenge-accepted', m => {
    console.log('received challenge-accepted:', JSON.stringify(m));
    const [p1, p2] = acceptChallenge(m.token, m.to);
    newGame(p1,p2);
  });

  socket.on('challenge-declined', m => {
    console.log('received challenge-declined:', JSON.stringify(m));
    declineChallenge(m.token, m.to);
  });
  
  socket.on('roll', m => {
    console.log('received roll:', JSON.stringify(m));
    try {
      roll(m.token, m.gameId);
    } catch (e) {
      if (e.name == 'GameNotFound') {
	console.log(e);
      } else { throw e; }
    }
  });
  
  socket.on('move', m => {
    console.log('received move:', JSON.stringify(m));
    try {
      move(m.token, m.gameId, m.from, m.to);
    } catch (e) {
      if (e.name == 'GameNotFound'
	  || e.name == 'IllegalMove') {
	console.log(e);
      } else { throw e; }
    }
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
