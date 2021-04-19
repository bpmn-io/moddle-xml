# Changelog

All notable changes to [moddle-xml](https://github.com/bpmn-io/moddle-xml) are documented here. We use [semantic versioning](http://semver.org/) for releases.

## Unreleased

___Note:__ Yet to be released changes appear here._

## 9.0.5

* `FIX`: correct serialization of `xml` namespace attributes on `Any` elements ([#60](https://github.com/bpmn-io/moddle-xml/issues/60))

## 9.0.4

* `FIX`: make hasOwnProperty check safe ([#54](https://github.com/bpmn-io/moddle-xml/pull/54))

## 9.0.3

* `FIX`: handle default `xml` namespace ([#50](https://github.com/bpmn-io/moddle-xml/issues/50))

## 8.0.8

* `FIX`: handle default `xml` namespace

## 9.0.2

* `FIX`: recursively log namespace as used ([#49](https://github.com/bpmn-io/moddle-xml/pull/49))

## 8.0.7

* `FIX`: recursively log namespace as used ([#49](https://github.com/bpmn-io/moddle-xml/pull/49))

## 9.0.1

* `FIX`: correctly serialize nested local namespaced elements ([#47](https://github.com/bpmn-io/moddle-xml/pull/47))

## 8.0.6

* `FIX`: correctly serialize nested local namespaced elements ([#48](https://github.com/bpmn-io/moddle-xml/pull/48))

## 9.0.0

* `FEAT`: promisify `Reader#fromXML` ([#45](https://github.com/bpmn-io/moddle-xml/pull/45))

### Breaking Changes

* `Reader#fromXML` API now returns a Promise. Support for callbacks is dropped. Refer to the [documentation](https://github.com/bpmn-io/moddle-xml#read-xml) for updated usage information.

## 8.0.5

_Republish of `v8.0.4`._

## 8.0.4

* `CHORE`: bump to `saxen@8.1.2`

## 8.0.3

* `CHORE`: bump to `saxen@8.1.1`

## 8.0.2

* `FIX`: read element as type if conflicting named propery is defines an attribute ([#43](https://github.com/bpmn-io/moddle-xml/issues/43))

## 8.0.1

* `DOCS`: update documentation

## 8.0.0

* `FEAT`: provide pre-packaged distribution
* `CHORE`: bump to `moddle@5`

## 7.5.0

* `FEAT`: validate ID attributes are [QNames](http://www.w3.org/TR/REC-xml/#NT-NameChar)

## 7.4.1

* `FIX`: make ES5 compliant

## 7.4.0

* `CHORE`: get rid of `tiny-stack` as a dependency ([#38](https://github.com/bpmn-io/moddle-xml/pull/38))

## 7.3.0

* `FEAT`: warn on unexpected body text
* `FEAT`: warn on text outside root node
* `CHORE`: remove `console.log` during import ([#28](https://github.com/bpmn-io/moddle-xml/issues/28))
* `CHORE`: bump to [`saxen@8.1.0`](https://github.com/nikku/saxen/blob/master/CHANGELOG.md#810)

## 7.2.3

* `FIX`: correctly serialize extension attributes along with typed elements

## 7.2.0

* `FEAT`: warn on invalid attributes under well-known namespaces ([#32](https://github.com/bpmn-io/moddle-xml/issues/32))

## 7.1.0

* `CHORE`: bump dependency versions

## 7.0.0

### Breaking Changes

* `FEAT`: migrate to ES modules. Use `esm` or a ES module aware transpiler to consume this library.

## 6.0.0

* `FEAT`: encode entities in body properties (instead of escaping via `CDATA`) ([`5645b582`](https://github.com/bpmn-io/moddle-xml/commit/5645b5822644a461eba9f3da481362475f040984))

## 5.0.2

* `FIX`: properly handle `.` in attribute names

## 5.0.1

* `FIX`: decode entities in `text` nodes

## 5.0.0

* `FEAT`: replace lodash with [min-dash](https://github.com/bpmn-io/min-dash)
* `FEAT`: don't bail out from attribute parsing on parse errors  ([`fd0c8b40`](https://github.com/bpmn-io/moddle-xml/commit/fd0c8b4084b4d92565dd7d3099e283fbb98f1dd0))

## ...

Check `git log` for earlier history.
