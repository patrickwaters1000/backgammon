import React, { Component } from "react";
import ReactDOM from "react-dom";
import Challenges from "./anteRoom/Challenges.js";
import Login from "./anteRoom/Login.js";
import { deepCopy } from "../utils.js";
import io from 'socket.io-client';

var socket = io();
var handle = null;
var token = null;
var userName = null;
var activeUsers = {}; // userName -> {incoming, outgoing}

function updateState() {
  let s = {
    token: token,
    userName: userName,
    activeUsers: activeUsers
  };
  handle.setState(deepCopy(s));
}

function canSendChallenge (toUserName) {
  return !(userName == toUserName
	   || activeUsers[toUserName].incoming
	   || activeUsers[toUserName].outgoing);
}

function sendChallenge (toUserName) {
  activeUsers[toUserName] = { outgoing: true };
  updateState();
  socket.emit(
      'challenge',
      { token: token, to: toUserName });
}

function answerChallenge (fromUserName, accept) {
  activeUsers[fromUserName] = {};
  updateState();
  header = (accept
	    ? 'challenge-accepted'
	    : 'challenge-declined');
  socket.emit(
    header,
    { token: token,
      to: fromUserName });
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

class TitleArea extends React.Component {
  render() {
    return React.createElement(
      "div", null,
      React.createElement(
	"h2", null , "Backgammon"),
      React.createElement(
	"p", null, "Click a player to challenge them"
      )
    );
  }
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
    } else {
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


function startGameURL(msg) {
  const { gameId, player } = msg;
  return ('backgammon.html?'
	  + `game=${gameId}`
	  + `&player=${player}`
	  + `&token=${token}`
	  + `&username=${userName}`);
}

window.addEventListener(
  "DOMContentLoaded",
  () => {
    const div = document.getElementById("main");
    const page = React.createElement(Page);
    ReactDOM.render(page, div);

    socket.on('token', msg => {
      token = msg;
      userName = document.getElementById(
	"usernameInput").value;
      updateState();
      socket.emit(
      'request-active-users',
      {token: token}
    );
    });

    socket.on('active-users', msg => {
      activeUsers = msg;
      updateState();
      console.log('Received active users');
    });
    
    socket.on('start-game', msg => {
      window.location.href = startGameURL(msg);
    });    
  }
);
