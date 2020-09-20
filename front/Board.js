import React, { Component } from "react";
import Pip from "./Pip.js";
import BarArea from "./BarArea.js";
import HomeArea from "./HomeArea.js";
import Dice from "./Dice.js";
import { newGame } from "../game.js";
import { range } from "./utils.js";
import { pipHalfWidth,
	 barWidth,
	 homeWidth,
	 boardWidth,
	 boardHeight,
	 boardColor,
	 dieWidth
       } from "./dimensions.js";

function whoControllsPip(p, pip) {
  return ( p.tokens[pip] > 0 ? "white"
	   : p.tokens[pip] < 0 ? "black"
	   : null );
}

function isTokenOnBarSelected (p) {
  let t = p.selectedToken; 
  if (t) {
    return (p.active == "white"
	    ? t.pipIndex==0
	    : t.pipIndex==25);
  } else {
    return false;
  }
}
// Board has no state, it is a subcomponent of a top level Game class
// which does have state. The board's properties are those of
// game.js/newGame() and functions for handling the following events:
// 1) clickPip(pipIndex)
// 2) clickToken(pipIndex, numTokenOnPip)
// 3) clickDice()
// Finally, at least one more property enhancing how the board should
// be rendered:
// 4) selectedToken (has keys pipIndex, numTokenOnPip)

export default class Board extends React.Component {
  
  getPipBasepointX (i) {
    if (i > 12) {
      return this.getPipBasepointX(25-i);
    } else {
      return (homeWidth
	      + (2*i-1) * pipHalfWidth
	      + (i < 7 ? 0 : barWidth));
    }
  }

  getPipProperties (i) {
    const p = this.props;
    const controller = whoControllsPip(p, i);
    const numTokens = Math.abs(p.tokens[i]);
    return {
      x: this.getPipBasepointX(i),
      y: (i > 12 ? boardHeight : 0),
      isEvenPip: i%2 == 0,
      isUpright: i > 12,
      numTokens: numTokens,
      controller: controller,
      selectedToken: ((p.selectedToken
		       && (p.selectedToken.pipIndex==i))
                      ? p.selectedToken.numTokenOnPip
                      : null),
      clickToken: numTokenOnPip => {
        p.clickToken(i, numTokenOnPip);
      },
      clickPip: () => { p.clickPip(i); }
    };
  }

  render () {
    const p = this.props;
    const pips = range(1,25).map(
      i => React.createElement(Pip, this.getPipProperties(i))
    );
    
    return React.createElement(
      "svg",
      { height: boardHeight, width: boardWidth },
      React.createElement( // board background
        "rect",
        { x: 0,
	  y: 0,
	  width: boardWidth,
	  height: boardHeight,
	  fill: boardColor }
      ),
      React.createElement(
        BarArea,
        {
	  whiteTokens: p.tokens[0],
          blackTokens: -p.tokens[25],
          selectedToken: (isTokenOnBarSelected(p)
                          ? p.selectedToken.numTokenOnPip
                          : null),
          clickToken: numTokenOnPip => {
	    let pipIndex = (p.active=="white" ? 0 : 25);
            p.clickToken(pipIndex, numTokenOnPip);
          }
	}
      ),
      React.createElement(
        HomeArea,
        { whiteTokens: 0, // FIX THIS
          blackTokens: 0,
          clickPip: () => {
	    let pipIndex = (p.active=="white" ? 25 : 0)
            p.clickPip(pipIndex);
          }}
      ),
      React.createElement(
        Dice,
        { x: homeWidth / 2 - dieWidth,
	  y: boardHeight / 2 - dieWidth / 2,
	  values: p.dice,
	  clickDice: p.clickDice
	}
      ),
      ...pips
    );
  }
}
