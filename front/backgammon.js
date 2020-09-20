import React, { Component } from "react";
import ReactDOM from "react-dom";
import io from 'socket.io-client';
import Login from "./anteRoom/Login.js";
import Challenges from "./anteRoom/Challenges.js";
import TitleArea from "./anteRoom/TitleArea.js";
import Board from "./Board.js";
import { newGame,
         move,
	 setDice,
         nextTurnIfNoMove } from "../game.js";
import { deepCopy } from "../utils.js";

var socket = io();
var handle = null;

var state = {
  token: null,
  userName: null,
  activeUsers: {},  // userName -> {incoming, outgoing}
  gameId: null,
  gameState: null,
  selectedToken: null // a backgammon token, not a login token
};

function setGameEventHandlers(s) {
  s.gameState.selectedToken = s.selectedToken;

  s.gameState.clickToken = (pipIndex, numTokenOnPip) => {
    console.log('Trying to click token');
    if (s.selectedToken) {
      console.log('Setting selected token to null');
      s.selectedToken = null;
    } else {
      console.log(('Setting selected token with '
		   + `pipIndex: ${pipIndex} `
		   + `numTokenOnPip: ${numTokenOnPip}`));
      state.selectedToken = {
	pipIndex: pipIndex,
	numTokenOnPip: numTokenOnPip
      };
    }
    updateState();
  };
  
  s.gameState.clickPip = (pipIndex) => {
    console.log('Trying to click pip');
    if (s.selectedToken) {
      let msg = {
	token: state.token,
	gameId: state.gameId,
	from: state.selectedToken.pipIndex,
	to: pipIndex
      };
      socket.emit('move', msg);
      state.selectedToken = null;
      updateState();
    }
  };
  
  s.gameState.clickDice = () => {
    console.log('Trying to click dice');
    socket.emit('roll', {
      token: state.token,
      gameId: state.gameId
    });
  };
}

function updateState() {
  let s = deepCopy(state);
  if (s.gameState) {
    setGameEventHandlers(s);
  }
  handle.setState(s);
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

function canSendChallenge (toUserName) {
  return !(state.userName == toUserName
	   || state.activeUsers[toUserName].incoming
	   || state.activeUsers[toUserName].outgoing);
}

function sendChallenge (toUserName) {
  state.activeUsers[toUserName] = { outgoing: true };
  updateState();
  socket.emit(
      'challenge',
      { token: state.token, to: toUserName });
}

function answerChallenge (fromUserName, accept) {
  state.activeUsers[fromUserName] = {};
  updateState();
  header = (accept
	    ? 'challenge-accepted'
	    : 'challenge-declined');
  socket.emit(
    header,
    { token: state.token,
      to: fromUserName });
}

class Page extends React.Component {
  constructor(props) {
    super(props);
    handle = this;
    this.state = {
      token: null,
      activeUsers: {},
      userName: null
    };
  };

  render() {
    let s = this.state;
    let children;
    if (!s.token) { // Not logged in
      children = [
	React.createElement(
	  Login,
	  { submitForm: submitLoginForm }
	)
      ];
    } else if (!s.gameId) { // In ante room
      children = [
	React.createElement(TitleArea),
	React.createElement(
	  Challenges,
	  {
	    activeUsers: s.activeUsers,
	    userName: s.userName,
	    sendMsg: (header, toUserName) => {
	      socket.emit(
		header,
		{ token: s.token,
		  to: toUserName }
	      );
	    }
	  }
	)
      ];
    } else { // Playing or watching a game
      children = [
	React.createElement(
	  Board,
	  s.gameState
	)
      ];
    }
    return React.createElement(
      "div",
      {className: "container"},
      ...children
    );
  };
}

/* ---------------------------------------------/
/                   Initialize                  /
/  --------------------------------------------*/

window.addEventListener(
  "DOMContentLoaded",
  () => {
    const div = document.getElementById("main-div");
    const page = React.createElement(Page);
    ReactDOM.render(page, div);

    socket.on('token', msg => {
      state.token = msg;
      state.userName = document.getElementById(
	"usernameInput").value;
      updateState();
      socket.emit(
	'request-active-users',
	{token: state.token}
      );
    });

    socket.on('active-users', msg => {
      state.activeUsers = msg;
      updateState();
      console.log('Received active users');
    });

    socket.on('game-info', msg => {
      console.log("Received game info msg ", JSON.stringify(msg));
      state.gameId = msg.gameId;
      let { userName } = state;
      if (msg.white == userName) {
	state.color = 'white';
      } else if (msg.black == userName) {
	state.color = 'black';
      } else {
	console.log((`Warning! Username ${userName} `
		     +`doesn't match ${msg.white} or ${msg.black}`));
      }
      if (state.gameState == null) {
	state.gameState = newGame();
      }
      updateState();
    });

    socket.on('game-state', msg => {
      console.log("Received game state msg ", JSON.stringify(msg));
      state.gameId = msg.gameId;
      state.gameState = msg.state;
      updateState();
    });

    socket.on('game-over', msg => {
      gameId = null;
      gameState = null;
    });
  }
);
