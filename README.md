# components.js

A simple way to manage web UI's. Inspired by Web Components, which sadly are not ready for production use yet without fairly heavy-weight frameworks like Polymer or Brick.

The design goals are:

* Small - **components.js** is under 4kb when minified and g-zipped
* Standalone - No dependencies
* Modern browser support - IE9+ etc...
* AMD / CJS compatible
* Server side rendering - **components.js** is able to parse the DOM and create instances of components automatically, similar to ReactJS
* Support touch and mouse events

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

Components are statefull so if you have multiple buttons and you want to keep track of how many times each one has been clicked then you could do the following.

```js
components.register('my-button', {

    clickCount: 0,

    events: {
        'click': 'onClick'
    },

    onClick: function (event) {
        this.clickCount += 1;
        console.log('button was clicked. click count: ' + this.clickCount);
    }

});
```


## DOM Events
**components.js** uses event delegation to dispatch events to the correct component. The following example shows how the events system works.

```js
components.register('my-element', {

    events: {
        'click': 'onClick',
        '.some-element:click': 'onSomeElementClick'
    },
    
    // called whenever a click event happens on the root element
    onClick: function (event) {},
    
    // called whenever a click event happens on an element 
    // matching the selector '.some-element'
    // the second argument is the element
    onSomeElementClick: function (event, element) {},
    
    // called whenever a mousedown or a touchstart event 
    // happens on an element matching the selector '.button'
    onButtonPointerDown: function (event, element) {}

});
```

**components.js** will not automatically start listening for events, you need to call `components.bindEvents()` after the DOM is ready. 


## Custom Events
A component can emit events that can be listened to by any parent components. This is useful for converting DOM events like `click` into more semantic event like `save` or `edit`. Custom events from child components are subscribed too in the same way as DOM events. The following example shows how this works.

```html
<div data-component-name="user-profile">
    <div data-component-name="user-settings"></div>
</div>
```

```js
components.register('user-profile', {

    events: {
        'user-settings:save': 'onSettingsSave'
    },
    
    onSettingsSave: function (event) {
        // event.target will be the instance of the 'user-settings' component that emitted the event
        // event.formData will be the FormData object
    }

});

components.register('user-settings', {

    events: {
        '.some-form:submit': 'onSubmit'
    },
    
    onSubmit: functon (event, form) {
        event.preventDefault();
        this.emit('save', {
            formData: new FormData(form)
        });
    }

});
```


## Working with server rendered HTML
A major design goal of **components.js** is to be able to work with server rendered HTML pages. Rendering on the server has been shown to be the fastest way of getting content to the user for the initial page load, and then progressively enhancing the page with JS. To parse the DOM for components you use `components.parse()` which optionally accepts an element to parse if you know you don't need to parse the whole `<body>`. When a component is created from an exisiting DOM element it's `data-` attributes will be parsed into the instances `options` object.

When a component is created it's `init()` method will be called and then it's `render()` method. This provides an opportunity to do any intialisation or add any additional markup that is only needed when JS is enabled.


## Creating components programatically
Once the page has loaded and the user starts interacting with your UI you will probably want to create new components. This can be done by using the classes returned by `components.register()`.

```js
var MyComponent = components.register('my-component', {

    template: '<p>Hello my name is ${ options.name }</p>',

});

var myComponent = new MyComponent(null, {
    name: 'Jon'
});

// prints:
// <div data-component-name="my-component" data-component-id="4">
//     <p>Hello my name is Jon</p>
// </div>
console.log(myComponent.el.outerHTML);
```

The previous example needs some explaining. This is what happens when you create a component instance programatically.

* A root element is created. The tagName used is `this.tagName` which by default is `div`
* If an options object is passed as the second argument it is mixed into `this.options`
* `init()` is called - this is a noop by default
* `render()` is called

If `this.template` is a string then it will formatted using ES6 style interpolation with `this` as the context. Paths are possible, for example `${ options.name}` as shown in the above example.

If `this.template` is a function it will be called with `this` as the first argument and the context, and the return value will be used to set `this.el.innerHTML`.

In most applications you will want to override the `render()` method so you can use whatever templating library you wish to, but the default implementation may be enough in simple cases. 


