import React, { Component } from "react";
import ReactDOM from "react-dom";
import Board from "./Board.js";
import { deepCopy } from "../utils.js";
import { newGame,
	 setDice,
	 move,
	 nextTurnIfNoMove } from "../game.js";
import io from 'socket.io-client';

var socket = io();

socket.on('history', history => { frames = getFrames(history); });

var frames = null;
var currentFrame = 0;
const div = document.getElementById("board-div");
var handle = null;

class Game extends React.Component {
  constructor(props) {
    super(props);
    this.state = newGame();
    setDice(this.state, [1,2]);
    handle = this;
  }

  render () {
    return React.createElement(Board, this.state);
  }
}

function getFrames(history) {
  const newFrames = [];
  const state = newGame();
  newFrames.push(deepCopy(state));
  history.forEach( row => {
    const [header, data] = row;
    if (header == 'roll') {
      const dice = deepCopy(data);
      setDice(state, dice);
    } else if (header == 'move') {
      const [from, to] = data;
      move(state, { from: from, to: to });
    } else {
      throw new Error(`Header ${header} not recognized`);
    }
    nextTurnIfNoMove(state);
    newFrames.push(deepCopy(state));
  });
  return newFrames;
}

function getGame() {
  const gameId = document.getElementById("game-id-input").value;
  socket.emit('replay-game', gameId);
  //fetch(`localhost:3000/game?id=${gameId}`)
  //  .then( g => { frames = getFrames(g); });
}

function updateFrame(sign) {
  console.log(JSON.stringify(currentFrame));
  console.log(JSON.stringify(sign));
  console.log(JSON.stringify(frames));
  currentFrame += sign;
  currentFrame = Math.max(0, currentFrame);
  currentFrame = Math.min(frames.length - 1, currentFrame);
  const newState = deepCopy(frames[currentFrame]);
  if (!newState.dice) {
    setDice(newState, [1,1]);
  }
  handle.setState(newState);
}
  
window.addEventListener(
  "DOMContentLoaded",
  function () {
    
    document.getElementById('submit-game-id-button')
      .addEventListener('click', getGame);

    document.addEventListener('keydown', (e) => {
      const sign = { "ArrowLeft": -1, "ArrowRight": 1 }[e.code];
      if (sign) { updateFrame(sign); }
    });

    const game = React.createElement(Game,{});
    ReactDOM.render(game, div);
    
  }
);
