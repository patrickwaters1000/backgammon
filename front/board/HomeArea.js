import React, { Component } from "react";
import Token from "./Token.js";
import { range } from "../../utils.js";
import { tokenThickness,
	 homeWidth,
	 boardHeight,
	 tokenRadius,
	 homeColor } from "./dimensions.js";

export default class HomeArea extends React.Component {
  // props: whiteTokens, blackTokens, clickPip()
  getToken(numTokens, i) {
    const controlledBy = (i< this.props.whiteTokens ? "white" : "black");
    return React.createElement(
      "rect", {
        x: 0.5 * homeWidth - tokenRadius,
        y: (controlledBy=="black"
            ? (numTokens-i-1) * tokenThickness
            : boardHeight - (i + 1) * tokenThickness),
        width: 2 * tokenRadius,
        height: tokenThickness,
        fill: tokenColors[controlledBy]
      });
  }

  render () {
    const p = this.props;
    const numTokens = p.whiteTokens + p.blackTokens;
    const tokens = range(numTokens).map( i => this.getToken(numTokens, i) );
    return React.createElement(
      'g',
      null,
      React.createElement( // home area
        "rect",
        { x: 0,
	  y: 0,
	  width: homeWidth,
	  height: boardHeight,
	  fill: homeColor,
	  onClick: () => {
	    console.log("Hello");
	    p.clickPip();
	  }
	}
      ),
      ...tokens
    );
  }
}
