module.exports = function (grunt) {

    require('load-grunt-tasks')(grunt);

    grunt.registerTask('default', ['test', 'build']);
    grunt.registerTask('test', ['jshint', 'karma', 'output-coverage-summary']);
    grunt.registerTask('build', ['jshint', 'uglify', 'copy']);

    grunt.registerTask('output-coverage-summary', function () {
        grunt.log.writeln(grunt.file.read('coverage/text-summary.txt'));
    });

    grunt.initConfig({

        jshint: {
            all: ['src/**/*.js', 'test/spec/**/*.js']
        },

        clean: {
            build: ['build'],
            tests: ['test/src', 'test/reports']
        },

        copy: {
            all: {
                files: {
                    'build/components.js': ['src/components.js']
                }
            }
        },

        uglify: {
            all: {
                files: {
                    'build/components.min.js': ['src/components.js']
                }
            }
        },

        karma: {
            unitTests: {
                singleRun: true,
                browsers: ['PhantomJS'],
                frameworks: ['mocha', 'sinon', 'expect'],
                options: {
                    files: [
                        'src/components.js',
                        'test/spec/components.js'
                    ],
                    reporters: ['mocha', 'coverage'],
                    preprocessors: {
                        'src/**/*.js': ['coverage']
                    },
                    coverageReporter: {
                        reporters: [
                            {
                                type: 'text-summary',
                                subdir: '.',
                                file: 'text-summary.txt'
                            }
                        ]
                    }
                }
            }
        }

    });

};
