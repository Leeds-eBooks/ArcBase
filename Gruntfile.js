const path                  = require('path')
const OccurrenceOrderPlugin = require('webpack/lib/optimize/OccurrenceOrderPlugin')
const DedupePlugin          = require('webpack/lib/optimize/DedupePlugin')
const UglifyJsPlugin        = require('webpack/lib/optimize/UglifyJsPlugin')
const packageJSON           = require('./package.json')

const webpackConfig = {
  loaders: [
    {
      loader: 'babel',
      test: /\.jsx?$/,
      include: [
        path.resolve(__dirname, 'js/'),
        path.resolve(__dirname, 'keys.js')
      ],
      query: {
        presets: [
          'es2015',
          'stage-3'
        ],
        plugins: [
          'lodash',
          'transform-flow-strip-types'
        ]
      }
    }, {
      loader: 'json',
      test: /\.json$/
    }
  ]
}

module.exports = grunt => {

  require('load-grunt-tasks')(grunt)

  grunt.initConfig({

    clean: ["dist"],

    copy: {
      main: {
        files: [{
          expand: true,
          src: [
            'LICENSE',
            'search.xml',
            'css/reset.css',
            'images/**/*'
          ],
          dest: 'dist'
        }]
      }
    },

    jade: {
      options: {
        data: {
          livereload: false,
          version: packageJSON.version
        }
      },
      dist: {
        files: {'dist/index.html': 'index.jade'}
      },
      dev: {
        options: {
          data: {
            livereload: true,
            version: packageJSON.version
          }
        },
        files: {'index.html': 'index.jade'}
      }
    },

    webpack: {
      dev: {
        entry: ['./js/index.js'],
        output: {
          path: 'js/',
          filename: 'index-compiled.js'
        },
        module: webpackConfig,
        plugins: [
          new OccurrenceOrderPlugin(true)
        ]
      },
      dist: {
        entry: ['./js/index.js'],
        output: {
          path: 'dist/js/',
          filename: 'index-compiled.js'
        },
        module: webpackConfig,
        plugins: [
          new OccurrenceOrderPlugin(true),
          new DedupePlugin(),
          new UglifyJsPlugin({compress: false})
        ]
      }
    },

    sass: {
      dist: {
        options: {
          style: 'compressed',
          loadPath: './node_modules/'
        },
        files: {
          'dist/css/styles.css': 'css/styles.scss'
        }
      },
      dev: {
        options: {
          style: 'expanded',
          loadPath: './node_modules/'
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
      }
    },

    ftps_deploy: {
      arcpublications: {
        options: {
          auth: {
            host: 'ftp.arcpublications.co.uk',
            port: 21,
            authKey: 'arcbase',
            secure: true
          },
          silent: false
        },
        files: [{
          expand: true,
          cwd: 'dist/',
          src: ['**/*'],
          dest: '/'
        }]
      }
    },

    watch: {
      files: [
        'js/modules/**/*',
        'js/index.js',
        '**/*.jade',
        '**/*.scss',
        '**/*.sass',
        'node_modules/kinvey-html5/kinvey.js'
      ],
      tasks: [
        'jade:dev',
        'sass:dev',
        'webpack:dev'
      ],
      options: {
        livereload: 34768
      }
    },

    connect: {
      dev: {
        options: {
          // livereload: true,
          open: true
        }
      }
    }
  })

  grunt.registerTask('default', [
    'clean', 'copy', 'jade:dist', 'sass:dist', 'webpack:dist', 'ftp-deploy', 'ftps_deploy'
  ])

  grunt.registerTask('deploy', [
    'ftps_deploy'
  ])

  grunt.registerTask('prod', [
    'clean', 'copy', 'jade:dist', 'sass:dist', 'webpack:dist'
  ])

  grunt.registerTask('dev', [
    'jade:dev', 'sass:dev', 'webpack:dev', 'connect', 'watch'
  ])
}
