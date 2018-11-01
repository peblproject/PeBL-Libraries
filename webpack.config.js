const path = require('path');

module.exports = {
    entry: './src/api.ts',
    // devtool: 'inline-source-map',
    module: {
	rules: [
	    {
		test:/\.tsx?$/,
		use: 'ts-loader',
		exclude: /node_modules/
	    }
	]
    },
    optimization: {
	minimize: false
    },
    resolve: {
	extensions: ['.tsx', '.ts', '.js']
    },
    output: {
	filename: 'PeBLCore.js',
	path: path.resolve(__dirname, 'dist')
    }
}
