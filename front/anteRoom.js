import React, { Component } from "react";
import ReactDOM from "react-dom";
import { deepCopy } from "../utils.js";
import io from 'socket.io-client';

const params = new URLSearchParams(window.location.search);
const token = params.get("token")

var socket = io();

// After coming to this page, the server still has a connection to the
// login page.
socket.emit('update-socket', token);

function sendChallenge (state, toUserName) {
  if (player !== state.player
      && window.confirm(`Challenge ${player}?`)) {
    socket.emit(
      'challenge',
      { token: token, to: toUserName }
    );
    const newState = deepCopy(state);
    newState.sentChallenge = {
      sentTo: toUserName, status: "pending"
    };
    return newState;
  } else { return state; }
}

function receiveChallenge (state, fromUserName) {
  if (window.confirm(
    `You are challenged by ${fromUserName}. Do you accept?`)) {
    console.log("You accepted the challenge. Challenge message:", msg);
    socket.emit(
      'challenge-accepted',
      { token: token, to: fromUserName }
    );
  } else {
    socket.emit(
      'challenge-declined',
      { token: token, to: fromUserName }
    );
  }
  return state; // The server will imminently redirect us to the game,
  // so doesn't really matter what we return here.
}

function challengeDeclined (state) {
  const newState = deepCopy(state);
  newState.sentChallenge.status = "declined";
  console.log(`Acknowledged the declined challenge. sentChallenge is now ${JSON.stringify(newState.sentChallenge)}`);
  return newState;
}

/* ---------------------------------------------/
/                   Components                  /
/  --------------------------------------------*/


class TitleArea extends React.Component {
  render() {
    return React.createElement(
      "div", null,
      React.createElement(
	"h2", null , "Backgammon"),
      React.createElement(
	"p",null, "Click a player to challenge them"
      )
    );
  }
}

class PlayersOnline extends React.Component {
  // props:
  // challengeFn,
  // players,
  // userName

  tableRows () {
    const p = this.props;
    return p.players.map( userName => React.createElement(
      "tr", null,
      React.createElement(
        "td",
        ((!p.canSendChallenge
	  || userName===p.userName)
         ? null
         : {
           className: "blueHover",
           onClick: () => { p.challengeFn(userName); },
         }
        ),
        userName),
      React.createElement("td", null, 0), // wins
      React.createElement("td", null, 0) // losses
    ));
  }

  render() {
    return React.createElement(
      "div", { className: "flexGrow", style: { width: "100%" } },
      React.createElement(
        "table", { style: { width: "100%" }},
        React.createElement(
          "thead", null,
          React.createElement(
            "tr", null,
            React.createElement(
	      "th", { style: { width: "50%" }}, "Player"),
            React.createElement(
	      "th", { style: { width: "25%" }}, "Wins"),
            React.createElement(
	      "th", { style: { width: "25%" }}, "Losses")
          )
        ),
        React.createElement(
          "tbody", null,
          ...this.tableRows()
        )
      )
    );
  }
}

function canSendChallenge (s) {
  return (s.userName
	  && (!s.sentChallenge
	      || s.sentChallenge.status !== "pending"));
}

class ChallengeStatus extends React.Component {
  // props:
  // player,
  // status
  render () {
    const p = this.props;
    const style = { color: "red" };
    const msg = (p.status == "pending"
                 ? `Waiting for ${p.player} to accept your challenge`
                 : `${p.player} declined your challenge`);
    // Cancel challenge button?
    return React.createElement("p", { style: style }, msg);
  }
}

class Page extends React.Component {
  // state: players, sentChallenge ( .player, .status )
  constructor(props) {
    super(props);
    this.state = {
      players: [],
      sentChallenge: null,
      userName: params.get("userName") // may very well be `null`
    };
    
    socket.on('active-users', msg => {
      const newState = deepCopy(this.state);
      newState.players = msg;
      this.setState(newState);
      console.log(`Received list of players ${JSON.stringify(msg)}`);
    });
    socket.on('challenge', msg => {
      console.log(`Received challenge ${JSON.stringify(msg)}`);
      this.setState(receiveChallenge(this.state, msg.from));
    });
    socket.on('challenge-declined', msg => {
      console.log(`Received challenge-declined ${JSON.stringify(msg)}`);
      this.setState(challengeDeclined(this.state));
    });
    socket.on('start-game', msg => {
      window.location.href =`backgammon.html?game=${msg.gameId}&player=${msg.player}&token=${token}&username=${params.get("userName")}`;
    });
  }

  render() {
    let s = this.state;
    var children = [
      React.createElement(TitleArea),
      React.createElement(
        PlayersOnline,
        {
          canSendChallenge: canSendChallenge(s),
          userName: s.userName,
          players: s.players,
          challengeFn: player => {
	    this.setState(
	      sendChallenge(s, player.player));
	  }
        })
    ];
    if (s.sentChallenge) {
      children.push(
        React.createElement(
          ChallengeStatus,
          { player: s.sentChallenge.player,
	    status: s.sentChallenge.status }));
    }
    
    return React.createElement(
      "div", { className: "container" },
      React.createElement(
	"div", { className: "page" },
	...children
      )
    );
  }
}

/* ---------------------------------------------/
/                   Initialize                  /
/  --------------------------------------------*/




window.addEventListener(
  "DOMContentLoaded",
  () => {
    const div = document.getElementById("main");
    const page = React.createElement(Page);
    ReactDOM.render(page, div);
    socket.emit('request-players-online', null);
  }
);
