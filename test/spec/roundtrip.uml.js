import expect from '../expect.js';

import fs from 'node:fs';

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


describe('Roundtrip - UML', function() {

  var createModel = createModelBuilder('test/fixtures/model/');

  var createWriter = function(model, options) {
    return new Writer(assign({ preamble: false }, options || {}));
  };


  it('should roundtrip UML', async function() {

    // given
    const xmiModdle = createModel([ 'xmi' ]);

    const reader = new Reader(xmiModdle);
    const writer = createWriter(xmiModdle, {
      format: true,
      preamble: true
    });

    const rootHandler = reader.handler('xmi:XMI');

    const input = fs.readFileSync('test/fixtures/xml/UML.xmi', 'utf-8')
      .replace(/"\/>/g, '" />')
      .replace(/&#xD;/g, '');

    // when
    const {
      rootElement
    } = await reader.fromXML(input, rootHandler);

    const output = writer.toXML(rootElement);

    // then
    expect(output).to.eql(input);
  });

});