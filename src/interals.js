// internal utilities
// ----------------------------------------------------------------

// override console with nop when running in a browser

let log;

if (typeof exports !== 'undefined') {
  log = console;
}
/**
 * Formats an Array using fixed point Notation.
 * @param {Array} arr An Array of intergers needed
 * to be fixed to some decimal digits.
 * @param {int} n Number of decimal digits to fix/approximate.
 * @return {Array} Processed integers
 */
module.exports.array_toFixed = function(arr, n) {
  return (res = Array.from(arr, (x) => x.toFixed(n))); // toFixed is for int
};

module.exports.isUndefined = function(val) {
  return typeof val === 'undefined';
};

module.exports.log = {warn: Function.prototype};
