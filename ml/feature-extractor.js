const fs = require('fs');
const sqlite = require('sqlite3').verbose();
const { newGame,
	setDice,
	move,
	winner,
        hasLegalMove,
        nextTurn,
        nextTurnIfNoMove } = require('../game.js');
const { deepCopy } = require('../utils.js');
const { pipScore,
	rollScore,
	winReward,
	extractFeatures,
	getVWLine } = require('./feature-lib.js');
var argv = require('minimist')(process.argv.slice(2));


function buildTransitions (history) {
  // Rebuilds a list of game state transitions from a history of moves and rolls.
  const state = newGame();
  let lostRollScore = 0;
  const transitions = [];
  history.forEach( row => {
    const [header, data] = row;
    if (header == 'roll') {
      const dice = deepCopy(data);
      setDice(state, dice);
      if (!hasLegalMove(state)) {
	lostRollScore -= rollScore(state);
	nextTurn(state);
      }
    } else if (header == 'move') {
      const [from, to] = data;
      let oldState = deepCopy(state);
      move(state, { from: from, to: to });
      let newState = deepCopy(state);
      transitions.push(
	{ from: oldState,
	  to: newState,
	  reward: (winReward(newState) + lostRollScore
		   + pipScore(newState) + rollScore(newState)
		   - pipScore(oldState) - rollScore(oldState)) }
      );
      nextTurnIfNoMove(state);
      lostRollScore = 0;
    } else {
      throw new Error(`Header ${header} not recognized`);
    }
  });
  return transitions;
}

exports.buildTransitions = buildTransitions;

function propagateRewards(transitions, q) {
  transitions.reverse()
  let sdfr = 0; // sum of discounted future rewards
  transitions.forEach( t => {
    const { reward } = t;
    sdfr = q * sdfr + reward;
    t.sdfr = sdfr;
  });
  transitions.reverse();
  return transitions;
}
exports.propagateRewards = propagateRewards;


/*
t => {
    extractFeatures(t);
    ex = t.features;
    ex["_label"] = {"Label": t.sdfr, "Weight": 1.0 };
    return ex;
  }
*/

function getVWExamples (gameHistory) {
  const transitions = buildTransitions(gameHistory);
  propagateRewards(transitions, 0.5);
  return transitions.map(getVWLine);
}

exports.getVWExamples = getVWExamples;


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
}


function getGameIds(db) {
  const sql = `SELECT id FROM games`;
  const p = new Promise( (res, rej) => {
    db.all(
      sql,
      [],
      (err, rows) => {
	if (err) { rej(err); }
	else { res(rows.map( r => r.id )); }
      }
    );
  });
  return p;
}


function readGame (gameId) {
  let db = connect();
  const sql = `SELECT history FROM games WHERE id = ${gameId}`;
  const p = new Promise( (res, rej) => {
    db.all(
      sql,
      [],
      (err, rows) => {
	if (err) { rej(err); }
	else {
	  //console.log(rows);
	  res(JSON.parse(rows[0].history));
	}
      }
    );
    db.close();
  });
  return p;
}

function writeVWTrainingSet(gameIds, db, file) {
  let firstLine = true;
  gameIds.forEach( id => {
    readGame(id)
      .then( gameHistory => {
	const examples = getVWExamples(gameHistory);	
	let s = examples.join('\n');
	if (firstLine) {
	  fs.writeFileSync(file, '');
	  firstLine = false;
	} else { s = '\n'+s; }
	fs.writeFileSync(file, s, { flag: "a" });
      }, err => {
	console.log(err);
      })
      .then( () => {
	//fs.writeFileSync(file, ']', {flag: "a"})
      }, err => {
        console.log(id,err);
      });
  });
}

exports.writeVWTrainingSet = writeVWTrainingSet;

if (argv['f']) {
  const db = connect();
  getGameIds(db).then( gameIds => {
    //console.log(gameIds);
    writeVWTrainingSet(gameIds, db, 'train.json');
  });
  db.close();
}
