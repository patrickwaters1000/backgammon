import React from "react";
import Board from "./Board.js";

const BoardPage = (props) => {
  return React.createElement(
    "div",
    {},
    React.createElement(Board, props),
    React.createElement(StatusBar, props.gameInfo)
  );
};

export default BoardPage;
