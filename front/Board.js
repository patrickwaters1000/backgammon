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

function whoControllsPip(s, pip) {
  return ( s.tokens[pip] > 0 ? "white"
	   : s.tokens[pip] < 0 ? "black"
	   : null );
}

export default class Board extends React.Component {
  /*constructor(props) {
    super(props);
    this.state = newGame();
    props.handle = this;
    // backgammonBoard = this;
    console.log("Initial state:",JSON.stringify(this.state));
  }*/
  
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
      selectedToken: (p.selectedToken && (p.selectedToken.pipNumber==i)
                      ? p.selectedToken.numTokenOnPip
                      : null),
      clickToken: numTokenOnPip => {
        this.setState(clickToken(p, i, numTokenOnPip));
      },
      clickPip: () => { clickPip(p, i); }
    };
  }

  render () {
    const p = this.props;
    const pips = range(1,25).map(
      i => React.createElement(Pip, this.getPipProperties(i))
    );
    //console.log("state", JSON.stringify(p));
    return React.createElement(
      "svg",
      { height: boardHeight, width: boardWidth },
      React.createElement( // board background
        "rect",
        { x: 0, y: 0, width: boardWidth, height: boardHeight, fill: boardColor }
      ),
      React.createElement(
        BarArea,
        { whiteTokens: p.tokens[0],
          blackTokens: -p.tokens[25],
          selectedToken: (p.selectedToken
                          && ((player == "white" && p.selectedToken.pipNumber==0)
                              || (player == "black" && p.selectedToken.pipNumber==25))
                          ? p.selectedToken.numTokenOnPip
                          : null),
          clickToken: numTokenOnPip => {
            this.setState(clickToken(p,
                                     (player=="white" ? 0 : 25),
                                     numTokenOnPip));
          }}
      ),
      React.createElement(
        HomeArea,
        { whiteTokens: 0, // FIX THIS
          blackTokens: 0,
          clickPip: () => {
            clickPip(p, (player=="white" ? 25 : 0)); // CAN DELETE?
          }}
      ),
      React.createElement(
        Dice,
        { x: homeWidth / 2 - dieWidth,
	  y: boardHeight / 2 - dieWidth / 2,
	  values: p.dice }
      ),
      ...pips
    );
  }
}
