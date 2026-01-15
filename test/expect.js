import { use as chaiUse } from 'chai';

import Matchers from './matchers.js';

// add matchers
chaiUse(Matchers);

// expose chai expect
export {
  expect as default
} from 'chai';