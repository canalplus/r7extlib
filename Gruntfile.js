module.exports = function(grunt) {

  var TEST_LIBS_FOLDER = './bower_components';


  grunt.initConfig({

    bower: {
      install: {
        options: {
          copy: false
        }
      }
    },

    open: {
      testPage: {
        path: "./specs/index.html"
      }
    },

    clean: {
      tests: [TEST_LIBS_FOLDER]
    },

    jshint: {
      gruntfileLint: {
        files: {
          src: ['./Gruntfile.js']
        }
      },
      libLint: {
        files: {
          src: ['./lib/r7extlib.js']
        }
      },
      testsLint: {
        files: {
          src: ['./specs/*.js']
        },
        options: {
          expr: true
        }
      }
    }

  });


  grunt.loadNpmTasks('grunt-open');
  grunt.loadNpmTasks('grunt-bower-task');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-jshint');


  grunt.registerTask('test', [
    'jshint:gruntfileLint', 'jshint:libLint', 'jshint:testsLint',
    'bower:install', 'open:testPage'
  ]);
};