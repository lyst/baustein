(function () {

    var win = window;
    var doc = document;
    var components = {};
    var componentClasses = {};
    var componentInstances = {};
    var componentId = 1;
    var addEventListener = 'addEventListener';
    var prototype = 'prototype';
    var setAttribute = 'setAttribute';
    var getAttribute = 'getAttribute';
    var parentElement = 'parentElement';
    var appendChild = 'appendChild';
    var removeChild = 'removeChild';
    var length = 'length';
    var createElement = 'createElement';
    var dataComponentNameAttribute = 'data-component-name';
    var dataComponentIdAttribute = 'data-component-id';
    var dataPrefix = 'data-';
    var matchesSelector = 'MatchesSelector';
    var call = 'call';
    var el = 'el';
    var globalHandlers = {};
    var slice = [].slice;
    var toString = {}.toString;
    var attributeNameRegExp = /-(\w)/g;
    var tempEl = doc[createElement]('div');

    var attributeNameReplacer = function (match, letter) {
        return letter.toUpperCase();
    };

    /**
     * Map of 'standard' events to their equivalent 'pointerevent'
     * @type {object}
     */
    var pointerEventsMap = {
        mousedown: 'pointerdown',
        mousemove: 'pointermove',
        mouseup: 'pointerup',
        touchstart: 'pointerdown',
        touchmove: 'pointermove',
        touchend: 'pointerup'
    };

    /**
     * Wrapper for query selector all that returns proper array.
     * @param {HTMLElement} root
     * @param {String} selector
     * @returns {Array}
     */
    var qsa = function (root, selector) {
        return slice[call](root.querySelectorAll(selector));
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

        for (var i = 0, l = components[length]; i < l; i++) {
            components[i][method].apply(components[i], args);
        }

        return this;
    };

    var parseDataAttributes = function (el) {

        var result = {};
        var attrs = el.attributes;
        var l = attrs[length];
        var i = 0;
        var attr;
        var name;
        var value;

        for (; i < l; i++) {
            attr = attrs[i];
            name = attr.name;

            if (name.indexOf(dataPrefix) !== 0 ||
                name === dataComponentIdAttribute ||
                name === dataComponentNameAttribute) {
                continue;
            }

            try {
                value = JSON.parse(attr.value);
            }
            catch (e) {
                value = attr.value;
            }

            name = attr.name.replace(dataPrefix, '')
                            .replace(attributeNameRegExp, attributeNameReplacer);

            result[name] = value;
        }


        return result;
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
        return toString.call(fn) === '[object Function]';
    };

    /**
     * Returns true if str is a string, otherwise false.
     * @param str
     * @returns {boolean}
     */
    var isString = function (str) {
        return toString.call(str) === '[object String]';
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

        this[el] = element;
        this._id = componentId++;
        element[setAttribute](dataComponentNameAttribute, this.name);
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
                this[el].innerHTML = this.template(this);
            }

            if (isString(this.template)) {
                this[el].innerHTML = this.template;
            }

            parse(this[el]);
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
                element[appendChild](this[el]);
                this.onInsert();
                this.emit('inserted');
            }

            return this;
        },

        /**
         * Called before the Component in inserted into the DOM.
         */
        beforeInsert: function () {
        },

        /**
         * Called after the Component is inserted into the DOM.
         */
        onInsert: function () {
        },

        /**
         * Removes this component from the DOM.
         * @returns {Component}
         */
        remove: function (chain) {

            // cannot be removed if no element or no parent element
            if (!this[el] || !this[el][parentElement]) {
                return this;
            }

            // get the chain of parent components if not passed
            chain = chain || parentComponents(this[el], true);

            // get all the child Components and invoke beforeRemove
            var children = parse(this[el]);
            invoke(children, 'beforeRemove');

            // actually remove the element
            this[el][parentElement][removeChild](this[el]);

            // invoke onRemove and emit remove event
            invoke(children, 'onRemove');
            this.emit('remove', null, chain);
            return this;
        },

        /**
         * Called before this Component is removed from the DOM.
         */
        beforeRemove: function () {
        },

        /**
         * Called after this Component is removed from the DOM.
         */
        onRemove: function () {
        },

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
            var chain = parentComponents(this[el], true);

            // invoke remove passing the chain
            this.remove(chain);

            // invoke before beforeDestroy on all child Components
            invoke(parse(this[el]), 'beforeDestroy');

            // emit the destroy event passing the chain
            this.emit('destroy', null, chain);

            // destroy everything
            this[el] = null;
            delete componentInstances[this._id];
            return null;
        },

        /**
         * Called before this Component is destroyed.
         */
        beforeDestroy: function () {
        },

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
            return this[el] ? qsa(this[el], selector) : [];
        },

        /**
         * Convenience method for performing querySelector within
         * the context of this Component.
         * @param {String} selector
         * @returns {HTMLElement|Null}
         */
        find: function (selector) {
            return this[el] ? this[el].querySelector(selector) : null;
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
        var targetComponentName = targetIsComponent ? target.name : null;
        var type = event.type;
        var component, events, delegateElement, key, selector, eventType, parts, method;

        chain = slice.call(chain || parentComponents(
            targetIsComponent ? target[el] : target, targetIsComponent
        ));

        while (chain.length) {

            component = chain.shift();
            events = component.events;

            if (!events) {
                continue;
            }

            for (key in events) {

                parts = key.split(':');
                selector = parts[length] > 1 ? parts[0] : null;
                eventType = parts[length] > 1 ? parts[1] : parts[0];
                method = events[key];

                if (eventType === type || pointerEventsMap[type] === eventType) {

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

        invokeGlobalHandlers(event);
    };

    /**
     * Invokes any global handlers that have been bound for the given event.
     * @param {Event} event
     */
    var invokeGlobalHandlers = function (event) {

        var handlers = globalHandlers[event.type] || globalHandlers[pointerEventsMap[event.type]];

        if (!handlers) {
            return;
        }

        for (var i = 0, l = handlers[length]; i < l; i++) {
            handlers[i].fn[call](handlers[i].ctx, event, doc.body);
        }
    };

    /**
     * Parses the given element or the body and creates Component instances.
     * @param {HTMLElement} [root]
     * @returns {Component[]}
     */
    var parse = components.parse = function (root) {
        root = arguments[length] === 1 ? root : doc.body;

        if (!root) {
            return [];
        }

        var els = qsa(root, '[' + dataComponentNameAttribute + ']');
        els.unshift(root);

        var result = [];
        var i = 0;
        var l = els[length];
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

        if (toString[call](name) === '[object Object]') {
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
            Constructor[prototype][key] = impl[key];
        }

        componentClasses[name] = Constructor;
        return Constructor;
    };

    /**
     * Binds all events to the body.
     */
    components.bindEvents = function () {

        [
            'click',
            'dblclick',
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
            'change'

        ].forEach(function (event, i) {
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