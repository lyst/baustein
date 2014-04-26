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
            expect(new Component(el)).to.have.property('el', el);
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

        it('should contain an events object only if one was defined', function () {
            var c = new Component();
            expect(c.events).to.equal(undefined);

            var events = {};
            var C = components.register(createComponentName(), {
                events: events
            });
            c = new C();
            expect(c).to.have.property('events', events);
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

        });

        describe('#destroy()', function () {

            it('should remove the element, destroy the component instance, and return null', function () {
                var name = createComponentName();
                addTestHTML('<div id="el" data-component-name="' + name + '"></div>');
                components.register(name);
                components.parse();
                var c = components.fromElement(document.getElementById('el'));
                expect(c.destroy()).to.equal(null);
                expect(document.getElementById('el')).to.equal(null);
                expect(c.el).to.equal(null);
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

         describe('#appendTo(component)', function () {

            it('should append itself to the component', function () {
                var c = new Component();
                var root = new Component();
                c.appendTo(root);
                expect(root.el.children[0]).to.equal(c.el);
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
            expect(components.fromElement(function () {})).to.equal(null);
            expect(components.fromElement('<div></div>')).to.equal(null);
        });

    });

});