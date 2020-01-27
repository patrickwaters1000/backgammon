'use strict';

var socket = io();

function range (i,j) {
  return (j
          ? Array(j-i).fill(0).map( (_, idx) => idx+i )
          : Array(i).fill(0).map( (_, idx) => idx ) );
}


var boardHeight;
var boardWidth;
var barWidth;
var homeWidth;
var pipHeight;
var pipHalfWidth;
var tokenRadius;
var tokenThickness;
var tokenColors;
var pipColors;
var barColor;
var homeColor;
var boardColor;
var dieWidth;
var dieSpotRadius;
var dieSpotAreaOffset;
var dieSpotAreaSpacing;
var dieSpotCenters;

function getRelativeDieSpotCenter(i) {
  // Location of ith possible spot relative to die corner
  const r = Math.floor(i/3);
  const c = i%3;
  return [r,c].map( i => dieSpotAreaOffset + i * dieSpotAreaSpacing );
}
// Locations of all die spots relative to die corner if "i" is rolled



function setLengths() {
  console.log(`${JSON.stringify(document.getElementById("backgammon-canvas"))}`);
  console.log(`Width = ${document.getElementById("backgammon-canvas").width}`);

  //boardHeight = document.getElementById("backgammon-canvas").width;
  //boardWidth = document.getElementById("backgammon-canvas").height;
  boardHeight = 0.95 * window.innerHeight;
  boardWidth = 0.75 * window.innerWidth;
  barWidth = 0.08 * boardWidth;
  homeWidth = 0.08 * boardWidth;
  pipHeight = 0.4 * boardHeight;
  pipHalfWidth = (boardWidth - barWidth - homeWidth) / 24;
  tokenRadius = 0.6 * pipHalfWidth;
  tokenThickness = 0.4 * tokenRadius;

  tokenColors = { white: "#ff0000", black: "#000000", selected: "#0000ff" };
  pipColors = { 0: "#ffffff", 1: "#d2a679" };
  barColor = "#88ff88";//"#ff8888";
  homeColor = "#88ff88";
  boardColor = "#39ac39"; //#604020";

  dieWidth = 1.0 * pipHalfWidth;
  dieSpotRadius = 0.08 * dieWidth;
  dieSpotAreaOffset = 0.25 * dieWidth;
  dieSpotAreaSpacing = dieWidth / 2 - dieSpotAreaOffset;

  // Locations of all die spots relative to die corner if "i" is rolled
  dieSpotCenters = [
    [], [4], [2,6], [2,4,6], [0,2,6,8], [0,2,4,6,8], [0,2,3,5,6,8]
  ].map( spotNumbers => spotNumbers.map(getRelativeDieSpotCenter) );
}


//console.log(dieSpotCenters);


// Additional global consts
let params = new URLSearchParams(window.location.search);
const token = params.get("token");
const gameId = params.get("game");
const player = params.get("player");
console.log(player);
socket.emit(
  'update-socket', // after coming to this page, the server still has a connection to the ante-room?
  token
);


function deepCopy(gameState) {
  return JSON.parse(JSON.stringify(gameState));
}

function whoControllsPip(gameState, pip) {
  if (gameState.tokensPerPip["white"][pip]>0) { return "white"; }
  else if (gameState.tokensPerPip["black"][pip]>0) { return "black"; }
  else { return null; }
}

/*range(25).forEach( i => {
  console.log(whoControllsPip(initialGameState, i));
  });*/

function isYourTurn(gameState) {
  const activePlayer = (gameState.turnNumber%2==0 ? "white" : "black");
  return player==activePlayer;
}

function canSelectToken(gameState, pipNumber) {
  console.log(isYourTurn(gameState), gameState.tokensPerPip[player]);
  return isYourTurn(gameState) && gameState.tokensPerPip[player][pipNumber] > 0;
}

function selectToken(gameState, pipNumber, numTokenOnPip) {
  var newState = deepCopy(gameState);
  newState.selectedToken = {
    pipNumber: pipNumber,
    numTokenOnPip: numTokenOnPip
  };
  console.log(newState);
  return newState;
}

function clickToken(gameState, pipNumber, numTokenOnPip) {
  console.log("In click token fn");
  if (canSelectToken(gameState, pipNumber)) {
    console.log("Selecting token");
    return selectToken(gameState, pipNumber, numTokenOnPip);
  } else {
    console.log("Cannot select token");
    return gameState;
  }
}

// Note: on server side we must account for the possibility that either player may be moving
/*function canMoveToken(gameState, fromPip, toPip) {
  const pone = (player=="white" ? "black" : "white");
  console.log("Your opponent is", pone);
  console.log("Your tokens on from pip =",gameState.tokensPerPip[player][fromPip]);
  console.log("Pone's tokens on to pip =",gameState.tokensPerPip[pone][toPip]);
  return (gameState.tokensPerPip[player][fromPip]>0 &&
  gameState.tokensPerPip[pone][toPip] < 2);
  }*/

// route this thru server? or would that create a lag?
/*function moveToken(gameState, fromPip, toPip) {

  const controller = whoControllsPip(gameState, fromPip);
  var newState = deepCopy(gameState);
  newState.tokensPerPip[controller][fromPip] -= 1;
  newState.tokensPerPip[controller][toPip] += 1;
  newState.turnNumber += 1;
  newState.selectedToken = null;
  return newState;
  }*/

function clickPip(gameState, clickedPip) {
  console.log("clicked pip", clickedPip);
  console.log("selected token",gameState.selectedToken);
  if (gameState.selectedToken) {
    const fromPip = gameState.selectedToken.pipNumber;
    socket.emit(
      'move',
      { token: token, gameId: gameId, from: fromPip, to: clickedPip }
    );
    /*if (canMoveToken(gameState, fromPip, clickedPip)) {
      console.log("You can move the token");
      return moveToken(gameState, fromPip, clickedPip);
      } else { console.log("You cannot move the token"); }
      }
      return gameState;*/
  }
}
//<text x="150" y="125" font-size="60" text-anchor="middle" fill="white">SVG</text>
class Token extends React.Component {
  // props: x, y, controlledBy, selected, clickToken
  render() {
    const p = this.props;

    return (
      React.createElement(
        "circle",
        {
          cx: this.props.x,
          cy: this.props.y,
          r: tokenRadius,
          fill:  (this.props.selected ? tokenColors.selected : tokenColors[this.props.controlledBy]),
          onClick: () => {
            console.log("Token clicked");
            this.props.clickToken();
          }
        },
      )
    );
  }
}

class Pip extends React.Component {

  getPipCorners() {
    const p = this.props;
    const sign = (p.isUpright ? -1 : 1);
    return [{
      x: p.basePoint.x - pipHalfWidth,
      y: p.basePoint.y
    }, {
      x: p.basePoint.x + pipHalfWidth,
      y: p.basePoint.y
    }, {
      x: p.basePoint.x,
      y: p.basePoint.y + sign * pipHeight
    }];
  }

  getPipPathString() {
    var p1, p2, p3;
    [p1, p2, p3] = this.getPipCorners();
    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} Z`;v
  }

  getToken(i) {
    const p = this.props;
    return React.createElement(Token, {
      x: p.basePoint.x,
      y: p.basePoint.y + (2*i+1) * (p.isUpright ? -1 : 1) * tokenRadius,
      controlledBy: p.controlledBy,
      selected: i==p.selectedToken,
      clickToken: () => p.clickToken(i)
    });
  }

  render() {
    // when >5 tokens, hide extras and put +x text element
    const tokensToRender = Math.min(this.props.numTokens, 5);
    const extraTokens = this.props.numTokens - tokensToRender;
    var tokens = range(tokensToRender).map( i => this.getToken(i) );
    const p = this.props;
    const extraTokensOrNothing = ( extraTokens > 0
                                   ? [React.createElement(
                                     "text",
                                     { x: p.basePoint.x,
                                       y: p.basePoint.y + (p.isUpright ? -1 : 1) * tokenRadius,
                                       textAnchor: "middle",
                                       alignmentBaseline: "middle",
                                       fill: "#ffffff",
                                       fontSize: 20
                                     },
                                     `+${extraTokens}`)]
                                   : [] );
    return (
      React.createElement(
        "g",
        null,
        React.createElement(
          "path",
          {
            d: this.getPipPathString(),
            fill: pipColors[(this.props.isEvenPip ? 0 : 1)],
            onClick: this.props.clickPip
          },
        ),
        ...tokens,
        ...extraTokensOrNothing
      )
    );
  }
}

class BarArea extends React.Component {
  // props: whiteTokens, blackTokens, selectedToken, clickToken()
  getToken(numTokens, i) {
    const p = this.props;
    const yMin = 0.5 * boardHeight - (numTokens-1) * tokenRadius;
    return React.createElement(
      Token, {
        x: homeWidth + 12 * pipHalfWidth + 0.5 * barWidth,
        y: yMin + i * 2 * tokenRadius,
        controlledBy: (i< this.props.whiteTokens ? "white" : "black"),
        selected: i==p.selectedToken, // often "selectedToken" is null
        clickToken: () => p.clickToken(i)
      });
  }

  render () {
    const p = this.props;
    const numTokens = p.whiteTokens + p.blackTokens;
    const tokens = [...Array(numTokens).keys()].map(
      i => this.getToken(numTokens, i)
    );
    return React.createElement(
      'g',
      null,
      React.createElement( // bar area
        "rect",
        { x: 12*pipHalfWidth + homeWidth, y: 0, width: barWidth, height: boardHeight, fill: barColor }
      ),
      ...tokens
    );
  }
}

class HomeArea extends React.Component {
  // props: whiteTokens, blackTokens, clickPip()
  getToken(numTokens, i) {
    const controlledBy = (i< this.props.whiteTokens ? "white" : "black");
    return React.createElement(
      "rect", {
        x: 0.5 * homeWidth - tokenRadius,
        y: (controlledBy=="black"
            ? (numTokens-i-1) * tokenThickness
            : boardHeight - (i + 1) * tokenThickness),
        width: 2 * tokenRadius,
        height: tokenThickness,
        fill: tokenColors[controlledBy]
      });
  }

  render () {
    const p = this.props;
    const numTokens = p.whiteTokens + p.blackTokens;
    const tokens = range(numTokens).map( i => this.getToken(numTokens, i) );
    return React.createElement(
      'g',
      null,
      React.createElement( // home area
        "rect",
        { x: 0, y: 0, width: homeWidth, height: boardHeight, fill: homeColor, onClick: p.clickPip }
      ),
      ...tokens
    );
  }
}

class Die extends React.Component {
  // props : x, y, value
  getSpots () {
    const activeSpotCenters = dieSpotCenters[this.props.value];
    return activeSpotCenters.map( center => {
      var dx,dy;
      [dx,dy] = center;
      return React.createElement(
        'circle',
        { cx: this.props.x + dx, cy: this.props.y + dy,
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

class Dice extends React.Component {
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

var backgammonBoard = null

class Board extends React.Component {
  constructor(props) {
    super(props);
    this.state = initialGameState;
    backgammonBoard = this;
  }

  getPipBasepointX (i) {
    if (i > 12) {
      return this.getPipBasepointX(25-i);
    } else {
      return (homeWidth + (2*i-1) * pipHalfWidth + (i < 7 ? 0 : barWidth));
    }
  }

  getPipProperties (i) {
    const s = this.state;
    const controller = whoControllsPip(s, i);
    const numTokens = (controller ? s.tokensPerPip[controller][i] : 0);
    return {
      basePoint: {
        x: this.getPipBasepointX(i),
        y: (i > 12 ? boardHeight : 0)
      },
      isEvenPip: i%2==0,
      isUpright: i>12,
      numTokens: numTokens,
      controlledBy: controller,
      selectedToken: (s.selectedToken && (s.selectedToken.pipNumber==i)
                      ? s.selectedToken.numTokenOnPip
                      : null),
      clickToken: numTokenOnPip => {
        this.setState(clickToken(s, i, numTokenOnPip));
      },
      clickPip: () => { clickPip(s, i); }
    };
  }

  render () {
    var pips = range(1,25).map(
      i => React.createElement(Pip, this.getPipProperties(i))
    );
    return React.createElement(
      "svg",
      { height: boardHeight, width: boardWidth },
      React.createElement( // board background
        "rect",
        {
          x: 0, y: 0, width: boardWidth, height: boardHeight, fill: boardColor
        }
      ),
      React.createElement(
        BarArea,
        { whiteTokens: this.state.tokensPerPip["white"][0],
          blackTokens: this.state.tokensPerPip["black"][25],
          selectedToken: (this.state.selectedToken
                          && ((player == "white" && this.state.selectedToken.pipNumber==0)
                              || (player == "black" && this.state.selectedToken.pipNumber==25))
                          ? this.state.selectedToken.numTokenOnPip
                          : null),
          clickToken: numTokenOnPip => {
            this.setState(clickToken(this.state,
                                     (player=="white" ? 0 : 25),
                                     numTokenOnPip));
          }}
      ),
      React.createElement(
        HomeArea,
        { whiteTokens: this.state.tokensPerPip["white"][25],
          blackTokens: this.state.tokensPerPip["black"][0],
          clickPip: () => {
            clickPip(this.state, (player=="white" ? 25 : 0));
          }}
      ),
      React.createElement(
        Dice,
        { x: homeWidth / 2 - dieWidth, y: boardHeight / 2 - dieWidth / 2, values: this.state.dice }
      ),
      ...pips
    );
  }
}


var initialGameState = null; // THIS IS HORRIBLE CODING STYLE

window.addEventListener(
  "DOMContentLoaded",
  function () {
    // Setup chat component
    setLengths();
    document.getElementById('msg-form').addEventListener(
      "submit",
      function (e) {
        e.preventDefault(); // prevents page reloading
        socket.emit('chat-message', { token: token, message: $('#m').val() });
        $('#m').val('');
        return false;
      }
    );
    socket.on('chat-message', function(msg){
      $('#messages').append($('<li>').text(msg));
    });
    // Setup board
    const backgammonContainer = document.querySelector('#backgammon-canvas');

    socket.on(
      'initial-game-state',
      m => {
        initialGameState = m;
        console.log(`About to render board. Received msg ${JSON.stringify(m)}, and initialGameState=${initialGameState}`);
        ReactDOM.render(React.createElement(Board), backgammonContainer);
      }
    );

    socket.on('game-state', m => {
      console.log(`Received state ${m}`);
      backgammonBoard.setState(m);
    });

    socket.emit('request-initial-game-state', { gameId: gameId });

    socket.on(
      'game-over',
      m => {
        alert(`${m.winner} has won the game`);
        window.location.href =`ante-room-2.html?token=${token}&userName=${params.get("username")}`;
      }
    );
  }
);
