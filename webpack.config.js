module.exports = {
  entry: [
    __dirname + '/src/index.js',
  ],
  output: {
    path: __dirname + '/dist/',
    filename: 'r7extlib.js',
  },
  module: {
    loaders: [
      {test: /\.js$/, loader: 'babel-loader'},
    ],
  },
};
