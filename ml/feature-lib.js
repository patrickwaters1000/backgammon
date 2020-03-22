const { winner } = require('../game.js');

function pipScore (state) {
  return state.tokens.reduce(
    (acc, num, pip) => {
      if (num == 0) {
	return acc;
      } else {
	const toGo = (num > 0 ? 25-pip : pip);
	return acc - num * toGo;
      }
    },
    0
  );
}

function rollScore (state) {
  const rollSum = state.rollsToPlay.reduce(
    (acc, roll) => acc + roll,
    0
  );
  const sign = (state.active == 'white' ? 1 : -1);
  return rollSum * sign;
}

function winReward (state) {
  return (winner(state) == 'white' ? 50
	  : winner(state) == 'black' ? -50
	  : 0);

}


function bucketize(rate, value) {
  if (value == 0) { return "0"; }
  const sign = (value > 0 ? "-" : "+");
  const logVal = Math.log(Math.abs(value));
  const bucket = Math.floor(logVal / Math.log(rate));
  return `${sign}${bucket}`;
}

function extractPipGain (transition) {
  const { from, to } = transition;
  //console.log(JSON.stringify(from));
  //console.log(JSON.stringify(to));
  const pipGain = (pipScore(to) + rollScore(to)
		   - pipScore(from) - rollScore(from));
  transition.features["pipGain"] = bucketize(2, pipGain);
}

function loneMenHazard (state, player) {
  const loneMan = (player == "white" ? 1 : -1);
  return state.tokens.reduce( (acc, num, pip) => {
    if (num != loneMan) {
      return acc;
    } else {
      const toGo = (num > 0 ? 25-pip : pip);
      return acc - toGo;
    }
  });
}

function extractLoneMenHazard (transition) {
  const { to } = transition;
  const lmhw = bucketize(2, loneMenHazard(to, 'white'));
  const lmhb = bucketize(2, loneMenHazard(to, 'black'));
  transition.features["loneMenHazard(w)"] = lmhw;
  transition.features["loneMenHazard(b)"] = lmhb;
}

function multiplicities (tokens) {
  const mults = {};
  tokens.forEach( (n, pip) => {
    if (0 < pip < 25
	&& n != 0) {
      if (!mults[n]) {
	mults[n] = 1;
      } else { mults[n] += 1; }
    }
  });
  return mults;
}

exports.multiplicities = multiplicities;

function extractMultiplicities (transition) {
  const { to } = transition;
  const mults = multiplicities(to.tokens);
  for (const num in mults) {
    transition.features[`multiplicity(${num})`] = String(mults[num]);
  }
}

function extractFeatures (transition) {
  transition.features = {};
  [
    extractPipGain,
    extractLoneMenHazard,
    extractMultiplicities
  ].forEach( f => { f(transition); } );
}

exports.extractFeatures = extractFeatures;

function getVWLine (transition) {
  extractFeatures(transition);
  acc = `${transition.sdfr} |`;
  for (const f in transition.features) {
    const v = transition.features[f];
    acc += ` ${f}${v}:1`;
  }
  return acc;
}

exports.pipScore = pipScore;
exports.rollScore = rollScore;
exports.winReward = winReward;
exports.extractFeatures = extractFeatures;
exports.getVWLine = getVWLine;
