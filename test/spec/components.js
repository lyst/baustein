describe('components', function () {

    var Component = components.Component;
    var testRoot = document.createElement('div');
    testRoot.id = 'test-root';
    document.body.appendChild(testRoot);

    afterEach(function () {
        testRoot.innerHTML = '';
    });

    var addTestHTML = function () {
        testRoot.innerHTML = [].slice.call(arguments).join('');
    };

    var rand = function () {
        return Math.floor(Math.random() * 100);
    };

    var createComponentName = function () {
        return ['component', rand(), rand(), rand()].join('-');
    };

    var makeEvent = function (event, target) {
        return {
            target: target,
            type: event
        };
    };

    it('should exist', function () {
        expect(components.Component).to.be.ok();
    });

    describe('components.Component', function () {

        it('should be a function', function () {
            expect(components.Component).to.be.a('function');
        });

        it('should create a root element if one is not passed', function () {
            var component = new Component();
            expect(component.el).to.have.property('tagName', 'DIV');
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
            expect(el.getAttribute('data-component-name')).to.eql(component.name);
        });

        it('should save passed options', function () {

            var options = {
                one: 'one',
                two: 2,
                three: [1, 2, 3]
            };
            var c = new Component(null, options);
            expect(c.options).to.eql(options);

        });

        it('should parse data attributes from the root element to get options', function () {

            var el = document.createElement('div');
            el.setAttribute('data-component-option-foo', 'foo');
            el.setAttribute('data-component-option-bar', JSON.stringify({key: 'value'}));
            el.setAttribute('data-component-option-baz-bob', 5);

            expect(new Component(el).options).to.eql({
                foo: 'foo',
                bar: {
                    key: 'value'
                },
                bazBob: 5
            });

        });

        it('should use defaultOptions first, then data attributes, then passed options', function () {

            var name = createComponentName();
            var C = components.register(name, {
                defaultOptions: {
                    foo: 'default value'
                }
            });
            expect(new C().options.foo).to.equal('default value');

            var d = document.createElement('div');
            d.setAttribute('data-component-option-foo', 'attribute value');

            expect(new C(d).options.foo).to.equal('attribute value');

            expect(new C(null, {
                foo: 'passed value'
            }).options.foo).to.equal('passed value');
        });

        describe('#defaultOptions()', function () {

            it('can be a function and if it is then it should be called to get default options', function () {

                var name = createComponentName();
                var C = components.register(name, {
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
                var NewComponent = components.register(createComponentName(), {
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
                addTestHTML('<div id="el" data-component-name="' + name + '"></div>');
                components.register(name);
                components.parse();
                c = components.fromElement(document.getElementById('el'));
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

            it('should call beforeRemove() before removing element from parent', function () {
                var el = document.createElement('div');
                var def = {
                    beforeRemove: sinon.spy(function () {
                        expect(this.el.parentElement).to.equal(el);
                    })
                };
                var C = components.register(createComponentName(), def);
                var c = new C();
                c.appendTo(el);
                c.remove();
                expect(c.beforeRemove.callCount).to.equal(1);
            });

            it('should call onRemove() after removing element from parent', function () {
                var el = document.createElement('div');
                var def = {
                    onRemove: sinon.spy(function () {
                        expect(this.el.parentElement).to.equal(null);
                    })
                };
                var C = components.register(createComponentName(), def);
                var c = new C();
                c.appendTo(el);
                c.remove();
                expect(c.onRemove.callCount).to.equal(1);
            });

            it('should emit the "remove" event', function () {

                var C = components.register(createComponentName());

                var events = {};
                events[C.prototype.name + ':remove'] = 'removeEventHandler';

                var def = {
                    events: events,
                    removeEventHandler: sinon.spy()
                };

                // this is a component that is listening for the
                // 'destroy' event from the C component
                var C2 = components.register(createComponentName(), def);

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
                addTestHTML('<div id="test-el" data-component-name="' + name + '"></div>');
                components.register(name);
                components.parse();
                var c = components.fromElement(document.getElementById('test-el'));
                expect(c.destroy()).to.equal(null);
                expect(document.getElementById('test-el')).to.equal(null);
                expect(c.el).to.equal(null);
            });

            it('should call beforeDestroy() on itself and all child components', function () {

                var def = {
                    beforeDestroy: sinon.spy()
                };
                var C = components.register(createComponentName(), def);

                var c1 = new C();
                var c2 = new C();
                var c3 = new C();

                c2.el.appendChild(c3.el);
                c1.el.appendChild(c2.el);

                c1.destroy();
                expect(def.beforeDestroy.callCount).to.equal(3);
            });

            it('should emit the "destroy" event', function () {

                var C = components.register(createComponentName());

                var events = {};
                events[C.prototype.name + ':destroy'] = 'destroyEventHandler';

                var def = {
                    events: events,
                    destroyEventHandler: sinon.spy()
                };

                // this is a component that is listening for the
                // 'destroy' event from the C component
                var C2 = components.register(createComponentName(), def);

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

                    var C = components.register(createComponentName(), {
                        template: function (ctx) {
                            return '<span>' + ctx.options.text + '</span>';
                        }
                    });

                    var actual = new C(null, {text: 'Hello world'}).el.innerHTML;
                    var expected = '<span>Hello world</span>';

                    expect(actual).to.equal(expected);
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

                var C = components.register(createComponentName(), def);

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
                var C = components.register(createComponentName());
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

                var C = components.register(createComponentName());

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

                var Component1 = components.register(createComponentName());
                var Component2 = components.register(createComponentName());

                var c1 = new Component1();
                var c2 = new Component1();
                var c3 = new Component2();
                var c4 = new Component2();
                var c5 = new Component1();
                var arr = [c1, c2, c5];
                var arr2 = [c3, c4];

                expect(components.getInstancesOf(c1.name)).to.have.length(3);
                expect(components.getInstancesOf(c3.name)).to.have.length(2);

                components.getInstancesOf(c1.name).forEach(function (c, i) {
                    expect(c).to.equal(arr[i]);
                });

                components.getInstancesOf(c3.name).forEach(function (c, i) {
                    expect(c).to.equal(arr2[i]);
                });

            });

        });

        describe('#getInstanceOf(name)', function () {

            it('should return a instance or undefined', function () {

                var Component1 = components.register(createComponentName());

                var c1 = new Component1();

                expect(components.getInstanceOf(c1.name)).to.be.a('object');
                expect(components.getInstanceOf(c1.name)).to.be(c1);
                expect(components.getInstanceOf('hello')).to.be(undefined);

            });

            it('should return the right instance', function () {

                var Component1 = components.register(createComponentName());
                var Component2 = components.register(createComponentName());

                var c1 = new Component1();
                var c2 = new Component1();
                var c3 = new Component2();
                var c4 = new Component2();
                var c5 = new Component1();

                expect(components.getInstanceOf(c1.name)).to.be(c1);
                expect(components.getInstanceOf(c4.name)).to.be(c3);

            });

        });

        describe('#destroy(name)', function () {

            it('should destroy all instances', function () {

                var Component1 = components.register(createComponentName());
                var Component2 = components.register(createComponentName());

                var c1 = new Component1();
                var c2 = new Component1();
                var c3 = new Component2();
                var c4 = new Component2();
                var c5 = new Component1();

                components.destroy(c1.name);

                expect(components.getInstancesOf(c1.name)).to.have.length(0);
                expect(components.getInstancesOf(c3.name)).to.have.length(2);

                components.destroy(c3.name);

                expect(components.getInstancesOf(c1.name)).to.have.length(0);
                expect(components.getInstancesOf(c3.name)).to.have.length(0);

            });

            it('should fail silent if there are no instances', function () {
                expect(components.destroy).withArgs('hallo').to.not.throwException();
                expect(components.destroy).to.not.throwException();
            });

            it('should be chainable', function () {
                expect(components.destroy()).to.be(components);
            });

        });

    });

    describe('components.register(name, implementation)', function () {

        it('should return a new class that extends components.Component', function () {
            var NewComponent = components.register(createComponentName());
            expect(new NewComponent()).to.be.a(Component);
        });

        it('should set the name of the component on the prototype', function () {
            var name = createComponentName();
            var NewComponent = components.register(name);
            expect(new NewComponent()).to.have.property('name', name);
        });

        it('should throw an error if the name is already registered', function () {
            var name = createComponentName();
            components.register(name);
            expect(components.register).withArgs(name).to.throwException();
        });

        it('should throw an error if name is not a valid string', function () {
            expect(components.register).withArgs(null).to.throwException();
            expect(components.register).withArgs('').to.throwException();
        });

    });

    describe('components.register(implementation)', function () {

        it('should return a new class that extends components.Component', function () {
            var NewComponent = components.register({name: createComponentName()});
            expect(new NewComponent()).to.be.a(Component);
        });

        it('should set the name of the component on the prototype', function () {
            var name = createComponentName();
            var NewComponent = components.register({name: name});
            expect(new NewComponent()).to.have.property('name', name);
        });

        it('should throw an error if the name is already registered', function () {
            var name = createComponentName();
            components.register({name: name});
            expect(components.register).withArgs({name: name}).to.throwException();
        });

        it('should throw an error if name is not a valid string', function () {
            expect(components.register).withArgs({}).to.throwException();
            expect(components.register).withArgs({name: function () {
            }}).to.throwException();
        });

    });

    describe('components.handleEvent(event)', function () {

        it('should invoke the correct method on the correct component', function () {

            var name1 = createComponentName();
            var name2 = createComponentName();
            var name3 = createComponentName();

            addTestHTML(
                    '<div id="first" data-component-name="' + name1 + '"></div>',
                    '<div id="second" data-component-name="' + name2 + '"><span class="outer"><span id="span-inner" class="inner"></span></span></div>',
                    '<div id="third" data-component-name="' + name1 + '"></div>',
                    '<div id="fourth" data-component-name="' + name3 + '"></div>',
                '<div id="fifth"></div>'
            );

            var spy = sinon.spy();
            var event = makeEvent('click', document.getElementById('first'));

            components.register(name1, {
                events: {
                    'click': 'onClick'
                },
                onClick: spy
            });
            components.register(name2, {
                events: {
                    '.outer:click': 'onOuterClick'
                },
                onOuterClick: spy
            });
            components.register(name3);

            components.parse();
            components.handleEvent(event);

            expect(spy.callCount).to.equal(1);
            expect(spy.getCall(0).args[0]).to.equal(event);

            event = makeEvent('click', document.getElementById('span-inner'));
            components.handleEvent(event);

            expect(spy.callCount).to.equal(2);
            expect(spy.getCall(1).args[0]).to.equal(event);
            expect(spy.getCall(1).args[1]).to.equal(event.target.parentElement);

            event = makeEvent('click', document.getElementById('fifth'));
            components.handleEvent(event);
            expect(spy.callCount).to.equal(2);

            event = makeEvent('click', document.getElementById('second'));
            components.handleEvent(event);
            expect(spy.callCount).to.equal(2);

            event = makeEvent('touchstart', document.getElementById('second'));
            components.handleEvent(event);
            expect(spy.callCount).to.equal(2);
        });

        it('should handle complicated selectors', function () {

            var name = createComponentName();

            addTestHTML(
                    '<div data-component-name="' + name + '">',
                '  <span class="one two"><span><span data-some-attribute><span id="target"></span></span></span></span>',
                '</div>'
            );

            var spy = sinon.spy();
            var event = makeEvent('click', document.getElementById('target'));

            components.register(name, {
                events: {
                    '.one.two [data-some-attribute]:click': 'onClick'
                },
                onClick: spy
            });

            components.parse();
            components.handleEvent(event);

            expect(spy.callCount).to.equal(1);
        });

    });

    describe('components.fromElement(element)', function () {

        var name, el;

        beforeEach(function () {
            name = createComponentName();
            el = document.createElement('div');
            el.setAttribute('data-component-name', name);
        });

        it('should create the correct component if it doesnt exist', function () {
            components.register(name);
            expect(components.fromElement(el)).to.be.a(Component);
        });

        it('should throw an exception if no component has been registered with the given name', function () {
            expect(components.fromElement).withArgs(el).to.throwException();
        });

        it('should always return the same component instance', function () {
            components.register(name);
            var c = components.fromElement(el);
            expect(components.fromElement(el)).to.equal(c);
            expect(components.fromElement(el)).to.equal(c);
            expect(components.fromElement(el)).to.equal(c);
        });

        it('should return null if the element has no component name attribute', function () {
            expect(components.fromElement(document.createElement('div'))).to.equal(null);
        });

        it('should return null if the passed argument is not an element', function () {
            expect(components.fromElement(null)).to.equal(null);
            expect(components.fromElement({})).to.equal(null);
            expect(components.fromElement(function () {
            })).to.equal(null);
            expect(components.fromElement('<div></div>')).to.equal(null);
        });

    });

});