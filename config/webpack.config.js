const { assert } = require('console');
const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, '../dist/umd'),
    filename: 'index.js',
    library: 'graph-autocomplete',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  module: {
    rules: [
      {
        test: /\.ts(x*)?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'config/tsconfig.umd.json'
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js', '.tsx', '.jsx'],
    fallback: {
      assert: false,
      fs: false,
      util: false
    }
  }
};
