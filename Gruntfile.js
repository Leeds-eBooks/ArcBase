module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt);

  grunt.initConfig({

    "clean": ["dist"],

    "copy": {
      main: {
        files: [{
          expand: true,
          src: [
            // 'index.html',
            'LICENSE',
            'css/reset.css',
            'images/**'
          ],
          dest: 'dist'
        }]
      }
    },

    "jade": {
      dist: {
        files: {'dist/index.html': 'index.jade'}
      },
      dev: {
        files: {'index.html': 'index.jade'}
      }
    },

    "browserify": {
      options: {
        sourceMap: true,
        transform: ['babelify']
      },
      dist: {
        files: {
          "dist/js/index-compiled.js": "js/index.js"
        }
      },
      dev: {
        files: {
          "js/index-compiled.js": "js/index.js"
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

    "ftp-deploy": {
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

    "watch": {
      files: ['css/*.scss','index.html','js/init.js'],
      tasks: ['dev'],
      options: {
        livereload: true
      }
    }
  })

  grunt.registerTask('default', [
    'clean', 'copy', 'jade', 'sass', 'browserify', 'ftp-deploy'
  ])

  grunt.registerTask('dev', [
    'jade:dev', 'sass:dev', 'browserify:dev'
  ])
}
