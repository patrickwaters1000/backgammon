const sqlite = require('sqlite3').verbose();
const { drop } = require('./utils.js');

const tokenToUserName = {};

exports.getUserName = (token) => {
  const user = tokenToUserName[token];
  if (user == null) {
    console.log(`Invalid token ${token}`);
  }
  return user;
};

exports.getActiveUsers = () => Object.values(tokenToUserName);

// Move to utils?
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

// callback is function of whether login was successful
// uses a callback because the query is asynchronous
function authenticate (name, password, callback) {
  let db = connect();
  db.all(
    `SELECT password FROM users WHERE name = '${name}'`,
    [],
    (dbErr, rows) => {
      if (dbErr) { console.log(dbErr); }
      console.log('rows',JSON.stringify(rows));
      const authentic =
	    (rows.length==1
	     && rows[0].password == password);
      console.log('Authentic:', authentic);
      callback(authentic);
    }
  );
  //db.close();
}

const deleteOldTokens = (userName) => {
  let oldTokens = Object.keys(tokenToUserName).filter(token => {
    return tokenToUserName[token] == userName;
  });
  oldTokens.forEach(token => {
    delete tokenToUserName[token];
  });
}; 

// Can promises help flatten / simplify this?
exports.login = (m, callback) => {
  const { name, password } = m;
  authenticate(
    name,
    password,
    authentic => {
      let token;
      if (authentic) {
	deleteOldTokens(name);
	token = Math.random().toString().substring(2);
	tokenToUserName[token] = name;
	console.log(`Gave token ${token} to ${name}`);
      }
      callback(authentic, token);
    }
  );
};

// If a user is logged out, we must abort all their games, but this
// isn't the right place in the code for that.
exports.logout = (token) => {
  if (name) {
    delete tokenToUserName[token];
    return true;
  } else { return false; }
};
