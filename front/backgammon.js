import React, { Component } from "react";
import ReactDOM from "react-dom";
import Board from "./Board.js";
import { newGame,
         move,
	 setDice,
         nextTurnIfNoMove } from "../game.js";
import { deepCopy } from "../utils.js";
import io from 'socket.io-client';

var socket = io();

const div = document.getElementById("board-div");
var handle = null;

var watchingGame = false;
var token = null;

function setEventHandlers(s) {
  s.clickPip = (pipIndex) => {};
  s.clickToken = (pipIndex, numTokenOnPip) => {};
  s.clickDice =() => {};
}

class Game extends React.Component {
  constructor(props) {
    super(props);
    let s = newGame();
    setEventHandlers(s)
    this.state = s;
    handle = this;
  }

  render () {
    return React.createElement(Board, this.state);
  }
}

socket.on('token', t => {
  token = t;
});

socket.on('game-state', s => {
  console.log("Received state",JSON.stringify(s));
  watchingGame = true;
  setEventHandlers(s);
  handle.setState(s);
});

socket.on('roll', m => {
  console.log("Received roll", JSON.stringify(m));
  let sNew = deepCopy(handle.state);
  setDice(sNew, m.dice);
  nextTurnIfNoMove(sNew);
  handle.setState(sNew);
});

socket.on('move', m => {
  console.log("Received move", JSON.stringify(m));
  let sNew = deepCopy(handle.state);
  move(sNew, m);
  nextTurnIfNoMove(sNew);
  handle.setState(sNew);
});

socket.on(
  'game-over',
  m => {
    watchingGame = false;
    findGameLoop();
  }
);
  
window.addEventListener(
  "DOMContentLoaded",
  function () {
    const game = React.createElement(Game,{});
    ReactDOM.render(game, div);
    login();
    findGameLoop();
  }
);
