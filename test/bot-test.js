const Game = require('../game.js');
const Bot = require('../bot.js');

const state = Game.newGame();
Game.setDice(state, [2,4]);
const score = Bot.scoreMove(state, { from: 1, to: 3});
console.log(score);
