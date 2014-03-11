var _ = require('lodash');

var Stack = require('moddle').util.Stack,
    Common = require('moddle').Common,

    nameToAlias = Common.nameToAlias,
    isSimpleType = Common.isSimpleType;

var XML_PREAMBLE = '<?xml version="1.0" encoding="UTF-8"?>\n';

var DEFAULT_NS_MAP = {
  'xsi': 'http://www.w3.org/2001/XMLSchema-instance'
};

function getElementTagName(descriptor) {
  return descriptor.ns.prefix + ':' + nameToAlias(descriptor.ns.localName, descriptor.$pkg);
}

function getPropertyTagName(descriptor) {
  return descriptor.ns.prefix + ':' + descriptor.ns.localName;
}

function getSerializableProperties(element) {
  var descriptor = element.$descriptor;

  return _.filter(descriptor.properties, function(p) {
    var name = p.name;

    // do not serialize defaults
    if (!element.hasOwnProperty(name)) {
      return false;
    }

    var value = element[name];
    
    // do not serialize default equals
    if (value === p.default) {
      return false;
    }

    return p.isMany ? value.length : true;
  });
}


function filterAttributes(props) {
  return _.filter(props, function(p) { return p.isAttr; });
}

function filterContained(props) {
  return _.filter(props, function(p) { return !p.isAttr; });
}


function ReferenceSerializer(parent, tagName) {
  this.tagName = tagName;
}

ReferenceSerializer.prototype.build = function(element) {
  this.element = element;
  return this;
};

ReferenceSerializer.prototype.serializeTo = function(writer) {
  writer
    .appendIndent()
    .append('<' + this.tagName + '>' + this.element.id + '</' + this.tagName + '>')
    .appendNewLine();
};

function BodySerializer() {}

BodySerializer.prototype.serializeValue = BodySerializer.prototype.serializeTo = function(writer) {
  var value = this.value,
      escape = this.escape;

  if (escape) {
    writer.append('<![CDATA[');
  }

  writer.append(this.value);

  if (escape) {
    writer.append(']]>');
  }
};

BodySerializer.prototype.build = function(prop, value) {
  this.value = value;

  if (prop.type === 'String' && value.indexOf('<') !== -1) {
    this.escape = true;
  }

  return this;
};

function ValueSerializer(tagName) {
  this.tagName = tagName;
}

ValueSerializer.prototype = new BodySerializer();

ValueSerializer.prototype.serializeTo = function(writer) {
  
  writer
    .appendIndent()
    .append('<' + this.tagName + '>');

  this.serializeValue(writer);

  writer
    .append( '</' + this.tagName + '>')
    .appendNewLine();
};

function ElementSerializer(parent, tagName) {
  this.body = [];

  this.parent = parent;
  this.tagName = tagName;
}

ElementSerializer.prototype.build = function(element) {
  var properties = getSerializableProperties(element);

  this.element = element;

  this.logNamespaceUsed(element.$descriptor.ns);

  if (!this.tagName) {
    this.tagName = getElementTagName(element.$descriptor);
  }

  this.parseContainments(filterContained(properties));
  this.parseAttributes(filterAttributes(properties));

  return this;
};

ElementSerializer.prototype.parseContainments = function(properties) {

  var self = this,
      body = this.body,
      element = this.element,
      typeDesc = element.$descriptor;

  _.forEach(properties, function(p) {
    var value = element.get(p.name),
        isReference = p.isReference,
        isMany = p.isMany;

    var tagName = getPropertyTagName(p);

    self.logNamespaceUsed(p.ns);

    if (!isMany) {
      value = [ value ];
    }

    if (p.isBody) {
      body.push(new BodySerializer().build(p, value[0]));
    } else
    if (isSimpleType(p.type)) {
      _.forEach(value, function(v) {
        body.push(new ValueSerializer(tagName).build(p, v));
      });
    } else
    if (isReference) {
      _.forEach(value, function(v) {
        body.push(new ReferenceSerializer(self, tagName).build(v));
      });
    } else {
      // allow serialization via type
      // rather than element name
      var asType = p.serialize === 'xsi:type';

      _.forEach(value, function(v) {
        var serializer;

        if (asType) {
          serializer = new TypeSerializer(self, tagName);
        } else {
          serializer = new ElementSerializer(self);
        }

        body.push(serializer.build(v));
      });
    }
  });
};

ElementSerializer.prototype.logNamespaceUsed = function(ns) {
  if (!this.parent) {
    if (!this.ns) {
      this.ns = {
        map: {},
        all: []
      };
    }

    if (!this.ns.map[ns.prefix]) {
      this.ns.map[ns.prefix] = true;
      this.ns.all.push(ns.prefix);
    }
  } else {
    this.parent.logNamespaceUsed(ns);
  }
};

ElementSerializer.prototype.parseAttributes = function(properties) {
  var self = this,
      element = this.element;

  this.attrs = _.collect(properties, function(p) {
    self.logNamespaceUsed(p.ns);

    var value = element.get(p.name);

    if (p.isReference) {
      value = value.id;
    }

    if (_.isString(value)) {
      var s = {
        '\n': '&#10;',
        '\n\r': '&#10;',
        '"': '&quot;'
      };

      value = value.replace(/(\n|\n\r|")/g, function(str) {
        return s[str];
      });
    }

    return { name: p.name, value: value };
  });
};

ElementSerializer.prototype.serializeAttributes = function(writer) {
  var element = this.element,
      attrs = this.attrs,
      root = !this.parent;

  var nsAttrs = [];

  if (root) {
    var model = element.$model;

    nsAttrs = _.collect(this.ns.all, function(prefix) {
      var uri = DEFAULT_NS_MAP[prefix] || model.getPackage(prefix).uri;

      return { name: 'xmlns:' + prefix, value: uri };
    });
  }

  // todo handle additional attrs
  var additionalAttrs = element.$attrs;

  _.forEach(nsAttrs.concat(attrs), function(a) {
    writer
      .append(' ')
      .append(a.name).append('="').append(a.value).append('"');
  });
};

ElementSerializer.prototype.serializeTo = function(writer) {
  var hasBody = this.body.length;

  writer
    .appendIndent()
    .append('<' + this.tagName);

  this.serializeAttributes(writer);

  writer
    .append(hasBody ? '>' : ' />')
    .appendNewLine();

  writer.indent();

  _.forEach(this.body, function(b) {
    b.serializeTo(writer);
  });
  
  writer.unindent();

  if (hasBody) {
    writer
      .appendIndent()
      .append('</' + this.tagName + '>')
      .appendNewLine();
  }
};

/**
 * A serializer for types that handles serialization of data types
 */
function TypeSerializer(parent, tagName) {

  ElementSerializer.call(this, parent, tagName);

  // use to serialize xsi:type
  // this.logNamespaceUsed({ prefix: 'xsi', name: 'xsi:type', localName: 'type' });

  this.parseAttributes = function(props) {
    ElementSerializer.prototype.parseAttributes.call(this, props);

    // use to serialize xsi:type
    // this.attrs.unshift({ name: 'xsi:type', value: this.element.type });
  };
}

TypeSerializer.prototype = new ElementSerializer();


function SavingWriter() {
  this.value = '';

  this.write = function(str) {
    this.value += str;
  };
}

function FormatingWriter(out, format) {

  var indent = [''];

  this.append = function(str) {
    out.write(str);

    return this;
  };

  this.appendNewLine = function() {
    if (format) {
      out.write('\n');
    }

    return this;
  };

  this.appendIndent = function() {
    if (format) {
      out.write(indent.join('  '));
    }

    return this;
  };

  this.indent = function() {
    indent.push('');
    return this;
  };

  this.unindent = function() {
    indent.pop();
    return this;
  };
}

/**
 * A writer for meta-model backed document trees
 *
 * @class XMLWriter
 */
function XMLWriter(options) {

  options = _.extend({ format: false, preamble: true }, options || {});

  function toXML(tree, writer) {
    var internalWriter = writer || new SavingWriter();
    var formatingWriter = new FormatingWriter(internalWriter, options.format);

    if (options.preamble) {
      formatingWriter.append(XML_PREAMBLE);
    }

    new ElementSerializer().build(tree).serializeTo(formatingWriter);

    if (!writer) {
      return internalWriter.value;
    }
  }

  return {
    toXML: toXML
  };
}

module.exports = XMLWriter;