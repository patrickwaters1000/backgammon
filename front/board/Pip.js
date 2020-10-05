import React, { Component } from "react";
import Token from "./Token.js";
import { pipHalfWidth,
	 pipHeight,
	 pipColors,
	 tokenRadius } from "./dimensions.js";
import { range } from "../../utils.js";

/*
Properties
x, y (basepoint coords)
isUpright
numTokens
controller
selectedToken
*/

export default class Pip extends React.Component {

  getCorners() {
    const p = this.props;
    const sign = (p.isUpright ? -1 : 1);
    return [{
      x: p.x - pipHalfWidth,
      y: p.y
    }, {
      x: p.x + pipHalfWidth,
      y: p.y
    }, {
      x: p.x,
      y: p.y + sign * pipHeight
    }];
  }

  getPath() {
    var p1, p2, p3;
    [p1, p2, p3] = this.getCorners();
    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} Z`;
  }

  getToken(i) {
    const p = this.props;
    return React.createElement(Token, {
      x: p.x,
      y: p.y + (2*i+1) * (p.isUpright ? -1 : 1) * tokenRadius,
      controller: p.controller,
      selected: i==p.selectedToken,
      onClick: () => p.clickToken(i)
    });
  }

  getExtraTokens(numExtra) {
    const p = this.props;
    if (numExtra == 0) {
      return [];
    } else {
      return [React.createElement(
	"text",
	{ x: p.x,
          y: p.y + (p.isUpright ? -1 : 1) * tokenRadius,
          textAnchor: "middle",
          alignmentBaseline: "middle",
          fill: "#ffffff",
          fontSize: 20
	},
	`+${numExtra}`
      )];
    }
  }
  
  render() {
    const p = this.props;
    // when >5 tokens, hide extras and put +x text element
    const tokensToRender = Math.min(p.numTokens, 5);
    const numExtra = p.numTokens - tokensToRender;
    const tokens = range(tokensToRender).map( i => this.getToken(i) );
    const extraTokens = this.getExtraTokens(numExtra);
    return (
      React.createElement(
        "g",
        null,
        React.createElement(
          "path",
          {
            d: this.getPath(),
            fill: pipColors[(p.isEvenPip ? 0 : 1)],
            onClick: p.clickPip
          },
        ),
        ...tokens,
        ...extraTokens
      )
    );
  }
}
