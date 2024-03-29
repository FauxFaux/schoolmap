const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './web/index.tsx',
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'bundle.[contenthash].js',
    library: 'app',
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './web/index.html',
    }),
  ],

  devtool: 'source-map',

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{ loader: 'babel-loader' }],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.png$/i,
        use: ['url-loader'],
      },
    ],
  },
};
