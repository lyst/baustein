(function () {

    var win = window;
    var doc = document;
    var components = {};
    var componentClasses = {};
    var componentInstances = {};
    var componentId = 1;
    var tempEl = doc.createElement('div');
    var addEventListener = 'addEventListener';
    var prototype = 'prototype';
    var setAttribute = 'setAttribute';
    var getAttribute = 'getAttribute';
    var parentElement = 'parentElement';
    var appendChild = 'appendChild';
    var dataComponentNameAttribute = 'data-component-name';
    var dataComponentIdAttribute = 'data-component-id';
    var pointerEventsMap = {
        mousedown: 'pointerdown',
        mousemove: 'pointermove',
        mouseup: 'pointerup',
        touchstart: 'pointerdown',
        touchmove: 'pointermove',
        touchend: 'pointerup'
    };
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    var globalHandlers = {};

    for (var x = 0; x < vendors.length && !win.requestAnimationFrame; ++x) {
        win.requestAnimationFrame = win[vendors[x] + 'RequestAnimationFrame'];
    }

    if (!win.requestAnimationFrame) {
        win.requestAnimationFrame = function (callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            win.setTimeout(function () {
                callback(currTime + timeToCall);
            }, timeToCall);
            lastTime = currTime + timeToCall;
        };
    }

    /**
     * Wrapper for query selector all that returns proper array.
     * @param {HTMLElement} root
     * @param {String} selector
     * @returns {Array}
     */
    var qsa = function (root, selector) {
        return [].slice.call(root.querySelectorAll(selector));
    };

    /**
     * Returns the nearest Component instance for the passed element.
     * @param {HTMLElement} el
     * @returns {Component}
     */
    var closestComponent = function (el) {

        var id;

        while (el && el !== doc.body) {

            id = el[getAttribute](dataComponentIdAttribute);

            if (id) {
                return componentInstances[id];
            }

            el = el[parentElement];
        }

        return null;
    };

    /**
     * Returns the closest element to el that matches the given selector.
     * @param {HTMLElement} el
     * @param {String} selector
     * @returns {HTMLElement|Null}
     */
    var closestSelector = function (el, selector) {

        while (el && el !== doc.body) {

            if (matches(el, selector)) {
                return el;
            }

            el = el[parentElement];
        }

        return null;
    };

    /**
     * Wrapper around the HTMLElement.prototype.matches
     * method to support vendor prefixed versions.
     * @param {HTMLElement} el
     * @param {String} selector
     * @returns {Boolean}
     */
    var matches = function (el, selector) {

        var matchesSelector = el.webkitMatchesSelector ||
            el.mozMatchesSelector ||
            el.msMatchesSelector ||
            el.oMatchesSelector ||
            el.matchesSelector ||
            el.matches;

        if (matchesSelector) {
            return matchesSelector.call(el, selector);
        }

        // fall back to performing a selector:
        var match;
        var parent = el[parentElement];
        var temp = !parent;

        if (temp) {
            parent = tempEl;
            parent[appendChild](el);
        }

        match = qsa(parent, selector).indexOf(el) !== -1;

        if (temp) {
            parent.removeChild(el);
        }

        return match;
    };

    /**
     * Returns the Component instance for the passed element or null.
     * If a component instance has already been created for this element
     * then it is returned, if not a new instance of the correct Component is created.
     * @param {HTMLElement} el
     */
    var fromElement = components.fromElement = function (el) {

        var name = el[getAttribute](dataComponentNameAttribute);
        var id = el[getAttribute](dataComponentIdAttribute);

        // if no name then it is not a component
        if (!name) {
            return null;
        }

        // if there is an id we must already have a component instance
        if (id) {
            return componentInstances[id];
        }

        if (!componentClasses[name]) {
            throw Error('No component has been registered with name ' + name);
        }

        // create a new Component instance
        var component = new componentClasses[name](el);
        componentInstances[component._id] = component;
        return component;
    };

    /**
     * Creates a new Component
     * @param el
     * @constructor
     */
    var Component = components.Component = function (el) {

        if (!el) {
            el = this.createRootElement();
        }

        this.el = el;
        this._id = componentId++;
        this.el[setAttribute](dataComponentNameAttribute, this.name);
        this.el[setAttribute](dataComponentIdAttribute, this._id);
        this.init();
    };

    Component[prototype] = {

        name: '',

        tagName: 'div',

        /**
         * The init function will be called when the Component is created.
         * This maybe be through the parsing of DOM or through directly creating the component.
         * @returns {Component}
         */
        init: function () {
            return this;
        },

        /**
         * Appends either an element or another Component into this component.
         * @param {HTMLElement|Component} target
         * @returns {Component}
         */
        appendTo: function (target) {

            if (!target) {
                return this;
            }

            if (target instanceof Component && target.el) {
                target.el[appendChild](this.el);
            }

            if (target[appendChild]) {
                target[appendChild](this.el);
            }

            return this;
        },

        /**
         * Removes this component from the DOM.
         * @returns {Component}
         */
        remove: function () {
            if (this.el && this.el[parentElement]) {
                this.el[parentElement].removeChild(this.el);
            }
            return this;
        },

        /**
         * Removes this Component from the DOM and deletes the instance from the instances pool.
         * Null is returned for convenience so it is easy to get rid of references to a Component.
         *    var component = components.fromElement(el);
         *    component = component.destroy();
         * @returns {null}
         */
        destroy: function () {
            this.remove();
            this.el = null;
            delete componentInstances[this._id];
            return null;
        },

        /**
         * In the case that this Component is created directly by invoking the constructor with
         * no element this method will be called to create the root element.
         * @returns {HTMLElement}
         */
        createRootElement: function () {
            return doc.createElement(this.tagName);
        },

        /**
         * Convenience method for performing querySelectorAll
         * within the context of this Component.
         * @param {String} selector
         * @returns {HTMLElement[]}
         */
        findAll: function (selector) {
            return this.el ? qsa(this.el, selector) : [];
        },

        /**
         * Convenience method for performing querySelector within
         * the context of this Component.
         * @param {String} selector
         * @returns {HTMLElement|Null}
         */
        find: function (selector) {
            return this.el ? this.el.querySelector(selector) : null;
        },

        getCoordsFromEvent: function (event) {

            var point = event.touches && event.touches[0] ? event.touches[0] : event;

            return {
                x: point.pageX,
                y: point.pageY
            };
        },

        requestAnimationFrame: function (fn) {
            win.requestAnimationFrame(fn.bind(this));
        },

        setGlobalEvent: function (event, fn) {
            globalHandlers[event] = globalHandlers[event] || [];

            globalHandlers[event].push({
                fn: fn,
                ctx: this
            });

            return this;
        },

        releaseGlobalEvent: function (event, fn) {
            var handlers = globalHandlers[event];

            if (!handlers) {
                return this;
            }

            globalHandlers[event] = handlers.filter(function (handler) {
                return handler.fn !== fn;
            });

            return this;
        }

    };

    /**
     * Handles all events and invokes Component handlers
     * based on their events object.
     * @param {Event} event
     */
    var handleEvent = components.handleEvent = function (event) {

        var target = event.target;
        var type = event.type;
        var component = closestComponent(target);

        if (!component) {
            invokeGlobalHandlers(event);
            return;
        }

        var events = component.events;
        var el, key, selector, eventType, parts, method;

        if (!events) {
            invokeGlobalHandlers(event);
            return;
        }

        for (key in events) {

            if (!events.hasOwnProperty(key)) {
                continue;
            }

            parts = key.split(':');
            selector = parts.length > 1 ? parts[0] : null;
            eventType = parts.length > 1 ? parts[1] : parts[0];
            method = events[key];

            if (eventType === type || pointerEventsMap[type] === eventType) {

                if (selector) {

                    el = closestSelector(target, selector);

                    if (el) {
                        component[method](event, el);
                    }

                }
                else {
                    component[method](event);
                }

            }

        }

        invokeGlobalHandlers(event);
    };

    /**
     * Invokes
     * @param event
     */
    var invokeGlobalHandlers = function (event) {

        var handlers = globalHandlers[event.type] || globalHandlers[pointerEventsMap[event.type]];

        if (!handlers) {
            return;
        }

        for (var i = 0, length = handlers.length; i < length; i++) {
            handlers[i].fn.call(handlers[i].ctx, event, doc.body);
        }
    };

    /**
     * Parses the given element or the body and creates Component instances.
     * @param {HTMLElement} [root]
     */
    components.parse = function (root) {
        root = root || doc.body;
        fromElement(root);
        qsa(root, '[' + dataComponentNameAttribute + ']').forEach(fromElement);
    };

    /**
     * Registers a new Component.
     * @param {String|Object} name
     * @param {Object} [impl] The implementation methods / properties.
     * @returns {Function}
     */
    components.register = function (name, impl) {

        if ({}.toString.call(name) === '[object Object]') {
            impl = name;
            name = impl.name;
        }

        if (componentClasses[name]) {
            throw Error('A component called ' + name + ' already exists');
        }

        impl = impl || {};

        var Constructor = function () {
            Component.apply(this, arguments);
        };

        var Surrogate = function () {
        };
        Surrogate[prototype] = Component[prototype];
        Constructor[prototype] = new Surrogate();
        Constructor[prototype].name = name;

        for (var key in impl) {
            if (impl.hasOwnProperty(key)) {
                Constructor[prototype][key] = impl[key];
            }
        }

        componentClasses[name] = Constructor;
        return Constructor;
    };

    /**
     * Binds all events to the body.
     */
    components.bindEvents = function () {

        ['click',
         'mousedown',
         'mouseup',
         'mousemove',
         'touchstart',
         'touchmove',
         'touchend',
         'keyup',
         'keydown',

         // the following events require useCapture
         'blur',
         'focus',
         'submit',
         'change'].forEach(function (event, i) {
            doc.body[addEventListener](event, handleEvent, i > 8);
         });

    };

    if (win.define && define.amd) {
        define(function () {
            return components;
        });
    }
    else {
        win.components = components;
    }

})();