(function() {
  'use strict';

  var gulp = require('gulp'),
      argv = require('yargs').argv,
      jshint = require('gulp-jshint'),
      rimraf = require('gulp-rimraf'),
      browserify = require('gulp-browserify'),
      rename = require('gulp-rename'),
      mochaPhantomJS = require('gulp-mocha-phantomjs');

  gulp.task('clean', function() {
    return gulp
      .src(['tmp', 'dist/r7extlib.js'], { read: false })
      .pipe(rimraf());
  });

  gulp.task('lint', function() {
    return gulp
      .src(['gulpfile.js', 'src/*.js'])
      .pipe(jshint())
      .pipe(jshint.reporter('default'))
      .pipe(jshint.reporter('fail'));
  });

  gulp.task('browserify', function() {
    return gulp
      .src('src/index.js')
      .pipe(browserify())
      .pipe(rename('r7extlib.js'))
      .pipe(gulp.dest('dist/'));
  });

  gulp.task('test', function() {
    return gulp
      .src('specs/index.html')
      .pipe(mochaPhantomJS({
        mocha: {
          grep: argv['test-grep']
        },
        reporter: 'nyan'
      }));
  });

  gulp.task('default', ['clean', 'lint', 'browserify']);

})();