/**
 * bitmask constants for object types. note that the type can
 * contain other flags so you should always check type with
 * ```if (type & objtypes.circle) { ... }```
 */
const objtypes = {
  circle: 1 << 0,
  slider: 1 << 1,
  spinner: 1 << 3,
};

module.exports = {
  objtypes: objtypes,
};
