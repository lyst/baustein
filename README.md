# components.js

A simple way to manage web UI's. Inspired by Web Components, which sadly are not ready for production use yet without fairly heavy-weight frameworks like Polymer or Brick.

The design goals are:

* Small - **components.js** is under 4kb when minified and g-zipped
* Standalone - No dependencies
* Modern browser support - IE9+ etc...
* AMD / CJS compatible
* Server side rendering - **components.js** is able to parse the DOM and create instances of components automatically, similar to ReactJS

## Examples

Lets start with something very simple, listen for click events on a button and write something to the console. To do this using jQuery we would do something like this.

```html
<button class=".my-button">Click Me</button>
```

```js
// wait for the DOM to be ready
$(function () {

    // find the button and attach a click handler
    $('.my-button').on('click', function () {
        console.log('button was clicked');
    });

});
```

The same thing using **components.js** looks like this:

```html
<button class=".my-button" data-component-name="my-button">Click Me</button>
```

```js
components.register('my-button', {

    events: {
        'click': 'onClick'
    },

    onClick: function (event) {
        console.log('button was clicked');
    }

});
```

By using `data-` attributes the behaviour added by JavaScript is not tied to a particular class or id. If you are familiar with Custom Elements (a part of the Web Components spec) you will notice that the registering a custom element is similar. To register a component you provide a name and an object to be used for that components prototype. The event handling syntax is similar to Backbone's.