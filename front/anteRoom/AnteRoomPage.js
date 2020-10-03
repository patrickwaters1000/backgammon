import React from "react";
import TitleArea from "./TitleArea.js";
import Challenges from "./Challenges.js";

const AnteRoomPage = (props) => {
  return React.createElement(
    "div",
    {},
    React.createElement(TitleArea),
    React.createElement(
      Challenges,
      {
	activeUsers: props.activeUsers,
	challenges: props.challenges,
	userName: props.userName,
	sendMsg: props.sendMsg
      }
    )
  );
};

export default AnteRoomPage;
