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


  describe('custom namespace mapping', function() {

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

});
