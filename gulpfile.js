(function() {
  'use strict';

  var gulp = require('gulp'),
      argv = require('yargs').argv,
      jshint = require('gulp-jshint'),
      rimraf = require('gulp-rimraf'),
      concat = require('gulp-concat'),
      browserify = require('gulp-browserify'),
      mochaPhantomJS = require('gulp-mocha-phantomjs');

  gulp.task('clean', function() {
    return gulp
      .src(['./tmp'], { read: false })
      .pipe(rimraf());
  });

  gulp.task('lint', function() {
    return gulp
      .src(['gulpfile.js', './src/*.js'])
      .pipe(jshint())
      .pipe(jshint.reporter('default'))
      .pipe(jshint.reporter('fail'));
  });

  gulp.task('concat', function() {
    return gulp
      .src(['./src/index.js', './src/*.js'])
      .pipe(concat('r7extlib.js'))
      .pipe(gulp.dest('./tmp/'));
  });

  gulp.task('browserify', function() {
    return gulp
      .src('./tmp/r7extlib.js')
      .pipe(browserify())
      .pipe(gulp.dest('./dist/'));
  });

  gulp.task('test', function() {
    return gulp
      .src('./specs/index.html')
      .pipe(mochaPhantomJS({
        mocha: {
          grep: argv['test-grep']
        },
        reporter: 'nyan'
      }));
  });

  gulp.task('default', ['lint', 'concat', 'browserify', 'clean']);

})();