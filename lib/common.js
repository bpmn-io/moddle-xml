export function hasLowerCaseAlias(pkg) {
  return pkg.xml && pkg.xml.tagAlias === 'lowerCase';
}

export var DEFAULT_NS_MAP = {
  'xsi': 'http://www.w3.org/2001/XMLSchema-instance',
  'xml': 'http://www.w3.org/XML/1998/namespace'
};

export var SERIALIZE_PROPERTY = 'property';

export function getSerialization(element) {
  return element.xml && element.xml.serialize;
}

export function getSerializationType(element) {
  const type = getSerialization(element);

  return type !== SERIALIZE_PROPERTY && (type || null);
}