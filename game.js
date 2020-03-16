const { range,
	reversed,
	deepCopy
      } = require('./utils.js');

class IllegalMove extends Error {
  constructor (msg, reasons) {
    super(msg);
    this.name = "IllegalMove";
    this.reasons = reasons;
  }
};
exports.IllegalMove = IllegalMove;

// Using a function, lest the "initial state" be mutated.
function initialTokens () {
  return [
    0, // bar area for white, home area for black
    2, 0, 0, 0, 0, -5, 0, -3, 0, 0, 0, 5,
    -5, 0, 0, 0, 3, 0, 5, 0, 0, 0, 0, -2,
    0 // home area for white, bar area for black
  ];
}

function newGame () {
  const g = {
    active: "white",
    dice: null,
    rollsToPlay: null,
    tokens: initialTokens()
  };
  return g;
}

function nextPlayer (s) {
  s.active = (s.active == "white"
	      ? "black" : "white");
}

function rollDice (s) {
  s.dice = [0,0].map(
    x => Math.ceil(6 * Math.random())
  );
}

function setRollsToPlay (s) {
  //console.log('Dice:',JSON.stringify(s.dice));
  s.rollsToPlay =
    (s.dice[0]==s.dice[1]
     ? Array(4).fill(s.dice[0])
     : s.dice.map( x=> x));
}

function occupiedPips (s) {
  pips = [];
  s.tokens.forEach( (numTokens, pip) => {
    if (numTokens > 0
	&& 1 <= pip <= 24) {
      pips.push(pip);
    }
  });
  return pips;
}

function inHomeQuadrant (pip) { 
  return pip > 18;
}

function checkValidPips(s, m) {
  const allowed = ( range(26).includes(m.from)
		    && range(26).includes(m.to) );
  if (!allowed) {
    return "To or from pip is not on board";
  }
}

// case of bearing out with inexact roll handled separately
function checkDiceSupportMove(s, m) {
  const diff = m.to - m.from;
  const allowed = (s.rollsToPlay.includes(diff)
		   || m.to == 25);
  if (!allowed) {
    return "Dice don't support move";
  }
}

function checkTokenOnFromPip(s, m) {
  const allowed = s.tokens[m.from] > 0;
  if (!allowed) {
    return "Player has no tokens on 'from' pip";
  }
}

function checkToPipNotOccupied(s, m) {
  const forbidden = s.tokens[m.to] < -1;
  if (forbidden) {
    return "Opponent controls 'to' pip";
  }
}

function checkBarRule(s, m) {
  const allowed = (s.tokens[0] == 0) || (m.from == 0);
  if (!allowed) {
    return "Player must move from bar";
  }
}

function checkTryingToBearOutEarly (s, m) {
  const pips = occupiedPips(s);
  const forbidden = ( m.to == 25
		      && Math.min(...pips) < 19 );
  if (forbidden) {
    return "Cannot bear out until all men in home quadrant";
  }
}

function checkDiceSupportBearingOut (s, m) {
  const pips = occupiedPips(s);
  const furthestPip = Math.min(...pips);
  const longestMove = Math.max(...s.rollsToPlay);
  const diff = m.to - m.from;

  const forbidden = (m.to == 25
		     && !s.rollsToPlay.includes(diff)
		     && (m.from != furthestPip
			 || m.from + longestMove < 25));
  if (forbidden) {
    return "Dice don't support bearing out";
  }
}

function forbiddenReasons (s, m) {
  return [
    checkValidPips,
    checkDiceSupportMove,
    checkTokenOnFromPip,
    checkToPipNotOccupied,
    checkBarRule,
    checkTryingToBearOutEarly,
    checkDiceSupportBearingOut
  ].map(
    f => f(s,m)
  ).filter(
    x => x
  );
}

function validateMove(s, m) {
  const reasons = forbiddenReasons(s, m);
  if (reasons.length > 0) {
    throw new IllegalMove(
      `Moving from ${m.from} to ${m.to} is illegal`,
      reasons
    );
  }
}

function sendToBarIfNecessary(s, pip) {
  if (s.tokens[pip] == -1) {
    s.tokens[pip] = 0;
    s.tokens[25] -= 1; // add to black token bar area
  }
}

function removeFromMovesToPlay (s, m) {
  const dist = m.to - m.from;
  const r = (
    s.rollsToPlay.includes(dist)
      ? dist
      : Math.max(...s.rollsToPlay)
  );
  const i = s.rollsToPlay.indexOf(r);
  s.rollsToPlay.splice(i, 1);
}

function move(s, m) {
  sendToBarIfNecessary(s, m.to);
  s.tokens[m.from] -= 1;
  if (m.to != 25) {
    s.tokens[m.to] += 1;
  }
  removeFromMovesToPlay(s, m);
  // Advancing the turn when there are no legal moves is a separate
  // operation.
}

function hasWon(s) {
  return occupiedPips(s).length == 0;
}

function reverseState(s) {
  s.tokens = s.tokens.map( men => -men );
  s.tokens.reverse();
  nextPlayer(s);
}

function hasLegalMove(s) {
  var toPips, m;
  for (from=0; from<25; from++) {
    toPips = s.rollsToPlay.map( d => from + d );
    toPips.push(25);
    for (i=0; i<toPips.length; i++) {
      to = toPips[i];
      m = { from: from, to: to };
      if (forbiddenReasons(s, m).length == 0) {
	return true;
      }
    }
  }  
  return false;
}

function legalMoves(s) {
  var toPips, m;
  const acc = [];
  occupiedPips(s).forEach( from => {
    s.rollsToPlay.forEach( diff => {
      m = { from: from,
	    to: Math.min(from + diff, 25) };
      if (forbiddenReasons(s, m).length == 0) {
	acc.push(m);
      }
    });
  });
  return acc;
}

function nextTurn (s) {
  nextPlayer(s);
  s.dice = null;
  s.rollsToPlay = [];
}

function tryMove (s, m) {
  validateMove(s, m);
  move(s, m);
  if (!hasLegalMove(s)) {
    nextTurn(s);
  }
}

function reverseMove(m) {
  m.from = 25 - m.from;
  m.to = 25 - m.to;
}

function withReversedState(f, s) {
  if (s.active == "black") {
    reverseState(s);
    const result = f(s);
    reverseState(s);
    return result;
  } else {
    return f(s);
  }
}

function withReversedStateAndMove(f, s, m) {
  if (s.active == "black") {
    reverseState(s);
    reverseMove(m);
    const result = f(s, m);
    reverseState(s);
    reverseMove(m);
    return result;
  } else {
    return f(s,m);
  }
}

exports.newGame = newGame;

exports.hasLegalMove = function (s) {
  return withReversedState(hasLegalMove, s);
};

exports.legalMoves = function (s) {
  if (s.active == "black") {
    reverseState(s);
    const moves = legalMoves(s);
    reverseState(s);
    moves.forEach( m => { reverseMove(m); });
    return moves;
  } else {
    return legalMoves(s);
  }
} 

exports.move = function (s, m) {
  return withReversedStateAndMove(tryMove, s, m);
};

exports.nextTurn = nextTurn;

// Used by bots
function setDice (s, dice) {
  s.dice = dice;
  setRollsToPlay(s);
  if (!hasLegalMove(s)) {
    nextTurn(s);
    return 'lost-roll'; // return value used only in ml feature extraction for determining whether a reward should be counted for losing the roll.
  }
}

exports.setDice = function (s, dice) {
  return withReversedState(
    s_ => setDice(s_, dice),
    s
  );
}

function roll (s) {
  rollDice(s);
  setRollsToPlay(s);
  const dice = deepCopy(s.dice);
  if (!hasLegalMove(s)) {
    nextTurn(s);
  }
  return dice;
}

exports.roll = function (s) {
  return withReversedState(roll, s);
}

exports.winner = function (s) {
  if (hasWon(s)) {
    return s.active;
  } else {
    reverseState(s);
    if (hasWon(s)) {
      return s.active;
    }
    reverseState(s);
  }
};


// Testing only below here

exports.setRollsToPlay = setRollsToPlay;


