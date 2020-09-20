const sqlite = require('sqlite3').verbose();
const activeUsers = {}; // map of token to several fields
//exports.activeUsers = activeUsers;
const userToToken = {};
const { drop } = require('./utils.js');

// What happens to exceptions in async functions?
class UserNotFound extends Error {
  constructor (msg) {
    super(msg);
    this.name = "UserNotFound";
  }
};

exports.UserNotFound = UserNotFound;

function getUser(token) {
  const user = activeUsers[token];
  if (!user) {
    throw new UserNotFound(`User ${token} not found.`);
  }
  return user;
}

exports.getUser = getUser;

function connect () {
  let db = new sqlite.Database(
    './db/primary.db',
    sqlite.OPEN_READONLY,
    err => {
      if (err) {
	console.log(err);
      }
    }
  );
  return db;
};

function newActiveUser (name, socket) {
  const token = Math.random().toString().substring(2);
  activeUsers[token] = {
    token: token,
    name: name,
    socket: socket,
    challenges: [], // challenges opened by player
  };
  userToToken[name] = token;
  return token;
}

exports.listActiveUsers = () => {
  return Object.values(activeUsers).map( user => user.name );
};

function addKeyIfMissing (o, k) {
  if (!Object.keys(o).includes(k)) {
    o[k] = {};
  }
}

function prepareActiveUsersMsg (toUser) {
  let msg = {};
  let logThis = Object.values(activeUsers).map(
    user => user.name
  );
  console.log(
    `Preparing active users msg ${JSON.stringify(logThis)}`
  );
  Object.values(activeUsers).forEach(
    user => {
      addKeyIfMissing(msg, user.name);
      if (user.name == toUser.name) {
	user.challenges.forEach(
	  otherUserName => {
	    addKeyIfMissing(msg, otherUserName);
	    msg[otherUserName].outgoing = true;
	  });
      } else {
	if (user.challenges.includes(toUser.name)) {
	  msg[user.name].incoming = true;
	}
      }
    },
  );
  return msg;
}

exports.announceActiveUsersToAll = () => {
  Object.values(activeUsers).forEach(user => {
    user.socket.emit(
      'active-users',
      prepareActiveUsersMsg(user.name)
    );
  });
}

exports.prepareActiveUsersMsg = prepareActiveUsersMsg;

// callback is function of whether login was successful
function authenticate (name, password, callback) {
  let db = connect();
  db.all(
    `SELECT password FROM users WHERE name = '${name}'`,
    [],
    (dbErr, rows) => {
      if (dbErr) { console.log(dbErr); }
      console.log('rows',JSON.stringify(rows));
      const authentic =
	    (!userToToken[name]
	     && rows.length==1
	     && rows[0].password == password);
      console.log('Authentic:', authentic);
      callback(authentic);
    }
  );
  //db.close();
}

exports.login = (socket, m, callback) => {
  const { name, password } = m;
  authenticate(
    name,
    password,
    authentic => {
      if (authentic) {
	const token = newActiveUser(name, socket);
	console.log(`Gave token ${token} to ${name}`);
	socket.emit('token', token);
      }
      callback(authentic);
    }
  );
};

exports.updateSocket = (token, socket) => {
  activeUsers[token].socket = socket;
  console.log(`Updated socket for token ${token}`);
}

// If a user is logged out, we must abort all their games, but this
// isn't the right place in the code for that.
exports.logout = (token) => {
  const name = activeUsers[token];
  if (name) {
    delete activeUsers[token];
    delete userToToken[name];
    return true;
  } else { return false; }
};

// If a name is in user->token, it is assumed that the token is a key
// of activeUsers.

// For bots in particular, it makes sense to allow challenges even if
// both players already have active games. Currently, we even allow
// multiple challenges from p1 to p2.

exports.challenge = (token1, name2) => {
  const user1 = getUser(token1);
  const user2 = getUser(userToToken[name2]);
  if (!user1.challenges.includes(user2.name)) {
    user1.challenges.push(user2.name);
    console.log(`Forwarding challenge to ${name2}`);
    user2.socket.emit('challenge', { from: user1.name });
    user2.socket.emit(
      'active-users',
      prepareActiveUsersMsg(user2.name)
    );
  }
};

exports.cancelChallenge = (token1, name2) => {
  const user1 = getUser(token1);
  const user2 = getUser(userToToken[name2]);
  if (drop(user1.challenges, name2)) {
    user2.socket.emit('cancel-challenge', { from: user1.name });
  }
};

// A player may have received multiple challenges, and thus must
// declare who he is answering.
exports.acceptChallenge = (token2, name1) => {
  const user2 = getUser(token2);
  const user1 = getUser(userToToken[name1]);
  if (drop(user1.challenges, user2.name)) {
    user1.socket.emit('challenge-accepted', { from: user2.name });
    return [user1, user2];
  }
};

exports.declineChallenge = (token2, name1) => {
  const user2 = getUser(token2);
  const user1 = getUser(userToToken[name1]);
  if (drop(user1.challenges, user2.name)) {
    user1.socket.emit('challenge-declined', { from: user2.name });
  }
};  
