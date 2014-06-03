'use strict';


function hasLowerCaseAlias(pkg) {
  return pkg.xml && pkg.xml.alias === 'lowerCase';
}

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function aliasToName(alias, pkg) {
  if (hasLowerCaseAlias(pkg)) {
    return capitalize(alias);
  } else {
    return alias;
  }
}


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


module.exports.aliasToName = aliasToName;
module.exports.nameToAlias = nameToAlias;


var DEFAULT_NS_MAP = {
  'xsi': 'http://www.w3.org/2001/XMLSchema-instance'
};


module.exports.DEFAULT_NS_MAP = DEFAULT_NS_MAP;