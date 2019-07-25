// timing point
// ----------------------------------------------------------------
// defines parameters such as timing and sampleset for an interval.
// for pp calculation we only need time and ms_per_beat
//
// it can inherit from its preceeding point by having
// change = false and setting ms_per_beat to a negative value which
// represents the bpm multiplier as ```-100 * bpm_multiplier```

class timing {
  constructor(values) {
    this.time = values.time || 0.0;
    this.ms_per_beat = values.ms_per_beat;
    if (this.ms_per_beat === undefined) {
      this.ms_per_beat = 600.0;
    }
    this.change = values.change;
    if (this.change === undefined) {
      this.change = true;
    }
  }
  toString() {
    return (
      '{ time: ' +
      this.time.toFixed(2) +
      ', ' +
      'ms_per_beat: ' +
      this.ms_per_beat.toFixed(2) +
      ' }'
    );
  }
}

module.exports = timing;
