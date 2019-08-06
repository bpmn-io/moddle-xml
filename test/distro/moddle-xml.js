const {
  expect
} = require('chai');


describe('moddle', function() {

  it('should expose CJS bundle', function() {

    const {
      Reader,
      Writer
    } = require('../..');

    expect(Reader).to.exist;
    expect(Writer).to.exist;
  });


  it('should expose UMD bundle', function() {
    const {
      Reader,
      Writer
    } = require('../../dist/moddle-xml.umd.js');

    expect(Reader).to.exist;
    expect(Writer).to.exist;
  });

});
