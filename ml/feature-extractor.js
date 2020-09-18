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
const { connect,
	query } = require('../sql-utils.js');
var argv = require('minimist')(process.argv.slice(2));


function buildTransitions (history) {
  // Rebuilds a list of game state transitions from a history of moves and rolls.
  const state = newGame();
  const transitions = [];
  var currentTransition;
  history.forEach( row => {
    const [header, data] = row;
    if (header == 'roll') {
      const dice = deepCopy(data);
      setDice(state, dice);
      currentTransition = { from: deepCopy(state) };
    } else if (header == 'move') {
      const [from, to] = data;
      move(state, { from: from, to: to });
    } else { throw new Error(`Header ${header} not recognized`); }
    if (!hasLegalMove(state)) {
      currentTransition.to = deepCopy(state);
      const { to, from } = currentTransition;
      currentTransition.reward = (winReward(to) + pipScore(to)
				  - pipScore(from) - rollScore(from));
      transitions.push(currentTransition);
      nextTurn(state);
    } 
  });
  return transitions;
}

// Combine reward for move with pone's next ply
function forwardSumRewards (transitions) {
  transitions.forEach( (t, i) => {
    nextT = transitions[i+1] || { reward: 0 };
    t.fullReward = t.reward + nextT.reward;
  });
}

exports.forwardSumRewards = forwardSumRewards;

exports.buildTransitions = buildTransitions;

function propagateRewards(transitions, q) {
  transitions.reverse()
  let sdfr = 0; // sum of discounted future rewards
  transitions.forEach( t => {
    const { fullReward } = t;
    sdfr = q * sdfr + fullReward;
    t.sdfr = sdfr;
  });
  transitions.reverse();
  return transitions;
}
exports.propagateRewards = propagateRewards;

function getVWExamples (gameHistory) {
  const transitions = buildTransitions(gameHistory);
  forwardSumRewards(transitions);
  propagateRewards(transitions, 0.5);
  return transitions.map(getVWLine);
}

exports.getVWExamples = getVWExamples;

function writeVWTrainingSet(gameIds, db, file) {
  let firstLine = true;
  gameIds.forEach( id => {
    query(db, `SELECT history FROM games WHERE id = ${id}`)
      .then( rows => {
	const gameHistory = JSON.parse(rows[0].history)
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
  query(db, `SELECT id FROM games`)
    .then( gameIds => {
      writeVWTrainingSet(
	gameIds.map( row => row.id ),
	db,
	'train.vw'
      );
    });
  db.close();
}
