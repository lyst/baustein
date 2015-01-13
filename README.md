# components.js

[![Build Status:](https://secure.travis-ci.org/jonbretman/components.png?branch=master)](https://travis-ci.org/jonbretman/components)

A simple way to manage web UI's. Inspired by Web Components, which sadly are not ready for production use yet without fairly heavy-weight frameworks like Polymer or Brick.

The design goals are:

* Small - **components.js** is under 4kb when minified and g-zipped
* Standalone - No dependencies
* Modern browser support - IE9+ etc...
* AMD / CJS compatible
* Server side rendering - **components.js** is able to parse the DOM and create instances of components automatically, similar to ReactJS
* Support touch and mouse events

## Examples

If you normally use jQuery to add some behaviour to your website then you probably do something a bit like this.

```html
<button class="my-button">Click Me</button>
```

```js
// find the button and attach a click handler
$('.my-button').on('click', function (event) {
    console.log('button was clicked');
});
```

The same thing using **components** looks like this:

```html
<button class="my-button" is="my-button">Click Me</button>
```

```js
components.register('my-button', {

    setupEvents: function (add) {
        add('click', this.onClick);
    },

    onClick: function (event) {
        console.log('button was clicked');
    }

});
```

Notice the `is` attribute - this tells **components** that it should create an instance of the `my-button` component for this element. The behaviour added by JavaScript is not tied to a particular class or id. If you are familiar with Custom Elements (a part of the Web Components spec) you will notice that the registering a custom element is the same. This is intentional, so that as Web Components become available in more browsers **components** can disappear.

Each component instance has it's own state so if you wanted to have lots of `my-button` components on a page and you want to keep track of how many times each one has been clicked then you could do the following.

```js
components.register('my-button', {

    clickCount: 0,

    setupEvents: function (add) {
        add('click', this.onClick);
    },

    onClick: function (event) {
        this.clickCount += 1;
        console.log('button was clicked. click count: ' + this.clickCount);
    }

});
```


## Custom Events
A component can emit events that can be listened to by any parent components. This is useful for converting DOM events like `click` into more semantic event like `save` or `edit`. Custom events from child components are subscribed too in the same way as DOM events. The following example shows how this works.

```html
<div is="user-profile">
    <div is="user-settings"></div>
</div>
```

```js
components.register('user-profile', {

    setupEvents: function (add) {
        add('user-settings', 'save', this.onSettingsSave);
    },
    
    onSettingsSave: function (event) {
        // event.target will be the instance of the 'user-settings' component that emitted the event
        // event.formData will be the FormData object
    }

});

components.register('user-settings', {

    setupEvents: function (add) {
        add('.some-form', 'submit', this.onSubmit);
    },
    
    onSubmit: function (event, form) {
        event.preventDefault();
        this.emit('save', {
            formData: new FormData(form)
        });
    }

});
```


## Working with server rendered HTML
A major design goal of **components.js** is to be able to work with server rendered HTML pages. Rendering the first page on the server has been shown to be the fastest way of getting content to the user for the initial page load. To parse the DOM for components you use `components.parse()` which optionally accepts an element to parse if you know you don't need to parse the whole `<body>`. When a component is created from an existing DOM element it's attributes will be parsed into the instances `options` object.

When a component is created it's `init()` method will be called and then it's `render()` method. This provides an opportunity to do any initialisation or add any additional markup that is only needed when JS is enabled.


## Creating components programmatically
Once the page has loaded and the user starts interacting with your UI you will probably want to create new components. This can be done by using the classes returned by `components.register()`.

```js
var MyComponent = components.register('my-component', {

    template: function (component) {
        return '<p>Hello my name is ' + component.options.name + '</p>';
    }

});

var myComponent = new MyComponent({
    name: 'Jon'
});

myComponent.appendTo(document.body)

// would append the following HTML to the body:
// <div is="my-component">
//     <p>Hello my name is Jon</p>
// </div>
```

Lets go through what happens when you create a component instance in this way.

* A root element is created using the components `createRootElement` method, which can be overridden per component. Be default it creates a new element using `this.tagName` which by default is `div`.
* If an options object is passed as the second argument it is mixed into `this.options`.
* `init()` is called - this is a noop by default.
* `setupEvents()` is called and is passed a bound version of `registerEvent` for convenience.
* `render()` is called.

If `this.template` is a function it will be called with `this` as the first argument and the context, and the return value will be used to set `this.el.innerHTML`.
