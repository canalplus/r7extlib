r7extlib
========

Easy interaction with R7 box for external webapps

Include the `lib/r7extlib.js` file in your webapp to use it. No build process is
required.

r7extlib as a npm dependency
----------------------------

To manage this dependency, you can use [npm](https://npmjs.org/).

```shell
npm install canalplus/r7extlib

# Or to add it to your package.json
npm install --save canalplus/r7extlib
```

This is the encouraged way if you use [Node.js](http://nodejs.org/) to test
and build your application.  
Building and testing your application is **strongly recommended**:
- Building: [Linting](http://www.jshint.com/)
  `->` Concatenating ([Browserify](http://browserify.org/)
  or [Require.js](http://www.requirejs.org/)
  or [Mincer](https://github.com/nodeca/mincer))
  `->` Minifying ([JS](https://github.com/mishoo/UglifyJS/) and
  [CSS](https://github.com/jbleuzen/node-cssmin))
- Testing: [Mocha](http://visionmedia.github.io/mocha/) +
  [Chai](http://chaijs.com/) +
  [Sinon](http://sinonjs.org/) for example

Such tasks are usually accomplished with task managers such as
[Grunt](http://gruntjs.com/)
or [Gulp](http://gulpjs.com/)

r7extlib... just a dependency
-----------------------------

You can simply use a package manager and add the r7extlib Github repository
in the dependency list.

[Bower](http://bower.io/) is a solution in the Node.js world:

```shell
bower install canalplus/r7extlib

# Or to add it to your bower.json
bower install --save canalplus/r7extlib
```


Tests
-----

Install [Node.js](http://nodejs.org).

Then install `grunt-cli`

```shell
npm install -g grunt-cli
```

Then install dependencies

```shell
npm install
```

To launch tests:

```shell
grunt test
```

To clean test libs installed only for test purposes

```shell
grunt clean
```