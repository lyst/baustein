import jsdom from 'jsdom';

// setup the simplest document possible
const doc = jsdom.jsdom('<!doctype html><html><body></body></html>');

// get the window object out of the document
const win = doc.defaultView;

// set globals for mocha that make access to document and window feel
// natural in the test environment
global.document = doc;
global.window = win;

for (const key in win) {

    if (!win.hasOwnProperty(key)) {
        continue;
    }

    if (key in global) {
        continue;
    }

    global[key] = win[key];
}
