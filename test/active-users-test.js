var socket1 = require('socket.io-client')('http://localhost:3000');
var socket2 = require('socket.io-client')('http://localhost:3000');

var token1 = null;
var token2 = null;

function initP1 (socket) {
  socket.on('token', token => {
    token1 = token;
  });

  socket.on('active-users', users => {
    users.forEach( u => {
      if (u == 'guest') {
	socket.emit('challenge', { token: token1, to: u });
      }
    });
  });
     
  socket.on('challenge-accepted', m => {
    // If here, the test is successful
    console.log('Received challenge-accepted!');
  });

  socket.emit(
  'login',
    { name: 'patrick',
      password: 'hello' }
  );

}

function initP2 (socket) {
  socket.on('token', token => {
    token2 = token;
  });
  
  socket.on('challenge', m => {
    socket.emit('challenge-accepted', { token: token2, to: m.from });
  });

  socket.emit(
  'login',
    { name: 'guest',
      password: '1234' }
  );
}

initP2(socket2);
setTimeout( () => { initP1(socket1); }, 500);
