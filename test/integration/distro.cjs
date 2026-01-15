const {
  expect
} = require('chai');


describe('integration', function() {

  describe('distro', function() {

    it('should expose CJS bundle', function() {

      const {
        Reader,
        Writer
      } = require('moddle-xml');

      expect(Reader).to.exist;
      expect(Writer).to.exist;
    });


    it('should expose ESM bundle', async function() {

      const {
        Reader,
        Writer
      } = await import('moddle-xml');

      expect(Reader).to.exist;
      expect(Writer).to.exist;
    });

  });

});
