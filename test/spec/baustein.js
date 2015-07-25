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

    describe('baustein', function () {

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

        describe('baustein.Component', function () {

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

            it('should set the id as an attribute on the root element', function () {
                var el = document.createElement('div');
                var component = new Component(el);
                expect(el.hasAttribute('data-component-id')).to.eql(true);
            });

            it('should set the name as an attribute on the root element', function () {
                var el = document.createElement('div');
                var component = new Component(el);
                expect(el.getAttribute('is')).to.eql(component.name);
            });

            it('should only call render() if the root element was created in the constructor function.', function () {

                var renderSpy = sinon.spy();

                var C = baustein.register(createComponentName(), {
                    render: renderSpy
                });

                var c1 = new C();
                var c2 = new C(document.createElement('div'));

                expect(renderSpy.callCount).to.equal(1);
                expect(renderSpy.getCall(0).calledOn(c1)).to.equal(true);
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

            it('should support passing the template function as an option', function () {
                var c = new Component({
                    template: function () {
                        return '<div class="foo bar">hi there</div>';
                    }
                });
                expect(c.el.innerHTML).to.equal('hi there');
                expect(c.el.className).to.equal('foo bar');
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

                it('should set up the domQuery and domWrapper functions', function () {
                    var c;

                    baustein.reset();

                    var domQuerySpy = sinon.spy(function () {
                        return [1, 2, 3]
                    });

                    var domWrapperSpy = sinon.spy(function () {
                        return [4, 5, 6];
                    });

                    baustein.init({
                        domQuery: domQuerySpy,
                        domWrapper: domWrapperSpy
                    });

                    c = new Component();
                    expect(c.find('.foo')).to.eql([4, 5, 6]);
                    expect(c.$el).to.eql([4, 5, 6]);

                    expect(domQuerySpy.callCount).to.equal(1);
                    expect(domQuerySpy.getCall(0).args[0]).to.equal(c.el);
                    expect(domQuerySpy.getCall(0).args[1]).to.equal('.foo');

                    expect(domWrapperSpy.callCount).to.equal(2);
                    expect(domWrapperSpy.getCall(0).args[0]).to.eql([c.el]);
                    expect(domWrapperSpy.getCall(1).args[0]).to.eql([1, 2, 3]);
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

                it('should return null if the component has already been destroyed', function () {
                    var c = new Component();
                    c.destroy();
                    expect(c.destroy()).to.equal(null);
                });

                it('should call destroy() on all child components', function () {
                    var Container = baustein.register(createComponentName());

                    var C = baustein.register(createComponentName());

                    var container = new Container();
                    var parent = new C();
                    var child = new C();
                    var grandchild = new C();

                    sinon.spy(parent, 'destroy');
                    sinon.spy(child, 'destroy');
                    sinon.spy(grandchild, 'destroy');

                    grandchild.appendTo(child);
                    child.appendTo(parent);
                    parent.appendTo(container);

                    parent.destroy();

                    expect(parent.destroy.callCount).to.equal(1);
                    expect(child.destroy.callCount).to.equal(1);

                    // We expect this to be called twice as it will first be called as a result
                    // of `parent` calling destroy on all it's children and then again as a result
                    // of `child` calling destroy on all it's children.
                    expect(grandchild.destroy.callCount).to.equal(2);

                    // check destroy() was called on each component in the expected order
                    expect(parent.destroy.calledBefore(child.destroy)).to.equal(true);
                    expect(child.destroy.calledBefore(grandchild.destroy)).to.equal(true);
                });

                it('during the emitting of the "destroy" event isDestroying() is true', function () {

                    var aName = createComponentName();
                    var bName = createComponentName();

                    var A = baustein.register(aName, {
                        setupEvents: function (add) {
                            add('destroy', bName, function (event) {
                                expect(event.target.isDestroying()).to.equal(true);
                            });
                        }
                    });

                    var B = baustein.register(bName, {
                        setupEvents: function (add) {
                            add('click', this.destroy);
                        }
                    });

                    var a = new A();
                    var b = new B();
                    b.appendTo(a);

                    baustein.handleEvent({
                        type: 'click',
                        target: b.el
                    });

                    expect(b.isDestroyed()).to.equal(true);

                });

                it('should result in onRemove() being called if the component was attached at time of destruction', function (done) {

                    var C = baustein.register(createComponentName(), {
                        onRemove: done,
                        onInsert: function () {
                            this.destroy();
                        }
                    });

                    var c = new C();
                    c.appendTo(document.body);
                });

                it('should set the render context to null', function () {
                    var C = baustein.register(createComponentName(), {
                        getInitialRenderContext: function () {
                            return {
                                name: 'Richard'
                            };
                        }
                    });

                    var c = new C();
                    expect(c.getRenderContext().name).to.equal('Richard');
                    c.destroy();
                    expect(c.getRenderContext()).to.equal(null);
                });

            });

            describe('#render()', function () {

                it('should do nothing if this.template is not a function', function () {
                    var C = baustein.register(createComponentName(), {
                        template: null
                    });
                    var c = new C();
                    expect(c.render()).to.equal(c);
                });

                it('should call getRenderContext() to get the context for the template function', function () {
                    var C = baustein.register(createComponentName(), {
                        template: function (context) {
                            return '<div>' + context.count + '</div>';
                        },
                        getInitialRenderContext: function () {
                            return {
                                count: 5
                            }
                        }
                    });
                    var c = new C();
                    expect(c.el.innerHTML).to.equal('5');
                });

                it('should throw an error if the template function does not return an HTML string representing a single node', function () {

                    [null, 'wat', '<p></p><p></p>'].forEach(function (invalid) {
                        function factory() {
                            var C = baustein.register(createComponentName(), {
                                template: function () {
                                    return invalid
                                }
                            });
                            return new C();
                        }

                        expect(factory).to.throwError('A component template must product a single DOM node.');
                    });
                });

                it('should throw an error if the root node output by the template does not match the root node of the component', function () {

                    function factory() {
                        var C = baustein.register(createComponentName(), {
                            tagName: 'div',
                            template: function () {
                                return '<p></p>'
                            }
                        });
                        return new C();
                    }

                    expect(factory).to.throwError('Cannot change the tagName of an element.');

                });

            });

            describe('#getInitialRenderContext()', function () {

                it('should be called when the component is created', function () {
                    var C = baustein.register(createComponentName(), {
                        getInitialRenderContext: sinon.spy()
                    });

                    var c = new C();
                    expect(c.getInitialRenderContext.callCount).to.equal(1);
                });

                it('should not affect the components render state if the object returned is later mutated', function () {
                    var context = {
                        foo: 'bar'
                    };

                    var C = baustein.register(createComponentName(), {
                        getInitialRenderContext: function () {
                            return context;
                        }
                    });

                    var c = new C();

                    expect(c.getRenderContext()).to.eql({
                        foo: 'bar'
                    });

                    context.foo = 'baz';
                    context.meaningoflife = 42;

                    expect(c.getRenderContext()).to.eql({
                        foo: 'bar'
                    });
                });

            });

            ['set', 'replace'].forEach(function (action) {

                var methodName = action + 'RenderContext';

                describe('#' + action + 'RenderContext()', function () {

                    it('should ' + (action === 'set' ? 'update' : action) + ' the state with the given object', function () {
                        var c = new Component();
                        c[methodName]({
                            one: 1
                        });

                        expect(c.getRenderContext()).to.eql({
                            one: 1
                        });

                        c[methodName]({
                            numbers: [1, 2, 3]
                        });

                        if (action === 'set') {
                            expect(c.getRenderContext()).to.eql({
                                one: 1,
                                numbers: [1, 2, 3]
                            });
                        }
                        else {
                            expect(c.getRenderContext()).to.eql({
                                numbers: [1, 2, 3]
                            });
                        }
                    });

                    it('should not affect the components state if the object passed in is later mutated', function () {
                        var c = new Component();
                        var context = {
                            name: {
                                first: 'Percy'
                            }
                        };
                        c[methodName](context);

                        expect(c.getRenderContext()).to.eql(context);

                        context.name.first = 'Graham';

                        expect(c.getRenderContext()).to.eql({
                            name: {
                                first: 'Percy'
                            }
                        });
                    });

                    it('should call render() if the components render context was changed', function () {
                        var c = new Component();

                        sinon.stub(c, 'render');

                        var context = {
                            number: 1,
                            string: 'hello',
                            arr: [1, 2, 3],
                            obj: {
                                key: 'value'
                            }
                        };

                        c[methodName](context);
                        c[methodName](context);
                        c[methodName](context);

                        context.arr.push(4);
                        c[methodName](context);
                        c[methodName](context);
                        c[methodName](context);

                        expect(c.render.callCount).to.equal(2);
                    });

                    it('should allow functions to be in the context', function () {
                        var c = new Component();
                        c[methodName]({
                            foo: function () {
                                return 5;
                            }
                        });

                        expect(c.getRenderContext().foo()).to.equal(5);
                    });

                });

            });

            describe('#getRenderContext()', function () {

                it('should return a clone of the current render context', function () {
                    var c = new Component();
                    c.setRenderContext({
                        foo: 'bar'
                    });

                    var context = c.getRenderContext();
                    expect(context).to.eql({
                        foo: 'bar'
                    });

                    var context2 = c.getRenderContext();

                    // it should not be the same object
                    expect(context).to.not.equal(context2);

                    // but it should be equivalent
                    expect(context).to.eql(context2);
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

                it('should handle one event at a time', function () {
                    var spy = sinon.spy(function () {
                        if (this.options.child) {
                            this.emit('bar');
                        }
                    });

                    var Component = baustein.register(createComponentName(), {
                        setupEvents: function (add) {
                            add('foo', spy);
                            if (this.options.grandparent) {
                                add('bar', spy);
                            }
                        }
                    });

                    var parent = new Component({grandparent: true});
                    var child = new Component({child: true});
                    var grandchild = new Component();

                    child.appendTo(parent);
                    grandchild.appendTo(child);

                    grandchild.emit('foo');

                    // check the number of calls
                    expect(spy.callCount).to.equal(4);

                    // first 'foo' should have been handled
                    expect(spy.getCall(0).thisValue).to.equal(grandchild);
                    expect(spy.getCall(1).thisValue).to.equal(child);
                    expect(spy.getCall(2).thisValue).to.equal(parent);
                    expect(spy.getCall(2).args[0]).to.have.property('type', 'foo');

                    // then 'bar'
                    expect(spy.getCall(3).thisValue).to.equal(parent);
                    expect(spy.getCall(3).args[0]).to.have.property('type', 'bar');
                });

                it('should stop handling the event if stopPropagation() is called', function () {

                    var log = [];

                    function createHandler(n) {
                        return function () {
                            log.push(n);
                        };
                    }

                    var Parent = baustein.register(createComponentName(), {
                        setupEvents: function (add) {
                            add('firstEvent', this.onFirstEvent);
                            add('secondEvent', this.onSecondEvent);
                        },
                        onFirstEvent: function () {
                            expect().fail('Handler should not be called as propagation was stopped.');
                        },
                        onSecondEvent: createHandler(3)
                    });

                    var Child = baustein.register(createComponentName(), {
                        setupEvents: function (add) {
                            add('firstEvent', this.onFirstEvent);
                            add('secondEvent', this.onSecondEvent);
                        },
                        onFirstEvent: sinon.spy(function (event) {
                            log.push(1);
                            event.stopPropagation();
                            event.target.emit('secondEvent');
                        }),
                        onSecondEvent: createHandler(2)
                    });

                    var Grandchild = baustein.register(createComponentName());

                    var parent = new Parent();
                    var child = new Child();
                    var grandchild = new Grandchild();

                    grandchild.appendTo(child);
                    child.appendTo(parent);

                    grandchild.emit('firstEvent');

                    expect(log).to.eql([1, 2, 3]);
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

                it('should accept a component', function () {
                    var c1 = new Component();
                    var c2 = new Component();
                    var container = document.createElement('div');

                    c1.appendTo(container);
                    c2.insertBefore(c1);

                    expect(container.childNodes[0]).to.equal(c2.el);
                    expect(container.childNodes[1]).to.equal(c1.el);
                });

                it('should do nothing if the target has no parent', function () {
                    var c = new Component();
                    var target = document.createElement('div');
                    expect(c.insertBefore(target)).to.equal(c);
                });

                it('should do nothing if the target is not an element or a component', function () {
                    var c = new Component();
                    expect(c.insertBefore(null)).to.equal(c);
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

                it('should accept a component', function () {
                    var c1 = new Component();
                    var c2 = new Component();
                    var container = document.createElement('div');

                    c1.appendTo(container);
                    c2.insertAfter(c1);

                    expect(container.childNodes[0]).to.equal(c1.el);
                    expect(container.childNodes[1]).to.equal(c2.el);
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

                it('should do nothing if the target has no parent', function () {
                    var c = new Component();
                    var target = document.createElement('div');
                    expect(c.insertAfter(target)).to.equal(c);
                });

                it('should do nothing if the target is not an element or a component', function () {
                    var c = new Component();
                    expect(c.insertAfter(null)).to.equal(c);
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

                it('should add a listener for the event', function () {

                    var Component1 = baustein.register(createComponentName());

                    var c = new Component1();

                    var handler = sinon.spy();
                    c.registerEvent('click', handler);
                    c.registerEvent('click', '.some-selector', handler);

                    var el = document.createElement('div');
                    el.className = 'some-selector';

                    c.el.appendChild(el);

                    baustein.handleEvent({
                        type: 'click',
                        target: el
                    });

                    expect(handler.callCount).to.equal(2);

                });

                it('should support filtering custom events by component name', function () {

                    var name1 = createComponentName();
                    var name2 = createComponentName();
                    var name3 = createComponentName();

                    var container = new Component();
                    var C1 = baustein.register(name1);
                    var C2 = baustein.register(name2);
                    var C3 = baustein.register(name3);

                    var c1 = new C1();
                    var c2 = new C2();
                    var c3 = new C3();

                    container.el.appendChild(c1.el);
                    container.el.appendChild(c2.el);
                    container.el.appendChild(c3.el);

                    var handler = sinon.spy();

                    container.registerEvent('foo', name1, handler);

                    c1.emit('foo');
                    c2.emit('foo');
                    c3.emit('foo');

                    expect(handler.callCount).to.equal(1);
                    expect(handler.getCall(0).args[0].target).to.equal(c1);

                });

            });

            describe('#releaseEvent(event, selector, handler)', function () {

                it('given an event, selector and handler, remove the specific handler', function () {
                    var NewComponent = baustein.register(createComponentName());
                    var c = new NewComponent();

                    var handler = sinon.spy();
                    var handler2 = sinon.spy();
                    c.registerEvent('click', '.dom', handler);
                    c.registerEvent('click', '.dom', handler2);
                    c.registerEvent('click', handler);

                    var el = document.createElement('div');
                    el.className = 'dom';

                    c.el.appendChild(el);

                    baustein.handleEvent({
                        type: 'click',
                        target: el
                    });

                    expect(handler.callCount).to.equal(2);
                    expect(handler2.callCount).to.equal(1);

                    c.releaseEvent('click', '.dom', handler);

                    baustein.handleEvent({
                        type: 'click',
                        target: el
                    });

                    expect(handler.callCount).to.equal(3);
                    expect(handler2.callCount).to.equal(2);
                });

            });

            describe('#releaseEvent(event, selector)', function () {

                it('given an event, selector, remove all events for that selector', function () {
                    var NewComponent = baustein.register(createComponentName());
                    var c = new NewComponent();

                    var handler = sinon.spy();
                    var handler2 = sinon.spy();
                    c.registerEvent('click', '.dom', handler);
                    c.registerEvent('click', '.dom', handler2);
                    c.registerEvent('click', handler);

                    c.releaseEvent('click', '.dom');

                    baustein.handleEvent({
                        type: 'click',
                        target: c.el
                    });

                    expect(handler.callCount).to.equal(1);
                    expect(handler2.callCount).to.equal(0);
                });

            });

            describe('#releaseEvent(event, handler)', function () {

                it('given an event, selector, remove all events for that selector', function () {
                    var NewComponent = baustein.register(createComponentName());
                    var c = new NewComponent();

                    var handler = sinon.spy();
                    c.registerEvent('click', handler);
                    c.releaseEvent('click', handler);

                    baustein.handleEvent({
                        type: 'click',
                        target: c.el
                    });

                    expect(handler.callCount).to.equal(0);
                });

            });

            describe('#releaseEvent(event)', function () {

                it('given an event, remove all events from the component only', function () {
                    var NewComponent = baustein.register(createComponentName());
                    var c = new NewComponent();

                    var handler = sinon.spy();
                    var handler2 = sinon.spy();

                    var target = document.createElement('div');
                    target.className = 'dom';

                    c.registerEvent('click', handler);
                    c.registerEvent('click', handler2);
                    c.releaseEvent('click');

                    baustein.handleEvent({
                        type: 'click',
                        target: target
                    });

                    expect(handler.callCount).to.equal(0);
                    expect(handler2.callCount).to.equal(0);
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

            describe('#onInsert', function () {

                it('should be called when the component is inserted into the DOM', function (done) {

                    var name = createComponentName();
                    var spy = sinon.spy();
                    var C = baustein.register(name, {
                        onInsert: spy
                    });

                    // create the DOM structure:
                    //     <parent>
                    //         <c1>
                    //             <c2>
                    var parent = document.createElement('div');
                    var c1 = new C();
                    var c2 = new C();
                    c1.appendTo(parent);
                    c2.appendTo(c1);

                    // add the parent which should trigger onInsert to be called
                    document.body.appendChild(parent);

                    // MutationObserver and mutation events are asynchronous so have to use a
                    // setTimeout, 100ms should be more than enough.
                    setTimeout(function () {
                        expect(spy.callCount).to.equal(2);
                        expect(spy.getCall(0).thisValue).to.equal(c1);
                        expect(spy.getCall(1).thisValue).to.equal(c2);
                        done();
                    }, 100);
                });

            });

            describe('#onRemove', function () {

                it('should be called when the component is removed from the DOM', function (done) {

                    var name = createComponentName();
                    var spy = sinon.spy();
                    var C = baustein.register(name, {
                        onRemove: spy
                    });

                    // create the DOM structure:
                    // <body>
                    //     <parent>
                    //         <c1>
                    //             <c2>
                    var parent = document.createElement('div');
                    var c1 = new C();
                    var c2 = new C();
                    document.body.appendChild(parent);
                    c1.appendTo(parent);
                    c2.appendTo(c1);

                    document.body.removeChild(parent);

                    // MutationObserver and mutation events are asynchronous so have to use a
                    // setTimeout, 100ms should be more than enough.
                    setTimeout(function () {
                        expect(spy.callCount).to.equal(2);
                        expect(spy.getCall(0).thisValue).to.equal(c1);
                        expect(spy.getCall(1).thisValue).to.equal(c2);
                        done();
                    }, 100);
                });

            });

        });

        describe('baustein.register(name, implementation)', function () {

            it('should return a new class that extends baustein.Component', function () {
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

            it('should support getters and setters', function () {
                var NewComponent = baustein.register(createComponentName(), {
                    counter: 0,
                    get foo() {
                        this.counter += 1;
                        return this.counter;
                    }
                });

                var c = new NewComponent();
                expect(c.foo).to.equal(1);
                expect(c.foo).to.equal(2);
                expect(c.foo).to.equal(3);

                // check each instance is unique
                c = new NewComponent();
                expect(c.foo).to.equal(1);
            });

            it('should setup mixins correctly', function () {
                var myMethod = sinon.spy();

                var myMixin = {
                    setupEvents: sinon.spy()
                };
                var myOtherMixin = {
                    setupEvents: sinon.spy()
                };

                var C = baustein.register(createComponentName(), {
                    mixins: [myMixin, myOtherMixin],
                    setupEvents: myMethod
                });

                new C();

                // each method should have been called once
                expect(myMixin.setupEvents.callCount).to.equal(1);
                expect(myOtherMixin.setupEvents.callCount).to.equal(1);
                expect(myMethod.callCount).to.equal(1);

                // check they were called in the correct order
                expect(myMixin.setupEvents.calledBefore(myOtherMixin.setupEvents)).to.equal(true);
                expect(myOtherMixin.setupEvents.calledBefore(myMethod)).to.equal(true);
            });

        });

        describe('#isAttached()', function () {

            it('should return false when the element is not attached to the DOM.', function () {
                var C = baustein.register(createComponentName());
                var c = new C();
                expect(c.isAttached()).to.equal(false);
            });

            it('should return true when the element is attached to the DOM.', function (done) {
                var C = baustein.register(createComponentName(), {
                    onInsert: function () {
                        expect(this.isAttached()).to.equal(true);
                        done();
                    }
                });
                var c = new C();
                c.appendTo(document.body);
            });

            it('should return false when the element is destroyed', function () {
                var C = baustein.register(createComponentName());
                var c = new C();
                c.destroy();
                expect(c.isAttached()).to.equal(false);
            });

        });

        describe('#isDetached()', function () {

            it('should return true when the element is not attached to the DOM.', function () {
                var C = baustein.register(createComponentName());
                var c = new C();
                expect(c.isDetached()).to.equal(true);
            });

            it('should return false when the element is attached to the DOM.', function (done) {
                var C = baustein.register(createComponentName(), {
                    onInsert: function () {
                        expect(this.isDetached()).to.equal(false);
                        done();
                    }
                });
                var c = new C();
                c.appendTo(document.body);
            });

            it('should return false when the element is destroyed', function () {
                var C = baustein.register(createComponentName());
                var c = new C();
                c.destroy();
                expect(c.isDetached()).to.equal(false);
            });

        });

        describe('#updateOptions(options)', function () {

            it('should update the options on the component', function () {
                var C = baustein.register(createComponentName());
                var c = new C({
                    foo: 'bar'
                });
                c.updateOptions({
                    foo: 'baz'
                });
                expect(c.options).to.eql({
                    foo: 'baz'
                });
            });

            [
                [{foo: ['bar']}, {foo: ['baz']}],
                [{foo: ['bar']}, {foo: ['baz', 'bar']}],
                [{foo: {key: 'value'}}, {foo: {key: 'new value'}}],
                [{foo: null}, {foo: 0}],
                [{foo: {key: 'value'}}, {foo: {key: 'value', otherKey: 'other value'}}],
                [{foo: 1, bar: 2}, {foo: 1, bar: 3}]
            ].forEach(function (arr, i) {
                var initial = arr[0];
                var update = arr[1];

                it('should call onOptionsChange() if an option changes - ' + (i + 1), function () {
                    var spy = sinon.spy();
                    var C = baustein.register(createComponentName(), {
                        onOptionsChange: spy
                    });
                    var c = new C(initial);
                    c.updateOptions(update);
                    expect(spy.callCount).to.equal(1);
                    expect(spy.getCall(0).args[0]).to.eql(initial);
                });

            });

            [
                [{foo: ['bar']}, {foo: ['bar']}],
                [{foo: 1}, {foo: 1}],
                [{foo: {key: 'value'}}, {foo: {key: 'value'}}],
                [{foo: null}, {foo: null}]
            ].forEach(function (arr, i) {
                var initial = arr[0];
                var update = arr[1];

                it('should not call onOptionsChange() if no option changes - ' + (i + 1), function () {
                    var spy = sinon.spy();
                    var C = baustein.register(createComponentName(), {
                        onOptionsChange: spy
                    });
                    var c = new C(initial);
                    c.updateOptions(update);
                    expect(spy.callCount).to.equal(0);
                });

            });

        });

        describe('baustein.handleEvent(event)', function () {

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

            it('should not return until the event is handled', function () {

                var markEventAsHandled = sinon.spy(function (event) {
                    event.hasBeenHandled = true;
                });

                var childEvent = {};
                var grandchildEvent = {};

                var Parent = baustein.register(createComponentName(), {
                    init: function () {
                        this.setGlobalHandler('foo', markEventAsHandled);
                        this.setGlobalHandler('bar', markEventAsHandled);
                    }
                });

                var Child = baustein.register(createComponentName(), {
                    setupEvents: function (add) {
                        add('foo', function () {

                            this.emit('bar', childEvent);

                            // event should have been handled by now
                            expect(childEvent.hasBeenHandled).to.equal(true);
                        });
                    }
                });

                var Grandchild = baustein.register(createComponentName());

                var parent = new Parent();
                var child = new Child();
                var grandchild = new Grandchild();

                grandchild.appendTo(child);
                child.appendTo(parent);

                grandchild.emit('foo', grandchildEvent);

                // the event should have bee handled by now
                expect(grandchildEvent.hasBeenHandled).to.equal(true);

                expect(markEventAsHandled.getCall(0).args[0]).to.equal(grandchildEvent);
                expect(markEventAsHandled.getCall(1).args[0]).to.equal(childEvent);

            });

        });

        describe('baustein.fromElement(element)', function () {

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

        describe('baustein.parse(node, ignoreRoot)', function () {

            it('should throw an error if the passed argument is not an element', function () {
                expect(baustein.parse).withArgs(null).to.throwException();
                expect(baustein.parse).withArgs(document.createTextNode('hello')).to.throwException();
                expect(baustein.parse).withArgs({}).to.throwException();
            });

            it('should not include the root node if the second argument is true', function () {
                var C = baustein.register(createComponentName());
                var c1 = new C();
                var c2 = new C();
                c2.appendTo(c1);

                expect(baustein.parse(c1.el)).to.eql([c1, c2]);
                expect(baustein.parse(c1.el, true)).to.eql([c2]);
            });

        });

        describe('baustein.parse()', function () {

            it('should parse the body if no arguments are passed', function () {
                var C = baustein.register(createComponentName());
                var c = new C();
                c.appendTo(document.body);
                expect(baustein.parse()).to.eql([c]);
            });

        });

    });

});
