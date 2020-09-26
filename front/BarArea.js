import React, { Component } from "react";
import Token from "./Token.js";
import { range } from "./utils.js";
import { tokenRadius,
	 boardHeight,
	 homeWidth,
	 pipHalfWidth,
	 barWidth,
	 barColor } from "./dimensions.js";


export default class BarArea extends React.Component {
  // props: whiteTokens, blackTokens, selectedToken, clickToken()
  getToken(numTokens, i) {
    const p = this.props;
    const yMin = 0.5 * boardHeight - (numTokens-1) * tokenRadius;
    return React.createElement(
      Token, {
        x: homeWidth + 12 * pipHalfWidth + 0.5 * barWidth,
        y: yMin + i * 2 * tokenRadius,
        controller: (i < p.whiteTokens ? "white" : "black"),
        selected: i==p.selectedToken, // often "selectedToken" is null
        onClick: () => p.clickToken(i)
      });
  }

  render () {
    const p = this.props;
    const numTokens = p.whiteTokens + p.blackTokens;
    const tokens = range(numTokens).map(
      i => this.getToken(numTokens, i)
    );
    return React.createElement(
      'g',
      null,
      React.createElement( // bar area
        "rect",
        { x: 12*pipHalfWidth + homeWidth,
	  y: 0, width: barWidth,
	  height: boardHeight,
	  fill: barColor }
      ),
      ...tokens
    );
  }
}
