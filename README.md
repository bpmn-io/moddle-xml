# moddle-xml

[![CI](https://github.com/bpmn-io/moddle-xml/workflows/CI/badge.svg)](https://github.com/bpmn-io/moddle-xml/actions?query=workflow%3ACI)

Read and write XML documents described with [moddle](https://github.com/bpmn-io/moddle).


## Usage

Get the libray via [npm](http://npmjs.org)

```
npm install --save moddle-xml
```


#### Bootstrap

Create a [moddle instance](https://github.com/bpmn-io/moddle)

```javascript
import Moddle from 'moddle';
import {
  Reader,
  Writer
} from 'moddle-xml';

const model = new Moddle([ myPackage ]);
```


#### Read XML

Use the reader to parse XML into an easily accessible object tree:

```javascript
const model; // previously created

const xml =
  '<my:root xmlns:props="http://mypackage">' +
    '<my:car id="Car_1">' +
      '<my:engine power="121" fuelConsumption="10" />' +
    '</my:car>' +
  '</my:root>';

const reader = new Reader(model);
const rootHandler = reader.handler('my:Root');

// when
try {
  const {
    rootElement: cars,
    warnings
  } = await reader.fromXML(xml, rootHandler);

  if (warnings.length) {
    console.log('import warnings', warnings);
  }

  console.log(cars);

  // {
  //  $type: 'my:Root',
  //  cars: [
  //    {
  //      $type: 'my:Car',
  //      id: 'Car_1',
  //      engine: [
  //        { $type: 'my:Engine', powser: 121, fuelConsumption: 10 }
  //      ]
  //    }
  //  ]
  // }

} catch (err) {
  console.log('import error', err, err.warnings);
}
```


#### Write XML

Use the writer to serialize the object tree back to XML:

```javascript
var model; // previously created

var cars = model.create('my:Root');
cars.get('cars').push(model.create('my:Car', { power: 10 }));

var options = { format: false, preamble: false };
var writer = new Writer(options);

var xml = writer.toXML(bar);

console.log(xml); // <my:root xmlns:props="http://mypackage"> ... <my:car power="10" /></my:root>
```

## License

MIT
