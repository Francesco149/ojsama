/**
 * To calculate max combo we need to compute slider ticks
 * the beatmap stores the distance travelled in one repetition and
 * the number of repetitions. this is enough to calculate distance
 * note that 1 repetition means no repeats (1 loop)
 * per tick using timing information and slider velocity.
 */
class slider {
  /**
   * @param {Object} values For Constructing the slider.
   */
  constructor(values) {
    this.pos = values.pos || [0, 0];
    this.distance = values.distance || 0.0;
    this.repetitions = values.repetitions || 1;
  }
  /**
   * DebugFunction.
   * @return {String}
   */
  toString() {
    return JSON.stringify(this);
  }
}

module.exports = slider;
