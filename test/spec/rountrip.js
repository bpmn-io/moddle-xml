import expect from '../expect.js';

import {
  assign
} from 'min-dash';

import {
  Reader,
  Writer
} from '../../lib/index.js';

import {
  createModelBuilder
} from '../helper.js';


describe('Roundtrip', function() {

  var createModel = createModelBuilder('test/fixtures/model/');

  var createWriter = function(model, options) {
    return new Writer(assign({ preamble: false }, options || {}));
  };


  it('should strip unused global', async function() {

    // given
    var extendedModel = createModel([ 'properties', 'properties-extended' ]);

    var reader = new Reader(extendedModel);
    var writer = createWriter(extendedModel);

    var rootHandler = reader.handler('ext:Root');

    var input =
      '<root xmlns="http://extended" xmlns:props="http://properties" id="Root">' +
        '<props:Base xmlns="http://properties" />' +
      '</root>';

    // when
    var {
      rootElement
    } = await reader.fromXML(input, rootHandler);

    var output = writer.toXML(rootElement);

    // then
    expect(output).to.eql(
      '<root xmlns="http://extended" id="Root">' +
        '<base xmlns="http://properties" />' +
      '</root>'
    );
  });


  it('should strip unused <xsi:type>', async function() {

    // given
    var extendedModel = createModel([ 'datatype' ]);

    var reader = new Reader(extendedModel);
    var writer = createWriter(extendedModel);

    var rootHandler = reader.handler('dt:Root');

    var input =
      '<dt:root xmlns:dt="http://datatypes">' +
        '<dt:bounds xsi:type="dt:Rect" y="100" />' +
      '</dt:root>';

    // when
    var {
      rootElement
    } = await reader.fromXML(input, rootHandler);

    var output = writer.toXML(rootElement);

    // then
    expect(output).to.eql(
      '<dt:root xmlns:dt="http://datatypes">' +
        '<dt:bounds y="100" />' +
      '</dt:root>'
    );
  });


  it('should reuse global namespace', async function() {

    // given
    var extendedModel = createModel([ 'properties', 'properties-extended' ]);

    var reader = new Reader(extendedModel);
    var writer = createWriter(extendedModel);

    var rootHandler = reader.handler('props:ComplexNesting');

    var input =
      '<root:complexNesting xml:lang="en" xmlns:root="http://properties" xmlns:ext="http://extended">' +
        '<complexNesting xmlns="http://properties">' +
          '<ext:extendedComplex numCount="1" />' +
        '</complexNesting>' +
      '</root:complexNesting>';

    // when
    var {
      rootElement
    } = await reader.fromXML(input, rootHandler);

    var output = writer.toXML(rootElement);

    expect(output).to.eql(
      '<root:complexNesting xmlns:root="http://properties" xmlns:ext="http://extended" xml:lang="en">' +
        '<complexNesting xmlns="http://properties">' +
          '<ext:extendedComplex numCount="1" />' +
        '</complexNesting>' +
      '</root:complexNesting>'
    );
  });


  it('should keep default <xml> namespace', async function() {

    // given
    var extendedModel = createModel([ 'properties' ]);

    var reader = new Reader(extendedModel);
    var writer = createWriter(extendedModel);

    var rootHandler = reader.handler('props:ComplexNesting');

    var input = '<root:complexNesting xmlns:root="http://properties" xml:lang="en" />';

    // when
    var {
      rootElement
    } = await reader.fromXML(input, rootHandler);

    var output = writer.toXML(rootElement);

    // then
    expect(output).to.eql(
      '<root:complexNesting xmlns:root="http://properties" xml:lang="en" />'
    );
  });


  it('should de-duplicate attribute names', async function() {

    // given
    var extendedModel = createModel([ 'extension/base' ]);
    var reader = new Reader(extendedModel);
    var writer = createWriter(extendedModel);

    var rootHandler = reader.handler('b:Root');

    var input = '<base:Root xmlns:base="http://base" xmlns:test="http://test" ownAttr="A" base:ownAttr="B">' +
      '<test:test test:duplicate="1" duplicate="2" />' +
    '</base:Root>';

    // when
    var {
      rootElement
    } = await reader.fromXML(input, rootHandler);

    var output = writer.toXML(rootElement);

    // then
    expect(output).to.eql(
      '<base:Root xmlns:base="http://base" xmlns:test="http://test" ownAttr="B">' +
      '<test:test duplicate="2" />' +
    '</base:Root>');
  });


  describe('generic', function() {

    it('should keep local ns attribute', async function() {

      // given
      var extendedModel = createModel([ 'extensions' ]);

      var reader = new Reader(extendedModel);
      var writer = createWriter(extendedModel);

      var rootHandler = reader.handler('e:Root');

      var input =
        '<e:root xmlns:e="http://extensions" xmlns:woop="https://woop">' +
          '<Bar xmlns="http://foobar">' +
            '<Foo woop:boop="Some" />' +
          '</Bar>' +
        '</e:root>';

      // when
      var {
        rootElement
      } = await reader.fromXML(input, rootHandler);

      var output = writer.toXML(rootElement);

      // then
      expect(output).to.eql(input);
    });


    it('should keep local <xsi:type>', async function() {

      // given
      var extendedModel = createModel([ 'extensions' ]);

      var reader = new Reader(extendedModel);
      var writer = createWriter(extendedModel);

      var rootHandler = reader.handler('e:Root');

      var input =
        '<e:root xmlns:e="http://extensions" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
          '<Bar xmlns="http://foobar">' +
            '<Foo xsi:type="Some" y="100" />' +
          '</Bar>' +
        '</e:root>';

      // when
      var {
        rootElement
      } = await reader.fromXML(input, rootHandler);

      var output = writer.toXML(rootElement);

      // then
      expect(output).to.eql(input);
    });


    it('should keep local <xsi:type> (renamed)', async function() {

      // given
      var extendedModel = createModel([ 'extensions' ]);

      var reader = new Reader(extendedModel);
      var writer = createWriter(extendedModel);

      var rootHandler = reader.handler('e:Root');

      var input =
        '<e:root xmlns:e="http://extensions" xmlns:foo="http://www.w3.org/2001/XMLSchema-instance">' +
          '<Bar xmlns="http://foobar">' +
            '<Foo foo:type="Some" y="100" />' +
          '</Bar>' +
        '</e:root>';

      // when
      var {
        rootElement
      } = await reader.fromXML(input, rootHandler);

      var output = writer.toXML(rootElement);

      // then
      expect(output).to.eql(input);
    });


    it('should keep generic <xsi:type>', async function() {

      // given
      var extendedModel = createModel([ 'extensions' ]);

      var reader = new Reader(extendedModel);
      var writer = createWriter(extendedModel);

      var rootHandler = reader.handler('e:Root');

      var input =
        '<e:root xmlns:e="http://extensions" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
          '<Bar xmlns="http://foobar">' +
            '<Foo xsi:type="Some" y="100" />' +
          '</Bar>' +
        '</e:root>';

      // when
      var {
        rootElement
      } = await reader.fromXML(input, rootHandler);

      var output = writer.toXML(rootElement);

      // then
      expect(output).to.eql(input);
    });


    it('should keep generic <xmi:type>', async function() {

      // given
      var extendedModel = createModel([ 'extensions' ]);

      var reader = new Reader(extendedModel);
      var writer = createWriter(extendedModel);

      var rootHandler = reader.handler('e:Root');

      var input =
        '<e:root xmlns:e="http://extensions" xmlns:xmi="http://www.omg.org/spec/XMI/20131001">' +
          '<Bar xmlns="http://foobar" xmi:type="FOOBAR" />' +
        '</e:root>';

      // when
      var {
        rootElement
      } = await reader.fromXML(input, rootHandler);

      var output = writer.toXML(rootElement);

      // then
      expect(output).to.eql(input);
    });


    it('should keep generic <xmi:type> (local)', async function() {

      // given
      var extendedModel = createModel([ 'extensions' ]);

      var reader = new Reader(extendedModel);
      var writer = createWriter(extendedModel);

      var rootHandler = reader.handler('e:Root');

      var input =
        '<e:root xmlns:e="http://extensions">' +
          '<Bar xmlns="http://foobar" xmlns:xmi="http://www.omg.org/spec/XMI/20131001" xmi:type="FOOBAR" />' +
        '</e:root>';

      // when
      var {
        rootElement
      } = await reader.fromXML(input, rootHandler);

      var output = writer.toXML(rootElement);

      // then
      expect(output).to.eql(input);
    });


    it('should keep generic <xmi:type> (nested)', async function() {

      // given
      var extendedModel = createModel([ 'extensions' ]);

      var reader = new Reader(extendedModel);
      var writer = createWriter(extendedModel);

      var rootHandler = reader.handler('e:Root');

      var input =
        '<e:root xmlns:e="http://extensions" xmlns:xmi="http://www.omg.org/spec/XMI/20131001">' +
          '<Bar xmlns="http://foobar">' +
            '<Foo xmi:type="Some" y="100" />' +
          '</Bar>' +
        '</e:root>';

      // when
      var {
        rootElement
      } = await reader.fromXML(input, rootHandler);

      var output = writer.toXML(rootElement);

      // then
      expect(output).to.eql(input);
    });

  });


  describe('custom namespace mapping', function() {

    it('should preserve remapped xmi:type', async function() {

      // given
      var datatypesModel = createModel([
        'datatype',
        'datatype-external'
      ], {
        nsMap: {
          'http://www.omg.org/spec/XMI/20131001': 'xmi'
        }
      });

      var reader = new Reader(datatypesModel);
      var writer = createWriter(datatypesModel);

      var rootHandler = reader.handler('dt:Root');

      var input =
        '<dt:root xmlns:dt="http://datatypes">' +
          '<dt:xmiBounds xmlns:do="http://datatypes2" ' +
                     'xmlns:foo="http://www.omg.org/spec/XMI/20131001" ' +
                     'xmlns:f="http://foo" foo:type="do:Rect" ' +
                     'x="100" f:bar="BAR" />' +
        '</dt:root>';

      // when
      var {
        rootElement
      } = await reader.fromXML(input, rootHandler);

      var output = writer.toXML(rootElement);

      // then
      expect(output).to.eql(input);
    });


    it('should keep remapped generic prefix', async function() {

      // given
      var extensionModel = createModel([ 'extensions' ], {
        nsMap: {
          'http://other': 'o',
          'http://foo': 'f'
        }
      });

      // given
      var reader = new Reader(extensionModel);
      var writer = createWriter(extensionModel);

      var rootHandler = reader.handler('e:Root');

      var input =
        '<e:root xmlns:e="http://extensions">' +
          '<bar:bar xmlns:bar="http://bar">' +
            '<other:child xmlns:other="http://other" b="B" />' +
          '</bar:bar>' +
          '<foo xmlns="http://foo">' +
            '<child a="A" />' +
          '</foo>' +
        '</e:root>';

      // when
      var {
        rootElement
      } = await reader.fromXML(input, rootHandler);

      var output = writer.toXML(rootElement);

      // then
      expect(output).to.eql(input);
    });

  });


  describe('package owned xml -> serialize property', function() {

    it('should roundtrip', async function() {

      // given
      var xmiModel = createModel([
        'uml/xmi',
        'uml/uml'
      ]);

      var reader = new Reader(xmiModel);
      var rootHandler = reader.handler('xmi:XMI');

      var input =
        '<xmi:XMI xmlns:xmi="http://www.omg.org/spec/XMI/20131001" xmlns:uml="http://www.omg.org/spec/UML/20131001">' +
          '<uml:Package xmi:type="uml:Package" />' +
          '<uml:Package xmi:type="uml:SpecialPackage" />' +
        '</xmi:XMI>';

      var {
        rootElement
      } = await reader.fromXML(input, rootHandler);

      // when
      var writer = createWriter(xmiModel);

      var output = writer.toXML(rootElement);

      // then
      expect(output).to.eql(
        '<xmi:XMI xmlns:xmi="http://www.omg.org/spec/XMI/20131001" xmlns:uml="http://www.omg.org/spec/UML/20131001">' +
          '<xmi:extension xmi:type="uml:Package" />' +
          '<xmi:extension xmi:type="uml:SpecialPackage" />' +
        '</xmi:XMI>'
      );
    });

  });

});
