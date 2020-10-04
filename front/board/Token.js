import React, { Component } from "react";
import { tokenRadius, tokenColors } from "./dimensions.js";

export default class Token extends React.Component {
  // props: x, y, controlledBy, selected, clickToken
  render() {
    const p = this.props;

    return (
      React.createElement(
        "circle",
        {
          cx: p.x,
          cy: p.y,
          r: tokenRadius,
          fill: (p.selected
		 ? tokenColors.selected
		 : tokenColors[p.controller]),
          onClick: p.onClick
        },
      )
    );
  }
}
