'use strict';

var fs = require('fs');
var util = require('util');

var _ = require('lodash');

var Moddle = require('moddle');

var jsondiffpatch = require('jsondiffpatch').create({
  objectHash: function (obj) {
    return JSON.stringify(obj);
  }
});

function ensureDirExists(dir) {

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

function readFile(filename) {
  return fs.readFileSync(filename, { encoding: 'UTF-8' });
}

function initAdditionalMatchers() {

  // this == jasmine

  this.addMatchers({

    toDeepEqual: function(expected) {

      // jasmine 1.3.x
      var actual = this.actual;
      var actualClone = _.cloneDeep(actual);
      var expectedClone = _.cloneDeep(expected);

      var result = {
        pass: _.isEqual(actualClone, expectedClone)
      };

      if (!result.pass) {
        console.warn('[to-deep-equal] elements do not equal. diff: ', util.inspect(jsondiffpatch.diff(actualClone, expectedClone), false, 4));
      }

      // jasmine 1.3.x
      return result.pass;
    }
  });
}

function createModelBuilder(base) {

  var cache = {};

  if (!base) {
    throw new Error('[test-util] must specify a base directory');
  }

  function createModel(packageNames) {

    var packages = _.collect(packageNames, function(f) {
      var pkg = cache[f];
      var file = base + f + '.json';

      if (!pkg) {
        try {
          pkg = cache[f] = JSON.parse(readFile(base + f + '.json'));
        } catch (e) {
          throw new Error('[Helper] failed to parse <' + file + '> as JSON: ' +  e.message);
        }
      }

      return pkg;
    });

    return new Moddle(packages);
  }

  return createModel;
}

module.exports.readFile = readFile;
module.exports.ensureDirExists = ensureDirExists;
module.exports.initAdditionalMatchers = initAdditionalMatchers;
module.exports.createModelBuilder = createModelBuilder;