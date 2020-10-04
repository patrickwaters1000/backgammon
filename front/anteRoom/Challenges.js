import React, { Component } from "react";

export default class Challenges extends React.Component {
  tableRow (p, userName) {
    let user = p.activeUsers[userName];
    let { incoming, outgoing } = p.challenges;
    let yesButton, noButton, watchButton;
    if (incoming.includes(userName)) {
      yesButton = React.createElement(
	"button",
	{onClick: () => { p.sendMsg('accept', userName); }},
	"Accept");
      noButton = React.createElement(
	"button",
	{onClick: () => { p.sendMsg('decline', userName); }},
	"Decline");
    } else if (outgoing.includes(userName)) {
      noButton = React.createElement(
	"button",
	{onClick: () => { p.sendMsg('cancel', userName); }},
	"Cancel");
    } else if (p.userName != userName) {
      yesButton = React.createElement(
	"button",
	{onClick: () => { p.sendMsg('open', userName); }},
	"Challenge");
    }
    let gameId = p.currentGames[userName];
    if (gameId) {
      watchButton = React.createElement(
	"button",
	{onClick: () => { p.watchGame(gameId); }},
	"Watch"
      );
    }
    return React.createElement(
      "tr",
      null,
      React.createElement("td", null, userName),
      React.createElement("td", null, yesButton),
      React.createElement("td", null, noButton),
      React.createElement("td", null, watchButton)
    );
  }

  render() {
    let p = this.props;
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
	      "th", { style: { width: "25%" }}, "Challenges/Accept"),
            React.createElement(
	      "th", { style: { width: "25%" }}, "Decline/cancel"),
	    React.createElement(
	      "th", { style: { width: "25%" }}, "Watch")
          )
        ),
        React.createElement(
          "tbody", null,
          ...p.activeUsers.map(
	    userName => this.tableRow(p, userName)
	  )
        )
      )
    );
  };
}
