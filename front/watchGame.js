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

function login() {
  socket.emit("login", { name: "guest", password: "1234" });
}

function findGameLoop() {
  if (token) {
    socket.emit("watch", token);
  }
  setTimeout(
    () => {
      if (!watchingGame) {
	findGameLoop();
      }
    },
    5000
  );
}	      

socket.on('token', t => {
  console.log(`Recieved token ${t}`);
  token = t;
});

socket.on('game-state', msg => {
  let { state } = msg;
  console.log("Received state",JSON.stringify(state));
  watchingGame = true;
  setEventHandlers(state);
  handle.setState(state);
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
