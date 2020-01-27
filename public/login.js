var socket = io();

socket.on(
  'token',
  msg => {
    console.log(`Received token ${msg}`);
    const username = document.getElementById("usernameInput").value;
    window.location.href =`ante-room-2.html?token=${msg}&userName=${username}`;
  }
);

socket.on(
  'login-failed',
  msg => {
    alert("Invalid username/password. Try again");
  }
)

window.addEventListener(
  "DOMContentLoaded",
  () => {
    document.getElementById("loginForm").addEventListener(
      "submit",
      (e) => {
	e.preventDefault();
	socket.emit(
	  'login',
	  {
	    username: document.getElementById("usernameInput").value,
	    password: document.getElementById("passwordInput").value
	  }
	);
      }
    );
  }
);
      
