import React, { Component } from "react";
import { dieSpotCenters,
	 dieSpotRadius,
	 dieWidth } from "./dimensions.js";

class Die extends React.Component {
  // props : x, y, value
  getSpots () {
    const p = this.props;
    const activeSpotCenters = dieSpotCenters[p.value];
    return activeSpotCenters.map( center => {
      var dx,dy;
      [dx,dy] = center;
      return React.createElement(
        'circle',
        { cx: p.x + dx, cy: p.y + dy,
          r: dieSpotRadius, fill: "#000000" },
      );
    });
  }

  render () {
    const p = this.props;
    return React.createElement(
      'g', null,
      React.createElement(
        'rect',
        { x: p.x, y: p.y,
          height: dieWidth, width: dieWidth,
          fill: "#ffffff", stroke: "#000000",
          //onClick: clickDice
        }
      ),
      ...this.getSpots()
    );
  }
}

export default class Dice extends React.Component {
  // props: values[2], x, y
  render () {
    const p = this.props;
    const dice = p.values.map( (v, i) => React.createElement(
      Die,
      { x: p.x + i * dieWidth, y: p.y, value: v }
    ));
    return React.createElement(
      'g', null,
      ...dice
    );
  }
}
