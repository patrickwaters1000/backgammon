import React from "react";
import { tokenColors,
	 boardHeight,
	 boardWidth } from "./dimensions.js";

const StatusField = props => React.createElement(
  "g",
  null,
  React.createElement(
    "rect",
    {x: props.x,
     y: props.y,
     height: 0.03 * boardHeight,
     width: 0.03 * boardWidth,
     fill: props.color }
  ),
  React.createElement(
    "text",
    {x: props.x + 0.06 * boardWidth,
     y: props.y,
     textAnchor: "start",
     dominantBaseline: "text-under",
     fill: "#000000",
     fontSize: 14
    },
    props.label
  )
);

const StatusBar = props => React.createElement(
  "svg",
  {
    width: 0.33 * boardWidth,
    height: boardHeight
  },
  StatusField({
    x: 0,
    y: 0.1 * boardHeight,
    color: tokenColors.white,
    label: props.white
  }),
  StatusField({
    x: 0,
    y: 0.2 * boardHeight,
    color: tokenColors.black,
    label: props.black
  })
);

export default StatusBar;
