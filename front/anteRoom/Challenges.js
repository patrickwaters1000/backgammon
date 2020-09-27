import React, { Component } from "react";

export default class Challenges extends React.Component {
  tableRow (p, userName) {
    let user = p.activeUsers[userName];
    let { incoming, outgoing } = p.challenges;
    let nameTDProps = (
      p.userName == userName
	? null
	: {className: "blueHover",
	   onClick: () => { p.sendMsg('open', userName); }}
    );
    let yesButton, noButton;
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
    } else {
      yesButton = React.createElement(
	"button",
	{onClick: () => { p.sendMsg('open', userName); }},
	"Challenge");
    }
    return React.createElement(
      "tr",
      null,
      React.createElement("td", nameTDProps, userName),
      React.createElement("td", null, yesButton),
      React.createElement("td", null, noButton)
    );
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
	      "th", { style: { width: "25%" }}, "Challenges/Accept"),
            React.createElement(
	      "th", { style: { width: "25%" }}, "Decline/cancel")
          )
        ),
        React.createElement(
          "tbody", null,
          ...Object.keys(this.props.activeUsers).map(
	    userName => this.tableRow(this.props, userName)
	  )
        )
      )
    );
  };
}
