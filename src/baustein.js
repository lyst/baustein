if (typeof window === 'undefined') {
    throw Error('components requires an environment with a window');
}

var win = window;
var doc = win.document;
var Obj = Object;
var slice = [].slice;

// these variables help minification
var parentElement = 'parentElement';
var filter = 'filter';
var push = 'push';
var forEach = 'forEach';
var attributes = 'attributes';
var lengthKey = 'length';
var prototype = 'prototype';
var call = 'call';
var apply = 'apply';
var DOMNodeInserted = 'DOMNodeInserted';
var DOMNodeRemoved = 'DOMNodeRemoved';

// keys used as private variables on Component instance
var privateSuffix = Math.random();
var stateKey = '_state' + privateSuffix;
var eventsKey = '_events' + privateSuffix;
var idKey = '_key' + privateSuffix;
var contextKey = '_context' + privateSuffix;

var observer;

/**
 * The current function to use to query elements in the DOM. Can be overridden when calling `init`.
 * @type {function}
 */
var domQuery = defaultDOMQuery;

/**
 * The current function to use as a DOM wrapper. Can be overridden when calling `init`.
 * @type {function}
 */
var domWrapper = defaultDOMWrapper;

/**
 * Map of component name -> component Class
 * @type {Object}
 */
var componentClasses = {};

/**
 * Map of component id -> component instance
 * @type {Object}
 */
var componentInstances = {};

/**
 * Map of event name -> handlers for that event
 * @type {Object}
 */
var globalHandlers = {};

/**
 * Incrementing number used to give each component a unique id.
 * @type {Number}
 */
var nextComponentId = 1;

var dataComponentIdAttribute = 'data-component-id';

var tmpEl = doc.createElement('div');

/**
 * Map of event name -> flag indicating whether or not to use useCapture
 * @type {Object}
 */
var allEvents = {
    click: false,
    dblclick: false,
    mousedown: false,
    mouseup: false,
    mousemove: false,
    mouseleave: true,
    mouseenter: true,
    touchstart: false,
    touchmove: false,
    touchend: false,
    keyup: false,
    keydown: false,
    error: true,
    blur: true,
    focus: true,
    scroll: true,
    submit: true,
    change: true,
    resize: true,
    load: true,
    orientationchange: true,
    input: false,
    drag: false,
    dragstart: false,
    dragend: false,
    dragenter: false,
    dragleave: false,
    drop: false
};

/**
 * Returns the 'inner' type of `obj`.
 * @param {*} obj
 * @returns {String}
 */
function type (obj) {
    return Obj[prototype].toString[call](obj).match(/\[object (.*?)\]/)[1].toLowerCase();
}

function keys(obj) {
    return Obj.keys(obj);
}

/**
 * Returns true if `obj` is an Object.
 * @param {*} obj
 * @returns {Boolean}
 */
function isObject(obj) {
    return type(obj) === 'object' && !isElement(obj);
}

/**
 * Returns true if `fn` is a function.
 * @param fn
 * @returns {Boolean}
 */
function isFunction (fn) {
    return type(fn) === 'function';
}

/**
 * Returns true if `el` is an element.
 * @param el
 * @returns {Boolean}
 */
function isElement (el) {
    return el && (el.nodeType === 1 || el.nodeType === 9);
}

/**
 * Returns true if `str` is a string.
 * @param {*} str
 * @returns {Boolean}
 */
function isString (str) {
    return type(str) === 'string';
}

/**
 * Returns `this`. Used as a placeholder method.
 * @returns {*}
 */
function noop () {
    return this;
}

/**
 * Returns a camel-cased version of `str`.
 * @param {String} str
 * @returns {String}
 */
function toCamelCase(str) {
    var parts = str.split('-');
    var i = 0;
    var j = parts.length;

    while (++i < j) {
        parts[0] += parts[i].substring(0, 1).toUpperCase() + parts[i].substring(1);
    }

    return parts[0];
}

/**
 * The default function to perform DOM queries.
 * @param {HTMLElement} el
 * @param {string} selector
 */
function defaultDOMQuery(el, selector) {
    return el ? el.querySelectorAll(selector) : [];
}

/**
 * The default function to wrap the results of DOM queries.
 * @param {array|NodeList} arr
 * @returns {Array}
 */
function defaultDOMWrapper(arr) {
    return arr && arr[lengthKey] ? slice[call](arr) : [];
}

/**
 * Mixes all arguments after `target` into `target` and returns `target`.
 * @param {Object} target
 * @returns {Object}
 */
function extend (target) {

    slice[call](arguments, 1)[forEach](function (source) {
        if (isObject(source)) {
            for (var key in source) {
                if (source.hasOwnProperty(key)) {
                    target[key] = source[key];
                }
            }
        }
    });

    return target;
}

/**
 * Returns the closest element to el that matches the given selector.
 * @param {HTMLElement} el
 * @param {String} selector
 * @returns {HTMLElement|Null}
 */
function closestElement (el, selector) {

    while (isElement(el)) {

        if (matches(el, selector)) {
            return el;
        }

        el = el[parentElement];
    }

    return null;
}

/**
 * Wrapper around the HTMLElement[prototype].matches
 * method to support vendor prefixed versions.
 * @param {HTMLElement} el
 * @param {String} selector
 * @returns {Boolean}
 */
function matches (el, selector) {

    var method = 'MatchesSelector';
    var matchesSelector = el['webkit' + method] ||
        el['moz' + method] ||
        el['ms' + method] ||
        el['o' + method] ||
        el.matchesSelector ||
        el.matches;

    return matchesSelector[call](el, selector);
}

/**
 * Returns the nearest Component instance for the passed element.
 * @param {HTMLElement|Component} element
 * @returns {Component[]}
 */
function parentComponents(element) {

    if (isComponent(element)) {
        element = element.el;
    }

    var id;
    var result = [];

    // Quick return for window or document
    if (element === win || element === doc) {
        return [];
    }

    while (isElement(element)) {

        id = element.getAttribute(dataComponentIdAttribute);

        if (id && componentInstances[id]) {
            result[push](componentInstances[id]);
        }

        element = element[parentElement];
    }

    return result;
}

/**
 * Returns the Component instance for the passed element or null.
 * If a component instance has already been created for this element
 * then it is returned, if not a new instance of the correct Component is created.
 * @param {HTMLElement} el
 */
export function fromElement(el) {

    var name;
    var id;

    if (!isElement(el)) {
        return null;
    }

    name = el.getAttribute('is');
    id = el.getAttribute(dataComponentIdAttribute);

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
}

/**
 * Given an array of Component instances invokes 'method' on each one.
 * Any additional arguments are passed to the method.
 * @param {Component[]|Component} components
 * @param {String} method
 */
function invoke(components, method) {

    var args = slice[call](arguments, 2);
    var i = 0;
    var componentsLength;

    if (isComponent(components)) {
        components = [components];
    }

    if (!components) {
        return this;
    }

    for (componentsLength = components[lengthKey]; i < componentsLength; i++) {
        if (isFunction(components[i][method])) {
            components[i][method][apply](components[i], args);
        }
    }

    return this;
}

/**
 * Given an element returns an object containing all the attributes parsed as JSON.
 *
 * Runs all values through JSON.parse() so it is possible to pass
 * structured data to component instances through data-* attributes.
 * @param {HTMLElement} el
 * @returns {Object}
 */
function parseAttributes(el) {

    var result = {};
    var name;
    var value;

    for (var i = 0; i < el[attributes][lengthKey]; i++) {
        name = toCamelCase(el[attributes][i].name);
        value = tryJSON(el[attributes][i].value);

        result[name] = value;
    }

    return result;
}

/**
 * Try to JSON decode a string. Possibly Base64 encoded.
 *
 * Will try to decode this string to an object. Will return the original string
 * if JSON.parse fails.
 * @param {String} value
 * @returns {*}
 */
const b64startChars = new Set(Array.from('bedIMONWZ'));
const jsonStartChars = new Set(Array.from('{[0123456789tfn"'));

function tryJSON(value) {
    if (value.length % 4 === 0 && b64startChars.has(value[0])) {
        try {
            var decode = win.atob(value);
            return JSON.parse(decode);
        } catch (er) {
        }
    }

    try {
        if (jsonStartChars.has(value[0])) {
            return JSON.parse(value);
        }
    } catch (er) {
    }

    return value;
}

/**
 * Returns true is objA and objB are equal.
 * @param {*} objA
 * @param {*} objB
 * @returns {boolean}
 */
function equals(objA, objB) {
    var typeA;
    var keysA;
    var i;

    if (objA === objB) {
        return true;
    }

    typeA = type(objA);

    if (typeA !== type(objB)) {
        return false;
    }

    if (typeA === 'array') {

        if (objA.length !== objB.length) {
            return false;
        }

        for (i = 0; i < objA.length; i++) {
            if (!equals(objA[i], objB[i])) {
                return false;
            }
        }

        return true;
    }

    if (isObject(objA)) {
        keysA = keys(objA);

        if (keysA.length !== keys(objB).length) {
            return false;
        }

        for (i = 0; i < keysA.length; i++) {
            if (!equals(objA[keysA[i]], objB[keysA[i]])) {
                return false;
            }
        }

        return true;
    }

    return false;
}

/**
 * Returns a deep clone of `obj`.
 * @param {*} obj
 * @returns {*}
 */
function clone(obj) {

    if (isObject(obj)) {
        return keys(obj).reduce(function (result, key) {
            result[key] = clone(obj[key]);
            return result;
        }, {});
    }

    if (type(obj) === 'array') {
        return obj.map(clone);
    }

    return obj;
}

/**
 * Updates objA with objB and returns true if this resulted in any actual changes to objA.
 * @param objA
 * @param objB
 * @returns {boolean}
 */
function updateObject(objA, objB) {
    var changed = false;
    var contextKeys = keys(objB);
    var key, i;

    for (i = 0; i < contextKeys.length; i++) {
        key = contextKeys[i];
        if (!equals(objA[key], objB[key])) {
            changed = true;
            objA[key] = objB[key];
        }
    }

    return changed;
}

/**
 * Returns true if component is an instance of Component.
 * @param component
 * @returns {boolean}
 */
export function isComponent(component) {
    return component instanceof Component;
}

function ensureEventHasMethod(event, methodName, propertyName) {
    if (propertyName in event || methodName in event) {
        return; // don't override existing methods
    }

    event[propertyName] = false;

    event[methodName] = function () {
        event[propertyName] = true;
    };
}

/**
 * When `handleEvent` receives an event it adds a "job" to this queue. A job is an array with 3
 * elements, which map to the arguments expected by `processEventJob`.
 * @type {Array}
 */
var handleEventQueue = [];

var EVENT_JOB_METHOD_INDEX = 0;
var EVENT_JOB_COMPONENT_INDEX = 1;
var EVENT_JOB_ARGS_INDEX = 2;

/**
 * Handles all events - both standard DOM events and custom Component events.
 *
 * Finds all component instances that contain the 'target' and adds a job to the `handleEventsQueue` for each one.
 *
 * If the event is a DOM event then the event target is the 'target' property of the event.
 * If the event is a custom Component event then the target is the component that emitted the event.
 *
 * @param {Event} event
 */
export function handleEvent(event) {

    ensureEventHasMethod(event, 'stopPropagation', 'propagationStopped');
    ensureEventHasMethod(event, 'preventDefault', 'defaultPrevented');

    // this adds a "job" to the queue for each handler that should be called on each component
    parentComponents(event.target)[forEach](function (c) {
        pushEventJobsForComponent(event, c);
    });

    // this adds a "job" to the queue for each global handler that should be called
    pushEventJobsForGlobalHandlers(event);

    while (handleEventQueue[lengthKey]) {

        // get the next job in the queue
        var job = handleEventQueue.shift();

        // if this component stopped propagation then remove all queued actions for this event
        if (job[EVENT_JOB_ARGS_INDEX][0].propagationStopped) {
            while (handleEventQueue[lengthKey] && handleEventQueue[0][EVENT_JOB_ARGS_INDEX][0] === job[EVENT_JOB_ARGS_INDEX][0]) {
                handleEventQueue.shift();
            }
        }

        // else we can can the handler
        else {
            job[EVENT_JOB_METHOD_INDEX][apply](job[EVENT_JOB_COMPONENT_INDEX], job[EVENT_JOB_ARGS_INDEX]);
        }

    }

}

/**
 * Pushes a "job" to the queue for each event handler `component` has for `event`.
 * @param {Event} event A DOM event or a custom component event.
 * @param {Component} component
 */
function pushEventJobsForComponent(event, component) {

    var events, closest, selector;
    var eventType, method, i, eventsLength;

    var target = event.target;

    // We definitely don't want to handle events for destroyed elements.
    if (component[stateKey] === STATE_DESTROYED) {
        return;
    }

    events = component[eventsKey];

    for (i = 0, eventsLength = events[lengthKey]; i < eventsLength; i++) {

        eventType = events[i][0];
        selector = events[i][1];
        method = events[i][2];

        // if event doesn't match then go to next component
        if (eventType !== event.type) {
            continue;
        }

        // if there is no selector just invoke the handler and move on
        if (!selector) {
            handleEventQueue[push]([method, component, [event]]);
            continue;
        }

        // if this is a component event then the
        // selector just needs to match the component name
        if (isComponent(target)) {

            // if component name matches call the handler
            if (selector === target.name) {
                handleEventQueue[push]([method, component, [event]]);
            }

        }
        else {

            // see if the selector matches the event target
            closest = closestElement(target, selector);

            // if it does then call the handler passing the matched element
            if (closest) {
                handleEventQueue[push]([method, component, [event, closest]]);
            }

        }

    }

}

/**
 * Pushes a "job" to the queue for each global event handler registered for `event`.
 * This is supported for components that need to listen to events on the body/document/window.
 * @param {Event} event A DOM event or a custom component event.
 */
function pushEventJobsForGlobalHandlers(event) {
    var handlers = globalHandlers[event.type];

    if (handlers) {
        for (var i = 0, handlersLength = handlers[lengthKey]; i < handlersLength; i++) {
            handleEventQueue[push]([handlers[i].fn, handlers[i].ctx, [event, doc.body]]);
        }
    }
}

/**
 * Parses the given element or the root element and creates Component instances.
 * @param {HTMLElement} [node] If not provided then the <body> will be parsed.
 * @param {boolean} [ignoreRootNode=false] If `true` then the root not will not be parsed or returned.
 * @returns {Component[]}
 */
export function parse(node, ignoreRootNode) {

    if (arguments[lengthKey] === 0) {
        node = doc.body;
    }
    else if (!isElement(node)) {
        throw Error('node must be an HTMLElement');
    }

    var result = [];

    for (var i = 0; i < node.childNodes.length; i++) {
        if (isElement(node.childNodes[i])) {
            result = result.concat(parse(node.childNodes[i], false));
        }
    }

    // If `ignoreRootNode` is true then we can just return the
    // result of calling `parse` on all children.
    if (ignoreRootNode === true) {
        return result;
    }

    var component = fromElement(node);

    if (component && component[stateKey] !== STATE_DESTROYED) {
        result[push](component);
    }

    return result;
}

/**
 * Registers a new Component.
 * @param {String} name
 * @param {Object} [impl] The implementation methods / properties.
 * @returns {Function}
 */
export function register(name, impl) {

    if (!isString(name) || !name) {
        throw Error('"' + name + '" is not a valid component name');
    }

    if (componentClasses[name]) {
        throw Error('A component called ' + name + ' already exists');
    }

    impl = impl || {};

    function F() {
        Component[apply](this, arguments);
    }

    F[prototype] = Obj.create(Component[prototype]);
    F[prototype].name = name;

    var impls = slice[call](impl.mixins || []);
    impls[push](impl);

    impls[forEach](function (impl) {
        keys(impl)[forEach](function (key) {

            var descriptor = Obj.getOwnPropertyDescriptor(impl, key);
            var existing = Obj.getOwnPropertyDescriptor(F[prototype], key);

            if (isFunction(descriptor.value) && existing && isFunction(existing.value)) {

                // save the original method
                var method = descriptor.value;

                // override the value of the descriptor to call
                // both the original function and the new one
                descriptor.value = function () {
                    existing.value[apply](this, arguments);
                    return method[apply](this, arguments);
                };
            }

            // define the new property
            Obj.defineProperty(F[prototype], key, descriptor);
        });

    });

    componentClasses[name] = F;
    return F;
}

/**
 * Un-registers a Component class and destroys any existing instances.
 * @param {string} name
 */
export function unregister(name) {
    destroy(name);
    componentClasses[name] = null;
}

/**
 *
 * @param {string} method
 */
function eventManager(method) {
    var key, el;

    for (key in allEvents) {

        // special case for resize and scroll event to listen on window
        el = ['resize', 'scroll', 'orientationchange'].indexOf(key) !== -1 ? win : doc.body;

        el[method](key, handleEvent, !!allEvents[key]);
    }
}

/**
 * Handler for mutation events. Only used when MutationObserver is not supported.
 * @param event
 */
function mutationEventHandler(event) {
    switch (event.type) {
        case DOMNodeInserted:
            nodeInserted(event.target);
            break;
        case DOMNodeRemoved:
            nodeRemoved(event.target);
            break;
    }
}

/**
 * Binds all events.
 */
function bindEvents() {
    eventManager('addEventListener');

    // use MutationObserver if available
    if (win.MutationObserver) {
        observer = new MutationObserver(function (records) {
            slice[call](records)[forEach](function (record) {
                slice[call](record.removedNodes)[forEach](nodeRemoved);
                slice[call](record.addedNodes)[forEach](nodeInserted);
            });
        });

        observer.observe(doc.body, {
            childList: true,
            subtree: true
        });
    }

    // fallback to mutation events
    else {
        doc.body.addEventListener(DOMNodeInserted, mutationEventHandler, true);
        doc.body.addEventListener(DOMNodeRemoved, mutationEventHandler, true);
    }
}

/**
 * Unbinds all events.
 */
function unbindEvents() {
    eventManager('removeEventListener');

    if (observer) {
        observer.disconnect();
    } else {
        doc.body.removeEventListener(DOMNodeInserted, mutationEventHandler, true);
        doc.body.removeEventListener(DOMNodeRemoved, mutationEventHandler, true);
    }
}

/**
 * Handler for a node being inserted. Parses the node finding all components and
 * calls `onInsert` on each.
 * @param node
 */
function nodeInserted(node) {
    if (isElement(node)) {

        // We only want components that think they are detached as IE10 can get a bit trigger
        // happer with firing DOMNodeInserted events.
        var components = parse(node)[filter](function (c) {
            if (c[stateKey] === STATE_DETACHED) {
                c[stateKey] = STATE_ATTACHED;
                return true;
            }
            return false;
        });

        invoke(components, 'onInsert');
    }
}

/**
 * Handler for a node being removed. Parses the node finding all components and
 * calls `onRemove` on each.
 * @param node
 */
function nodeRemoved(node) {
    if (isElement(node)) {

        // We only want components that think they are attached as IE10 can get a bit trigger
        // happer with firing DOMNodeRemoved events.
        var components = parse(node)[filter](function (c) {
            if (c[stateKey] === STATE_ATTACHED) {
                c[stateKey] = STATE_DETACHED;
                return true;
            }
            return false;
        });

        invoke(components, 'onRemove');
    }
}

/**
 * Initialises the components library by parsing the DOM and binding events.
 * @param {object} [options]
 * @param {function} [options.domQuery] A custom function to use to make DOM queries.
 * @param {function} [options.domWrapper] A custom function to use to wrap the results
 *                                        of DOM queries.
 */
export function init(options) {

    options = options || {};

    if (options.domQuery) {
        domQuery = options.domQuery;
    }

    if (options.domWrapper) {
        domWrapper = options.domWrapper;
    }

    bindEvents();

    // by calling `nodeInserted` not only will all the components present at page load be parsed
    // but `onInsert` will be called and the "inserted" event will be emitted on each
    nodeInserted(doc.body);

}

/**
 * Opposite of `init`. Destroys all component instances and un-registers all components.
 * Resets the `domQuery` and `domWrapper` functions to their defaults.
 */
export function reset() {

    // destroy any component instances
    for (var key in componentInstances) {
        if (componentInstances[key]) {
            componentInstances[key].destroy();
        }
    }

    // reset state
    domQuery = defaultDOMQuery;
    domWrapper = defaultDOMWrapper;
    componentClasses = {};
    componentInstances = {};

    // unbind all event handlers
    unbindEvents();
}

/**
 * @param {string} name
 * @returns {Object}
 */
export function getInstanceOf(name) {
    return getInstancesOf(name)[0];
}

/**
 * @param {string} name
 * @returns {Array}
 */
export function getInstancesOf(name) {

    var result = [];

    for (var key in componentInstances) {
        if (componentInstances[key] && componentInstances[key].name === name) {
            result[push](componentInstances[key]);
        }
    }

    return result;
}

/**
 * @param {string} name
 */
export function destroy(name) {
    getInstancesOf(name)[forEach](function(instance) {
        instance.destroy();
    });

    return this;
}

var STATE_DETACHED = 1;
var STATE_ATTACHED = 2;
var STATE_DESTROYING = 3;
var STATE_DESTROYED = 4;

/**
 * Reducer function that can be used to turn a list of attributes into a JS object where the
 * attribute names map to attribute values.
 * @param {object} result
 * @param {Attr} attr A DOM node attribute
 * @returns {object}
 */
function attributeReducer(result, attr) {
    result[attr.name] = attr.value;
    return result;
}

/**
 * Copy all attributes from `source` to `target` and remove any attributes from `target` that are
 * not present on `source`. The data-component-id attribute is ignored.
 * @param {HTMLElement} target
 * @param {HTMLElement} source
 */
function copyAttributes(target, source) {
    var targetAttributes = slice[call](target[attributes]).reduce(attributeReducer, {});
    var sourceAttributes = slice[call](source[attributes]).reduce(attributeReducer, {});

    // copy all attributes from the source to the target
    keys(sourceAttributes)[forEach](function (attrName) {
        target.setAttribute(attrName, sourceAttributes[attrName]);
    });

    // remove any attributes (except for data-component-id) from the target that are not
    // present on the source.
    keys(targetAttributes)[forEach](function (attrName) {
        if (attrName !== dataComponentIdAttribute && !sourceAttributes.hasOwnProperty(attrName)) {
            target.removeAttribute(attrName);
        }
    });
}

/**
 * Creates a new Component
 * @param element
 * @param options
 * @constructor
 */
export function Component (element, options) {

    var shouldRender = false;

    if (arguments[lengthKey] === 1 && isObject(element)) {
        options = element;
        element = this.createRootElement();
        shouldRender = true;
    }

    if (!arguments[lengthKey]) {
        element = this.createRootElement();
        shouldRender = true;
    }

    // internals
    this[idKey] = nextComponentId++;
    this[eventsKey] = [];
    this[stateKey] = STATE_DETACHED;
    this[contextKey] = {};

    this.el = element;

    // Convenience for accessing this components root element wrapped
    // in whatever `domWrapper` returns. Not used internally.
    this.$el = domWrapper([this.el]);

    // Options are built from optional default options - this can
    // be a property or a function that returns an object, the
    // element attributes, and finally any options passed to the constructor
    this.options = extend(
        {},
        isFunction(this.defaultOptions) ? this.defaultOptions() : this.defaultOptions,
        parseAttributes(this.el),
        options
    );

    if (this.options.template) {
        this.template = this.options.template;
    }

    element.setAttribute('is', this.name);
    element.setAttribute(dataComponentIdAttribute, this[idKey]);

    // store this instance
    componentInstances[this[idKey]] = this;

    this.init();
    this.setupEvents(this.registerEvent.bind(this));
    this[contextKey] = clone(this.getInitialRenderContext());

    // Only render if we created the root element in the constructor function. Otherwise we assume
    // that the element was already on the page and was already rendered.
    if (shouldRender) {
        this.render();
    }
}

Component[prototype] = {

    name: '',

    tagName: 'div',

    /**
     * If provided this will be used to render the component when `render()` is called. It should
     * be a function that accepts a single argument, which will be the return value of `getRenderContext()`.
     * It must return a valid HTML string and represent the entire component, including the root node.
     * @type {function}
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
     * Sets up any events required on the component, called during component initialisation.
     * @example
     *  setupEvents: function(add) {
     *      add('click', '.image-thumbnail', this._onImageThumbnailClick);
     *      add('mouseover', '.image', this._onImageMouseOverClick);
     *  }
     * @param {Function} add - use this function to add any events to the component
     */
    setupEvents: noop,

    /**
     * Renders the component using `template`. This method performs a destructive render e.g. all
     * child components will first be destroyed.
     * @returns {Component}
     */
    render: function () {
        var template = this.template;
        var html, newElement;

        if (!isFunction(template)) {
            return this;
        }

        html = template[call](this, this.getRenderContext());

        tmpEl.innerHTML = html;

        if (tmpEl.children[lengthKey] !== 1) {
            throw Error('A component template must produce a single DOM node.');
        }

        newElement = tmpEl.removeChild(tmpEl.firstElementChild);
        tmpEl.innerHTML = '';

        if (newElement.tagName !== this.el.tagName) {
            throw Error('Cannot change the tagName of an element.');
        }

        // destroy all children of the target as they are about to be re-rendered
        invoke(parse(this.el, true), 'destroy');

        this.el.innerHTML = newElement.innerHTML;
        copyAttributes(this.el, newElement);
        return this;
    },

    /**
     * Sets all the values in `context` into the components render context. If this results in any
     * changes to the context `render()` will be called.
     * @param {object} context
     * @returns {Component}
     */
    setRenderContext: function (context) {
        // we want our own copy of the context so nothing outside can mutate it
        context = clone(context);

        if (updateObject(this[contextKey], context)) {
            this.render();
        }

        return this;
    },

    /**
     * Replaces the current render context with `context`. If this results in a different render
     * context then `render()` will be called.
     * @param {object} context
     */
    replaceRenderContext: function (context) {
        // we want our own copy of the context so nothing outside can mutate it
        context = clone(context);

        // if it is different to the current context then set it and call render()
        if (!equals(this[contextKey], context)) {
            this[contextKey] = context;
            this.render();
        }
    },

    /**
     * Returns a clone of the current render context.
     * @returns {object}
     */
    getRenderContext: function () {
        return clone(this[contextKey]);
    },

    /**
     * Called by the constructor to get the initial render context.
     * @returns {object}
     */
    getInitialRenderContext: function () {
        return {};
    },

    /**
     * Updates this components options. If calling this method results in the options changing then
     * `onOptionsChanged` will be called with the previous options.
     * @param options
     */
    updateOptions: function (options) {
        var optionsClone = clone(this.options);

        if (updateObject(this.options, options)) {
            this.onOptionsChange(optionsClone);
        }

        return this;
    },

    /**
     * Called when options are changed via a call to `updateOptions`.
     */
    onOptionsChange: noop,

    /**
     * Emits an event that parent Components can listen to.
     * @param name The name of the event to emit
     * @param [data] Event data
     */
    emit: function (name, data) {

        data = data || {};
        data.target = data.target || this;
        data.type = name;
        data.customEvent = true;

        handleEvent(data);
        return data;
    },

    /**
     * Inserts this component before another element.
     * @param {HTMLElement} el the element to go before
     * @returns {Component}
     */
    insertBefore: function(el) {

        el = isElement(el) ? el : isComponent(el) ? el.el : null;

        if (!el) {
            return this;
        }

        var parent = el[parentElement];
        if (parent) {
            parent.insertBefore(this.el, el);
        }

        return this;
    },

    /**
     * Inserts this component after another element.
     * @param {HTMLElement} el the element to go after
     * @returns {Component}
     */
    insertAfter: function(el) {

        el = isElement(el) ? el : isComponent(el) ? el.el : null;

        if (!el) {
            return this;
        }

        // no insertAfter, so insert before the next sibling
        // null case automatically handled
        var parent = el.parentNode;
        if (parent) {
            parent.insertBefore(this.el, el.nextSibling);
        }

        return this;
    },

    /**
     * Appends this Component to an element.
     * @param {HTMLElement} el
     * @returns {Component}
     */
    appendTo: function (el) {

        el = isElement(el) ? el : isComponent(el) ? el.el : null;

        if (!el) {
            return this;
        }

        el.appendChild(this.el);
        return this;
    },

    /**
     * Called after the Component is inserted into the DOM.
     */
    onInsert: noop,

    /**
     * Removes this component from the DOM.
     * @returns {Component}
     */
    remove: function () {

        // Cannot be removed if no element or no parent element
        if (!this.el || !this.el[parentElement]) {
            return this;
        }

        this.el[parentElement].removeChild(this.el);

        // If the component is currently destroying itself it is better to call onRemove() manually
        // here rather than wait for the mutation event to pick it up. This is because there is a
        // race condition where the state is set to destroyed before the mutation event fires.
        if (this.isDestroying()) {
            this.onRemove();
        }

        return this;
    },

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

        // Check that this component has not already been destroyed or is currently being destroyed.
        if (!componentInstances[this[idKey]] || this.isDestroying()) {
            return null;
        }

        this[stateKey] = STATE_DESTROYING;
        this[contextKey] = null;

        // invoke destroy on all child Components
        invoke(parse(this.el, true), 'destroy');

        // Make sure this component is removed
        this.remove();

        this.releaseAllGlobalHandlers();

        // We are now destroyed!
        this[stateKey] = STATE_DESTROYED;

        // Remove the reference to the element and the dom wrapper
        this.el = null;
        this.$el = null;

        // Remove the reference to this component instance. Using a null assignment instead of
        // delete as delete has performance implications
        componentInstances[this[idKey]] = null;

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
     * Convenience method for performing querySelector within
     * the context of this Component.
     * @param {String} selector
     * @returns {Array}
     */
    find: function (selector) {
        return domWrapper(domQuery(this.el, selector));
    },

    /**
     * Returns the first component with 'name' within this Component or null.
     * @param {String} name
     * @returns {Component|Null}
     */
    findComponent: function (name) {
        return fromElement(
            this.find('[is=' + name + ']')[0]
        );
    },

    /**
     * Returns all components with 'name' within this component.
     * If no components exist with this name an empty array will be returned.
     * @param name
     * @returns {Component[]}
     */
    findComponents: function (name) {
        return [].map[call](
            this.find('[is=' + name + ']'),
            fromElement
        );
    },

    invoke: invoke,

    /**
     * Registers an event that this component would like to listen to.
     * @param {string} event
     * @param {string|function} selector
     * @param {function} [handler]
     * @returns {Component}
     */
    registerEvent: function (event, selector, handler) {

        if (arguments[lengthKey] === 2) {
            handler = selector;
            selector = null;
        }

        this[eventsKey][push]([event, selector, handler]);
        return this;
    },

    /**
     * Release an event or all events from this component.
     * @example
     *  releaseEvent('click', '.image-thumbnail, this._onImageThumbnailClick);
     *  // releases the specific click event handler on an object
     *
     * @example
     *  releaseEvent('click', '.image-thumbnail');
     *  // release all click events on the object
     *
     * @example
     *  releaseEvent('click'); // releases all click events on the component
     *
     * @param {String} event - the event to release
     * @param {String} [selector] - the selector of the object to release the event
     * @param {Function} [handler] - the handler to release off the object
     */
    releaseEvent: function(event, selector, handler) {

        if (isFunction(selector) && !handler) {
            handler = selector;
            selector = null;
        }

        if (!isFunction(handler)) {
            handler = null;
        }

        if (typeof(selector) === 'undefined') {
            selector = null;
        }

        this[eventsKey] = this[eventsKey][filter](function(ev) {
            var eventName = ev[0];
            var eventSelector = ev[1];
            var eventHandler = ev[2];

            if (!handler) {
                // we don't care what handler, just get rid of it
                return !(eventName === event && eventSelector === selector);
            }
            else {
                return !(eventName === event && eventSelector === selector &&
                    eventHandler === handler);
            }

        });

    },

    /**
     * Set a global event handler. This is useful when you
     * need to listen to events that happen outside this component.
     * @param {String} event
     * @param {Function} fn
     * @returns {Component}
     */
    setGlobalHandler: function (event, fn) {

        // Each component should only be able to set 1 global handler for a given event with
        // the same function.
        this.releaseGlobalHandler(event, fn);

        globalHandlers[event] = globalHandlers[event] || [];

        globalHandlers[event][push]({
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
        var ctx = this;

        if (!handlers) {
            return this;
        }

        // filter out entries with the same function and context
        globalHandlers[event] = handlers[filter](function (handler) {
            return handler.fn !== fn || handler.ctx !== ctx;
        });

        return this;
    },

    /**
     * Releases all global handles that this component has registered using `setGlobalHandler`.
     */
    releaseAllGlobalHandlers: function () {
        keys(globalHandlers)[forEach](function (event) {

            globalHandlers[event] = globalHandlers[event][filter](function (handler) {
                return handler.ctx !== this;
            }.bind(this));

        }.bind(this));
    },

    /**
     * @returns {boolean} true if the component is currently destroying itself.
     */
    isDestroying: function () {
        return this[stateKey] === STATE_DESTROYING;
    },

    /**
     * @returns {boolean} true if the component has been destroyed.
     */
    isDestroyed: function () {
        return this[stateKey] == STATE_DESTROYED;
    },

    /**
     * @returns {boolean} true if the component is attached to the DOM.
     */
    isAttached: function () {
        return this[stateKey] == STATE_ATTACHED;
    },

    /**
     * @returns {boolean} true if the component is detached from the DOM.
     */
    isDetached: function () {
        return this[stateKey] == STATE_DETACHED;
    }

};

export default {
    fromElement: fromElement,
    isComponent: isComponent,
    handleEvent: handleEvent,
    parse: parse,
    register: register,
    unregister: unregister,
    init: init,
    reset: reset,
    getInstanceOf: getInstanceOf,
    getInstancesOf: getInstancesOf,
    destroy: destroy,
    Component: Component
};
