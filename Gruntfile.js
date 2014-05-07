module.exports = function (grunt) {

    var istanbul = require('istanbul');

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-mocha');

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

        mocha: {
            all: {
                src: ['test/index.html'],
                options: {
                    log: true,
                    reporter: 'Spec',
                    run: false
                }
            }
        },

        coverage: {

            // when the coverage object is received
            // from grunt-mocha it will be saved here
            coverage: null,

            instrument: {

                // files to instrument
                files: [
                    {
                        src: '**/*.js',
                        expand: true,
                        cwd: 'src',
                        dest: 'test/src'
                    }
                ]
            },

            // task for generating reports
            report: {
                reports: ['html', 'text-summary'],
                dest: 'test/reports'
            }
        }

    });

    grunt.event.on('coverage', function (coverage) {
        grunt.config('coverage.coverage', coverage);
    });

    grunt.registerMultiTask('coverage', 'Generates coverage reports for JS using Istanbul', function () {

        if (this.target === 'instrument') {

            var ignore = this.data.ignore || [];
            var instrumenter = new istanbul.Instrumenter();

            this.files.forEach(function (file) {

                var src = file.src[0],
                    instrumented = grunt.file.read(src);

                // only instrument this file if it is not in ignored list
                if (!grunt.file.isMatch(ignore, src)) {
                    instrumented = instrumenter.instrumentSync(instrumented, src);
                }

                // write
                grunt.file.write(file.dest, instrumented);
            });

            return;
        }

        if (this.target === 'report') {

            this.requiresConfig('coverage.coverage');

            var Report = istanbul.Report;
            var Collector = istanbul.Collector;
            var reporters = this.data.reports;
            var dest = this.data.dest;
            var collector = new Collector();

            // fetch the coverage object we saved earlier
            collector.add(grunt.config('coverage.coverage'));

            reporters.forEach(function (reporter) {

                Report.create(reporter, {
                    dir: dest + '/' + reporter
                }).writeReport(collector, true);

            });

            return;
        }

        grunt.warn('Unknown target - valid targets are "instrument" and "report"');
    });

    grunt.registerTask('default', ['test', 'build']);
    grunt.registerTask('test', ['jshint', 'clean:tests', 'coverage:instrument', 'mocha', 'coverage:report']);
    grunt.registerTask('build', ['jshint', 'uglify', 'copy']);

};