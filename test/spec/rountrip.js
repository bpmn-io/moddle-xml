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


  it('should strip unused global', function(done) {

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
    reader.fromXML(input, rootHandler, function(err, rootElement) {

      if (err) {
        return done(err);
      }

      var output = writer.toXML(rootElement);

      // then
      expect(output).to.eql(
        '<root xmlns="http://extended" id="Root">' +
          '<base xmlns="http://properties" />' +
        '</root>'
      );

      done();
    });

  });


  it('should reuse global namespace', function(done) {

    // given
    var extendedModel = createModel([ 'properties', 'properties-extended' ]);

    var reader = new Reader(extendedModel);
    var writer = createWriter(extendedModel);

    var rootHandler = reader.handler('props:ComplexNesting');

    var input =
      '<root:complexNesting xmlns:root="http://properties" xmlns:ext="http://extended">' +
        '<complexNesting xmlns="http://properties">' +
          '<ext:extendedComplex numCount="1" />' +
        '</complexNesting>' +
      '</root:complexNesting>';

    // when
    reader.fromXML(input, rootHandler, function(err, rootElement) {

      if (err) {
        return done(err);
      }

      var output = writer.toXML(rootElement);

      // then
      expect(output).to.eql(
        '<root:complexNesting xmlns:root="http://properties" xmlns:ext="http://extended">' +
          '<complexNesting xmlns="http://properties">' +
            '<ext:extendedComplex numCount="1" />' +
          '</complexNesting>' +
        '</root:complexNesting>'
      );

      done();
    });

  });

});
