(function () {

    var win = window;
    var doc = document;

    // storage
    var components = {};
    var componentClasses = {};
    var componentInstances = {};
    var globalHandlers = {};

    var componentId = 1;

    // strings for bracket notation access to help minifier
    var prototype = 'prototype';
    var setAttribute = 'setAttribute';
    var getAttribute = 'getAttribute';
    var parentElement = 'parentElement';
    var appendChild = 'appendChild';
    var removeChild = 'removeChild';
    var createElement = 'createElement';
    var dataPrefix = 'data-component-';
    var dataComponentNameAttribute = dataPrefix + 'name';
    var dataComponentIdAttribute = dataPrefix + 'id';
    var dataComponentOptionsAttribute = dataPrefix + 'option-';
    var matchesSelector = 'MatchesSelector';
    var call = 'call';
    var elProp = 'el';
    var lengthProp = 'length';
    var nameProp = 'name';

    // noop function for predefined methods
    var noop = function() {};

    // prototype method shorthands
    var slice = [].slice;
    var toString = {}.toString;

    // regex for camel casing attribute names
    var attributeNameRegExp = /-(\w)/g;

    // regex for template interpolation
    var templateInterpolationRegExp = /\$\{ *(.*?) *\}/g;

    // temp element needed for Element.prototype.matches fallback
    var tempEl = doc[createElement]('div');

    // placeholder object for user defined mappings
    var eventMappings = {};

    // default set of events to listen to
    // the values indicate whether or not to use useCapture
    var allEvents = {
        'click': false,
        'dblclick': false,
        'mousedown': false,
        'mouseup': false,
        'mousemove': false,
        'touchstart': false,
        'touchmove': false,
        'touchend': false,
        'keyup': false,
        'keydown': false,
        'error': true,
        'blur': true,
        'focus': true,
        'scroll': true,
        'submit': true,
        'change': true,
        'resize': true
    };

    /**
     * Wrapper for query selector all that returns proper array.
     * @param {HTMLElement} el
     * @param {String} selector
     * @returns {Array}
     */
    var qsa = function (el, selector) {
        return slice[call](el.querySelectorAll(selector));
    };

    /**
     * Returns the nearest Component instance for the passed element.
     * @param {HTMLElement} element
     * @param {Boolean} [ignoreRoot]
     * @returns {Component[]}
     */
    var parentComponents = function (element, ignoreRoot) {

        var id;
        var result = [];

        if (ignoreRoot) {
            element = element && element[parentElement];
        }

        while (element && element !== doc.body) {

            id = element[getAttribute](dataComponentIdAttribute);

            if (id) {
                result.push(componentInstances[id]);
            }

            element = element[parentElement];
        }

        return result;
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

        var matchesSelector = el['webkit' + matchesSelector] ||
            el['moz' + matchesSelector] ||
            el['ms' + matchesSelector] ||
            el['o' + matchesSelector] ||
            el.matchesSelector ||
            el.matches;

        if (matchesSelector) {
            return matchesSelector[call](el, selector);
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
            parent[removeChild](el);
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

        if (!isElement(el)) {
            return null;
        }

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
        return new componentClasses[name](el);
    };

    /**
     * Given an array of Component instances invokes 'method' on each one.
     * Any additional arguments are passed to the method.
     * @param {Component[]|Component} components
     * @param {String} method
     */
    var invoke = function (components, method) {

        if (isComponent(components)) {
            components = [components];
        }

        if (!components) {
            return this;
        }

        var args = slice[call](arguments, 2);

        for (var i = 0, l = components[lengthProp]; i < l; i++) {
            components[i][method].apply(components[i], args);
        }

        return this;
    };

    /**
     * Given an element returns an object containing all data-* attributes
     * except for data-component-name and data-component-id.
     *
     * Runs all values through JSON.parse() so it is possible to pass
     * structured data to component instances through data-* attributes.
     * @param {HTMLElement} el
     * @returns {Object}
     */
    var parseDataAttributes = function (el) {

        var result = {};
        var attrs = el.attributes;
        var l = attrs[lengthProp];
        var i = 0;
        var attr;
        var name;
        var value;

        for (; i < l; i++) {
            attr = attrs[i];
            name = attr[nameProp];

            // ignore non data-component-option-* attributes
            if (name.indexOf(dataComponentOptionsAttribute) !== 0) {
                continue;
            }

            // run everything through JSON.parse().
            // If it fails to pass just assume it isn't meant to.
            try {
                value = JSON.parse(attr.value);
            }
            catch (e) {
                value = attr.value;
            }

            // camel-case the attribute name minus the 'data-' prefix
            name = attr[nameProp].replace(dataComponentOptionsAttribute, '')
                                 .replace(attributeNameRegExp, attributeNameReplacer);

            result[name] = value;
        }

        return result;
    };

    /**
     * Function used when camel casing  attribute names.
     * @param {String} match
     * @param {String} letter
     * @returns {string}
     */
    var attributeNameReplacer = function (match, letter) {
        return letter.toUpperCase();
    };

    /**
     * Returns true if component is an instance of Component.
     * @param component
     * @returns {boolean}
     */
    var isComponent = function (component) {
        return component instanceof Component;
    };

    /**
     * Returns true if element is an HTMLElement.
     * @param element
     * @returns {*|boolean}
     */
    var isElement = function (element) {
        return element && element.nodeType === 1;
    };

    /**
     * Returns true if fn is a function, otherwise false.
     * @param fn
     * @returns {boolean}
     */
    var isFunction  = function (fn) {
        return toString[call](fn) === toString[call](toString);
    };

    /**
     * Returns true if str is a string, otherwise false.
     * @param str
     * @returns {boolean}
     */
    var isString = function (str) {
        return toString[call](str) === toString[call]('');
    };

    /**
     * Basic ES6 style string interpolation.
     * @param {String} str
     * @param {Object} data
     * @returns {String}
     */
    var interpolateTemplate = function (str, data) {

        return str.replace(templateInterpolationRegExp, function (match, key) {

            var parts = key.split('.');
            var value = data;

            while (parts.length && value) {
                key = parts.shift();
                value = value[key];
            }

            return value !== undefined ? value : '';
        });

    };

    /**
     * Creates a new Component
     * @param el
     * @constructor
     */
    var Component = components.Component = function (element, options) {

        if (!element) {
            element = this.createRootElement();
        }

        this.options = parseDataAttributes(element);

        if (options) {
            for (var key in options) {
                this.options[key] = options[key];
            }
        }

        this[elProp] = element;
        this._id = componentId++;
        element[setAttribute](dataComponentNameAttribute, this[nameProp]);
        element[setAttribute](dataComponentIdAttribute, this._id);

        componentInstances[this._id] = this;

        this.init();
        this.render();
    };

    Component[prototype] = {

        name: '',

        tagName: 'div',

        /**
         * If set to a string that string will be used as
         * the innerHTML whenever render is called.
         *
         * If set to a function it will be called with the
         * component as both 'this' and as the first argument.
         */
        template: null,

        /**
         * The init function will be called when the Component is created.
         * This maybe be through the parsing of DOM or through directly creating the component.
         * @returns {Component}
         */
        init: function () {
            return this;
        },

        /**
         * Renders the contents of the component into the root element.
         * @returns {Component}
         */
        render: function () {

            if (isFunction(this.template)) {
                this[elProp].innerHTML = this.template(this);
            }

            if (isString(this.template)) {
                this[elProp].innerHTML = interpolateTemplate(this.template, this);
            }

            parse(this[elProp]);
            return this;
        },

        /**
         * Emits an event that parent Components can listen to.
         * @param name The name of the event to emit
         * @param [data] Event data
         * @param [chain] Array of parent Components
         */
        emit: function (name, data, chain) {

            data = data || {};
            data.target = this;
            data.type = name;
            data.customEvent = true;

            handleEvent(data, chain);
        },

        /**
         * Appends this Component to an element.
         * @param {HTMLElement} element
         * @returns {Component}
         */
        appendTo: function (element) {

            if (isElement(element) && isElement(this.el)) {
                this.beforeInsert();
                element[appendChild](this[elProp]);
                this.onInsert();
                this.emit('inserted');
            }

            return this;
        },

        /**
         * Called before the Component in inserted into the DOM.
         */
        beforeInsert: noop,

        /**
         * Called after the Component is inserted into the DOM.
         */
        onInsert: noop,

        /**
         * Removes this component from the DOM.
         * @returns {Component}
         */
        remove: function (chain) {

            // cannot be removed if no element or no parent element
            if (!this[elProp] || !this[elProp][parentElement]) {
                return this;
            }

            // get the chain of parent components if not passed
            chain = chain || parentComponents(this[elProp], true);

            // get all the child Components and invoke beforeRemove
            var children = parse(this[elProp]);
            invoke(children, 'beforeRemove');

            // actually remove the element
            this[elProp][parentElement][removeChild](this[elProp]);

            // invoke onRemove and emit remove event
            invoke(children, 'onRemove');
            this.emit('remove', null, chain);
            return this;
        },

        /**
         * Called before this Component is removed from the DOM.
         */
        beforeRemove: noop,

        /**
         * Called after this Component is removed from the DOM.
         */
        onRemove: noop,

        /**
         * Removes this Component from the DOM and deletes the instance from the instances pool.
         * Null is returned for convenience so it is easy to get rid of references to a Component.
         *    this.component = this.component.destroy();
         * @returns {null}
         */
        destroy: function () {

            // must have already been destroyed
            if (!componentInstances[this._id]) {
                return null;
            }

            // get the parent chain of Components
            var chain = parentComponents(this[elProp], true);

            // invoke remove passing the chain
            this.remove(chain);

            // invoke before beforeDestroy on all child Components
            invoke(parse(this[elProp]), 'beforeDestroy');

            // emit the destroy event passing the chain
            this.emit('destroy', null, chain);

            // destroy everything
            this[elProp] = null;
            delete componentInstances[this._id];
            return null;
        },

        /**
         * Called before this Component is destroyed.
         */
        beforeDestroy: noop,

        /**
         * In the case that this Component is created directly by invoking the constructor with
         * no element this method will be called to create the root element.
         * @returns {HTMLElement}
         */
        createRootElement: function () {
            return doc[createElement](this.tagName);
        },

        /**
         * Convenience method for performing querySelectorAll
         * within the context of this Component.
         * @param {String} selector
         * @returns {HTMLElement[]}
         */
        findAll: function (selector) {
            return this[elProp] ? qsa(this[elProp], selector) : [];
        },

        /**
         * Convenience method for performing querySelector within
         * the context of this Component.
         * @param {String} selector
         * @returns {HTMLElement|Null}
         */
        find: function (selector) {
            return this[elProp] ? this[elProp].querySelector(selector) : null;
        },

        /**
         * Returns the first component with 'name' within this Component or null.
         * @param {String} name
         * @returns {Component|Null}
         */
        findComponent: function (name) {
            return fromElement(
                this.find('[' + dataComponentNameAttribute + '=' + name + ']')
            );
        },

        /**
         * Returns all components with 'name' within this component.
         * If no components exist with this name an empty array will be returned.
         * @param name
         * @returns {Component[]}
         */
        findAllComponents: function (name) {
            return this.findAll('[' + dataComponentNameAttribute + '=' + name + ']')
                       .map(fromElement);
        },

        invoke: invoke,

        /**
         * Set a global event handler. This is useful when you
         * need to listen to events that happen outside this component.
         * @param {String} event
         * @param {Function} fn
         * @returns {Component}
         */
        setGlobalHandler: function (event, fn) {
            globalHandlers[event] = globalHandlers[event] || [];

            globalHandlers[event].push({
                fn: fn,
                ctx: this
            });

            return this;
        },

        /**
         * Release a global event handler that was previously set with setGlobalHandler().
         * @param {String} event
         * @param {Function} fn
         * @returns {Component}
         */
        releaseGlobalHandler: function (event, fn) {
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
     * @param {Component[]} [chain] Only used internally when a chain of
     *                              Components is already available.
     */
    var handleEvent = components.handleEvent = function (event, chain) {

        var target = event.target;
        var targetIsComponent = isComponent(target);
        var targetComponentName = targetIsComponent ? target[nameProp] : null;
        var type = event.type;
        var component, events, delegateElement, key, selector, eventType, parts, method;

        chain = slice.call(chain || parentComponents(
            targetIsComponent ? target[elProp] : target, targetIsComponent
        ));

        while (chain.length) {

            component = chain.shift();
            events = component.events;

            if (!events) {
                continue;
            }

            for (key in events) {

                parts = key.split(':');
                selector = parts[lengthProp] > 1 ? parts[0] : null;
                eventType = parts[lengthProp] > 1 ? parts[1] : parts[0];
                method = events[key];

                if (eventType === type || eventMappings[type] === eventType) {

                    if (selector) {

                        if (targetIsComponent) {

                            if (selector === targetComponentName) {
                                component[method](event);
                            }

                        }
                        else {

                            delegateElement = closestSelector(target, selector);

                            if (delegateElement) {
                                component[method](event, delegateElement);
                            }

                        }

                    }
                    else {
                        component[method](event);
                    }

                }

            }

        }

        // global handlers
        var handlers = globalHandlers[event.type] || globalHandlers[eventMappings[event.type]];

        if (!handlers) {
            return;
        }

        for (var i = 0, l = handlers[lengthProp]; i < l; i++) {
            handlers[i].fn[call](handlers[i].ctx, event, doc.body);
        }
    };

    /**
     * Parses the given element or the root element and creates Component instances.
     * @param {HTMLElement} [el]
     * @returns {Component[]}
     */
    var parse = components.parse = function (el) {
        el = isElement(el) ? el : doc.body;

        var els = qsa(el, '[' + dataComponentNameAttribute + ']');
        els.unshift(el);

        var result = [];
        var i = 0;
        var l = els[lengthProp];
        var component;

        for (; i < l; i++) {

            component = fromElement(els[i]);

            if (component) {
                result.push(component);
            }
        }

        return result;
    };

    /**
     * Registers a new Component.
     * @param {String|Object} name
     * @param {Object} [impl] The implementation methods / properties.
     * @returns {Function}
     */
    components.register = function (name, impl) {

        if (toString[call](name) === toString[call]({})) {
            impl = name;
            name = impl[nameProp];
        }

        if (!isString(name) || !name) {
            throw Error('"' + name + '" is not a valid component name');
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
        Constructor[prototype][nameProp] = name;

        for (var key in impl) {
            Constructor[prototype][key] = impl[key];
        }

        componentClasses[name] = Constructor;
        return Constructor;
    };

    /**
     * Binds all events to the body.
     */
    components.bindEvents = function () {

        var key, el;

        for (key in allEvents) {

            // special case for resize and scroll event to listen on window
            el = ['resize', 'scroll'].indexOf(key) !== -1 ? window : doc.body;

            el.addEventListener(key, handleEvent, !!allEvents[key]);
        }

    };

    /**
     *
     * @param {Object} options
     * @param {Object} options.eventMappings
     * @param {Object} options.additionalEvents
     */
    components.init = function (options) {

        options = options || {};

        if (options.eventMappings) {
            eventMappings = options.eventMappings;
        }

        if (options.additionalEvents) {
            for (var key in options.additionalEvents) {
                allEvents[key] = options.additionalEvents[key];
            }
        }

        components.parse();
        components.bindEvents();
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