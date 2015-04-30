module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    "clean": ["dist"],
    "copy": {
      main: {
        files: [
          {expand: true, src: [
            'index.html',
            'keys.js',
            'LICENSE',
            'js/**',
            'scripts/**',
            'templates/**',
            '!js/init.js',
            '!js/init.*.js',
            '!js/init-compiled.js',
            'bower_components/**/*.js',
            'bower_components/**/LICENSE',
            'css/reset.css',
            'images/**'
          ], dest: 'dist'}
        ]
      }
    },
    "concat": {
      main: {
        src: ['js/init.setup.js', 'js/init.functions.js', 'js/init.model.js'],
        dest: 'js/init.js'
      }
    },
    "6to5": {
      options: {
        sourceMap: true
      },
      dist: {
        files: {
          "dist/js/init-compiled.js": "js/init.js"
        }
      },
      dev: {
        files: {
          "js/init-compiled.js": "js/init.js"
        }
      }
    },
    "sass": {
      dist: {
        options: {
          style: 'compressed'
        },
        files: {
          'dist/css/styles.css': 'css/styles.scss'
        }
      },
      dev: {
        options: {
          style: 'expanded'
        },
        files: {
          'css/styles.css': 'css/styles.scss'
        }
      }
    },
    'ftp-deploy': {
      arctour: {
        auth: {
          host: 'ftp.arctour.co.uk',
          port: 21,
          authKey: 'ben'
        },
        src: 'dist',
        dest: '/public_html/arcbase'
      },
      arcpublications: {
        auth: {
          host: 'arcpublications.co.uk',
          port: 21,
          authKey: 'ben-arcpublications'
        },
        src: 'dist',
        dest: '/arcbase'
      }
    },
    'watch': {
      files: ['css/*.scss','index.html','js/init.js'],
      tasks: ['dev'],
      options: {
        livereload: true
      }
    }
  });

  grunt.registerTask('default', ['clean','copy','concat','sass','6to5','ftp-deploy']);
  grunt.registerTask('dev', ['concat','sass:dev','6to5:dev']);

};
