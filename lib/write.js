import {
  forEach,
  isString,
  filter,
  assign,
  has,
  findIndex
} from 'min-dash';

import {
  isSimpleType,
  parseNameNS
} from 'moddle';

import {
  hasLowerCaseAlias,
  getSerialization,
  SERIALIZE_PROPERTY,
  DEFAULT_NS_MAP
} from './common.js';

var XML_PREAMBLE = '<?xml version="1.0" encoding="UTF-8"?>\n';

var ESCAPE_ATTR_CHARS = /<|>|'|"|&|\n\r|\n/g;
var ESCAPE_CHARS = /<|>|&/g;


export function Namespaces(parent) {

  this.prefixMap = {};
  this.uriMap = {};
  this.used = {};

  this.wellknown = [];
  this.custom = [];
  this.parent = parent;

  this.defaultPrefixMap = parent && parent.defaultPrefixMap || {};
}

Namespaces.prototype.mapDefaultPrefixes = function(defaultPrefixMap) {
  this.defaultPrefixMap = defaultPrefixMap;
};

Namespaces.prototype.defaultUriByPrefix = function(prefix) {
  return this.defaultPrefixMap[prefix];
};

/**
 * Return the first truthy `fn(scope)` walking this scope and its ancestors.
 *
 * @param {(scope: Namespaces) => any} fn
 *
 * @return {any}
 */
Namespaces.prototype.resolve = function(fn) {

  var scope = this;

  while (scope) {
    var resolved = fn(scope);

    if (resolved) {
      return resolved;
    }

    scope = scope.parent;
  }
};

/**
 * Call `fn(scope)` for this scope and each of its ancestors.
 *
 * @param {(scope: Namespaces) => void} fn
 */
Namespaces.prototype.eachScope = function(fn) {

  var scope = this;

  while (scope) {
    fn(scope);

    scope = scope.parent;
  }
};

Namespaces.prototype.byUri = function(uri) {
  return this.resolve(function(scope) {
    return scope.uriMap[uri];
  });
};

Namespaces.prototype.add = function(ns, isWellknown) {

  this.uriMap[ns.uri] = ns;

  if (isWellknown) {
    this.wellknown.push(ns);
  } else {
    this.custom.push(ns);
  }

  this.mapPrefix(ns.prefix, ns.uri);
};

Namespaces.prototype.uriByPrefix = function(prefix) {
  var key = prefix || 'xmlns';

  return this.resolve(function(scope) {
    return scope.prefixMap[key];
  });
};

Namespaces.prototype.mapPrefix = function(prefix, uri) {
  this.prefixMap[prefix || 'xmlns'] = uri;
};

Namespaces.prototype.getNSKey = function(ns) {
  return (ns.prefix !== undefined) ? (ns.uri + '|' + ns.prefix) : ns.uri;
};

Namespaces.prototype.logUsed = function(ns) {

  var uri = ns.uri;
  var nsKey = this.getNSKey(ns);

  // all scopes resolve to the same entry, so resolve once
  var resolved = this.byUri(uri);

  this.eachScope(function(scope) {
    scope.used[nsKey] = resolved;
  });
};

Namespaces.prototype.getUsed = function(ns) {

  var allNs = [].concat(this.wellknown, this.custom);

  return allNs.filter(ns => {
    var nsKey = this.getNSKey(ns);

    return this.used[nsKey];
  });
};


function lower(string) {
  return string.charAt(0).toLowerCase() + string.slice(1);
}

function nameToAlias(name, pkg) {
  if (hasLowerCaseAlias(pkg)) {
    return lower(name);
  } else {
    return name;
  }
}

function inherits(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
}

function nsName(ns) {
  if (isString(ns)) {
    return ns;
  } else {
    return (ns.prefix ? ns.prefix + ':' : '') + ns.localName;
  }
}

function getNsAttrs(namespaces) {

  return namespaces.getUsed().filter(function(ns) {

    // do not serialize built in <xml> namespace
    return ns.prefix !== 'xml';
  }).map(function(ns) {
    var name = 'xmlns' + (ns.prefix ? ':' + ns.prefix : '');
    return { name: name, value: ns.uri };
  });

}

function getElementNs(ns, descriptor) {
  if (descriptor.isGeneric) {
    return assign({ localName: descriptor.ns.localName }, ns);
  } else {
    return assign({ localName: nameToAlias(descriptor.ns.localName, descriptor.$pkg) }, ns);
  }
}

function getPropertyNs(ns, descriptor) {
  return assign({ localName: descriptor.ns.localName }, ns);
}

function getSerializableProperties(element) {
  var descriptor = element.$descriptor;

  return filter(descriptor.properties, function(p) {
    var name = p.name;

    if (p.isVirtual) {
      return false;
    }

    // do not serialize defaults
    if (!has(element, name)) {
      return false;
    }

    var value = element[name];

    // do not serialize default equals
    if (value === p.default) {
      return false;
    }

    // do not serialize null properties
    if (value === null) {
      return false;
    }

    return p.isMany ? value.length : true;
  });
}

var ESCAPE_ATTR_MAP = {
  '\n': '#10',
  '\n\r': '#10',
  '"': '#34',
  '\'': '#39',
  '<': '#60',
  '>': '#62',
  '&': '#38'
};

var ESCAPE_MAP = {
  '<': 'lt',
  '>': 'gt',
  '&': 'amp'
};

function escape(str, charPattern, replaceMap) {

  // ensure we are handling strings here
  str = isString(str) ? str : '' + str;

  return str.replace(charPattern, function(s) {
    return '&' + replaceMap[s] + ';';
  });
}

/**
 * Escape a string attribute to not contain any bad values (line breaks, '"', ...)
 *
 * @param {String} str the string to escape
 * @return {String} the escaped string
 */
function escapeAttr(str) {
  return escape(str, ESCAPE_ATTR_CHARS, ESCAPE_ATTR_MAP);
}

function escapeBody(str) {
  return escape(str, ESCAPE_CHARS, ESCAPE_MAP);
}

function filterAttributes(props) {
  return filter(props, function(p) { return p.isAttr; });
}

function filterContained(props) {
  return filter(props, function(p) { return !p.isAttr; });
}


function ReferenceSerializer(tagName) {
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

BodySerializer.prototype.serializeValue =
BodySerializer.prototype.serializeTo = function(writer) {
  writer.append(
    this.escape
      ? escapeBody(this.value)
      : this.value
  );
};

BodySerializer.prototype.build = function(prop, value) {
  this.value = value;

  if (prop.type === 'String' && value.search(ESCAPE_CHARS) !== -1) {
    this.escape = true;
  }

  return this;
};

function ValueSerializer(tagName) {
  this.tagName = tagName;
}

inherits(ValueSerializer, BodySerializer);

ValueSerializer.prototype.serializeTo = function(writer) {

  writer
    .appendIndent()
    .append('<' + this.tagName + '>');

  this.serializeValue(writer);

  writer
    .append('</' + this.tagName + '>')
    .appendNewLine();
};

function ElementSerializer(parent, propertyDescriptor) {
  this.body = [];
  this.attrs = [];

  this.parent = parent;
  this.propertyDescriptor = propertyDescriptor;
}

ElementSerializer.prototype.build = function(element) {
  buildTree(this, element);

  return this;
};

/**
 * Enter the element during the build walk: register its namespaces, tag
 * name and attributes, then return the deferred, ordered work to build its
 * child nodes (empty when it has none).
 *
 * @param {Object} element
 *
 * @return {Array<Object>} ordered, deferred work items to build the children
 */
ElementSerializer.prototype.enter = function(element) {
  this.element = element;

  var elementDescriptor = element.$descriptor,
      propertyDescriptor = this.propertyDescriptor;

  var isGeneric = elementDescriptor.isGeneric;

  if (isGeneric) {
    this.otherAttrs = this.parseGenericNsAttributes(element);
  } else {
    this.otherAttrs = this.parseNsAttributes(element);
  }

  if (propertyDescriptor) {
    this.ns = this.nsPropertyTagName(propertyDescriptor);
  } else {
    this.ns = this.nsTagName(elementDescriptor);
  }

  this.tagName = this.addTagName(this.ns);

  if (isGeneric) {
    return this.collectGenericContainments(element);
  }

  var properties = getSerializableProperties(element);

  this.parseAttributes(filterAttributes(properties));

  return this.collectContainments(filterContained(properties));
};

/**
 * Exit the element during the build walk: register its generic attributes,
 * which must happen after the children so namespace usage is logged in
 * document order.
 */
ElementSerializer.prototype.exit = function() {
  this.parseGenericAttributes(this.element, this.otherAttrs);
};

ElementSerializer.prototype.nsTagName = function(descriptor) {
  var effectiveNs = this.logNamespaceUsed(descriptor.ns);
  return getElementNs(effectiveNs, descriptor);
};

ElementSerializer.prototype.nsPropertyTagName = function(descriptor) {
  var effectiveNs = this.logNamespaceUsed(descriptor.ns);
  return getPropertyNs(effectiveNs, descriptor);
};

ElementSerializer.prototype.isLocalNs = function(ns) {
  return ns.uri === this.ns.uri;
};

/**
 * Get the actual ns attribute name for the given element.
 *
 * @param {Object} element
 * @param {Boolean} [element.inherited=false]
 *
 * @return {Object} nsName
 */
ElementSerializer.prototype.nsAttributeName = function(element) {

  var ns;

  if (isString(element)) {
    ns = parseNameNS(element);
  } else {
    ns = element.ns;
  }

  // return just local name for inherited attributes
  if (element.inherited) {
    return { localName: ns.localName };
  }

  // parse + log effective ns
  var effectiveNs = this.logNamespaceUsed(ns);

  // LOG ACTUAL namespace use
  this.getNamespaces().logUsed(effectiveNs);

  // strip prefix if same namespace like parent
  if (this.isLocalNs(effectiveNs)) {
    return { localName: ns.localName };
  } else {
    return assign({ localName: ns.localName }, effectiveNs);
  }
};

ElementSerializer.prototype.parseGenericNsAttributes = function(element) {

  return Object.entries(element).filter(
    ([ key, value ]) => !key.startsWith('$') && this.parseNsAttribute(element, key, value)
  ).map(
    ([ key, value ]) => ({ name: key, value: value })
  );
};

ElementSerializer.prototype.collectGenericContainments = function(element) {
  var self = this,
      children = [];

  var bodyText = element.$body;

  if (bodyText) {
    children.push({
      create: function() {
        return new BodySerializer().build({ type: 'String' }, bodyText);
      }
    });
  }

  var genericChildren = element.$children;

  if (genericChildren) {
    forEach(genericChildren, function(child) {
      children.push({
        create: function() {
          return new ElementSerializer(self);
        },
        element: child
      });
    });
  }

  return children;
};

ElementSerializer.prototype.parseNsAttribute = function(element, name, value) {
  var model = element.$model;

  var nameNs = parseNameNS(name);

  var ns;

  // parse xmlns:foo="http://foo.bar"
  if (nameNs.prefix === 'xmlns') {
    ns = { prefix: nameNs.localName, uri: value };
  }

  // parse xmlns="http://foo.bar"
  if (!nameNs.prefix && nameNs.localName === 'xmlns') {
    ns = { uri: value };
  }

  if (!ns) {
    return {
      name: name,
      value: value
    };
  }

  if (model && model.getPackage(value)) {

    // register well known namespace
    this.logNamespace(ns, true, true);
  } else {

    // log custom namespace directly as used
    var actualNs = this.logNamespaceUsed(ns, true);

    this.getNamespaces().logUsed(actualNs);
  }
};


/**
 * Parse namespaces and return a list of left over generic attributes
 *
 * @param  {Object} element
 * @return {Array<Object>}
 */
ElementSerializer.prototype.parseNsAttributes = function(element) {
  var self = this;

  var genericAttrs = element.$attrs;

  var attributes = [];

  // parse namespace attributes first
  // and log them. push non namespace attributes to a list
  // and process them later
  forEach(genericAttrs, function(value, name) {

    var nonNsAttr = self.parseNsAttribute(element, name, value);

    if (nonNsAttr) {
      attributes.push(nonNsAttr);
    }
  });

  return attributes;
};

ElementSerializer.prototype.parseGenericAttributes = function(element, attributes) {

  var self = this;

  forEach(attributes, function(attr) {

    try {
      self.addAttribute(self.nsAttributeName(attr.name), attr.value);
    } catch (e) {

      typeof console !== 'undefined' && console.warn(
        `missing namespace information for <${
          attr.name
        }=${ attr.value }> on`, element, e
      );
    }
  });
};

ElementSerializer.prototype.collectContainments = function(properties) {

  var self = this,
      element = this.element,
      children = [];

  forEach(properties, function(p) {
    var value = element.get(p.name),
        isReference = p.isReference,
        isMany = p.isMany;

    if (!isMany) {
      value = [ value ];
    }

    if (p.isBody) {
      children.push({
        create: function() {
          return new BodySerializer().build(p, value[0]);
        }
      });
    } else if (isSimpleType(p.type)) {
      forEach(value, function(v) {
        children.push({
          create: function() {
            return new ValueSerializer(self.addTagName(self.nsPropertyTagName(p))).build(p, v);
          }
        });
      });
    } else if (isReference) {
      forEach(value, function(v) {
        children.push({
          create: function() {
            return new ReferenceSerializer(self.addTagName(self.nsPropertyTagName(p))).build(v);
          }
        });
      });
    } else {

      // allow serialization via type
      // rather than element name
      var serialization = getSerialization(p);

      forEach(value, function(v) {
        children.push({
          create: function() {
            if (serialization) {
              if (serialization === SERIALIZE_PROPERTY) {
                return new ElementSerializer(self, p);
              }

              return new TypeSerializer(self, p, serialization);
            }

            return new ElementSerializer(self);
          },
          element: v
        });
      });
    }
  });

  return children;
};

ElementSerializer.prototype.getNamespaces = function(local) {

  var namespaces = this.namespaces;

  if (!namespaces) {
    var parentNamespaces = this.getParentNamespaces();

    if (local || !parentNamespaces) {
      this.namespaces = namespaces = new Namespaces(parentNamespaces);
    } else {
      namespaces = parentNamespaces;
    }
  }

  return namespaces;
};

/**
 * Resolve, and memoize, the namespaces scope owned by the closest
 * ancestor serializer.
 *
 * @return {Namespaces|null}
 */
ElementSerializer.prototype.getParentNamespaces = function() {

  if (this.parentNamespaces !== undefined) {
    return this.parentNamespaces;
  }

  var scope = null,
      ancestor = this.parent;

  while (ancestor) {
    if (ancestor.namespaces) {
      scope = ancestor.namespaces;
      break;
    }

    if (ancestor.parentNamespaces !== undefined) {
      scope = ancestor.parentNamespaces;
      break;
    }

    ancestor = ancestor.parent;
  }

  return (this.parentNamespaces = scope);
};

ElementSerializer.prototype.logNamespace = function(ns, wellknown, local) {
  var namespaces = this.getNamespaces(local);

  var nsUri = ns.uri,
      nsPrefix = ns.prefix;

  var existing = namespaces.byUri(nsUri);

  if (!existing || local) {
    namespaces.add(ns, wellknown);
  }

  namespaces.mapPrefix(nsPrefix, nsUri);

  return ns;
};

ElementSerializer.prototype.logNamespaceUsed = function(ns, local) {
  var namespaces = this.getNamespaces(local);

  // ns may be
  //
  //   * prefix only
  //   * prefix:uri
  //   * localName only

  var prefix = ns.prefix,
      uri = ns.uri,
      newPrefix, idx,
      wellknownUri;

  // handle anonymous namespaces (elementForm=unqualified), cf. #23
  if (!prefix && !uri) {
    return { localName: ns.localName };
  }

  wellknownUri = namespaces.defaultUriByPrefix(prefix);

  uri = uri || wellknownUri || namespaces.uriByPrefix(prefix);

  if (!uri) {
    throw new Error('no namespace uri given for prefix <' + prefix + '>');
  }

  ns = namespaces.byUri(uri);

  // register new default prefix <xmlns> in local scope
  if (!ns && !prefix) {
    ns = this.logNamespace({ uri }, wellknownUri === uri, true);
  }

  if (!ns) {
    newPrefix = prefix;
    idx = 1;

    // find a prefix that is not mapped yet
    while (namespaces.uriByPrefix(newPrefix)) {
      newPrefix = prefix + '_' + idx++;
    }

    ns = this.logNamespace({ prefix: newPrefix, uri: uri }, wellknownUri === uri);
  }

  if (prefix) {
    namespaces.mapPrefix(prefix, uri);
  }

  return ns;
};

ElementSerializer.prototype.parseAttributes = function(properties) {
  var self = this,
      element = this.element;

  forEach(properties, function(p) {

    var value = element.get(p.name);

    if (p.isReference) {

      if (!p.isMany) {
        value = value.id;
      } else {
        var values = [];
        forEach(value, function(v) {
          values.push(v.id);
        });

        // IDREFS is a whitespace-separated list of references.
        value = values.join(' ');
      }

    }

    self.addAttribute(self.nsAttributeName(p), value);
  });
};

ElementSerializer.prototype.addTagName = function(nsTagName) {
  var actualNs = this.logNamespaceUsed(nsTagName);

  this.getNamespaces().logUsed(actualNs);

  return nsName(nsTagName);
};

ElementSerializer.prototype.addAttribute = function(name, value) {
  var attrs = this.attrs;

  if (isString(value)) {
    value = escapeAttr(value);
  }

  // de-duplicate attributes
  // https://github.com/bpmn-io/moddle-xml/issues/66
  var idx = findIndex(attrs, function(element) {
    return (
      element.name.localName === name.localName &&
      element.name.uri === name.uri &&
      element.name.prefix === name.prefix
    );
  });

  var attr = { name: name, value: value };

  if (idx !== -1) {
    attrs.splice(idx, 1, attr);
  } else {
    attrs.push(attr);
  }
};

ElementSerializer.prototype.serializeAttributes = function(writer) {
  var attrs = this.attrs,
      namespaces = this.namespaces;

  if (namespaces) {
    attrs = getNsAttrs(namespaces).concat(attrs);
  }

  forEach(attrs, function(a) {
    writer
      .append(' ')
      .append(nsName(a.name)).append('="').append(a.value).append('"');
  });
};

ElementSerializer.prototype.serializeTo = function(writer) {
  serializeTree(this, writer);
};

/**
 * Serialize the serializer tree rooted at the given element serializer to
 * the writer, using an explicit stack to stay flat for nested documents.
 *
 * @param {ElementSerializer} root
 * @param {Object} writer
 */
function serializeTree(root, writer) {

  var stack = [ { serializer: root, index: 0, opened: false, indent: false } ];

  while (stack.length) {
    var frame = stack[stack.length - 1],
        serializer = frame.serializer;

    if (!frame.opened) {
      var firstBody = serializer.body[0];

      frame.indent = firstBody && firstBody.constructor !== BodySerializer;

      writer
        .appendIndent()
        .append('<' + serializer.tagName);

      serializer.serializeAttributes(writer);

      writer.append(firstBody ? '>' : ' />');

      frame.opened = true;

      if (!firstBody) {
        writer.appendNewLine();
        stack.pop();
        continue;
      }

      if (frame.indent) {
        writer
          .appendNewLine()
          .indent();
      }
    }

    if (frame.index < serializer.body.length) {
      var child = serializer.body[frame.index++];

      if (child instanceof ElementSerializer) {
        stack.push({ serializer: child, index: 0, opened: false, indent: false });
      } else {
        child.serializeTo(writer);
      }

      continue;
    }

    if (frame.indent) {
      writer
        .unindent()
        .appendIndent();
    }

    writer
      .append('</' + serializer.tagName + '>')
      .appendNewLine();

    stack.pop();
  }
}

/**
 * A serializer for types that handles serialization of data types
 */
function TypeSerializer(parent, propertyDescriptor, serialization) {
  ElementSerializer.call(this, parent, propertyDescriptor);

  this.serialization = serialization;
}

inherits(TypeSerializer, ElementSerializer);

TypeSerializer.prototype.parseNsAttributes = function(element) {

  // extracted attributes with serialization attribute
  // <type=typeName> stripped; it may be later
  var attributes = ElementSerializer.prototype.parseNsAttributes.call(this, element).filter(
    attr => attr.name !== this.serialization
  );

  var descriptor = element.$descriptor;

  // only serialize <type=typeName> if necessary
  if (descriptor.name === this.propertyDescriptor.type) {
    return attributes;
  }

  var typeNs = this.typeNs = this.nsTagName(descriptor);
  this.getNamespaces().logUsed(this.typeNs);

  // add xsi:type attribute to represent the elements
  // actual type

  var pkg = element.$model.getPackage(typeNs.uri),
      typePrefix = (pkg.xml && pkg.xml.typePrefix) || '';

  this.addAttribute(
    this.nsAttributeName(this.serialization),
    (typeNs.prefix ? typeNs.prefix + ':' : '') + typePrefix + descriptor.ns.localName
  );

  return attributes;
};

TypeSerializer.prototype.isLocalNs = function(ns) {
  return ns.uri === (this.typeNs || this.ns).uri;
};

function SavingWriter() {
  this.value = '';

  this.write = function(str) {
    this.value += str;
  };
}

function FormatingWriter(out, format) {

  var indent = [ '' ];

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
 * @param {Object} options output options to pass into the writer
 */
export function Writer(options) {

  options = assign({ format: false, preamble: true }, options || {});

  function toXML(tree, writer) {
    var internalWriter = writer || new SavingWriter();
    var formatingWriter = new FormatingWriter(internalWriter, options.format);

    if (options.preamble) {
      formatingWriter.append(XML_PREAMBLE);
    }

    var serializer = new ElementSerializer();

    var model = tree.$model;

    serializer.getNamespaces().mapDefaultPrefixes(getDefaultPrefixMappings(model));

    serializer.build(tree).serializeTo(formatingWriter);

    if (!writer) {
      return internalWriter.value;
    }
  }

  return {
    toXML: toXML
  };
}


// helpers ///////////

/**
 * Build the serializer tree for the given root element, iterating an
 * explicit stack rather than recursing so deeply nested documents stay
 * flat.
 *
 * Elements are visited pre-order so namespaces register in document order:
 * `enter` opens an element and returns its children, `exit` runs once its
 * subtree is built.
 *
 * @param {ElementSerializer} rootSerializer
 * @param {Object} rootElement
 */
function buildTree(rootSerializer, rootElement) {

  var stack = [ {
    serializer: rootSerializer,
    children: rootSerializer.enter(rootElement),
    index: 0
  } ];

  while (stack.length) {
    var frame = stack[stack.length - 1];

    if (frame.index >= frame.children.length) {
      frame.serializer.exit();
      stack.pop();
      continue;
    }

    var child = frame.children[frame.index++];

    var childSerializer = child.create();

    frame.serializer.body.push(childSerializer);

    if (child.element) {
      stack.push({
        serializer: childSerializer,
        children: childSerializer.enter(child.element),
        index: 0
      });
    }
  }
}

/**
 * @param {Moddle} model
 *
 * @return { Record<string, string> } map from prefix to URI
 */
function getDefaultPrefixMappings(model) {

  const nsMap = model.config && model.config.nsMap || {};

  const prefixMap = {};

  // { prefix -> uri }
  for (const prefix in DEFAULT_NS_MAP) {
    prefixMap[prefix] = DEFAULT_NS_MAP[prefix];
  }

  // { uri -> prefix }
  for (const uri in nsMap) {
    const prefix = nsMap[uri];

    prefixMap[prefix] = uri;
  }

  for (const pkg of model.getPackages()) {
    prefixMap[pkg.prefix] = pkg.uri;
  }

  return prefixMap;
}