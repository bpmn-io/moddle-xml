import expect from '../expect';

import {
  Reader
} from '../../lib';

import {
  readFile,
  createModelBuilder
} from '../helper';


describe('Reader', function() {

  var createModel = createModelBuilder('test/fixtures/model/');

  describe('api', function() {

    var model = createModel([ 'properties' ]);

    it('should provide result with context', async function() {

      // given
      var reader = new Reader(model);
      var rootHandler = reader.handler('props:ComplexAttrs');

      var xml = '<props:complexAttrs xmlns:props="http://properties"></props:complexAttrs>';

      // when
      var result = await reader.fromXML(xml, rootHandler);

      const {
        element, parseContext
      } = result;

      // then
      expect(element).to.exist;
      expect(parseContext).to.exist;
    });


    it('should provide error with context', function(done) {

      // given
      var reader = new Reader(model);
      var rootHandler = reader.handler('props:ComplexAttrs');

      // when
      reader.fromXML('this-is-garbage', rootHandler).catch(function(err) {

        const { message, parseContext } = err;

        // then
        expect(message).to.exist;
        expect(parseContext).to.exist;

        done();
      });
    });

  });


  describe('should import', function() {

    var model = createModel([ 'properties' ]);
    var extendedModel = createModel([ 'properties', 'properties-extended' ]);

    describe('data types', function() {

      it('simple', async function() {

        // given
        var reader = new Reader(model);
        var rootHandler = reader.handler('props:ComplexAttrs');

        var xml = '<props:complexAttrs xmlns:props="http://properties">' +
                    '<props:attrs integerValue="10" />' +
                  '</props:complexAttrs>';

        // when
        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.element).to.jsonEqual({
          $type: 'props:ComplexAttrs',
          attrs: {
            $type: 'props:Attributes',
            integerValue: 10
          }
        });
      });


      it('simple / xsi:type', async function() {

        // given
        var reader = new Reader(model);
        var rootHandler = reader.handler('props:ComplexAttrs');

        var xml = '<props:complexAttrs xmlns:props="http://properties" ' +
                                      'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
                    '<props:attrs xsi:type="props:SubAttributes" integerValue="10" />' +
                  '</props:complexAttrs>';

        // when
        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.element).to.jsonEqual({
          $type: 'props:ComplexAttrs',
          attrs: {
            $type: 'props:SubAttributes',
            integerValue: 10
          }
        });
      });


      it('simple / xsi:type / default ns', async function() {

        // given
        var reader = new Reader(model);
        var rootHandler = reader.handler('props:ComplexAttrs');

        var xml = '<complexAttrs xmlns="http://properties" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
                    '<attrs xsi:type="SubAttributes" integerValue="10" />' +
                  '</complexAttrs>';

        // when
        var result = await reader.fromXML(xml, rootHandler);

        expect(result.element).to.jsonEqual({
          $type: 'props:ComplexAttrs',
          attrs: {
            $type: 'props:SubAttributes',
            integerValue: 10
          }
        });
      });


      it('simple / xsi:type / different ns prefix', async function() {

        // given
        var reader = new Reader(model);
        var rootHandler = reader.handler('props:ComplexAttrs');

        var xml = '<a:complexAttrs xmlns:a="http://properties" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
                    '<a:attrs xsi:type="a:SubAttributes" integerValue="10" />' +
                  '</a:complexAttrs>';

        // when
        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.element).to.jsonEqual({
          $type: 'props:ComplexAttrs',
          attrs: {
            $type: 'props:SubAttributes',
            integerValue: 10
          }
        });
      });


      it('collection / no xsi:type', async function() {

        // given
        var reader = new Reader(model);
        var rootHandler = reader.handler('props:ComplexAttrsCol');

        var xml = '<props:complexAttrsCol xmlns:props="http://properties">' +
                    '<props:attrs integerValue="10" />' +
                    '<props:attrs booleanValue="true" />' +
                  '</props:complexAttrsCol>';

        // when
        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.element).to.jsonEqual({
          $type: 'props:ComplexAttrsCol',
          attrs: [
            { $type: 'props:Attributes', integerValue: 10 },
            { $type: 'props:Attributes', booleanValue: true }
          ]
        });
      });


      it('collection / xsi:type / from other namespace)', async function() {

        var datatypeModel = createModel(['datatype', 'datatype-external']);

        // given
        var reader = new Reader(datatypeModel);
        var rootHandler = reader.handler('dt:Root');

        var xml =
          '<dt:root xmlns:dt="http://datatypes" xmlns:do="http://datatypes2" ' +
                   'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
            '<dt:otherBounds xsi:type="dt:Rect" y="100" />' +
            '<dt:otherBounds xsi:type="do:Rect" x="200" />' +
          '</dt:root>';

        // when
        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.element).to.jsonEqual({
          $type: 'dt:Root',
          otherBounds: [
            { $type: 'dt:Rect', y: 100 },
            { $type: 'do:Rect', x: 200 }
          ]
        });
      });


      it('collection / xsi:type / from other namespace / default ns)', async function() {

        var datatypeModel = createModel(['datatype', 'datatype-external']);

        // given
        var reader = new Reader(datatypeModel);
        var rootHandler = reader.handler('dt:Root');

        var xml =
          '<root xmlns="http://datatypes" xmlns:do="http://datatypes2" ' +
                'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
            '<otherBounds xsi:type="Rect" y="100" />' +
            '<otherBounds xsi:type="do:Rect" x="200" />' +
          '</root>';

        // when
        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.element).to.jsonEqual({
          $type: 'dt:Root',
          otherBounds: [
            { $type: 'dt:Rect', y: 100 },
            { $type: 'do:Rect', x: 200 }
          ]
        });
      });


      it('collection / xsi:type / type alias', async function() {

        var datatypeModel = createModel(['datatype', 'datatype-aliased']);

        // given
        var reader = new Reader(datatypeModel);
        var rootHandler = reader.handler('dt:Root');

        var xml =
          '<root xmlns="http://datatypes" xmlns:da="http://datatypes-aliased" ' +
                'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
            '<otherBounds xsi:type="dt:Rect" y="100" />' +
            '<otherBounds xsi:type="da:tRect" z="200" />' +
          '</root>';

        // when
        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.element).to.jsonEqual({
          $type: 'dt:Root',
          otherBounds: [
            { $type: 'dt:Rect', y: 100 },
            { $type: 'da:Rect', z: 200 }
          ]
        });
      });


      it('collection / xsi:type / unknown type', function(done) {

        var datatypeModel = createModel([ 'datatype' ]);

        // given
        var reader = new Reader(datatypeModel);
        var rootHandler = reader.handler('dt:Root');

        var xml =
          '<root xmlns="http://datatypes" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
            '<otherBounds xsi:type="Unknown" y="100" />' +
          '</root>';

        // when
        reader.fromXML(xml, rootHandler).catch(function(err) {

          // then
          expect(err).to.exist;

          expect(err.message).to.contain('unparsable content <otherBounds> detected');

          done();
        });
      });


      it('generic, non-ns elements', async function() {

        var extensionModel = createModel([ 'extension/base' ]);

        // given
        var reader = new Reader(extensionModel);
        var rootHandler = reader.handler('b:Root');

        var xml =
          '<b:Root xmlns:b="http://base">' +
            '<Any foo="BAR" />' +
          '</b:Root>';

        // when
        var result = await reader.fromXML(xml, rootHandler);

        expect(result.element).to.jsonEqual({
          $type: 'b:Root',
          generic: {
            $type: 'Any',
            foo: 'BAR'
          }
        });
      });

    });


    describe('attributes', function() {

      it('with special characters', async function() {

        // given
        var reader = new Reader(model);
        var rootHandler = reader.handler('props:SimpleBodyProperties');

        var xml = '<props:simpleBodyProperties xmlns:props="http://properties" str="&#60;&#62;&#10;&#38;" />';

        // when
        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.element).to.jsonEqual({
          $type: 'props:SimpleBodyProperties',
          str: '<>\n&'
        });
      });


      it('inherited', async function() {

        // given
        var reader = new Reader(extendedModel);
        var rootHandler = reader.handler('ext:Root');

        // when
        var result = await reader.fromXML('<ext:root xmlns:ext="http://extended" id="FOO" />', rootHandler);

        // then
        expect(result.element).to.jsonEqual({ $type: 'ext:Root', id: 'FOO' });
      });

    });


    describe('simple nested properties', function() {

      it('parse boolean property', async function() {

        // given
        var reader = new Reader(model);
        var rootHandler = reader.handler('props:SimpleBodyProperties');

        var xml = '<props:simpleBodyProperties xmlns:props="http://properties">' +
                    '<props:intValue>5</props:intValue>' +
                  '</props:simpleBodyProperties>';

        // when
        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.element).to.jsonEqual({
          $type: 'props:SimpleBodyProperties',
          intValue: 5
        });
      });


      it('parse boolean property', async function() {

        // given
        var reader = new Reader(model);
        var rootHandler = reader.handler('props:SimpleBodyProperties');

        var xml = '<props:simpleBodyProperties xmlns:props="http://properties">' +
                    '<props:boolValue>false</props:boolValue>' +
                  '</props:simpleBodyProperties>';

        // when
        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.element).to.jsonEqual({
          $type: 'props:SimpleBodyProperties',
          boolValue: false
        });
      });


      it('parse string isMany prooperty', async function() {

        // given
        var reader = new Reader(model);
        var rootHandler = reader.handler('props:SimpleBodyProperties');

        var xml = '<props:simpleBodyProperties xmlns:props="http://properties">' +
                    '<props:str>A</props:str>' +
                    '<props:str>B</props:str>' +
                    '<props:str>C</props:str>' +
                  '</props:simpleBodyProperties>';

        // when
        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.element).to.jsonEqual({
          $type: 'props:SimpleBodyProperties',
          str: [ 'A', 'B', 'C' ]
        });
      });


      it('should not discard value with an empty tag', async function() {

        // given
        var reader = new Reader(createModel([ 'replace' ]));
        var rootHandler = reader.handler('r:Extension');

        var xml = '<r:Extension xmlns:r="http://replace">' +
                    '<r:value></r:value>' +
                  '</r:Extension>';

        // when
        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.element).to.jsonEqual({
          $type: 'r:Extension',
          value: ''
        });
      });
    });


    describe('body text', function() {

      it('parse body text property', async function() {

        // given
        var reader = new Reader(model);
        var rootHandler = reader.handler('props:SimpleBody');

        var xml = '<props:simpleBody xmlns:props="http://properties">textContent</props:simpleBody>';

        // when
        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.element).to.jsonEqual({
          $type: 'props:SimpleBody',
          body: 'textContent'
        });
      });


      it('parse body text property / encoded', async function() {

        // given
        var reader = new Reader(model);
        var rootHandler = reader.handler('props:SimpleBody');

        var xml = (
          '<props:simpleBody xmlns:props="http://properties">' +
            '&lt; 10, &gt; 20, &amp;nbsp;' +
          '</props:simpleBody>'
        );

        // when
        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.element).to.jsonEqual({
          $type: 'props:SimpleBody',
          body: '< 10, > 20, &nbsp;'
        });
      });


      it('parse body text property / trimmed whitespace', async function() {

        // given
        var reader = new Reader(model);
        var rootHandler = reader.handler('props:SimpleBody');

        var xml = '<props:simpleBody xmlns:props="http://properties">    </props:simpleBody>';

        // when
        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.element).to.jsonEqual({
          $type: 'props:SimpleBody'
        });
      });


      it('parse body CDATA property / trimmed whitespace', async function() {

        // given
        var reader = new Reader(model);
        var rootHandler = reader.handler('props:SimpleBody');

        var xml = '<props:simpleBody xmlns:props="http://properties">' +
                  '   <![CDATA[<h2>HTML markup</h2>]]>' +
                  '</props:simpleBody>';

        // when
        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.element).to.jsonEqual({
          $type: 'props:SimpleBody',
          body: '<h2>HTML markup</h2>'
        });
      });

    });


    describe('alias', function() {

      it('lowerCase', async function() {

        // given
        var reader = new Reader(model);
        var rootHandler = reader.handler('props:Root');

        // when
        var result = await reader.fromXML('<props:root xmlns:props="http://properties" />', rootHandler);

        // then
        expect(result.element).to.jsonEqual({ $type: 'props:Root' });

      });


      it('none', async function() {

        // given
        var noAliasModel = createModel(['noalias']);

        var reader = new Reader(noAliasModel);
        var rootHandler = reader.handler('na:Root');

        // when
        var result = await reader.fromXML('<na:Root xmlns:na="http://noalias" />', rootHandler);

        // then
        expect(result.element).to.jsonEqual({ $type: 'na:Root' });
      });

    });


    describe('reference', function() {

      it('single', async function() {

        // given
        var reader = new Reader(extendedModel);
        var rootHandler = reader.handler('props:Root');

        var xml =
          '<props:root xmlns:props="http://properties">' +
            '<props:containedCollection id="C_5">' +
              '<props:complex id="C_1" />' +
              '<props:complex id="C_2" />' +
            '</props:containedCollection>' +
            '<props:referencingSingle id="C_4" referencedComplex="C_1" />' +
          '</props:root>';

        // when
        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.element).to.jsonEqual({
          $type: 'props:Root',
          any: [
            {
              $type: 'props:ContainedCollection',
              id: 'C_5',
              children: [
                { $type: 'props:Complex', id: 'C_1' },
                { $type: 'props:Complex', id: 'C_2' }
              ]
            },
            { $type: 'props:ReferencingSingle', id: 'C_4' }
          ]
        });

        var referenced = result.element.any[0].children[0];
        var referencingSingle = result.element.any[1];

        expect(referencingSingle.referencedComplex).to.equal(referenced);
      });


      it('collection', async function() {

        // given
        var reader = new Reader(extendedModel);
        var rootHandler = reader.handler('props:Root');

        var xml =
          '<props:root xmlns:props="http://properties">' +
            '<props:containedCollection id="C_5">' +
              '<props:complex id="C_1" />' +
              '<props:complex id="C_2" />' +
            '</props:containedCollection>' +
            '<props:referencingCollection id="C_4">' +
              '<props:references>C_2</props:references>' +
              '<props:references>C_5</props:references>' +
            '</props:referencingCollection>' +
          '</props:root>';

        // when
        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.element).to.jsonEqual({
          $type: 'props:Root',
          any: [
            {
              $type: 'props:ContainedCollection',
              id: 'C_5',
              children: [
                { $type: 'props:Complex', id: 'C_1' },
                { $type: 'props:Complex', id: 'C_2' }
              ]
            },
            { $type: 'props:ReferencingCollection', id: 'C_4' }
          ]
        });

        var containedCollection = result.element.any[0];
        var complex_c2 = containedCollection.children[1];

        var referencingCollection = result.element.any[1];

        expect(referencingCollection.references).to.jsonEqual([ complex_c2, containedCollection ]);
      });


      it('attribute collection', async function() {

        // given
        var reader = new Reader(extendedModel);
        var rootHandler = reader.handler('props:Root');

        var xml =
          '<props:root xmlns:props="http://properties">' +
            '<props:containedCollection id="C_5">' +
              '<props:complex id="C_1" />' +
              '<props:complex id="C_2" />' +
              '<props:complex id="C_3" />' +
            '</props:containedCollection>' +
            '<props:attributeReferenceCollection id="C_4" refs="C_2 C_3 C_5" />' +
          '</props:root>';

        // when
        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.element).to.jsonEqual({
          $type: 'props:Root',
          any: [
            {
              $type: 'props:ContainedCollection',
              id: 'C_5',
              children: [
                { $type: 'props:Complex', id: 'C_1' },
                { $type: 'props:Complex', id: 'C_2' },
                { $type: 'props:Complex', id: 'C_3' }
              ]
            },
            { $type: 'props:AttributeReferenceCollection', id: 'C_4' }
          ]
        });

        var containedCollection = result.element.any[0];
        var complex_c2 = containedCollection.children[1];
        var complex_c3 = containedCollection.children[2];

        var attrReferenceCollection = result.element.any[1];

        expect(attrReferenceCollection.refs).to.jsonEqual([ complex_c2, complex_c3, containedCollection ]);
      });

    });

  });


  describe('should not import', function() {

    var model = createModel([ 'properties' ]);

    describe('wrong namespace', function() {

      it('same alias', function(done) {

        // given
        var reader = new Reader(model);
        var rootHandler = reader.handler('props:Root');

        var xml = '<props:root xmlns:props="http://invalid">' +
                    '<props:referencingSingle id="C_4" />' +
                  '</props:root>';

        // when
        reader.fromXML(xml, rootHandler).catch(function(err) {

          expect(err).to.exist;
          done();
        });
      });


      it('different alias', function(done) {

        // given
        var reader = new Reader(model);
        var rootHandler = reader.handler('props:Root');

        var xml = '<props1:root xmlns:props1="http://invalid">' +
                    '<props1:referencingSingle id="C_4" />' +
                  '</props1:root>';

        // when
        reader.fromXML(xml, rootHandler).catch(function(err) {

          expect(err).to.exist;
          done();
        });
      });

    });

  });


  describe('internal', function() {

    var extendedModel = createModel([ 'properties', 'properties-extended' ]);


    describe('should identify references', function() {

      it('on attribute', async function() {

        // given
        var reader = new Reader(extendedModel);
        var rootHandler = reader.handler('props:ReferencingSingle');

        var xml = '<props:referencingSingle xmlns:props="http://properties" id="C_4" referencedComplex="C_1" />';

        // when
        var result = await reader.fromXML(xml, rootHandler);

        // then
        var expectedReference = {
          element: {
            $type: 'props:ReferencingSingle',
            id: 'C_4'
          },
          property: 'props:referencedComplex',
          id: 'C_1'
        };

        var references = result.parseContext.references;

        expect(references).to.jsonEqual([ expectedReference ]);
      });


      it('embedded', async function() {

        // given
        var reader = new Reader(extendedModel);
        var rootHandler = reader.handler('props:ReferencingCollection');

        var xml = '<props:referencingCollection xmlns:props="http://properties" id="C_4">' +
                    '<props:references>C_2</props:references>' +
                    '<props:references>C_5</props:references>' +
                  '</props:referencingCollection>';

        var result = await reader.fromXML(xml, rootHandler);

        var expectedTarget = {
          $type: 'props:ReferencingCollection',
          id: 'C_4'
        };

        var expectedReference1 = {
          property: 'props:references',
          id: 'C_2',
          element: expectedTarget
        };

        var expectedReference2 = {
          property: 'props:references',
          id: 'C_5',
          element: expectedTarget
        };

        var references = result.parseContext.references;

        expect(references).to.jsonEqual([ expectedReference1, expectedReference2 ]);
      });

    });

  });


  describe('error handling', function() {

    function expectError(error, expectedMatch) {
      expect(error.message).to.match(expectedMatch);
    }

    function expectWarnings(warnings, expectedMatches) {
      expect(warnings).to.have.length(expectedMatches.length);

      warnings.forEach(function(w, idx) {
        expectError(w, expectedMatches[idx]);
      });
    }

    var model = createModel([ 'properties' ]);
    var extendedModel = createModel([ 'properties', 'properties-extended' ]);


    it('should handle non-xml text files', function(done) {

      var data = readFile('test/fixtures/error/no-xml.txt');

      var reader = new Reader(model);
      var rootHandler = reader.handler('props:ComplexAttrs');

      // when
      reader.fromXML(data, rootHandler).catch(function(err) {

        expect(err).to.exist;


        done();
      });

    });


    it('should handle unexpected text', async function() {

      var xml = '<props:complexAttrs xmlns:props="http://properties">a</props:complexAttrs>';

      var reader = new Reader(model);
      var rootHandler = reader.handler('props:ComplexAttrs');

      // when
      var result = await reader.fromXML(xml, rootHandler);

      const { element, parseContext } = result;

      expectWarnings(parseContext.warnings, [
        /unexpected body text <a>/
      ]);

      // then
      expect(element).to.jsonEqual({
        $type: 'props:ComplexAttrs'
      });
    });


    it('should handle unexpected CDATA', async function() {

      var xml = '<props:complexAttrs xmlns:props="http://properties"><![CDATA[a]]></props:complexAttrs>';

      var reader = new Reader(model);
      var rootHandler = reader.handler('props:ComplexAttrs');

      // when
      var result = await reader.fromXML(xml, rootHandler);

      const { element, parseContext } = result;

      expectWarnings(parseContext.warnings, [
        /unexpected body text <a>/
      ]);

      // then
      expect(element).to.jsonEqual({
        $type: 'props:ComplexAttrs'
      });
    });


    it('should handle incomplete attribute declaration', async function() {

      var xml = '<props:complexAttrs xmlns:props="http://properties" foo />';

      var reader = new Reader(model);
      var rootHandler = reader.handler('props:ComplexAttrs');

      // when
      var result = await reader.fromXML(xml, rootHandler);

      const { element, parseContext } = result;

      expectWarnings(parseContext.warnings, [
        /nested error: missing attribute value/
      ]);

      // then
      expect(element).to.jsonEqual({
        $type: 'props:ComplexAttrs'
      });
    });


    it('should handle attribute re-definition', async function() {

      var xml = '<props:complexAttrs xmlns:props="http://properties" id="A" id="B" />';

      var reader = new Reader(model);
      var rootHandler = reader.handler('props:ComplexAttrs');

      // when
      var result = await reader.fromXML(xml, rootHandler);

      const { element, parseContext } = result;

      expectWarnings(parseContext.warnings, [
        /nested error: attribute <id> already defined/
      ]);

      // then
      expect(element).to.jsonEqual({
        $type: 'props:ComplexAttrs',
        id: 'A'
      });
    });


    it('should handle unparsable attributes', async function() {

      var xml = '<props:complexAttrs id="A" foo=\'"" />';

      var reader = new Reader(model);
      var rootHandler = reader.handler('props:ComplexAttrs');

      // when
      var result = await reader.fromXML(xml, rootHandler);

      const { element, parseContext } = result;

      expectWarnings(parseContext.warnings, [
        /nested error: attribute value quote missmatch/,
        /nested error: illegal character after attribute end/
      ]);

      // then
      expect(element).to.jsonEqual({
        $type: 'props:ComplexAttrs',
        id: 'A'
      });
    });


    it('should handle illegal ID attribute', function(done) {

      var xml = '<props:complexAttrs id="a&lt;" />';

      var reader = new Reader(model);
      var rootHandler = reader.handler('props:ComplexAttrs');

      // when
      reader.fromXML(xml, rootHandler).catch(function(err) {

        expect(err).to.exist;

        // then
        expectError(err, /nested error: illegal ID <a<>/);

        done();
      });
    });


    it('should handle non-xml binary file', function(done) {

      var data = readFile('test/fixtures/error/binary.png');

      var reader = new Reader(model);
      var rootHandler = reader.handler('props:ComplexAttrs');

      // when
      reader.fromXML(data, rootHandler).catch(function(err) {

        expect(err).to.exist;


        done();
      });

    });


    describe('should handle invalid root element', function() {

      it('wrong type', function(done) {

        var xml = '<props:referencingCollection xmlns:props="http://properties" id="C_4">' +
                    '<props:references>C_2</props:references>' +
                    '<props:references>C_5</props:references>' +
                  '</props:referencingCollection>';

        var reader = new Reader(model);
        var rootHandler = reader.handler('props:ComplexAttrs');

        var expectedError =
          'unparsable content <props:referencingCollection> detected\n\t' +
              'line: 0\n\t' +
              'column: 0\n\t' +
              'nested error: unexpected element <props:referencingCollection>';

        // when
        reader.fromXML(xml, rootHandler).catch(function(err) {

          expect(err).to.exist;
          expect(err.message).to.eql(expectedError);

          done();
        });
      });


      it('wrong uri', function(done) {

        // given
        var reader = new Reader(model);
        var rootHandler = reader.handler('props:Root');

        var xml = '<props:root xmlns:props="http://invalid">' +
                    '<props:referencingSingle id="C_4" />' +
                  '</props:root>';

        // when
        reader.fromXML(xml, rootHandler).catch(function(err) {

          expect(err).to.exist;
          expect(err.message).to.match(/unexpected element <props:root>/);



          done();
        });
      });


      it('unknown uri + prefix', function(done) {

        // given
        var reader = new Reader(model);
        var rootHandler = reader.handler('props:Root');

        var xml = '<props1:root xmlns:props1="http://invalid">' +
                    '<props1:referencingSingle id="C_4" />' +
                  '</props1:root>';

        // when
        reader.fromXML(xml, rootHandler).catch(function(err) {

          expect(err).to.exist;
          expect(err.message).to.match(/unexpected element <props1:root>/);

          done();
        });
      });


      it('missing namespace', function(done) {

        // given
        var reader = new Reader(model);
        var rootHandler = reader.handler('props:Root');

        var xml = '<root xmlns:props="http://properties">' +
                    '<referencingSingle id="C_4" />' +
                  '</root>';

        // when
        reader.fromXML(xml, rootHandler).catch(function(err) {

          expect(err).to.exist;
          expect(err.message).to.match(/unparsable content <root> detected/);

          done();
        });
      });


      it('unparsable root element / lax mode', function(done) {

        // given
        var reader = new Reader({ model: model, lax: true });
        var rootHandler = reader.handler('props:Root');

        var xml = '<root xmlns:props="http://properties">' +
                    '<referencingSingle id="C_4" />' +
                  '</root>';

        // when
        reader.fromXML(xml, rootHandler).catch(function(err) {

          expect(err).to.exist;
          expect(err.message).to.match(/failed to parse document as <props:Root>/);

          done();
        });
      });

    });


    it('should handle invalid child element', function(done) {

      var xml = '<props:referencingCollection xmlns:props="http://properties" id="C_4">' +
                  '<props:references>C_2</props:references>' +
                  '<props:invalid>C_5</props:invalid>' +
                '</props:referencingCollection>';

      var reader = new Reader(model);
      var rootHandler = reader.handler('props:ReferencingCollection');

      var expectedError =
        'unparsable content <props:invalid> detected\n\t' +
            'line: 0\n\t' +
            'column: 110\n\t' +
            'nested error: unknown type <props:Invalid>';

      // when
      reader.fromXML(xml, rootHandler).catch(function(err) {

        expect(err).to.exist;
        expect(err.message).to.eql(expectedError);

        done();
      });
    });


    it('should handle invalid child element / non-model schema', function(done) {

      var xml = '<props:referencingCollection xmlns:props="http://properties" xmlns:other="http://other">' +
                  '<other:foo>C_2</other:foo>' +
                '</props:referencingCollection>';

      var reader = new Reader(model);
      var rootHandler = reader.handler('props:ReferencingCollection');

      var expectedError =
        'unparsable content <other:foo> detected\n\t' +
            'line: 0\n\t' +
            'column: 88\n\t' +
            'nested error: unrecognized element <other:foo>';

      // when
      reader.fromXML(xml, rootHandler).catch(function(err) {

        expect(err).to.exist;
        expect(err.message).to.eql(expectedError);



        done();
      });
    });


    it('should handle duplicate id', function(done) {

      var xml = '<props:root xmlns:props="http://properties" id="root">' +
                  '<props:baseWithId id="root" />' +
                '</props:root>';

      var reader = new Reader(model);
      var rootHandler = reader.handler('props:Root');

      var expectedError =
        'unparsable content <props:baseWithId> detected\n\t' +
            'line: 0\n\t' +
            'column: 54\n\t' +
            'nested error: duplicate ID <root>';

      // when
      reader.fromXML(xml, rootHandler).catch(function(err) {

        expect(err).to.exist;
        expect(err.message).to.eql(expectedError);



        done();
      });
    });


    describe('references', function() {

      describe('should log warning', function() {

        it('on unresolvable reference', async function() {

          // given
          var reader = new Reader(extendedModel);
          var rootHandler = reader.handler('props:Root');

          var xml =
            '<props:root xmlns:props="http://properties">' +
              '<props:referencingSingle id="C_4" referencedComplex="C_1" />' +
            '</props:root>';

          // when
          var result = await reader.fromXML(xml, rootHandler);

          // then
          expect(result.element).to.jsonEqual({
            $type: 'props:Root',
            any: [
              { $type: 'props:ReferencingSingle', id: 'C_4' }
            ]
          });

          var referencingSingle = result.element.any[0];

          expect(referencingSingle.referencedComplex).not.to.exist;

          // expect warning to be logged
          expect(result.parseContext.warnings).to.eql([
            {
              message : 'unresolved reference <C_1>',
              element : referencingSingle,
              property : 'props:referencedComplex',
              value : 'C_1'
            }
          ]);
        });


        it('on unresolvable collection reference', async function() {

          // given
          var reader = new Reader(extendedModel);
          var rootHandler = reader.handler('props:Root');

          var xml =
            '<props:root xmlns:props="http://properties">' +
              '<props:containedCollection id="C_5">' +
                '<props:complex id="C_2" />' +
              '</props:containedCollection>' +
              '<props:referencingCollection id="C_4">' +
                '<props:references>C_1</props:references>' +
                '<props:references>C_2</props:references>' +
              '</props:referencingCollection>' +
            '</props:root>';

          // when
          var result = await reader.fromXML(xml, rootHandler);

          // then
          expect(result.element).to.jsonEqual({
            $type: 'props:Root',
            any: [
              {
                $type: 'props:ContainedCollection',
                id: 'C_5',
                children: [
                  { $type: 'props:Complex', id: 'C_2' }
                ]
              },
              { $type: 'props:ReferencingCollection', id: 'C_4' }
            ]
          });

          // expect invalid reference not to be included
          var c2 = result.element.any[0].children[0];
          var referencingCollection = result.element.any[1];

          expect(referencingCollection.references).to.jsonEqual([ c2 ]);

          // expect warning to be logged
          expect(result.parseContext.warnings).to.jsonEqual([
            {
              message: 'unresolved reference <C_1>',
              element: referencingCollection,
              property : 'props:references',
              value : 'C_1'
            }
          ]);
        });

      });

    });

  });


  describe('lax error handling', function() {

    var model = createModel([ 'properties' ]);


    it('should ignore namespaced invalid child', async function() {

      // given
      var reader = new Reader({ model: model, lax: true });
      var rootHandler = reader.handler('props:ComplexAttrs');

      var xml = '<props:complexAttrs xmlns:props="http://properties">' +
                  '<props:unknownElement foo="bar">' +
                    '<props:unknownChild />' +
                  '</props:unknownElement>' +
                '</props:complexAttrs>';

      var result = await reader.fromXML(xml, rootHandler);

      // then
      expect(result.parseContext.warnings).to.have.length(1);

      var warning = result.parseContext.warnings[0];

      expect(warning.message).to.eql(
        'unparsable content <props:unknownElement> detected\n\t' +
            'line: 0\n\t' +
            'column: 52\n\t' +
            'nested error: unknown type <props:UnknownElement>');

      // then
      expect(result.element).to.jsonEqual({
        $type: 'props:ComplexAttrs'
      });
    });


    it('should ignore invalid child', async function() {

      // given
      var reader = new Reader({ model: model, lax: true });
      var rootHandler = reader.handler('props:ComplexAttrs');

      var xml = '<props:complexAttrs xmlns:props="http://properties">' +
                  '<unknownElement foo="bar" />' +
                '</props:complexAttrs>';

      var result = await reader.fromXML(xml, rootHandler);

      // then
      expect(result.parseContext.warnings).to.have.length(1);

      var warning = result.parseContext.warnings[0];

      expect(warning.message).to.eql(
        'unparsable content <unknownElement> detected\n\t' +
            'line: 0\n\t' +
            'column: 52\n\t' +
            'nested error: unrecognized element <unknownElement>');

      // then
      expect(result.element).to.jsonEqual({
        $type: 'props:ComplexAttrs'
      });
    });

  });


  describe('extension handling', function() {

    var extensionModel = createModel([ 'extensions' ]);


    describe('attributes', function() {

      it('should read extension attributes', async function() {

        // given
        var reader = new Reader(extensionModel);
        var rootHandler = reader.handler('e:Root');

        var xml = '<e:root xmlns:e="http://extensions" xmlns:other="http://other" other:foo="BAR" />';

        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.element.$attrs).to.jsonEqual({
          'xmlns:e': 'http://extensions',
          'xmlns:other': 'http://other',
          'other:foo' : 'BAR'
        });
      });


      it('should read default ns', async function() {

        // given
        var reader = new Reader(extensionModel);
        var rootHandler = reader.handler('e:Root');

        var xml = '<root xmlns="http://extensions" />';

        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.element.$attrs).to.jsonEqual({
          'xmlns': 'http://extensions'
        });
      });
    });


    describe('elements', function() {

      it('should read self-closing extension elements', async function() {

        // given
        var reader = new Reader(extensionModel);
        var rootHandler = reader.handler('e:Root');

        var xml =
          '<e:root xmlns:e="http://extensions" xmlns:other="http://other">' +
            '<e:id>FOO</e:id>' +
            '<other:meta key="FOO" value="BAR" />' +
            '<other:meta key="BAZ" value="FOOBAR" />' +
          '</e:root>';

        // when
        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.element).to.jsonEqual({
          $type: 'e:Root',
          id: 'FOO',
          extensions: [
            {
              $type: 'other:meta',
              key: 'FOO',
              value: 'BAR'
            },
            {
              $type: 'other:meta',
              key: 'BAZ',
              value: 'FOOBAR'
            }
          ]
        });
      });


      it('should read extension element body', async function() {

        // given
        var reader = new Reader(extensionModel);
        var rootHandler = reader.handler('e:Root');

        var xml =
          '<e:root xmlns:e="http://extensions" xmlns:other="http://other">' +
            '<e:id>FOO</e:id>' +
            '<other:note>' +
              'a note' +
            '</other:note>' +
          '</e:root>';

        // when
        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.element).to.jsonEqual({
          $type: 'e:Root',
          id: 'FOO',
          extensions: [
            {
              $type: 'other:note',
              $body: 'a note'
            }
          ]
        });
      });


      it('should read nested extension element', async function() {

        // given
        var reader = new Reader(extensionModel);
        var rootHandler = reader.handler('e:Root');

        var xml =
          '<e:root xmlns:e="http://extensions" xmlns:other="http://other">' +
            '<e:id>FOO</e:id>' +
            '<other:nestedMeta>' +
              '<other:meta key="k1" value="v1" />' +
              '<other:meta key="k2" value="v2" />' +
              '<other:additionalNote>' +
                'this is some text' +
              '</other:additionalNote>' +
            '</other:nestedMeta>' +
          '</e:root>';

        // when
        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.element).to.jsonEqual({
          $type: 'e:Root',
          id: 'FOO',
          extensions: [
            {
              $type: 'other:nestedMeta',
              $children: [
                { $type: 'other:meta', key: 'k1', value: 'v1' },
                { $type: 'other:meta', key: 'k2', value: 'v2' },
                { $type: 'other:additionalNote', $body: 'this is some text' }
              ]
            }
          ]
        });
      });


      describe('descriptor', function() {

        it('should exist', async function() {

          // given
          var reader = new Reader(extensionModel);
          var rootHandler = reader.handler('e:Root');

          var xml =
            '<e:root xmlns:e="http://extensions" xmlns:other="http://other">' +
              '<e:id>FOO</e:id>' +
              '<other:note>' +
                'a note' +
              '</other:note>' +
            '</e:root>';

          // when
          var result = await reader.fromXML(xml, rootHandler);

          var note = result.element.extensions[0];

          // then
          expect(note.$descriptor).to.exist;
        });


        it('should contain namespace information', async function() {

          // given
          var reader = new Reader(extensionModel);
          var rootHandler = reader.handler('e:Root');

          var xml =
            '<e:root xmlns:e="http://extensions" xmlns:other="http://other">' +
              '<e:id>FOO</e:id>' +
              '<other:note>' +
                'a note' +
              '</other:note>' +
            '</e:root>';

          // when
          var result = await reader.fromXML(xml, rootHandler);

          var note = result.element.extensions[0];

          // then
          expect(note.$descriptor).to.eql({
            name: 'other:note',
            isGeneric: true,
            ns: {
              prefix: 'other',
              localName: 'note',
              uri: 'http://other'
            }
          });
        });

      });


      describe('namespace declarations', function() {

        it('should handle nested', async function() {

          // given
          var reader = new Reader(extensionModel);
          var rootHandler = reader.handler('e:Root');

          var xml =
            '<e:root xmlns:e="http://extensions">' +
              '<bar:bar xmlns:bar="http://bar">' +
                '<other:child b="B" xmlns:other="http://other" />' +
              '</bar:bar>' +
              '<foo xmlns="http://foo">' +
                '<child a="A" />' +
              '</foo>' +
            '</e:root>';

          // when
          var result = await reader.fromXML(xml, rootHandler);

          // then
          expect(result.element).to.jsonEqual({
            $type: 'e:Root',
            extensions: [
              {
                $type: 'bar:bar',
                'xmlns:bar': 'http://bar',
                $children: [
                  {
                    $type: 'other:child',
                    'xmlns:other': 'http://other',
                    b: 'B'
                  }
                ]
              },
              {
                $type: 'ns0:foo',
                'xmlns': 'http://foo',
                $children: [
                  { $type: 'ns0:child', a: 'A' }
                ]
              }
            ]
          });
        });


        it('should handle nested, re-declaring default', async function() {

          // given
          var reader = new Reader(extensionModel);
          var rootHandler = reader.handler('e:Root');

          var xml =
            '<root xmlns="http://extensions">' +
              '<bar:bar xmlns:bar="http://bar">' +
                '<other:child b="B" xmlns:other="http://other" />' +
              '</bar:bar>' +
              '<foo xmlns="http://foo">' +
                '<child a="A" />' +
              '</foo>' +
            '</root>';

          // when
          var result = await reader.fromXML(xml, rootHandler);

          // then
          expect(result.element).to.jsonEqual({
            $type: 'e:Root',
            extensions: [
              {
                $type: 'bar:bar',
                'xmlns:bar': 'http://bar',
                $children: [
                  {
                    $type: 'other:child',
                    'xmlns:other': 'http://other',
                    b: 'B'
                  }
                ]
              },
              {
                $type: 'ns0:foo',
                'xmlns': 'http://foo',
                $children: [
                  {
                    $type: 'ns0:child',
                    a: 'A'
                  }
                ]
              }
            ]
          });
        });

      });

    });

  });


  describe('parent -> child relationship', function() {

    var model = createModel([ 'properties' ]);
    var extendedModel = createModel([ 'properties', 'properties-extended' ]);
    var extensionModel = createModel([ 'extensions' ]);


    it('should expose $parent on model elements', async function() {

      // given
      var reader = new Reader(model);
      var rootHandler = reader.handler('props:ComplexAttrs');

      var xml = '<props:complexAttrs xmlns:props="http://properties" ' +
                                    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
                  '<props:attrs xsi:type="props:Attributes" integerValue="10" />' +
                '</props:complexAttrs>';

      // when
      var result = await reader.fromXML(xml, rootHandler);

      // then
      expect(result.element.$parent).not.to.exist;
      expect(result.element.attrs.$parent).to.equal(result.element);
    });


    it('should expose $parent on references', async function() {

      // given
      var reader = new Reader(extendedModel);
      var rootHandler = reader.handler('props:Root');

      var xml =
        '<props:root xmlns:props="http://properties">' +
          '<props:containedCollection id="C_5">' +
            '<props:complex id="C_1" />' +
            '<props:complex id="C_2" />' +
          '</props:containedCollection>' +
          '<props:referencingSingle id="C_4" referencedComplex="C_1" />' +
        '</props:root>';

      // when
      var result = await reader.fromXML(xml, rootHandler);

      var containedCollection = result.element.any[0];
      var referencedComplex = result.element.any[1].referencedComplex;

      // then
      expect(referencedComplex.$parent).to.equal(containedCollection);
    });


    it('should expose $parent on extension elements', async function() {

      // given
      var reader = new Reader(extensionModel);
      var rootHandler = reader.handler('e:Root');

      var xml =
        '<e:root xmlns:e="http://extensions" xmlns:other="http://other">' +
          '<e:id>FOO</e:id>' +
          '<other:nestedMeta>' +
            '<other:meta key="k1" value="v1" />' +
            '<other:meta key="k2" value="v2" />' +
            '<other:additionalNote>' +
              'this is some text' +
            '</other:additionalNote>' +
          '</other:nestedMeta>' +
        '</e:root>';

      // when
      var result = await reader.fromXML(xml, rootHandler);

      var child = result.element.extensions[0];
      var nested = child.$children[0];

      expect(child.$parent).to.equal(result.element);
      expect(nested.$parent).to.equal(child);

      expect(result.element).to.jsonEqual({
        $type: 'e:Root',
        id: 'FOO',
        extensions: [
          {
            $type: 'other:nestedMeta',
            $children: [
              { $type: 'other:meta', key: 'k1', value: 'v1' },
              { $type: 'other:meta', key: 'k2', value: 'v2' },
              { $type: 'other:additionalNote', $body: 'this is some text' }
            ]
          }
        ]
      });
    });

  });


  describe('qualified extensions', function() {

    var extensionModel = createModel([ 'extension/base', 'extension/custom' ]);
    var model = createModel([ 'properties' ]);


    it('should read typed extension property', async function() {

      // given
      var reader = new Reader(extensionModel);
      var rootHandler = reader.handler('b:Root');

      var xml =
        '<b:Root xmlns:b="http://base" xmlns:c="http://custom">' +
          '<c:CustomGeneric count="10" />' +
        '</b:Root>';

      // when
      var result = await reader.fromXML(xml, rootHandler);

      expect(result.element).to.jsonEqual({
        $type: 'b:Root',
        generic: {
          $type: 'c:CustomGeneric',
          count: 10
        }
      });

    });


    it('should read typed extension attribute', async function() {

      // given
      var reader = new Reader(extensionModel);
      var rootHandler = reader.handler('b:Root');

      var xml =
        '<b:Root xmlns:b="http://base" xmlns:c="http://custom" ' +
                'c:customAttr="666">' +
        '</b:Root>';

      // when
      var result = await reader.fromXML(xml, rootHandler);

      expect(result.element).to.jsonEqual({
        $type: 'b:Root',
        customAttr: 666
      });

    });


    it('should read generic collection', async function() {

      // given
      var reader = new Reader(extensionModel);
      var rootHandler = reader.handler('b:Root');

      var xml =
        '<b:Root xmlns:b="http://base" xmlns:c="http://custom" ' +
                'xmlns:other="http://other">' +
          '<c:Property key="foo" value="FOO" />' +
          '<c:Property key="bar" value="BAR" />' +
          '<other:Xyz>content</other:Xyz>' +
        '</b:Root>';

      // when
      var result = await reader.fromXML(xml, rootHandler);

      expect(result.element).to.jsonEqual({
        $type: 'b:Root',
        genericCollection: [
          {
            $type: 'c:Property',
            key: 'foo',
            value: 'FOO'
          },
          {
            $type: 'c:Property',
            key: 'bar',
            value: 'BAR'
          },
          {
            $type: 'other:Xyz',
            $body: 'content'
          }
        ]
      });

    });


    describe('validation', function() {

      describe('should warn on invalid well-known NS attribute', function() {

        it('extension NS', async function() {

          // given
          var reader = new Reader(extensionModel);
          var rootHandler = reader.handler('b:Root');

          var xml = `
            <b:Root xmlns:b="http://base"
                    xmlns:c="http://custom"
                    xmlns:foo="http://foo"
                    c:unknownAttribute="XXX">
            </b:Root>
          `;

          // when
          var result = await reader.fromXML(xml, rootHandler);

          // then
          expect(result.parseContext.warnings).to.have.length(1);

          var warning = result.parseContext.warnings[0];

          expect(warning.message).to.eql(
            'unknown attribute <c:unknownAttribute>'
          );

          expect(result.element).to.jsonEqual({
            $type: 'b:Root'
          });

          expect(result.element.$attrs).to.jsonEqual({
            'xmlns:b': 'http://base',
            'xmlns:c': 'http://custom',
            'xmlns:foo': 'http://foo',
            'c:unknownAttribute': 'XXX'
          });
        });


        it('local NS', async function() {

          // given
          var reader = new Reader({ model: model, lax: true });
          var rootHandler = reader.handler('props:ComplexAttrs');

          var xml = '<props:complexAttrs xmlns:props="http://properties" props:unknownAttribute="FOO" />';

          var result = await reader.fromXML(xml, rootHandler);

          // then
          expect(result.parseContext.warnings).to.have.length(1);

          var warning = result.parseContext.warnings[0];

          expect(warning.message).to.eql(
            'unknown attribute <props:unknownAttribute>'
          );

          expect(result.element).to.jsonEqual({
            $type: 'props:ComplexAttrs'
          });

          expect(result.element.$attrs).to.jsonEqual({
            'xmlns:props': 'http://properties',
            'props:unknownAttribute': 'FOO'
          });
        });

      });


      it('should permit non-well-known attributes', async function() {

        // given
        var reader = new Reader(extensionModel);
        var rootHandler = reader.handler('b:Root');

        var xml = `
          <b:Root
              xmlns:b="http://base"
              xmlns:blub="http://blub"
              blub:attr="XXX">
          </b:Root>
        `;

        // when
        var result = await reader.fromXML(xml, rootHandler);

        // then
        expect(result.parseContext.warnings).to.be.empty;



        expect(result.element).to.jsonEqual({
          $type: 'b:Root'
        });

        expect(result.element.$attrs).to.jsonEqual({
          'xmlns:b': 'http://base',
          'xmlns:blub': 'http://blub',
          'blub:attr': 'XXX'
        });

      });


      it('should fail parsing unknown element', function(done) {

        // given
        var reader = new Reader(extensionModel);
        var rootHandler = reader.handler('b:Root');

        var xml =
          '<b:Root xmlns:b="http://base" xmlns:c="http://custom" ' +
                  'xmlns:other="http://other">' +
            '<c:NonExisting />' +
          '</b:Root>';

        // when
        reader.fromXML(xml, rootHandler).catch(function(err) {
          expect(err).to.exist;

          done();
        });

      });

    });

  });


  describe('fake ids', function() {

    var fakeIdsModel = createModel([ 'fake-id' ]);


    it('should ignore (non-id) id attribute', async function() {

      // given
      var reader = new Reader(fakeIdsModel);
      var rootHandler = reader.handler('fi:Root');

      var xml =
        '<fi:Root xmlns:fi="http://fakeid">' +
          '<fi:ChildWithFakeId id="FOO" />' +
        '</fi:Root>';

      // when
      var result = await reader.fromXML(xml, rootHandler);

      // then
      expect(result.element).to.jsonEqual({
        $type: 'fi:Root',
        children: [
          {
            $type: 'fi:ChildWithFakeId',
            id: 'FOO'
          }
        ]
      });

      expect(result.parseContext.elementsById).to.be.empty;

    });


    it('should not-resolve (non-id) id references', async function() {

      // given
      var reader = new Reader(fakeIdsModel);
      var rootHandler = reader.handler('fi:Root');

      var xml =
        '<fi:Root xmlns:fi="http://fakeid">' +
          '<fi:ChildWithFakeId id="FOO" />' +
          '<fi:ChildWithFakeId ref="FOO" />' +
        '</fi:Root>';

      // when
      var result = await reader.fromXML(xml, rootHandler);

      // then
      expect(result.element).to.jsonEqual({
        $type: 'fi:Root',
        children: [
          {
            $type: 'fi:ChildWithFakeId',
            id: 'FOO'
          },
          {
            $type: 'fi:ChildWithFakeId'
          }
        ]
      });

      expect(result.parseContext.warnings).to.have.length(1);
      expect(result.parseContext.warnings[0].message).to.eql('unresolved reference <FOO>');
    });

  });


  describe('encoding', function() {

    var model = createModel([ 'properties' ]);

    it('should decode UTF-8, no problemo', async function() {

      // given
      var reader = new Reader(model);
      var rootHandler = reader.handler('props:ComplexAttrs');

      var xml =
        '<?xml version="1.0" encoding="utf-8"?>' +
        '<props:complexAttrs xmlns:props="http://properties">' +
        '</props:complexAttrs>';

      // when
      var result = await reader.fromXML(xml, rootHandler);

      // then

      expect(result.parseContext.warnings).to.be.empty;

      expect(result).to.exist;
      expect(context).to.exist;

    });


    it('should warn on non-UTF-8 encoded files', async function() {

      // given
      var reader = new Reader(model);
      var rootHandler = reader.handler('props:ComplexAttrs');

      var xml =
        '<?xml encoding="windows-1252"?>' +
        '<props:complexAttrs xmlns:props="http://properties">' +
        '</props:complexAttrs>';

      // when
      var result = await reader.fromXML(xml, rootHandler);

      // then


      var warnings = result.parseContext.warnings;

      expect(warnings).to.have.length(1);
      expect(warnings[0].message).to.match(
        /unsupported document encoding <windows-1252>/
      );

      expect(result).to.exist;
      expect(result.parseContext).to.exist;

    });


    it('should warn on non-UTF-8 encoded files / CAPITALIZED', async function() {

      // given
      var reader = new Reader(model);
      var rootHandler = reader.handler('props:ComplexAttrs');

      var xml =
        '<?XML ENCODING="WINDOWS-1252"?>' +
        '<props:complexAttrs xmlns:props="http://properties">' +
        '</props:complexAttrs>';

      // when
      var result = await reader.fromXML(xml, rootHandler);

      // then


      var warnings = result.parseContext.warnings;

      expect(warnings).to.have.length(1);
      expect(warnings[0].message).to.match(
        /unsupported document encoding <WINDOWS-1252>/
      );

      expect(result).to.exist;
      expect(result.parseContext).to.exist;

    });

  });


  describe('attr <> child conflict', function() {

    var model = createModel([ 'attr-child-conflict' ]);


    it('should import attr and child with the same name', async function() {

      // given
      var reader = new Reader(model);
      var rootHandler = reader.handler('s:Foo');

      var xml = `
        <s:foo xmlns:s="http://s" bar="Bar">
          <s:bar woop="WHOOPS">
          </s:bar>
        </s:foo>`;

      // when
      var result = await reader.fromXML(xml, rootHandler);

      // then
      expect(result.element).to.jsonEqual({
        $type: 's:Foo',
        bar: 'Bar',
        bars: [
          {
            $type: 's:Bar',
            woop: 'WHOOPS'
          }
        ]
      });
    });

  });

});
