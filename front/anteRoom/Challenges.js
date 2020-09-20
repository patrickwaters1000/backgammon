import React, { Component } from "react";

export default class Challenges extends React.Component {
  tableRow (p, userName) {
    let user = p.activeUsers[userName];
    let nameTDProps = (
      p.userName == userName
	? null
	: {className: "blueHover",
	   onClick: () => { p.sendMsg('challenge', userName); }}
    );
    let yesButton, noButton;
    if (user.incoming) {
      yesButton = React.createElement(
	"button",
	{onClick: () => { p.sendMsg('challenge-accepted', userName); }},
	"Accept");
      noButton = React.createElement(
	"button",
	{onClick: () => { p.sendMsg('challenge-declined', userName); }},
	"Decline");
    } else if (user.outgoing) {
      noButton = React.createElement(
	"button",
	{onClick: () => { p.sendMsg('cancel-challenge', userName); }},
	"Cancel");
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
	      "th", { style: { width: "25%" }}, "Accept"),
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
