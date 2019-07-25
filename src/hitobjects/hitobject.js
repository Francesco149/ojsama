/**
 * Generic hitobject
 * the only common property is start time (in millisecond).
 * object-specific properties are stored in data, which can be
 * an instance of circle, slider, or null
 */
class hitobject {
  /**
   * @param {Object} values Object used to Construct the HitObject.
   */
  constructor(values) {
    this.time = values.time || 0.0;
    this.type = values.type || 0;
    if (typeof values.data !== 'undefined') this.data = values.data;
  }

  /**
   * @return {string}
   */
  typestr() {
    let res = '';
    if (this.type & objtypes.circle) res += 'circle | ';
    if (this.type & objtypes.slider) res += 'slider | ';
    if (this.type & objtypes.spinner) res += 'spinner | ';
    return res.substring(0, Math.max(0, res.length - 3));
  }

  /**
   * Debugging Function.
   * @return {string}
   */
  toString() {
    return JSON.stringify(this);
  }
}

module.exports = hitobject;
