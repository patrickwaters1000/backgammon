const Game = require('./game.js');
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const { login,
	logout,
	listActiveUsers,
	challenge,
	cancelChallenge,
	acceptChallenge,
	declineChallenge } = require('./active-users.js');
const { newGame,
	roll,
	move,
	resign } = require('./active-games.js');
const { connect,
        query } = require('./sql-utils.js');

// const Utils = require('./front/utils.js'); WHY NOT??

// The following are somewhat wrongly named since we may have both players and watchers

// to p2, in memory
// var playerToStats = {}; // read and write to disk

// NOTE: there could be a "sync" every 10s where the server checks
// whether users are still there and then sends updates activeUsers to
// each activeUser

// NOTE: when making a move, the user should send game id, since in
// principle we could support a signle user playing multiple games

// TODO: Doubling cube and bank rolls
// TODO: Each player rolls one die at start of game
// TODO: refactor code for authenticating messages
// TODO: something better for players "db"
// TODO: WHAT ABOUT USERNAME COLLISIONS? (What if two copies of the
// same bot log in or a player logs in twice?)
// TODO: Use https
// TODO: log out inactive players

/* 

Minimum steps to testing an ML algorithm against random bot
    1) Get app in playable state
2     a) Finish refactor of active games
2     b) Adapt random bot to new API
1     c) Implement writing games to disc
    2) Generate data set
1     a) Adapt "watch" script to replay a game from the table
0     b) Generate a few hundred games
1   3) Feature extraction pipeline
      a) From a game record, construct a list of states
      b) Backpropagate rewards
2   4) Build features (use functions of a state or a transition?)
      a) Number of pips
      b) "Expected number" of pips lost if pone plays greedy algorithm
        i) Sum over lone men
        ii) For each lone man, compute the number of opponent rolls that could hit him.
      c) Number of pips with X men for X=1, X=2, X=3, X>=4
    4) Training a simple model
      No a) Can try to predict the probability of random bot 1 winning against random bot 2
      or a') Can try to predict the observed discounted future rewards for a given transition
0     b) From a game, generate triples (old state, new state, reward)
1     c) Convert a triple to a feature vector and label
0     c) Iterate over games, writing training set to disc
1     d) Python script to train linear regression model
    5) Test it out
1     a) Adapt random bot to use the linear regression model
        i) Let it compute feature values on a state
        ii) Apply linear regression to get predicted values of new states
        iii) Choose best new state
0     b) Run many games, crunch the stats, inspect the games.
    



Nice to have
* Unit tests for ative-users and active-games
* Use get-user fn that throws user not found exception instead of checking whether the user is null
* SQLite tables for games etc.
*/


app.use(express.static('dist'));

app.get('/', function(req, res) {
  res.sendFile(`${__dirname}/public/login.html`);
});

app.get('/watch', function(req, res) {
  res.sendFile(`${__dirname}/dist/watchGame.html`);
});

app.get('/replay', function(req, res) {
  res.sendFile(`${__dirname}/dist/replayGame.html`);
});



app.get('/game', function(req, res) {
  
});

io.on('connection', function(socket) {
  console.log('Connection!');
  
  /*socket.on(
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
  );*/
  /*socket.on(
    'watch',
    m => {
      if ( m.userName ) {
	playerToSocket[m.userName] = socket;
	gameId = Object.keys(games)[0];
	if (games[gameId]) {
	  games[gameId].audience.push(m.userName);
	}
      }
    }
  );*/

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
	  io.emit(
	    'active-users',
	    listActiveUsers() // what should this do?
	  );
	} else {
	  console.log('Login failed', JSON.stringify(err));
	  socket.emit('login-failed', err);
	}
      });
    }
  );

  socket.on(
    'logout',
    m => {
      console.log('received logout:', JSON.stringify(m));
      logout(m.token);
    }
  );

  
  socket.on(
    'request-active-users',
    m => { io.emit('active-users', listActiveUsers()); }
  );
  
  socket.on(
    'challenge',
    m => {
      console.log('received challenge:', JSON.stringify(m));
      challenge(m.token, m.to);
    }
  );

  socket.on(
    'cancel-challenge',
    m => {
      console.log('received cancel-challenge:', JSON.stringify(m));
      cancelChallenge(m.token, m.to);
    }
  );

  socket.on(
    'challenge-accepted',
    m => {
      console.log('received challenge-accepted:', JSON.stringify(m));
      const [p1, p2] = acceptChallenge(m.token, m.to);
      newGame(p1,p2);
    }
  );

  socket.on(
    'challenge-declined',
    m => {
      console.log('received challenge-declined:', JSON.stringify(m));
      declineChallenge(m.token, m.to);
    }
  );
  
  /*socket.on('update-socket', token => { // when transitioning from the
  // ante-room to the game, need new socket
    var player = tokenToPlayer(token);
    playerToSocket[player] = socket;
    console.log(`Updated socket for ${player}`);
  });*/
  
  /*socket.on(
    'request-game-state',
    m => {
      console.log('received request-game-state',
		  JSON.stringify(m));
      const game = games[m.gameId];
      if (game) {
	socket.emit('game-state', game.state);
      } else {
	console.log("Game not found");
      }
    }
  );*/

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
