const params = new URLSearchParams(window.location.search);
const token = params.get("token") || Math.random().toString().substring(2);;

var socket = io();

// React expects state to be reassigned, not mutated
function deepCopy(state) {
    return JSON.parse(JSON.stringify(state));
}

function assoc (obj, k, v) {
  newObj = deepCopy(obj);
  newObj[k] = v;
  return newObj;
}


/* ---------------------------------------------/
/                   Logic                       /
/  --------------------------------------------*/


function login (state, userName) {
  console.log("Attempting login");
  socket.emit('login', {
    userName: userName,
    token: token
  });
  console.log("We attempted the login");
  const newState = deepCopy(state);
  newState.userName = userName;
  return newState;
}

/*
function updatePlayers (state, msg) {
  const newState = deepCopy(state);
  newState.players = msg;
  return newState;
}*/

function sendChallenge (state, player) {
  if (player !== state.player
      && window.confirm(`Challenge ${player}?`)) {
    socket.emit(
      'challenge',
      { p1: state.userName, p2: player, token: token }
    );
    const newState = deepCopy(state);
    newState.sentChallenge = { player: player, status: "pending" };
    return newState;
  } else { return state; }
}

function receiveChallenge (state, msg) {
  if (window.confirm(`You are challenged by ${msg.p1}. Do you accept?`)) {
    console.log("You accepted the challenge. Challenge message:", msg);
    socket.emit(
      'challenge-accepted',
      { p1: msg.p1, p2: state.userName, token: token }
    );
  } else {
    socket.emit(
      'challenge-declined',
      { p1: msg.p1, p2: state.userName, token: token }
    );
  }
  return state; // The server will immenently redirect us to the game,
  // so doesn't really matter what we return here.
}

function challengeDeclined (state) {
  const newState = deepCopy(state);
  newState.sentChallenge.status = "declined";
  console.log(`Acknowledged the declined challenge. sentChallenge is now ${JSON.stringify(newState.sentChallenge)}`);
  return newState;
}

/* ---------------------------------------------/
/                   Components                  /
/  --------------------------------------------*/


class TitleArea extends React.Component {
  render() {
    const style = {
      fontFamily: "Helvetica",
      //margin: "auto"
    };
    return React.createElement(
      "h2", { style: style}, "Backgammon ante room"
    );
  }
}


class PlayersOnline extends React.Component {
  // props: challengeFn (fn), players, userName

  tableRows () {
    const p = this.props;
    return p.players.map( player => React.createElement(
      "tr", null,
      React.createElement(
        "td",
        ((!p.canSendChallenge || player.player===p.userName)
         ? null
         : {
           className: "blueHover",
           onClick: () => { p.challengeFn(player); },
         }
        ),
        player.player),
      React.createElement("td", null, player.wins),
      React.createElement("td", null, player.losses)
    ));
  }

  render() {
    console.log(`Rendering players online with state ${JSON.stringify(this.props.players)}`);

    return React.createElement(
      "div", { className: "flexGrow", style: { width: "100%" } },
      React.createElement(
        "table", { style: { width: "100%" }},
        React.createElement(
          "thead", null,
          React.createElement(
            "tr", null,
            React.createElement("th", { style: { width: "50%" }}, "Player"),
            React.createElement("th", { style: { width: "25%" }}, "Wins"),
            React.createElement("th", { style: { width: "25%" }}, "Losses")
          )
        ),
        React.createElement(
          "tbody", null,
          ...this.tableRows()
        )
      )
    );
  }
}

class ChallengeStatus extends React.Component {
  // props: player, status
  render () {
    const p = this.props;
    console.log(`Rendering ChallengeStatus with props ${JSON.stringify(p)}`);
    const style = { color: "red" };
    const msg = (p.status == "pending"
                 ? `Waiting for ${p.player} to accept your challenge`
                 : `${p.player} declined your challenge`);
    // Cancel challenge button?
    return React.createElement("p", { style: style }, msg);
  }
}

class InputName extends React.Component {
  // props: loginFn
  /*submit() {
    const userName = document.getElementById("username").value;
    this.props.loginFn(userName);
  }*/

  render() {
    const style = {
      display: "flex",
      padding: "0px",
      flexDirection: "row",
      width: "100%",
      fontFamily: "Helvetica",
      onSubmit: (e) => {
        e.preventDefault();
        //this.submit();
        const userName = document.getElementById("username").value;
        this.props.loginFn(userName);
      }
    };
    return React.createElement(
      "form", { style: style },
      React.createElement(
	"div", { style: { width: "150px" }},
	React.createElement("p", { className: "userNameLabel"}, "Name:")),
      React.createElement(
	"div", { style: { width: "200px" },
		 //className: "flexGrow",
	       },
	React.createElement(
	  "input", { id: "username", className: "userNameInput"})
	  //"p", null, "hello")
      ),
      React.createElement(
	"div", { style: { width: "150px" }},
	React.createElement(
          "button",
          {
            className: "loginButton",
            background: "#272727",
            onClick: () => {
              const userName = document.getElementById("username").value;
              this.props.loginFn(userName);
              //this.submit
            }
          },
          "Go"
	))
    );
  }
}

class Page extends React.Component {
  // state: players, sentChallenge ( .player, .status )
  constructor(props) {
    super(props);
    this.state = {
      players: [],
      sentChallenge: null,
      userName: params.get("userName") // may very well be `null`
    };
    socket.on('update-users-online', msg => {
      const newState = deepCopy(this.state);
      newState.players = msg;
      this.setState(newState);
      console.log(`Received list of players ${JSON.stringify(msg)}`);
    });
    socket.on('challenge', msg => {
      this.setState(receiveChallenge(this.state, msg));
    });
    socket.on('challenge-declined', msg => {
      console.log(`Received challenge-declined ${JSON.stringify(msg)}`);
      this.setState(challengeDeclined(this.state, msg));
    });
    socket.on('start-game', msg => {
      window.location.href =`backgammon.html?game=${msg.gameId}&player=${msg.player}&token=${token}`;
    });
  }

  render() {
    const style = {
      margin: "auto",
      marginTop: "100px",
      padding: "10px",
      width: "400px",
      height: "400px",
      display: "flex",
      flexDirection: "column",
      borderStyle: "solid",
      borderWidth: "1px",
      borderRadius: "10px",
      fontFamily: "Helvetica"
    };
    var children = [
      React.createElement(TitleArea),
      React.createElement(
        PlayersOnline,
        {
          canSendChallenge: (this.state.userName
                             && (!this.state.sentChallenge
                                 || this.state.sentChallenge.status !== "pending")),
          userName: this.state.userName,
          players: this.state.players,
          challengeFn: player => { this.setState(sendChallenge(this.state, player.player)); }
        })
    ];
    if (this.state.sentChallenge) {
      children.push(
        React.createElement(
          ChallengeStatus,
          { player: this.state.sentChallenge.player, status: this.state.sentChallenge.status }));
    }
    if (!this.state.userName) {
      children.push(
        React.createElement(
          InputName,
          {
            loginFn: userName => {
              console.log("Gonna try login soon.");
              this.setState(login(this.state, userName));
            }
          }
        ));
    }
    return React.createElement("div", { style: style }, ...children);
  }
}

/* ---------------------------------------------/
/                   Initialize                  /
/  --------------------------------------------*/




window.addEventListener(
  "DOMContentLoaded",
  () => {
    const div = document.getElementById("main");
    const page = React.createElement(Page);
    ReactDOM.render(page, div);
    socket.emit('request-players-online', null);
  }
);
