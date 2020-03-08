import React, { Component } from "react";
import ReactDOM from "react-dom";
import Board from "./Board.js";
import { newGame } from "../game.js";
import io from 'socket.io-client';

var socket = io();

const div = document.getElementById("board-div");
var handle = null;

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

window.addEventListener(
  "DOMContentLoaded",
  function () {
    const game = React.createElement(Game,{});
    ReactDOM.render(game, div);
  
    socket.on('game-state', s => {
      console.log("Received state",JSON.stringify(s));
      handle.setState(s);
    });
  }
);

socket.emit(
  "watch",
  { userName: "Q" }
);
