const path = require('path');
const HtmlWebPackPlugin = require("html-webpack-plugin");

const page = 'backgammon';
//const page = 'watchGame';
//const page = 'replayGame';
//const page = 'anteRoom';

module.exports = {
  entry: `./front/${page}.js`,
  output: {
    filename: `${page}.js`,
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      },
      {
        test: /\.html$/,
        use: [
          {
            loader: "html-loader"
          }
        ]
      }
    ]
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: `./front/${page}.html`,
      filename: `./${page}.html`, // automatically prefixed with output path
      //hash: true
    })
  ],
  devtool: 'eval-source-map'
};
