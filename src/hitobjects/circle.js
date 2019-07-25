/**
 * This is a class representing Circles.
 * Stored in the objects are in playfield coordinates (512*384 rect)
 */
class Circle {
  /**
   * Constructs the circle Object.
   * @param {Object} values Object Representing Postion.
   */
  constructor(values) {
    this.pos = values.pos || [0, 0];
  }
  /**
   * Debugging Function; Returns string of the object.
   * @return {String}
   */
  toString() {
    return JSON.stringify(this);
  }
}

module.exports = {
  Circle: Circle,
};
