import React, { Component } from "react";
import ReactDOM from "react-dom";
import Token from "./Token.js";
import Pip from "./Pip.js";
import Board from "./Board.js";
import { boardWidth, boardHeight, boardColor } from "./dimensions.js";
import { range } from "./utils.js";

// var socket = io();


// Additional global consts
/*
let params = new URLSearchParams(window.location.search);
const token = params.get("token");
const gameId = params.get("game");
const player = params.get("player");

console.log(player);
socket.emit(
  'update-socket', // after coming to this page, the server still has a connection to the ante-room?
  token
);*/


/*

function isYourTurn(gameState) {
  const activePlayer = (gameState.turnNumber%2==0 ? "white" : "black");
  return player==activePlayer;
}

function canSelectToken(gameState, pipNumber) {
  console.log(isYourTurn(gameState), gameState.tokensPerPip[player]);
  return isYourTurn(gameState) && gameState.tokensPerPip[player][pipNumber] > 0;
}

function selectToken(gameState, pipNumber, numTokenOnPip) {
  var newState = deepCopy(gameState);
  newState.selectedToken = {
    pipNumber: pipNumber,
    numTokenOnPip: numTokenOnPip
  };
  console.log(newState);
  return newState;
}

function clickToken(gameState, pipNumber, numTokenOnPip) {
  console.log("In click token fn");
  if (canSelectToken(gameState, pipNumber)) {
    console.log("Selecting token");
    return selectToken(gameState, pipNumber, numTokenOnPip);
  } else {
    console.log("Cannot select token");
    return gameState;
  }
}

function clickPip(gameState, clickedPip) {
  console.log("clicked pip", clickedPip);
  console.log("selected token",gameState.selectedToken);
  if (gameState.selectedToken) {
    const fromPip = gameState.selectedToken.pipNumber;
    socket.emit(
      'move',
      { token: token, gameId: gameId, from: fromPip, to: clickedPip }
    );
  }
}
var backbammonBoard = null;

var initialGameState = null; 

*/

window.addEventListener(
  "DOMContentLoaded",
  function () {
    // Setup chat component
    //setLengths();
    const b = <Board > </Board>;
    const e = document.getElementById("board-div");
    ReactDOM.render(b,e);
  }
);

//(this.props.selected ? tokenColors.selected : tokenColors[this.props.controlledBy])

/*
document.getElementById('msg-form').addEventListener(
      "submit",
      function (e) {
        e.preventDefault(); // prevents page reloading
        socket.emit('chat-message', { token: token, message: $('#m').val() });
        $('#m').val('');
        return false;
      }
    );
    socket.on('chat-message', function(msg){
      $('#messages').append($('<li>').text(msg));
    });
    // Setup board
    const backgammonContainer = document.querySelector('#backgammon-canvas');

    socket.on(
      'initial-game-state',
      m => {
        initialGameState = m;
        console.log(`About to render board. Received msg ${JSON.stringify(m)}, and initialGameState=${initialGameState}`);
        ReactDOM.render(React.createElement(Board), backgammonContainer);
      }
    );

    socket.on('game-state', m => {
      console.log(`Received state ${m}`);
      backgammonBoard.setState(m);
    });

    socket.emit('request-initial-game-state', { gameId: gameId });

    socket.on(
      'game-over',
      m => {
        alert(`${m.winner} has won the game`);
        window.location.href =`ante-room-2.html?token=${token}&userName=${params.get("username")}`;
      }
    );
*/
