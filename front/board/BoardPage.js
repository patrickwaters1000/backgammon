import React from "react";
import Board from "./Board.js";
import StatusBar from "./StatusBar.js";

const BoardPage = (props) => {
  return React.createElement(
    "div",
    {
      style: {
	display: "flex",
	flexDirection: "row"
      }
    },
    React.createElement(Board, props),
    React.createElement(StatusBar, props.gameInfo)
  );
};

export default BoardPage;
