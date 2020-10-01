const { legalMoves,
	newGame,
	setDice,
	move } = require('./game.js');
const { deepCopy } = require('./utils.js');

const newHistory = s => ({moves: [], state: s});
  
const applyMoveToHist = (h, m) => {
  let newH = deepCopy(h);
  newH.moves.push(m);
  move(newH.state, m);
  return newH;
};

const branch = (h) => {
  let moves = legalMoves(h.state);
  return moves.map(m => applyMoveToHist(h, m));
};

const branchTwice = h => {
  let hs = branch(h);
  return [].concat(...hs.map(branch));
};

// find unsafe pips (or occupation numbers)
// if there's at least one safe move,
//     check for moves that hit the opponent
//     maybe optimize for num pips with 3+ tokens
//     break ties randomly
// if no safe move, choose move with fewest pips to lose

const getLastBlackPip = state => {
  let pip;
  for (pip = 24; pip >= 0; pip--) {
    if (state.tokens[pip] < 0) {
      break;
    }
  }
  return pip;
}

const getLastWhitePip = state => {
  let pip;
  for (pip = 0; pip <= 24; pip++) {
    if (state.tokens[pip] > 0) {
      break;
    }
  }
  return pip;
}

const whiteUnsafePips = state => {
  let acc = [];
  let lastPip = getLastBlackPip(state);
  for (let pip = 0; pip < lastPip; pip++) {
    if (state.tokens[pip] == 1) {
      acc.push(pip);
    }
  }
  return acc;
};

const blackUnsafePips = state => {
  let acc = [];
  let lastPip = getLastWhitePip(state);
  for (let pip = 24; pip > lastPip; pip--) {
    if (state.tokens[pip] == -1) {
      acc.push(pip);
    }
  }
  return acc;
};

const pipScore = state => {
  return state.tokens.reduce(
    (acc, tokens, pip) => {
      return (tokens > 0 ? acc - tokens * (25 - pip) :
	      tokens < 0 ? acc - tokens * pip :
	      acc);
    }
  );
};

const maximizer = (f, a) => a.map(
  x => [f(x), x]
).reduce(
  (acc, p) => (p[0] > acc[0] ? p : acc)
)[1];

const whiteSafeStrategy = state => {
  let hs = branchTwice({moves: [], state: state});
  let safeChoices = [];
  hs.forEach(h => {
    if (whiteUnsafePips(h.state).length == 0) {
      safeChoices.push(h);
    }
  });
  if (safeChoices.length > 0) {
    return maximizer(
      h => pipScore(h.state),
      safeChoices
    );
  } else if (hs.length > 0) {
    return maximizer(
      h => - Math.max(...whiteUnsafePips(h.state)),
      hs
    );
  }
};

const blackSafeStrategy = state => {
  let hs = branchTwice({moves: [], state: state});
  let safeChoices = [];
  hs.forEach(h => {
    if (blackUnsafePips(h.state).length == 0) {
      safeChoices.push(h);
    }
  });
  if (safeChoices.length > 0) {
    return maximizer(
      h => - pipScore(h.state),
      safeChoices
    );
  } else {
    return maximizer(
      h => Math.min(...blackUnsafePips(h.state)),
      hs
    );
  }    
};

exports.safeBotStrategy = state => {
  let h
  switch (state.active) {
  case "black":
    h = blackSafeStrategy(state);
    break;
  case "white":
    h = whiteSafeStrategy(state);
    break;
  }
  if (h) {
    return h.moves
  } 
};
