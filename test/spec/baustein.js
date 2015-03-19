define(['../../dist/baustein.amd.js'], function (baustein) {

    // PhantomJS sigh...
    if (!Function.prototype.bind) {
        Function.prototype.bind = function (oThis) {
            if (typeof this !== 'function') {
                // closest thing possible to the ECMAScript 5
                // internal IsCallable function
                throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
            }

            var aArgs = Array.prototype.slice.call(arguments, 1),
                fToBind = this,
                fNOP = function () {
                },
                fBound = function () {
                    return fToBind.apply(this instanceof fNOP && oThis ? this : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
                };

            fNOP.prototype = this.prototype;
            fBound.prototype = new fNOP();

            return fBound;
        };
    }

    describe('components', function () {

        var Component = baustein.Component;
        var testRoot = document.createElement('div');

        testRoot.id = 'test-root';
        document.body.appendChild(testRoot);

        beforeEach(function () {
            baustein.init();
        });

        afterEach(function () {
            baustein.reset();
            testRoot.innerHTML = '';
        });

        var addTestHTML = function () {
            testRoot.innerHTML = [].slice.call(arguments).join('');
        };

        var createComponentName = (function (n) {
            return function () {
                return 'component-' + n++;
            };
        })(0);

        var makeEvent = function (event, target) {
            return {
                target: target,
                type: event
            };
        };

        describe('components.Component', function () {

            it('should be a function', function () {
                expect(baustein.Component).to.be.a('function');
            });

            it('should create a root element if one is not passed', function () {
                var component = new Component();
                expect(component.el).to.have.property('tagName', 'DIV');
            });

            it('should create a root element if only a options object is passed', function () {
                var component = new Component({
                    foo: 'bar'
                });
                expect(component.el).to.have.property('tagName', 'DIV');
                expect(component.options).to.have.property('foo', 'bar');
            });

            it('should accept a root element if one is passed', function () {
                var el = document.createElement('div');
                expect(new Component(el).el).to.equal(el);
            });

            it('should allocate each instance a unique id', function () {
                var component1 = new Component();
                var component2 = new Component();
                var component3 = new Component();
                expect(component2._id).to.equal(component1._id + 1);
                expect(component3._id).to.equal(component2._id + 1);
            });

            it('should set the id as an attribute on the root element', function () {
                var el = document.createElement('div');
                var component = new Component(el);
                expect(el.getAttribute('data-component-id')).to.eql(component._id);
            });

            it('should set the name as an attribute on the root element', function () {
                var el = document.createElement('div');
                var component = new Component(el);
                expect(el.getAttribute('is')).to.eql(component.name);
            });

            it('should save passed options', function () {

                var options = {
                    one: 'one',
                    two: 2,
                    three: [1, 2, 3]
                };
                var c = new Component(options);
                expect(c.options).to.eql(options);

            });

            it('should parse attributes from the root element to get options', function () {

                var el = document.createElement('div');
                el.setAttribute('foo', 'foo');
                el.setAttribute('bar', JSON.stringify({key: 'value'}));
                el.setAttribute('baz-bob', 5);

                expect(new Component(el).options).to.eql({
                    foo: 'foo',
                    bar: {
                        key: 'value'
                    },
                    bazBob: 5
                });

            });

            it('should use defaultOptions first, then attributes, then passed options', function () {

                var name = createComponentName();
                var C = baustein.register(name, {
                    defaultOptions: {
                        foo: 'default value'
                    }
                });
                expect(new C().options.foo).to.equal('default value');

                var d = document.createElement('div');
                d.setAttribute('foo', 'attribute value');

                expect(new C(d).options.foo).to.equal('attribute value');

                expect(new C({
                    foo: 'passed value'
                }).options.foo).to.equal('passed value');
            });

            it('should call setupEvents passing it a bound version of registerEvent', function () {

                var handler = sinon.spy();

                var setupEvents = sinon.spy(function (add) {
                    add('click', '.some-selector', handler);
                });

                var registerEvent = sinon.spy();

                var Component1 = baustein.register(createComponentName(), {
                    setupEvents: setupEvents,
                    registerEvent: registerEvent
                });

                var c = new Component1();

                expect(setupEvents.callCount).to.equal(1);

                var call = registerEvent.getCall(0);
                expect(call.calledOn(c)).to.equal(true);
                expect(call.args).to.eql(['click', '.some-selector', handler]);

            });

            describe('#defaultOptions()', function () {

                it('can be a function and if it is then it should be called to get default options', function () {

                    var name = createComponentName();
                    var C = baustein.register(name, {
                        defaultOptions: sinon.spy()
                    });

                    new C();
                    new C();
                    new C();

                    expect(C.prototype.defaultOptions.callCount).to.equal(3);
                });

            });

            describe('#init()', function () {

                it('should be called when creating the component', function () {
                    var spy = sinon.spy();
                    var NewComponent = baustein.register(createComponentName(), {
                        init: spy
                    });
                    var component = new NewComponent();
                    expect(spy.callCount).to.equal(1);
                    expect(spy.getCall(0).args).to.have.length(0);
                    expect(spy.getCall(0).calledOn(component)).to.be.ok();
                });

            });

            describe('#remove()', function () {

                var name, c;

                beforeEach(function () {
                    name = createComponentName();
                    baustein.register(name);
                    addTestHTML('<div id="el" is="' + name + '"></div>');
                    c = baustein.fromElement(document.getElementById('el'));
                });

                it('should remove the element from the DOM', function () {
                    c.remove();
                    expect(document.getElementById('el')).to.equal(null);
                });

                it('should return this', function () {
                    expect(c.remove()).to.equal(c);
                });

                it('should handle the element having no parent', function () {
                    document.getElementById('el').parentElement.removeChild(document.getElementById('el'));
                    expect(c.remove()).to.be.ok();
                });

                it('should call onRemove() after removing element from parent', function () {
                    var el = document.createElement('div');
                    var def = {
                        onRemove: sinon.spy(function () {
                            expect(this.el.parentElement).to.equal(null);
                        })
                    };
                    var C = baustein.register(createComponentName(), def);
                    var c = new C();
                    c.appendTo(el);
                    c.remove();
                    expect(c.onRemove.callCount).to.equal(1);
                });

                it('should emit the "remove" event', function () {

                    var C = baustein.register(createComponentName());

                    var def = {
                        setupEvents: function (add) {
                            add('remove', C.prototype.name, this.removeEventHandler);
                        },
                        removeEventHandler: sinon.spy()
                    };

                    // this is a component that is listening for the
                    // 'destroy' event from the C component
                    var C2 = baustein.register(createComponentName(), def);

                    // set up component hierarchy
                    var c1 = new C2();
                    var c2 = new C2();
                    var c3 = new C2();
                    var c4 = new C();
                    c3.el.appendChild(c4.el);
                    c2.el.appendChild(c3.el);
                    c1.el.appendChild(c2.el);

                    // assert the handler has not been called
                    expect(def.removeEventHandler.callCount).to.equal(0);

                    // destroy the inner most child element
                    c4.remove();

                    // assert handler was called correct number of times
                    expect(def.removeEventHandler.callCount).to.equal(3);

                    // check event bubbled up the dom firing on components in the correct order
                    [c3, c2, c1].forEach(function (c, i) {
                        expect(def.removeEventHandler.getCall(i).calledOn(c)).to.be.ok();
                    });

                });

            });

            describe('#destroy()', function () {

                it('should remove the element, destroy the component instance, and return null', function () {
                    var name = createComponentName();
                    baustein.register(name);
                    addTestHTML('<div id="test-el" is="' + name + '"></div>');
                    var c = baustein.fromElement(document.getElementById('test-el'));
                    expect(c.destroy()).to.equal(null);
                    expect(document.getElementById('test-el')).to.equal(null);
                    expect(c.el).to.equal(null);
                });

                it('should call beforeDestroy() on itself and all child components', function () {

                    var def = {
                        beforeDestroy: sinon.spy()
                    };
                    var C = baustein.register(createComponentName(), def);

                    var c1 = new C();
                    var c2 = new C();
                    var c3 = new C();

                    c2.el.appendChild(c3.el);
                    c1.el.appendChild(c2.el);

                    c1.destroy();
                    expect(def.beforeDestroy.callCount).to.equal(3);
                });

                it('should emit the "destroy" event', function () {

                    var C = baustein.register(createComponentName());

                    var def = {
                        setupEvents: function (add) {
                            add('destroy', C.prototype.name, this.destroyEventHandler);
                        },
                        destroyEventHandler: sinon.spy()
                    };

                    // this is a component that is listening for the
                    // 'destroy' event from the C component
                    var C2 = baustein.register(createComponentName(), def);

                    // set up component hierarchy
                    var c1 = new C2();
                    var c2 = new C2();
                    var c3 = new C2();
                    var c4 = new C();
                    c3.el.appendChild(c4.el);
                    c2.el.appendChild(c3.el);
                    c1.el.appendChild(c2.el);

                    // assert the handler has not been called
                    expect(def.destroyEventHandler.callCount).to.equal(0);

                    // destroy the inner most child element
                    c4.destroy();

                    // assert handler was called correct number of times
                    expect(def.destroyEventHandler.callCount).to.equal(3);

                    // check event bubbled up the dom firing on components in the correct order
                    [c3, c2, c1].forEach(function (c, i) {
                        expect(def.destroyEventHandler.getCall(i).calledOn(c)).to.be.ok();
                    });
                });

                it('should return null if the component has already been destroyed', function () {
                    var c = new Component();
                    c.destroy();
                    expect(c.destroy()).to.equal(null);
                });

            });

            describe('#render()', function () {

                describe('when the template property is a function', function () {

                    it('should invoke the function passing "this" as the first argument', function () {

                        var C = baustein.register(createComponentName(), {
                            template: function (ctx) {
                                return '<span>' + ctx.options.text + '</span>';
                            }
                        });

                        var actual = new C({text: 'Hello world'}).el.innerHTML;
                        var expected = '<span>Hello world</span>';

                        expect(actual).to.equal(expected);
                    });

                });

                describe('when the template property is a string', function () {

                    it('it should add it to el', function () {

                        var content = '<span>Hello world</span>';

                        var C = baustein.register(createComponentName(), {
                            template: content
                        });

                        var actual = new C().el.innerHTML;

                        expect(actual).to.equal(content);
                    });

                });

            });

            describe('#appendTo(element)', function () {

                it('should return this', function () {
                    var c = new Component();
                    expect(c.appendTo()).to.equal(c);
                });

                it('should append itself to the element', function () {
                    var c = new Component();
                    var root = document.createElement('div');
                    c.appendTo(root);
                    expect(root.children[0]).to.equal(c.el);
                });

            });

            describe('#invoke(components, methodName, ...args)', function () {

                var def, arr;

                beforeEach(function () {
                    def = {
                        someMethod: sinon.spy()
                    };

                    var C = baustein.register(createComponentName(), def);

                    arr = [new C(), new C(), new C()];
                });

                it('should call the given function on each component in the array', function () {
                    new Component().invoke(arr, 'someMethod');
                    expect(def.someMethod.callCount).to.equal(3);
                });

                it('should call the methods with the correct context', function () {
                    new Component().invoke(arr, 'someMethod');

                    arr.forEach(function (ctx, i) {
                        expect(def.someMethod.getCall(i).calledOn(ctx)).to.equal(true);
                    });

                });

                it('should pass any additional arguments to the method', function () {
                    new Component().invoke(arr, 'someMethod', 'one', 'two', 'three');

                    arr.forEach(function (ctx, i) {
                        expect(def.someMethod.getCall(i).args).to.eql(['one', 'two', 'three']);
                    });

                });

                it('should also accept a single component', function () {
                    new Component().invoke(arr[0], 'someMethod');
                    expect(def.someMethod.callCount).to.equal(1);
                });

                it('should do nothing if first argument is not valid', function () {
                    expect(new Component().invoke(null, 'someMethod')).to.be.ok();
                });

                it('should check that the given method exists before calling it', function () {

                    var spy = sinon.spy();
                    var objs = [
                        {testMethod: spy},
                        {testMethod: spy},
                        {testMethod: null},
                        {}
                    ];

                    // should not throw
                    expect(new Component().invoke(objs, 'testMethod')).to.be.ok();

                    // should have called the methods on the objects that had it
                    expect(spy.callCount).to.equal(2);

                });

            });

            describe('#find(selector)', function () {

                it('should return the element that matches the selector', function () {
                    var c = new Component();
                    c.el.innerHTML = '<span class="outer"><p><span class="inner">select me</span></p></span>';
                    expect(c.find('.outer .inner')[0].innerHTML).to.equal('select me');
                });

                it('should return an empty jQuery object if no element matches the selector or the component has been destroyed', function () {
                    var c = new Component();
                    expect(c.find('.does-not-exist')).to.have.length(0);
                    c.destroy();
                    expect(c.find('.does-not-exist')).to.have.length(0);
                });

                it('should only locate elements within the Component', function () {

                    addTestHTML('<div class="outside"><div class="test-component"><div class="inside"></div></div></div>');

                    var c = new Component(testRoot.querySelector('.test-component'));
                    expect(c.find('.inside')).to.have.length(1);
                    expect(c.find('.outside')).to.have.length(0);
                });

            });

            describe('#findComponent(name)', function () {

                it('should return the first child component with the given name', function () {
                    var C = baustein.register(createComponentName());
                    var c1 = new Component();
                    var c2 = new C();

                    c1.el.appendChild(c2.el);
                    expect(c1.findComponent(c2.name)).to.equal(c2);
                });

                it('should return null if no component with the given name exists', function () {
                    var c = new Component();
                    expect(c.findComponent('foobar')).to.equal(null);
                });

            });

            describe('#findComponents(name)', function () {

                it('should return an array of all components that match the given name', function () {

                    var C = baustein.register(createComponentName());

                    var c1 = new Component();
                    var c2 = new C();
                    var c3 = new C();
                    var c4 = new C();
                    var arr = [c2, c3, c4];

                    c1.el.appendChild(c2.el);
                    c1.el.appendChild(c3.el);
                    c1.el.appendChild(c4.el);

                    expect(c1.findComponents(c2.name)).to.have.length(3);

                    c1.findComponents(c2.name).forEach(function (c, i) {
                        expect(c).to.equal(arr[i]);
                    });

                });

            });

            describe('#getInstancesOf(name)', function () {

                it('should return an array of all components that match the given name', function () {

                    var Component1 = baustein.register(createComponentName());
                    var Component2 = baustein.register(createComponentName());

                    var c1 = new Component1();
                    var c2 = new Component1();
                    var c3 = new Component2();
                    var c4 = new Component2();
                    var c5 = new Component1();
                    var arr = [c1, c2, c5];
                    var arr2 = [c3, c4];

                    expect(baustein.getInstancesOf(c1.name)).to.have.length(3);
                    expect(baustein.getInstancesOf(c3.name)).to.have.length(2);

                    baustein.getInstancesOf(c1.name).forEach(function (c, i) {
                        expect(c).to.equal(arr[i]);
                    });

                    baustein.getInstancesOf(c3.name).forEach(function (c, i) {
                        expect(c).to.equal(arr2[i]);
                    });

                });

            });

            describe('#emit(name, data, chain)', function () {

                it('should call handler when emit event on same component', function () {
                    var spy = sinon.spy();
                    var Component = baustein.register(createComponentName(), {
                        setupEvents: function (add) {
                            add('foo', spy);
                        }
                    });

                    var component = new Component();
                    component.emit('foo');
                    expect(spy.callCount).to.equal(1);

                });

                it('should call handler on parent component when emit on child', function () {
                    var spy = sinon.spy();
                    var ComponentParent = baustein.register(createComponentName(), {
                        setupEvents: function (add) {
                            add('foo', spy);
                        }
                    });

                    var ComponentChild = baustein.register(createComponentName());

                    var componentParent = new ComponentParent();
                    var componentChild = new ComponentChild();

                    componentChild.appendTo(componentParent.el);

                    componentChild.emit('foo');
                    expect(spy.callCount).to.equal(1);

                });

                it('should call handler with data', function () {
                    var spy = sinon.spy();
                    var data = {
                        foo: 'bar'
                    };

                    var Component = baustein.register(createComponentName(), {
                        setupEvents: function (add) {
                            add('foo', spy);
                        }
                    });

                    var component = new Component();
                    component.emit('foo', data);
                    expect(spy.calledWith(data));

                });

                it('should call handler with custom target', function () {

                    var spy = sinon.spy();
                    var el = document.createElement('div');
                    var Component = baustein.register(createComponentName(), {
                        setupEvents: function (add) {
                            add('foo', spy);
                        }
                    });

                    var component = new Component();

                    component.el.appendChild(el);

                    component.emit('foo', {
                        target: el
                    });

                    expect(spy.getCall(0).args[0].target).to.be(el);

                });

            });

            describe('#insertBefore(element)', function () {

                it('should return this', function () {
                    var c = new Component();
                    expect(c.insertBefore()).to.equal(c);
                });

                it('should insert itself before the child element', function () {

                    var root = document.createElement('div');
                    var child1 = document.createElement('span');
                    var child2 = document.createElement('span');
                    root.appendChild(child1);
                    root.appendChild(child2);

                    var c = new Component();
                    c.insertBefore(child2);
                    expect(root.children[0]).to.equal(child1);
                    expect(root.children[1]).to.equal(c.el);
                    expect(root.children[2]).to.equal(child2);

                });

            });

            describe('#insertAfter(element)', function () {

                it('should return this', function () {
                    var c = new Component();
                    expect(c.insertAfter()).to.equal(c);
                });


                it('should insert itself after the child element', function () {

                    var root = document.createElement('div');
                    var child1 = document.createElement('span');
                    var child2 = document.createElement('span');
                    root.appendChild(child1);
                    root.appendChild(child2);

                    var c = new Component();
                    c.insertAfter(child1);
                    expect(root.children[0]).to.equal(child1);
                    expect(root.children[1]).to.equal(c.el);
                    expect(root.children[2]).to.equal(child2);

                });

                it('should insert itself as the last child if inserted after the last child', function () {
                    var root = document.createElement('div');
                    var child = document.createElement('span');
                    root.appendChild(child);

                    var c = new Component();
                    c.insertAfter(child);
                    expect(root.children[0]).to.equal(child);
                    expect(root.children[1]).to.equal(c.el);
                });

                it('should insert immediately after the first child, not after a text node', function () {

                    var root = document.createElement('div');
                    var child1 = document.createElement('span');
                    var textNode = document.createTextNode('I am some text');
                    var child2 = document.createElement('span');
                    root.appendChild(child1);
                    root.appendChild(textNode);
                    root.appendChild(child2);

                    var c = new Component();
                    c.insertAfter(child1);
                    expect(root.childNodes[0]).to.equal(child1);
                    expect(root.childNodes[1]).to.equal(c.el);
                    expect(root.childNodes[2]).to.equal(textNode);
                    expect(root.childNodes[3]).to.equal(child2);

                });

            });

            describe('#getInstanceOf(name)', function () {

                it('should return a instance or undefined', function () {

                    var Component1 = baustein.register(createComponentName());

                    var c1 = new Component1();

                    expect(baustein.getInstanceOf(c1.name)).to.be.a('object');
                    expect(baustein.getInstanceOf(c1.name)).to.be(c1);
                    expect(baustein.getInstanceOf('hello')).to.be(undefined);

                });

                it('should return the right instance', function () {

                    var Component1 = baustein.register(createComponentName());
                    var Component2 = baustein.register(createComponentName());

                    var c1 = new Component1();
                    var c2 = new Component1();
                    var c3 = new Component2();
                    var c4 = new Component2();
                    var c5 = new Component1();

                    expect(baustein.getInstanceOf(c1.name)).to.be(c1);
                    expect(baustein.getInstanceOf(c4.name)).to.be(c3);

                });

            });

            describe('#destroy(name)', function () {

                it('should destroy all instances', function () {

                    var Component1 = baustein.register(createComponentName());
                    var Component2 = baustein.register(createComponentName());

                    var c1 = new Component1();
                    var c2 = new Component1();
                    var c3 = new Component2();
                    var c4 = new Component2();
                    var c5 = new Component1();

                    baustein.destroy(c1.name);

                    expect(baustein.getInstancesOf(c1.name)).to.have.length(0);
                    expect(baustein.getInstancesOf(c3.name)).to.have.length(2);

                    baustein.destroy(c3.name);

                    expect(baustein.getInstancesOf(c1.name)).to.have.length(0);
                    expect(baustein.getInstancesOf(c3.name)).to.have.length(0);

                });

                it('should fail silent if there are no instances', function () {
                    expect(baustein.destroy).withArgs('hallo').to.not.throwException();
                    expect(baustein.destroy).to.not.throwException();
                });

                it('should be chainable', function () {
                    expect(baustein.destroy()).to.be(baustein);
                });

            });

            describe('#registerEvent(event, selector, handler)', function () {

                it('should add an entry to the _events array', function () {

                    var Component1 = baustein.register(createComponentName());

                    var c = new Component1();

                    expect(c._events).to.have.length(0);

                    var handler = function () {
                    };
                    c.registerEvent('click', handler);
                    c.registerEvent('click', '.some-selector', handler);

                    expect(c._events).to.have.length(2);

                    expect(c._events[0]).to.eql(['click', null, handler]);
                    expect(c._events[1]).to.eql(['click', '.some-selector', handler]);

                });

            });

            describe('#releaseEvent(event, selector, handler)', function () {

                it('given an event, selector and handler, remove the specific handler', function () {
                    var NewComponent = baustein.register(createComponentName());
                    var c = new NewComponent();

                    var handler = function () {
                    };
                    var handler2 = function () {
                        return false;
                    };
                    c.registerEvent('click', '.dom', handler);
                    c.registerEvent('click', '.dom', handler2);
                    c.registerEvent('click', handler);

                    expect(c._events).to.have.length(3);
                    c.releaseEvent('click', '.dom', handler);
                    expect(c._events).to.have.length(2);
                });

                it('given an event, selector, remove all events for that selector', function () {
                    var NewComponent = baustein.register(createComponentName());
                    var c = new NewComponent();

                    var handler = function () {
                    };
                    var handler2 = function () {
                        return true;
                    };
                    c.registerEvent('click', '.dom', handler);
                    c.registerEvent('click', '.dom', handler2);
                    c.registerEvent('click', handler);

                    c.releaseEvent('click', '.dom');
                    expect(c._events).to.have.length(1);
                });

                it('given an event, remove all events from the component only', function () {
                    var NewComponent = baustein.register(createComponentName());
                    var c = new NewComponent();

                    var handler = function () {
                    };
                    var handler2 = function () {
                        return true;
                    };
                    c.registerEvent('click', '.dom', handler);
                    c.registerEvent('click', '.dom', handler2);
                    c.registerEvent('click', handler);

                    c.releaseEvent('click');
                    expect(c._events).to.have.length(2);

                    c.registerEvent('click', handler);
                    c.registerEvent('click', handler2);
                    c.releaseEvent('click');
                    expect(c._events).to.have.length(2);
                });

                it('should not remove unspecified events', function () {
                    var NewComponent = baustein.register(createComponentName());
                    var c = new NewComponent();

                    var handler = function () {
                    };
                    var handler2 = function () {
                        return true;
                    };

                    c.registerEvent('click', '.dom', handler);
                    c.registerEvent('click', '.dom', handler2);
                    c.registerEvent('hover', handler);

                    c.releaseEvent('hover', handler2);
                    expect(c._events).to.have.length(3);

                    c.releaseEvent('click');
                    expect(c._events).to.have.length(3);

                    c.releaseEvent('mouseout', '.dom', handler);
                    expect(c._events).to.have.length(3);

                    c.releaseEvent('mouseout', '.dom');
                    expect(c._events).to.have.length(3);
                });
            });

            describe('#releaseGlobalHandler', function () {

                it('should call handlers registered with setGlobalHandler', function () {

                    var handler = sinon.spy();
                    var Component = baustein.register(createComponentName());
                    var component1 = new Component();
                    var component2 = new Component();

                    // both using the same handler
                    component1.setGlobalHandler('foo', handler);
                    component2.setGlobalHandler('foo', handler);

                    // handler should be called twice
                    baustein.handleEvent({
                        type: 'foo',
                        target: document.body
                    });
                    expect(handler.callCount).to.equal(2);

                    // one component releases the handler
                    component1.releaseGlobalHandler('foo', handler);

                    // one handler should still remain
                    baustein.handleEvent({
                        type: 'foo',
                        target: document.body
                    });
                    expect(handler.callCount).to.equal(3);
                });

            });

        });

        describe('components.register(name, implementation)', function () {

            it('should return a new class that extends components.Component', function () {
                var NewComponent = baustein.register(createComponentName());
                expect(new NewComponent()).to.be.a(Component);
            });

            it('should set the name of the component on the prototype', function () {
                var name = createComponentName();
                var NewComponent = baustein.register(name);
                expect(new NewComponent()).to.have.property('name', name);
            });

            it('should throw an error if the name is already registered', function () {
                var name = createComponentName();
                baustein.register(name);
                expect(baustein.register).withArgs(name).to.throwException();
            });

            it('should throw an error if name is not a valid string', function () {
                expect(baustein.register).withArgs(null).to.throwException();
                expect(baustein.register).withArgs('').to.throwException();
            });

        });

        describe('components.register(implementation)', function () {

            it('should return a new class that extends components.Component', function () {
                var NewComponent = baustein.register({name: createComponentName()});
                expect(new NewComponent()).to.be.a(Component);
            });

            it('should set the name of the component on the prototype', function () {
                var name = createComponentName();
                var NewComponent = baustein.register({name: name});
                expect(new NewComponent()).to.have.property('name', name);
            });

            it('should throw an error if the name is already registered', function () {
                var name = createComponentName();
                baustein.register({name: name});
                expect(baustein.register).withArgs({name: name}).to.throwException();
            });

            it('should throw an error if name is not a valid string', function () {
                expect(baustein.register).withArgs({}).to.throwException();
                expect(baustein.register).withArgs({
                    name: function () {
                    }
                }).to.throwException();
            });

        });

        describe('components.handleEvent(event)', function () {

            it('should invoke the correct method on the correct component', function () {

                var name1 = createComponentName();
                var name2 = createComponentName();
                var name3 = createComponentName();

                var spy = sinon.spy();

                baustein.register(name1, {
                    setupEvents: function (add) {
                        add('click', this.onClick);
                    },
                    onClick: spy
                });
                baustein.register(name2, {
                    setupEvents: function (add) {
                        add('click', '.outer', this.onOuterClick);
                    },
                    onOuterClick: spy
                });
                baustein.register(name3);

                addTestHTML(
                    '<div id="first" is="' + name1 + '"></div>',
                    '<div id="second" is="' + name2 + '"><span class="outer"><span id="span-inner" class="inner"></span></span></div>',
                    '<div id="third" is="' + name1 + '"></div>',
                    '<div id="fourth" is="' + name3 + '"></div>',
                    '<div id="fifth"></div>'
                );

                var event = makeEvent('click', document.getElementById('first'));

                baustein.handleEvent(event);

                expect(spy.callCount).to.equal(1);
                expect(spy.getCall(0).args[0]).to.equal(event);

                event = makeEvent('click', document.getElementById('span-inner'));
                baustein.handleEvent(event);

                expect(spy.callCount).to.equal(2);
                expect(spy.getCall(1).args[0]).to.equal(event);
                expect(spy.getCall(1).args[1]).to.equal(event.target.parentElement);

                event = makeEvent('click', document.getElementById('fifth'));
                baustein.handleEvent(event);
                expect(spy.callCount).to.equal(2);

                event = makeEvent('click', document.getElementById('second'));
                baustein.handleEvent(event);
                expect(spy.callCount).to.equal(2);

                event = makeEvent('touchstart', document.getElementById('second'));
                baustein.handleEvent(event);
                expect(spy.callCount).to.equal(2);
            });

            it('should handle complicated selectors', function () {

                var name = createComponentName();
                var spy = sinon.spy();

                baustein.register(name, {
                    setupEvents: function (add) {
                        add('click', '.one.two [some-attribute]', this.onClick);
                    },
                    onClick: spy
                });

                addTestHTML(
                    '<div is="' + name + '">',
                    '  <span class="one two"><span><span some-attribute><span id="target"></span></span></span></span>',
                    '</div>'
                );

                var event = makeEvent('click', document.getElementById('target'));

                baustein.handleEvent(event);

                expect(spy.callCount).to.equal(1);
            });

            it('should call handlers registered with setGlobalHandler', function () {

                var name = createComponentName();
                var handler = sinon.spy();

                var C = baustein.register(name);

                var el = document.createElement('div');
                var c = new C();
                c.el.appendChild(el);

                c.setGlobalHandler('click', handler);

                baustein.handleEvent({
                    type: 'click',
                    target: document.body
                });

                expect(handler.callCount).to.equal(1);
            });

        });

        describe('components.fromElement(element)', function () {

            var name, el;

            beforeEach(function () {
                name = createComponentName();
                el = document.createElement('div');
                el.setAttribute('is', name);
            });

            it('should create the correct component if it doesnt exist', function () {
                baustein.register(name);
                expect(baustein.fromElement(el)).to.be.a(Component);
            });

            it('should throw an exception if no component has been registered with the given name', function () {
                expect(baustein.fromElement).withArgs(el).to.throwException();
            });

            it('should always return the same component instance', function () {
                baustein.register(name);
                var c = baustein.fromElement(el);
                expect(baustein.fromElement(el)).to.equal(c);
                expect(baustein.fromElement(el)).to.equal(c);
                expect(baustein.fromElement(el)).to.equal(c);
            });

            it('should return null if the element has no component name attribute', function () {
                expect(baustein.fromElement(document.createElement('div'))).to.equal(null);
            });

            it('should return null if the passed argument is not an element', function () {
                expect(baustein.fromElement(null)).to.equal(null);
                expect(baustein.fromElement({})).to.equal(null);
                expect(baustein.fromElement(function () {
                })).to.equal(null);
                expect(baustein.fromElement('<div></div>')).to.equal(null);
            });

        });

    });

});
