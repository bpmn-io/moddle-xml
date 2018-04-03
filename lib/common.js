export function hasLowerCaseAlias(pkg) {
  return pkg.xml && pkg.xml.tagAlias === 'lowerCase';
}

export var DEFAULT_NS_MAP = {
  'xsi': 'http://www.w3.org/2001/XMLSchema-instance'
};

export var XSI_TYPE = 'xsi:type';

function serializeFormat(element) {
  return element.xml && element.xml.serialize;
}

export function serializeAsType(element) {
  return serializeFormat(element) === XSI_TYPE;
}

export function serializeAsProperty(element) {
  return serializeFormat(element) === 'property';
}