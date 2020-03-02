function range (i,j) {
  return (j
          ? Array(j-i).fill(0).map( (_, idx) => idx+i )
          : Array(i).fill(0).map( (_, idx) => idx ) );
}

function reversed (a) {
  const n = a.length;
  return range(n).map( i => a[n-i] );
}

const initialTokens = [
  0, // bar area for white, home area for black
  2, 0, 0, 0, 0, -5,
  0, 0, 0, 0, -3, 5,
  0, 0, 0, 0, 3, -5,
  5, 0, 0, 0, 0, -2,
  0 // home area for white, bar area for black
];

function newGame (w,b) {
  const g = {
    players: { white: w, black: b },
    active: "white",
    dice: null,
    rollsToPlay: null,
    tokens: initialTokens
  };
  rollDice(g);
  return g;
}

function nextPlayer (s) {
  s.active = (s.active == "white"
	      ? "black" : "white");
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

function rollDice (s) {
  s.dice = [0,0].map(
    x => Math.ceil(6 * Math.random())
  );
}

function setRollsToPlay (s) {
  s.rollsToPlay =
    (s.dice[0]==s.dice[1]
     ? Array(4).fill(s.dice[0])
     : s.dice.map( x=> x));
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
  const allowed = (tokens[0] == 0) || (m.from == 0);
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

function forbiddenReasons(s, m) {
  const reasons = [
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
  return ( reasons.length == 0 ? null : reasons);
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
  // Advancing the turn if no legal moves should cover this
  if (s.rollsToPlay.length == 0) {
    rollDice(s);
    setRollsToPlay(s);
  }
  nextPlayer(s);
}

function moveIfLegal (s, m) {
  const reasons = forbiddenReasons(s, m);
  const canMove = !reasons;
  if (canMove) {
    move(s,m);
  }
  return [canMove, reasons];
}


function hasWon(s) {
  return occupiedPips(s).length == 0;
}

function reverseState(s) {
  s.tokens = s.tokens.map( men => -men );
  s.tokens.reverse();
  nextPlayer(s);
}

function legalMoveExists(s) {
  var toPips, m;
  for (from=0; from<25; from++) {
    toPips = s.rollsToPlay.map( d => from + d );
    toPips.push(25);
    for (i=0; i<toPips.length; i++) {
      to = toPips[i];
      m = { from: from, to: to };
      if (!forbiddenReasons(s, m)) {
	return true;
      }
    }
  }  
  return false;
}

function legalMoveExistsOrNextTurn(s) {
  // If there is a legal move, returns true.
  // Else advances the turn and returns false.
  if (legalMoveExists(s)) {
    return true;
  }
  nextPlayer(s);
  rollDice(s);
  setRollsToPlay(s);
  return false;
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

exports.moveIfLegal = function (s, m) {
  return withReversedStateAndMove(moveIfLegal, s, m);
};

exports.activePlayerHasWon = function (s) {
  return withReversedState(hasWon, s)
};

exports.legalMoveExistsOrNextTurn = function (s) {
  return withReversedState(legalMoveExistsOrNextTurn, s);
};

// Testing only below here

exports.setRollsToPlay = setRollsToPlay;


