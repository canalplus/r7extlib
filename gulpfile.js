(function() {
  'use strict';

  var gulp = require('gulp');
  var argv = require('yargs').argv;
  var jshint = require('gulp-jshint');
  var rimraf = require('gulp-rimraf');
  var browserify = require('gulp-browserify');
  var uglify = require('gulp-uglify');
  var rename = require('gulp-rename');
  var mochaPhantomJS = require('gulp-mocha-phantomjs');

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

  gulp.task('compress', function() {
    gulp.src('tmp/*.js')
      .pipe(uglify())
      .pipe(gulp.dest('dist'));
  });

  gulp.task('browserify', function() {
    return gulp
      .src('src/index.js')
      .pipe(browserify())
      .pipe(rename('r7extlib.js'))
      .pipe(gulp.dest('tmp/'));
  });

  gulp.task('test', function() {
    return gulp
      .src('specs/index.html')
      .pipe(mochaPhantomJS({
        mocha: {
          grep: argv['test-grep'],
        },
        reporter: 'spec',
      }));
  });

  gulp.task('default', ['clean', 'lint', 'browserify', 'compress']);
})();
