/**
 * Defines parameters such as timing and sampleset for an interval.
 * for pp calculation we only need time and ms_per_beat
 * it can inherit from its preceeding point by having
 * change = false and setting ms_per_beat to a negative value which
 * represents the bpm multiplier as ```-100 * bpm_multiplier```
 */
class timing {
  /**
   * Timing Class Constructor.
   * @param {Object} values An Object of Values for construction of Timing.
   */
  constructor(values) {
    this.time = values.time || 0.0;
    this.ms_per_beat =
      values.ms_per_beat === undefined ? 600.0 : values.ms_per_beat;

    this.change = values.change === undefined ? true : values.change;
  }
  /**
   * Function to return a String from the current Instance.
   * Debugging Puposes only.
   * @return {String} Constructued String.
   */
  toString() {
    return JSON.stringify(this);
  }
}

module.exports = timing;
