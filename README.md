# baustein

[![Build Status:](https://secure.travis-ci.org/ssaw/baustein.png?branch=master)](https://travis-ci.org/ssaw/baustein)

A simple way to manage web UI's. Inspired by Web Components, which sadly are not ready for production use yet without fairly heavy-weight frameworks like Polymer or Brick.

The design goals are:

* Small - both in file size and API
* No dependencies
* Modern browser support - IE9+ etc...
* AMD / CJS compatible
* Progressive enhancement - **baustein** is able to parse the DOM and create instances of components automatically, similar to ReactJS

## Examples
**HTML**
```html
<button class="my-button" is="my-button">Click Me</button>
```

**JS**
```js
baustein.register('my-button', {

    setupEvents: function (add) {
        add('click', this.onClick);
    },

    onClick: function (event) {
        console.log('button was clicked');
    }

});
```

The `is` attribute this tells **baustein** that it should create an instance of the `my-button` component for this element. Each component instance has it's own state so if you wanted to have lots of `my-button` components on a page and you want to keep track of how many times each one has been clicked then you could do the following.

```js
baustein.register('my-button', {

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
baustein.register('user-profile', {

    setupEvents: function (add) {
        add('user-settings', 'save', this.onSettingsSave);
    },
    
    onSettingsSave: function (event) {
        // event.target will be the instance of the 'user-settings' component that emitted the event
        // event.formData will be the FormData object
    }

});

baustein.register('user-settings', {

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
