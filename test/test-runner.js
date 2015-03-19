requirejs.config({

    baseUrl: 'base/',

    // ask Require.js to load these files (all our tests and polyfills)
    deps: [
        'base/test/spec/baustein.js'
    ],

    // start test run, once Require.js is done
    callback: window.__karma__.start

});
