import React, { Component } from "react";
import ReactDOM from "react-dom";

const boardWidth = "500px";
const boardHeight = "500px";
const boardColor = "#39ac39";

class Board extends React.Component {

  render () {
    return (
	<svg height={boardHeight} width={boardWidth} >
	<rect x="0" y="0" width={boardWidth} height={boardHeight} fill={boardColor}>
	</rect>
	</svg>
    );
  }
}

export default Board;

const wrapper = document.getElementById("div-1");
wrapper ? ReactDOM.render(<Board />, wrapper) : false;

/*
    return React.createElement(
      "svg",
      { height: boardHeight, width: boardWidth },
      React.createElement( // board background
        "rect",
        {
          x: 0, y: 0, width: boardWidth, height: boardHeight, fill: boardColor
        }
      )
    );
*/
