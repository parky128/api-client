const path = require('path');

module.exports = {
  mode: 'production',
  target: 'node',
  entry: {
    'index': path.resolve(__dirname, './dist/commonjs/index.js')
  },
  output: {
    path: path.resolve(__dirname, './dist/umd'),
    filename: '[name].js',
    library: 'alClient',
    libraryTarget: 'umd', // supports commonjs, amd and web browsers
    globalObject: 'this'
  }
};
