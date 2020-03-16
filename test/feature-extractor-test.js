const F = require('../ml/feature-extractor.js');

const history = [
  ['roll', [1,2]],
  ['move', [1,2]],
  ['move', [1,3]],
  ['roll', [2,4]],
  ['move', [6,2]], // hits the white token
  ['move', [8,6]],
  ['roll', [6,6]], // can't move
  ['roll', [2,3]],
  ['move', [24,22]],
  ['move', [24,21]]
];

const expectedRewards = [0, 0, -2, 0, -24, 0];

const transitions = F.buildTransitions(history);

console.log('Expected rewards:', expectedRewards);
console.log('Actual rewards:', transitions.map( t => t.reward ));
