module.exports = function (grunt) {

    require('load-grunt-tasks')(grunt);

    grunt.registerTask('default', ['build']);
    grunt.registerTask('test', ['jshint', 'karma', 'output-coverage-summary']);
    grunt.registerTask('build', ['jshint', 'transpile', 'uglify']);

    grunt.registerTask('output-coverage-summary', function () {
        grunt.log.writeln(grunt.file.read('coverage/text-summary.txt'));
    });

    grunt.initConfig({

        jshint: {
            options: {
                esnext: true,
                undef: true,
                unused: 'var',
                browser: true
            },
            src: ['src/**/*.js']
        },

        clean: {
            dist: ['dist']
        },

        uglify: {
            all: {
                files: {
                    'dist/baustein.amd.min.js': ['dist/baustein.amd.js'],
                    'dist/baustein.cjs.min.js': ['dist/baustein.cjs.js']
                }
            }
        },

        transpile: {
            cjs: {
                type: "cjs",
                files: [
                    {
                        src: 'src/baustein.js',
                        dest: 'dist/baustein.cjs.js'
                    }
                ]
            },
            amd: {
                anonymous: true,
                type: "amd",
                files: [
                    {
                        src: 'src/baustein.js',
                        dest: 'dist/baustein.amd.js'
                    }
                ]
            }
        },

        karma: {
            unitTests: {
                singleRun: true,
                browsers: ['PhantomJS'],
                frameworks: ['requirejs', 'mocha', 'sinon', 'expect'],
                options: {
                    files: [
                        'test/test-runner.js',
                        {
                            pattern: 'dist/**/*.js',
                            included: false
                        },
                        {
                            pattern: 'test/spec/**/*.js',
                            included: false
                        }
                    ],
                    reporters: ['mocha', 'coverage'],
                    preprocessors: {
                        'dist/**/*.js': ['coverage']
                    },
                    coverageReporter: {
                        reporters: [
                            {
                                type: 'text-summary',
                                subdir: '.',
                                file: 'text-summary.txt'
                            },
                            {
                                type: 'html',
                                dir: 'coverage'
                            }
                        ]
                    }
                }
            }
        }

    });

};
