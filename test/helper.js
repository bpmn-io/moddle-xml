import fs from 'fs';

import {
  map
} from 'min-dash';

import { Moddle } from 'moddle';


export function ensureDirExists(dir) {

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

export function readFile(filename) {
  return fs.readFileSync(filename, { encoding: 'UTF-8' });
}

export function createModelBuilder(base) {

  var cache = {};

  if (!base) {
    throw new Error('[test-util] must specify a base directory');
  }

  function createModel(packageNames, options = {}) {

    var packages = map(packageNames, function(f) {
      var pkg = cache[f];
      var file = base + f + '.json';

      if (!pkg) {
        try {
          pkg = cache[f] = JSON.parse(readFile(base + f + '.json'));
        } catch (e) {
          throw new Error('[Helper] failed to parse <' + file + '> as JSON: ' + e.message);
        }
      }

      return pkg;
    });

    return new Moddle(packages, { strict: true, ...options });
  }

  return createModel;
}