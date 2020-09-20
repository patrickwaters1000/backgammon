import React, { Component } from "react";

export default class TitleArea extends React.Component {
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
