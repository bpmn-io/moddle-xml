# moddle-xml

XML import/export for documents described with [moddle](https://github.com/bpmn-io/moddle).

## Example

```
var Moddle = require('moddle'),
    ModdleXML = require('moddle-xml');

var model = new Moddle([ aPackageDescriptor ]);

var bar = model.create('foo:Bar', { a: 'AHA', b: 'B' });


var options = { format: false, preamble: false };
var writer = new ModdleXML.Writer(options);

var xml = writer.toXML(bar);

console.log(xml); // <foo:Bar a="AHA" b="B"/>

```


## License

MIT