const Game = require('./game.js');

function range (i,j) {
  return (j
          ? Array(j-i).fill(0).map( (_, idx) => idx+i )
          : Array(i).fill(0).map( (_, idx) => idx ) );
}

function makeGame ( tokenMap, dice, active ) {
  tokens = range(26).map( pip => tokenMap[pip] || 0 );
  state = {
    players: { white: "p1", black: "p2" },
    active: active,
    dice: dice,
    movesToPlay: null,
    tokens: tokens
  };
  Game.setRollsToPlay(state);
  return state;
}

function getTokenMap( tokens ) {
  acc = {};
  tokens.forEach( (men, pip) => {
    if (men!=0) { acc[pip] = men; }
  });
  return acc;
}

function checkTokens( state, tokenMap ) {
  return (JSON.stringify(getTokenMap(state.tokens))
	  == JSON.stringify(tokenMap));
}

function checkReasons( reasons, expected ) {
  const expectedReasonsFound = expected.reduce(
    (acc, reason) => (
      reasons.includes(reason)
	? acc
	: false
    ),
    true
  );
  return (reasons.length == expected.length
	  && expectedReasonsFound);
}

const legalMoveTestCases = [
  {
    testing: "ordinary move",
    tokens: {1: 1},
    dice: [3,3],
    active: "white",
    move: {from: 1, to: 4},
    expectedTokens: { 4: 1 }
  },
  {
    testing: "moving to a friendly pip", 
    tokens: {5: 1, 8: 2},
    dice: [3,3],
    active: "white",
    move: {from: 5, to: 8},
    expectedTokens: { 8: 3 }
  },
  {
    testing: "ordinary move by black", 
    tokens:  {10: -1},
    dice: [3,3],
    active: "black",
    move: {from: 10, to: 7},
    expectedTokens: { 7: -1 }
  },
  {
    testing: "bearing out exactly", 
    tokens:  { 20: 1 },
    dice: [5,3],
    active: "white",
    move: {from: 20, to: 25},
    expectedTokens: {}
  },
  {
    testing: "bearing out as black", 
    tokens:  { 2: -1},
    dice: [2,2],
    active: "black",
    move: {from: 2, to: 0},
    expectedTokens: {}
  },
  {
    testing: "bearing out with inexact roll",
    tokens: { 22: 1, 23: 1 },
    dice: [4,4],
    active: "white",
    move: {from: 22, to: 25},
    expectedTokens: { 23: 1}
  },
  {
    testing: "sending a black token to the bar",
    tokens:  { 10: 1, 15: -1 },
    dice: [5, 5],
    active: "white",
    move: {from: 10, to: 15},
    expectedTokens: { 15: 1, 25: -1}
  },
  {
    testing: "sending a white token to the bar",
    tokens:  { 10: 1, 15: -1 },
    dice: [5, 5],
    active: "black",
    move: {from: 15, to: 10},
    expectedTokens: { 10: -1, 0: 1}
  }
];
legalMoveTestCases.forEach( data => {
  const state = makeGame(
    data.tokens, data.dice, data.active
  );
  var moved,reasons;
  [moved, reasons] = Game.moveIfLegal(state, data.move);
  newTokens = getTokenMap(state.tokens);
  if (!moved ||
      !checkTokens(state, data.expectedTokens)) {
    const want = { moved: true,
		   tokens: data.expectedTokens };
    const got = { moved: moved,
		  tokens: getTokenMap(state.tokens) };
    msg = [`\nFailed testing ${data.testing}`,
	   `Want ${JSON.stringify(want)}`,
	   `Got  ${JSON.stringify(got)}`].join("\n");
    console.log(msg);
  }
});

const illegalMoveTestCases = [
  {
    testing: "bearing out too early", 
    tokens:  { 20: 1, 18: 1 },
    dice: [5,3],
    active: "white",
    move: {from: 20, to: 25},
    reasons: ["Cannot bear out until all men in home quadrant"]
  },
  {
    testing: "dice don't support move",
    tokens:  {1: 1},
    dice: [3,3],
    active: "white",
    move: {from: 1, to: 5},
    reasons: ["Dice don't support move"]
  },
  {
    testing: "leaving a man on the bar",
    tokens:  {0: 1, 10: 1},
    dice: [2,3],
    active: "white",
    move: {from: 10, to: 12},
    reasons: ["Player must move from bar"]
  },
  {
    testing: "moving from vacant pip",
    tokens:  {5: 1, 10: 1},
    dice: [2,3],
    active: "white",
    move: {from: 11, to: 13},
    reasons: ["Player has no tokens on 'from' pip"]
  },
  {
    testing: "moving to occupied pip",
    tokens:  {5: 2, 10: -1},
    dice: [5,3],
    active: "black",
    move: {from: 10, to: 5},
    reasons: ["Opponent controls 'to' pip"]
  },
  {
    testing: "bearing out wrong token with inexact roll",
    tokens:  { 2: -1, 4: -3 },
    dice: [5,6],
    active: "black",
    move: { from: 2, to: 0 },
    reasons: ["Dice don't support bearing out"],
  }
];
illegalMoveTestCases.forEach( data => {
  const state = makeGame(
    data.tokens, data.dice, data.active
  );
  var moved,reasons;
  [moved, reasons] = Game.moveIfLegal(state, data.move);
  newTokens = getTokenMap(state.tokens);
  if (moved ||
      !checkReasons(reasons, data.reasons)) {
    const want = { moved: false,
		   reasons: data.reasons };
    const got = { moved: moved,
		  reasons: reasons };
    msg = [`\nFailed testing ${data.testing}`,
	   `Want ${JSON.stringify(want)}`,
	   `Got  ${JSON.stringify(got)}`].join("\n");
    console.log(msg);
  }
});


// Game over conditions

gameOverCases = [
  {
    testing: "white has won",
    tokens: { 2: -4 },
    active: "white",
    expected: true
  },
  {
    testing: "white has not won",
    tokens: { 24: 1, 2: -4 },
    active: "white",
    expected: false
  },
  {
    testing: "black has won",
    tokens: { 24: 1 },
    active: "black",
    expected: true
  }
];
gameOverCases.forEach( data => {
  const state = makeGame(
    data.tokens, [0,0], data.active
  );
  const result = Game.activePlayerHasWon(state);
  if (result != data.expected) {
    console.log(`\nFailed testing ${data.testing}\n`);
  }
});

// Advancing turn if all moves are used

// Advancing turn if no legal move

nextTurnIfNoMovesCases = [
  {
    testing: "legal move exists for white",
    tokens: { 3: 2 },
    active: "white",
    dice: [4, 5],
    expectedResult: true,
    expectedActive: "white",
    expectedTokens: { 3: 2 }
  },
  {
    testing: "no legal move exists for white",
    tokens: { 3: 2, 7: -2, 8: -2 },
    active: "white",
    dice: [4, 5],
    expectedResult: false,
    expectedActive: "black",
    expectedTokens: { 3: 2, 7: -2, 8: -2 }
  },
  {
    testing: "legal move exists for black",
    tokens: { 4: -2 },
    active: "black",
    dice: [1, 5],
    expectedResult: true,
    expectedActive: "black",
    expectedTokens: { 4: -2 },
  },
  {
    testing: "no legal move exists for black",
    tokens: { 10: -1, 8: 2 },
    active: "black",
    dice: [2, 2],
    expectedResult: false,
    expectedActive: "white",
    expectedTokens: { 10: -1, 8: 2 },
  },
];
nextTurnIfNoMovesCases.forEach( data => {
  const state = makeGame(
    data.tokens, data.dice, data.active
  );
  const result = Game.legalMoveExistsOrNextTurn(state);
  if (result != data.expectedResult
      || state.active != data.expectedActive
      || !checkTokens(state, data.expectedTokens)
     ) {
    const want = { result: data.expectedResult,
		   active: data.expectedActive,
		   tokens: data.expectedTokens };
    const got = { result: result,
		  active: state.active,
		  tokens: getTokenMap(state.tokens) };
    msg = [`\nFailed testing ${data.testing}`,
	   `Want ${JSON.stringify(want)}`,
	   `Got  ${JSON.stringify(got)}`].join("\n");
    console.log(msg);
  }
});
