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
      file: {
        path: "./specs/index.html"
      }
    },

    clean: {
      tests: [TEST_LIBS_FOLDER]
    }

  });


  grunt.loadNpmTasks('grunt-open');
  grunt.loadNpmTasks('grunt-bower-task');
  grunt.loadNpmTasks('grunt-contrib-clean');


  grunt.registerTask('test', ['bower:install', 'open:file']);
};