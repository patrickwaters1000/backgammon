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
	currentGames: props.currentGames,
	userName: props.userName,
	sendMsg: props.sendMsg,
	watchGame: props.watchGame
      }
    )
  );
};

export default AnteRoomPage;
