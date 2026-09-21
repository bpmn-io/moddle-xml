import expect from '../expect.js';

import {
  Reader,
  Writer
} from 'moddle-xml';

import {
  createModelBuilder
} from '../helper.js';


// reading and writing must stay (roughly) linear in document size so large,
// deeply nested documents exhaust neither the stack nor the CPU, cf.
// https://github.com/bpmn-io/moddle-xml/security/advisories/GHSA-x3vc-q6mj-47vp
describe('performance', function() {

  var createModel = createModelBuilder('test/fixtures/model/');

  var model = createModel([ 'properties' ]);

  var extensionModel = createModel([ 'extensions' ]);

  var DEPTH = 50000;

  var NS_DEPTH = 1500;

  // linear read / write stays far below this, a quadratic or stack-recursive
  // regression blows past it (or crashes outright)
  this.timeout(5000);

  function createDeepXML(depth) {
    return (
      '<props:complexNesting xmlns:props="http://properties" id="root">' +
        '<props:complexNesting>'.repeat(depth - 1) +
          '<props:complexNesting />' +
        '</props:complexNesting>'.repeat(depth - 1) +
      '</props:complexNesting>'
    );
  }

  function createDeepModdle(depth) {
    var root = model.create('props:ComplexNesting', { id: 'root' });

    var parent = root;

    for (var i = 0; i < depth; i++) {
      var child = model.create('props:ComplexNesting');

      parent.get('nested').push(child);
      parent = child;
    }

    return root;
  }

  function nestingDepth(element) {
    var depth = 0;

    var nested = element.get('nested');

    while (nested.length) {
      depth++;
      nested = nested[0].get('nested');
    }

    return depth;
  }

  function write(element) {
    return new Writer({ preamble: false }).toXML(element);
  }

  function read(xml) {
    var reader = new Reader(model);
    var rootHandler = reader.handler('props:ComplexNesting');

    return reader.fromXML(xml, rootHandler);
  }


  it('should write deeply nested document', function() {

    // given
    var root = createDeepModdle(DEPTH);

    // when
    var xml = write(root);

    // then
    var elementCount = (xml.match(/<props:complexNesting/g) || []).length;

    expect(elementCount).to.eql(DEPTH + 1);
  });


  it('should read deeply nested document', async function() {

    // when
    var { rootElement } = await read(createDeepXML(DEPTH));

    // then
    expect(rootElement.id).to.eql('root');
    expect(nestingDepth(rootElement)).to.eql(DEPTH);
  });


  it('should round-trip deeply nested document', async function() {

    // when
    var { rootElement } = await read(createDeepXML(DEPTH));

    // then
    expect(write(rootElement)).to.eql(createDeepXML(DEPTH));
  });


  it('should round-trip deeply nested namespaces', async function() {

    // given
    var xml = createDeepNamespaceXML(NS_DEPTH);

    // when
    var reader = new Reader(extensionModel);
    var rootHandler = reader.handler('e:Root');

    var { rootElement } = await reader.fromXML(xml, rootHandler);

    // then
    expect(write(rootElement)).to.eql(xml);
  });

  function createDeepNamespaceXML(depth) {
    var open = '<e:root xmlns:e="http://extensions">',
        close = '</e:root>';

    for (var i = 0; i < depth - 1; i++) {
      open += '<p' + i + ':e xmlns:p' + i + '="urn:' + i + '">';
      close = '</p' + i + ':e>' + close;
    }

    open += '<p' + (depth - 1) + ':e xmlns:p' + (depth - 1) + '="urn:' + (depth - 1) + '" />';

    return open + close;
  }

});
