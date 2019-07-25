// internal utilities
// ----------------------------------------------------------------

// override console with nop when running in a browser

let log = {warn: Function.prototype};

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
function arrayToFixed(arr, n) {
  return Array.from(arr, (x) => x.toFixed(n)); // toFixed is for int
}

function isUndefined(val) {
  return typeof val === 'undefined';
}

module.exports = {
  log: log,
  arrayToFixed: arrayToFixed,
  isUndefined: isUndefined,
};
