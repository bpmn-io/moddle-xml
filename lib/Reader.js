var sax = require('sax');
var _ = require('lodash');

var Common = require('moddle').Common,
    Stack = require('moddle').util.Stack,

    logger = require('moddle').util.Logger,
    
    parseNameNs = Common.parseNameNs,
    coerceType = Common.coerceType,
    aliasToName = Common.aliasToName,
    isSimpleType = Common.isSimpleType;

function parseNodeAttributes(node) {
  var nodeAttrs = node.attributes;

  return _.reduce(nodeAttrs, function(result, v, k) {
    var ns = parseNameNs(v.name, v.prefix);
    result[ns.name] = v.value;
    return result;
  }, {});
}

/**
 * Normalizes namespaces for a node given an optional default namespace and a
 * number of mappings from uris to default prefixes.
 * 
 * @param  {XmlNode} node
 * @param  {Model} model the model containing all registered namespaces
 * @param  {Uri} defaultNsUri
 */
function normalizeNamespaces(node, model, defaultNsUri) {
  var uri, childUri, prefix;

  uri = node.uri || defaultNsUri;

  if (uri) {
    var pkg = model.getPackage(uri);

    if (pkg) {
      prefix = pkg.prefix;
    } else {
      prefix = node.prefix;
    }

    node.prefix = prefix;
    node.uri = uri;
  }

  _.forEach(node.attributes, function(attr) {
    normalizeNamespaces(attr, model, null);
  });
}

/**
 * A parse context.
 *
 * @class
 * 
 * @param {ElementHandler} parseRoot the root handler for parsing a document
 */
function Context(parseRoot) {

  var elementsById = {};
  var references = [];

  var warnings = [];

  return {

    addReference: function(reference) {
      references.push(reference);
    },

    getReferences: function() {
      return references;
    },

    addElement: function(id, element) {

      if (!id || !element) {
        throw new Error('[xml-reader] id or ctx must not be null');
      }

      elementsById[id] = element;
    },

    addWarning: function(w) {
      logger.debug('[warning]', w.message, w);
      warnings.push(w);
    },

    getWarnings: function() {
      return warnings;
    },

    getElements: function() {
      return elementsById;
    },

    getParseRoot: function() {
      return parseRoot;
    }
  };
}

function BaseHandler() {}

BaseHandler.prototype.handleEnd = function() {};
BaseHandler.prototype.handleText = function() {};
BaseHandler.prototype.handleNode = function() {};
BaseHandler.prototype.getElement = function() {
  return this.element;
};

function BodyHandler() {}

BodyHandler.prototype = new BaseHandler();

BodyHandler.prototype.handleText = function(text) {
  this.body = (this.body || '') + text;
};

function ReferenceHandler(property, context) {
  this.property = property;
  this.context = context;
}

ReferenceHandler.prototype = new BodyHandler();

ReferenceHandler.prototype.handleNode = function(node) {

  if (this.element) {
    throw new Error('expected no sub nodes');
  } else {
    this.element = this.createReference(node);
  }

  return this;
};

ReferenceHandler.prototype.handleEnd = function() {
  this.element.id = this.body;
};

ReferenceHandler.prototype.createReference = function() {
  return {
    property: this.property.ns.name,
    id: ''
  };
};

function ValueHandler(propertyDesc, element) {
  this.element = element;
  this.propertyDesc = propertyDesc;
}

ValueHandler.prototype = new BodyHandler();

ValueHandler.prototype.handleEnd = function() {

  var value = this.body,
      element = this.element,
      propertyDesc = this.propertyDesc;

  value = coerceType(propertyDesc.type, value);

  if (propertyDesc.isMany) {
    element.get(propertyDesc.name).push(value);
  } else {
    element.set(propertyDesc.name, value);
  }
};

/**
 * @class XMLReader.ElementHandler
 * 
 */
function ElementHandler(model, type, context) {
  this.model = model;
  this.type = model.getType(type);
  this.context = context;
}

ElementHandler.prototype = new BodyHandler();

ElementHandler.prototype.addReference = function(reference) {
  this.context.addReference(reference);
};

ElementHandler.prototype.handleNode = function(node) {
  var parser = this;

  if (!this.element) {
    this.element = this.createElement(node);
    var id = this.element.id;

    if (id) {
      this.context.addElement(id, this.element);
    }
  } else {
    parser = this.handleChild(node);
  }

  return parser;
};

ElementHandler.prototype.handleEnd = function() {

  var value = this.body,
      element = this.element,
      descriptor = element.$descriptor,
      bodyProperty = descriptor.bodyProperty;

  if (bodyProperty && value !== undefined) {
    value = coerceType(bodyProperty.type, value);
    element.set(bodyProperty.name, value);
  }
};

/**
 * Create an instance of the model from the given node.
 * 
 * @param  {Element} node the xml node
 */
ElementHandler.prototype.createElement = function(node) {
  var attributes = parseNodeAttributes(node),
      type = this.type,
      descriptor = type.$descriptor,
      context = this.context,
      instance = new type({});

  _.forEach(attributes, function(value, name) {

    var prop = descriptor.propertiesByName[name];

    if (prop && prop.isReference) {
      context.addReference({
        element: instance,
        property: prop.ns.name,
        id: value
      });
    } else {
      if (prop) {
        value = coerceType(prop.type, value);
      }
      
      instance.set(name, value);
    }
  });

  return instance;
};

ElementHandler.prototype.getPropertyForElement = function(nameNs) {
  if (_.isString(nameNs)) {
    nameNs = parseNameNs(nameNs);
  }

  var type = this.type,
      descriptor = type.$descriptor;

  var propertyName = nameNs.name,
      typeName = nameNs.prefix + ':' + aliasToName(nameNs.localName, descriptor.$pkg);

  var property = descriptor.propertiesByName[propertyName];

  // search for properties by name first
  if (property) {
    return property;
  }

  var elementType = this.model.getType(typeName);

  // search for collection members later
  property = _.find(descriptor.properties, function(p) {
    return !p.isVirtual && !p.isReference && elementType.isA(p.type);
  });

  if (property) {
    return _.extend({}, property, { effectiveType: elementType.$descriptor.name });
  } else {
    return null;
  }
};

ElementHandler.prototype.toString = function() {
  return 'ElementDescriptor[' + this.type.$descriptor.name + ']';
};

ElementHandler.prototype.valueHandler = function(propertyDesc, element) {
  return new ValueHandler(propertyDesc, element);
};

ElementHandler.prototype.referenceHandler = function(propertyDesc) {
  return new ReferenceHandler(propertyDesc, this.context);
};

ElementHandler.prototype.handler = function(type) {
  return new ElementHandler(this.model, type, this.context);
};

/**
 * Handle the child element parsing
 * 
 * @param  {Element} node the xml node
 */
ElementHandler.prototype.handleChild = function(node) {
  var nameNs = parseNameNs(node.local, node.prefix);

  var propertyDesc = this.getPropertyForElement(nameNs),
      type,
      childHandler;

  if (!propertyDesc) {
    throw new Error('no property descriptor matching node <' + nameNs.name + '>');
  }

  type = propertyDesc.effectiveType || propertyDesc.type;
  
  try {
    if (isSimpleType(propertyDesc.type)) {
      return this.valueHandler(propertyDesc, this.element);
    }

    if (propertyDesc.isReference) {
      childHandler = this.referenceHandler(propertyDesc).handleNode(node);
    } else {
      childHandler = this.handler(type).handleNode(node);
    }
    
    var newElement = childHandler.getElement();

    if (propertyDesc.isMany) {
      this.element.get(propertyDesc.name).push(newElement);
    } else {
      this.element.set(propertyDesc.name, newElement);
    }

    if (propertyDesc.isReference) {
      _.extend(newElement, {
        element: this.element
      });

      this.context.addReference(newElement);
    }
  } catch (e) {
    throw new Error('[xml-reader] @ ' + this.element.type + '#' + propertyDesc.ns.name + ' : ' + e.message);
  }

  return childHandler;
};

/**
 * A reader for a meta-model
 *
 * @class XMLReader
 * 
 * @param {Model} model used to read xml files
 */
function XMLReader(model) {

  function resolveReferences(context) {

    var elementsById = context.getElements();
    var references = context.getReferences();

    _.forEach(references, function(r) {
      var element = r.element;
      var reference = elementsById[r.id];
      var property = element.$descriptor.propertiesByName[r.property];

      if (!reference) {
        context.addWarning({ message: 'unresolved reference <' + r.id + '>', element: r.element, property: r.property, value: r.value });
        return;
      }

      if (property.isMany) {
        var collection = element.get(property.name),
            idx = collection.indexOf(r);

        collection[idx] = reference;
      } else {
        element.set(property.name, reference);
      }
    });
  }

  function fromXML(xml, rootHandler, done) {

    var context = new Context(rootHandler);

    var parser = sax.parser(true, { xmlns: true, trim: true }),
        stack = new Stack();

    rootHandler.context = context;

    // push root handler
    stack.push(rootHandler);

    parser.onerror = function (e) {
      logger.error('error!!!', e);
    };

    parser.onopentag = function(node) {
      var handler = stack.top();

      normalizeNamespaces(node, model);

      stack.push(handler.handleNode(node));
    };

    parser.ontext = parser.oncdata = function(text) {
      var handler = stack.top();
      handler.handleText(text);
    };

    parser.onclosetag = function(tagName) {
      var old = stack.pop();
      old.handleEnd();
    };

    parser.onend = function () {
      resolveReferences(context);
      done(null, rootHandler.getElement(), context);
    };

    parser.write(xml).close();
  }

  return {
    fromXML: fromXML,

    handler: function(name) {
      return new ElementHandler(model, name);
    }
  };
}

module.exports = XMLReader;
module.exports.ElementHandler = ElementHandler;