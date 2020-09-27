const { drop } = require('./utils.js');

const challenges = {}; // map of fromUserName --> toUserName --> true

exports.openChallenge = (from, to) => {
  if (from != to) {
    if (challenges[from] == null) {
      challenges[from] = {};
    }
    challenges[from][to] = true;
  }
};

exports.closeChallenge = (from, to) => {
  let cs = challenges[from];
  if (cs) {
    delete cs[to];
  }
};

exports.challengeIsOpen = (from, to) => {
  let cs = challenges[from];
  return cs && cs[to] == true;
}

const getOutgoingChallenges = (user) => {
  return Object.keys(challenges[user] || {});
}

const getIncomingChallenges = (user) => {
  return Object.keys(challenges).filter(from => {
    return (challenges[from] || {})[user];
  });
};

exports.prepareChallengesMsg = (user) => {
  return {
    incoming: getIncomingChallenges(user),
    outgoing: getOutgoingChallenges(user),
  };
};

