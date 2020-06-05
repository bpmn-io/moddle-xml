import expect from '../expect';

import {
  assign
} from 'min-dash';

import {
  Reader,
  Writer
} from '../../lib';

import {
  createModelBuilder
} from '../helper';


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

});
