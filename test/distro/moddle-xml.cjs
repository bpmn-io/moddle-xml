const {
  expect
} = require('chai');

const pkg = require('../../package.json');

const pkgExports = pkg.exports['.'];


describe('moddle-xml', function() {

  it('should expose CJS bundle', function() {

    const {
      Reader,
      Writer
    } = require('../../' + pkgExports['require']);

    expect(Reader).to.exist;
    expect(Writer).to.exist;
  });

});
