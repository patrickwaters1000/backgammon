import React, { Component } from "react";
import ReactDOM from "react-dom";
import io from 'socket.io-client';
import Login from "./anteRoom/Login.js";
import AnteRoomPage from "./anteRoom/AnteRoomPage.js";
import Board from "./Board.js";
import { newGame,
         move,
	 setDice,
         nextTurnIfNoMove } from "../game.js";
import { deepCopy } from "../utils.js";

/*
Bugs
- Tokens in home area not appearing
- After game over, board is shown flipped??
- Login screen has no css
*/

/*
Want features
- Watch button
- Return from watching game
- End of game screen
- Stats / Elos
- Show tokens in home area
- Show who's turn it is
- Show somehow whether a die has been played
- Improve UI for selecting a move 
    - highlight pips
    - keyboard input
*/

var socket = io();
var handle = null;

// Confusing that token and selectedToken mean different things
var appState = {
  token: null,
  userName: null,
  activeUsers: [],
  currentGames: {},
  challenges: {incoming: [], outgoing: []},
  gameId: null,
  gameState: null,
  selectedToken: null // a backgammon token, not a login token
};

const clickToken = (pipIndex, numTokenOnPip) => {
  console.log('Trying to click token');
  if (appState.selectedToken) {
    appState.selectedToken = null;
  } else {
    appState.selectedToken = {
      pipIndex: pipIndex,
      numTokenOnPip: numTokenOnPip
    };
  }
};

const clickPip = pipIndex => {
  console.log('Trying to click pip');
  if (appState.selectedToken) {
    let msg = {
      token: appState.token,
      gameId: appState.gameId,
      from: appState.selectedToken.pipIndex,
      to: pipIndex
    };
    socket.emit('move', msg);
    appState.selectedToken = null;
  }
};

const clickDice = () => {
  console.log('Trying to click dice');
  socket.emit('roll', {
    token: appState.token,
    gameId: appState.gameId
  });
};

function syncAppState() {
  handle.setState({
    ...deepCopy(appState),
    clickToken: (pipIndex, numTokenOnPip) => {
      clickToken(pipIndex, numTokenOnPip);
      syncAppState();
    },
    clickPip: pipIndex => {
      clickPip(pipIndex);
      syncAppState()
    }, 
    clickDice: clickDice
  });
}

function submitLoginForm (e) {
  e.preventDefault();
  socket.emit(
    'login',
    {
      name: document.getElementById("usernameInput").value,
      password: document.getElementById("passwordInput").value
    }
  );
}

const sendMsg = (action, toUserName) => {
  socket.emit(
    'update-challenges',
    { action: action,
      token: appState.token,
      to: toUserName }
  );
};

const watchGame = gameId => {
  socket.emit(
    'watch-game',
    { token: appState.token,
      gameId: gameId }
  );
};

class Page extends React.Component {
  constructor(props) {
    super(props);
    handle = this;
  };
  
  render() {
    let s = this.state;
    if (s == null) {
      // React error if render doesn't return a component.
      return React.createElement("div");
    } else if (!s.token) { // Not logged in
      return React.createElement(
	Login,
	{ submitForm: submitLoginForm }
      );
    } else if (!s.gameState) { // In ante room
      return React.createElement(
	AnteRoomPage,
	{ activeUsers: s.activeUsers,
	  challenges: s.challenges,
	  currentGames: s.currentGames,
	  userName: s.userName,
	  sendMsg: sendMsg,
	  watchGame: watchGame
	}
      );
    } else { // Playing or watching a game
      return React.createElement(
	Board,
	{ ...s.gameState,
	  clickPip: s.clickPip,
	  clickToken: s.clickToken,
	  clickDice: s.clickDice,
	  selectedToken: s.selectedToken
	}
      );
    }
  };
}

/* ---------------------------------------------/
/                   Initialize                  /
/  --------------------------------------------*/

window.addEventListener("DOMContentLoaded", () => {
  const div = document.getElementById("main-div");
  const page = React.createElement(Page);
  ReactDOM.render(page, div);
  syncAppState();

  socket.on('token', msg => {
    appState.token = msg;
    appState.userName = document.getElementById("usernameInput").value;
    syncAppState();
    socket.emit(
      'request-active-users',
      {token: appState.token}
    );
    socket.emit(
      'request-current-games',
      null
    );
  });

  socket.on('active-users', msg => {
    appState.activeUsers = msg;
    syncAppState();
    console.log('Received active users');
  });

  socket.on('challenges', msg => {
    appState.challenges = msg;
    syncAppState();
    console.log('Received challenges');
  });

  socket.on('game-info', msg => {
    console.log("Received game info msg ", JSON.stringify(msg));
    appState.gameId = msg.gameId;
    let { userName } = appState;
    appState.color = (msg.white == userName ? 'white' :
		      msg.black == userName ? 'black' : null);
    if (appState.color == null) {
      console.log((`Warning! Username ${userName} `
		   +`doesn't match ${msg.white} or ${msg.black}`));
    }
    syncAppState();
  });

  socket.on('game-state', msg => {
    console.log("Received game state msg ", JSON.stringify(msg));
    appState.gameId = msg.gameId;
    appState.gameState = msg.state;
    syncAppState();
  });

  socket.on('current-games', msg => {
    console.log("Received current games ", JSON.stringify(msg));
    appState.currentGames = msg;
    syncAppState();
  });

  socket.on('game-over', msg => {
    console.log("Recieved game over ", JSON.stringify(msg));
    appState.gameId = null;
    appState.gameState = null;
    syncAppState()
    socket.emit('request-active-users', {token: appState.token});
    socket.emit('request-challenges', {token: appState.token});
  });
});
