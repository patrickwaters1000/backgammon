import React, { Component } from "react";

export default class Login extends React.Component {

  render() {
    const p = this.props;

    let userNameInputProps = {
      id: "usernameInput",
      type: "text",
      placeholder: "Enter username",
      required: true
    };
    let passwordInputProps = {
      id: "passwordInput",
      type: "text",
      placeholder: "Enter password",
      required: true
    };
    
    return React.createElement(
      "div",
      {className: "container"},
      React.createElement(
	"form",
	{
	  id: "loginForm",
	  onSubmit: p.submitForm
	},
	React.createElement(
	  "h2", null, "Backgammon"),
	React.createElement(
	  "label", null, "Username"),
	React.createElement(
	  "input", userNameInputProps),
	React.createElement(
	  "label", null, "Password"),
	React.createElement(
	  "input", passwordInputProps),
	React.createElement(
	  "button",
	  {type: "submit"},
	  "Login"
	)
      )
    );
  }
}
