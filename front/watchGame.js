import React, { Component } from "react";
import ReactDOM from "react-dom";
import Board from "./Board.js";
import { newGame } from "../game.js";
import io from 'socket.io-client';

var socket = io();

const div = document.getElementById("board-div");
var handle = null;

var watchingGame = false;

class Game extends React.Component {
  constructor(props) {
    super(props);
    this.state = newGame();
    handle = this;
  }

  render () {
    return React.createElement(Board, this.state);
  }
}

function findGameLoop() {
  socket.emit("watch", { userName: "Q" });
  setTimeout(
    () => {
      if (!watchingGame) {
	findGameLoop();
      }
    },
    100
  );
}	      


socket.on('game-state', s => {
  console.log("Received state",JSON.stringify(s));
  watchingGame = true;
  handle.setState(s);
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
    socket.emit("watch", { userName: "Q" });
  }
);



    
