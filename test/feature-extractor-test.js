const F = require('../ml/feature-extractor.js');
const L = require('../ml/feature-lib.js');
const G = require('../game.js');

const history = [
  ['roll', [1,2]],
  ['move', [1,2]],
  ['move', [1,3]], // finishes turn, reward 0
  ['roll', [2,4]],
  ['move', [6,2]], // hits token at 2
  ['move', [8,6]], // finishes turn, reward -2
  ['roll', [6,6]], // can't move, finishes turn reward -24
  ['roll', [2,3]],
  ['move', [24,22]],
  ['move', [24,21]]
];

const expectedRewards = [0, -2, -24, 0];
const expectedFullRewards = [-2, -26, -24, 0]
const expectedSDFR = [-21, -38, -24, 0];

const transitions = F.buildTransitions(history);

F.forwardSumRewards(transitions);
F.propagateRewards(transitions, 0.5);

console.log('Expected rewards:', expectedRewards);
console.log('Actual rewards:', transitions.map( t => t.reward ));

console.log('Expected full rewards:', expectedFullRewards);
console.log('Actual rewards:', transitions.map( t => t.fullReward ));

console.log('Expected sdfr:', expectedSDFR);
console.log('Actual rewards:', transitions.map( t => t.sdfr ));

transitions.forEach(L.extractFeatures);

console.log(transitions[0]);


//console.log(F.multiplicities(G.newGame().tokens));

//console.log(F.getVWExamples(history));

//F.writeVWTrainingSet([6], 'train.json');
