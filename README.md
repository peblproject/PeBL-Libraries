
# Description

PeBL Core libraries which is user management, messaging, network syncing, storage, and activity tracking.

# Setup

## Once per project

Browse to root of project directory and run the command below if tsconfig.json doesn't exist

```tsc --init```

Open the tsconfig.json and modify settings to suit project

Setup npm for using the webpack packaging tool

```npm init```

The package json from the npm init should look roughly like

```
{
  "name": "pebl.core",
  "version": "1.0.0",
  "description": "## Once per project",
  "main": "src/api.ts ",
  "directories": {
    "test": "test"
  },
  "dependencies": {},
  "devDependencies": {
    "ts-loader": "^5.3.0",
    "typescript": "^3.1.5",
    "webpack": "^4.23.1",
    "webpack-cli": "^3.1.2"
  },
  "scripts": {
    "test": "echo \"No Tests\" && exit 1",
    "build": "webpack"
  },
  "author": "Eduworks",
  "license": "Apache 2"
}
```

Lastly create a webpack.config.js file in the root directory

```
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
```

## Once per dev env

Install typescript, the typescript webpack loader, webpack, and webpack commandline interface

```npm install --save-dev typescript ts-loader webpack webpack-cli```

--save-dev is for any libraries that don't belong in production

# Compile

To compile

```tsc```

Compile and watch files for changes

```tsc -w```

To compile and package files for use

```npm run build```
