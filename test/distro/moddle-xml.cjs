const {
  expect
} = require('chai');

const pkg = require('../../package.json');


describe('moddle-xml', function() {

  it('should expose CJS bundle', function() {

    const {
      Reader,
      Writer
    } = require('../../' + pkg['main']);

    expect(Reader).to.exist;
    expect(Writer).to.exist;
  });


  it('should expose UMD bundle', function() {
    const {
      Reader,
      Writer
    } = require('../../' + pkg['umd:main']);

    expect(Reader).to.exist;
    expect(Writer).to.exist;
  });

});
