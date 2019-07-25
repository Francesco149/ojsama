const {objtypes} = require('./hitobjects');

const modes = {
  std: 0,
};

/**
 * Partial beatmap structure with just enough data for pp calculation.
 */
class beatmap {
  /**
   * Constructor for a beatmap.
   */
  constructor() {
    this.format_version = 1;
    this.mode = modes.std;
    this.title = this.title_unicode = '';
    this.artist = this.artist_unicode = '';
    this.creator = '';
    this.version = '';
    this.ar = undefined;
    this.cs = this.od = this.hp = 5.0;
    this.sv = this.tick_rate = 1.0;
    this.ncircles = this.nsliders = this.nspinners = 0;
    if (!this.objects) {
      this.objects = [];
    } else {
      this.objects.length = 0;
    }
    if (!this.timing_points) {
      this.timing_points = [];
    } else {
      this.timing_points.length = 0;
    }
  }

  /**
   * Calculates Maximum Combo of the map.
   * @return {int} Maximum Combo of a map.
   */
  maxCombo() {
    // this is given by ncircles + nspinners + nsliders * 2
    // (heads and tails) + nsliderticks
    //
    // we approximate slider ticks by calculating the
    // playfield pixels per beat for the current section
    // and dividing the total distance travelled by
    // pixels per beat. this gives us the number of beats,
    // which multiplied by the tick rate gives use the
    // tick count.

    let res = this.ncircles + this.nspinners;
    let tindex = -1;
    let tnext = Number.NEGATIVE_INFINITY;
    let pxPerBeat = 0.0;
    for (let i = 0; i < this.objects.length; ++i) {
      const obj = this.objects[i];
      if (!(obj.type & objtypes.slider)) {
        continue;
      }
      // keep track of the current timing point without
      // looping through all of them for every object
      while (obj.time >= tnext) {
        ++tindex;
        if (this.timing_points.length > tindex + 1) {
          tnext = this.timing_points[tindex + 1].time;
        } else {
          tnext = Number.POSITIVE_INFINITY;
        }
        const t = this.timing_points[tindex];
        let svMultiplier = 1.0;
        if (!t.change && t.ms_per_beat < 0) {
          svMultiplier = -100.0 / t.ms_per_beat;
        }
        // beatmaps older than format v8 don't apply
        // the bpm multiplier to slider ticks
        if (this.format_version < 8) {
          pxPerBeat = this.sv * 100.0;
        } else {
          pxPerBeat = this.sv * 100.0 * svMultiplier;
        }
      }
      const sl = obj.data;
      const numBeats = (sl.distance * sl.repetitions) / pxPerBeat;
      // subtract an epsilon to prevent accidental
      // ceiling of whole values such as 2.00....1 -> 3 due
      // to rounding errors
      let ticks = Math.ceil(
          ((numBeats - 0.1) / sl.repetitions) * this.tick_rate
      );
      --ticks;
      ticks *= sl.repetitions;
      ticks += sl.repetitions + 1;
      res += Math.max(0, ticks);
    }
    return res;
  }
  /**
   * Used for Debug.
   * @return {String}
   */
  toString() {
    let res = this.artist + ' - ' + this.title + ' [';
    if (this.title_unicode || this.artist_unicode) {
      res += '(' + this.artist_unicode + ' - ' + this.title_unicode + ')';
    }
    res +=
      this.version +
      '] mapped by ' +
      this.creator +
      '\n' +
      '\n' +
      'AR' +
      parseFloat(this.ar.toFixed(2)) +
      ' ' +
      'OD' +
      parseFloat(this.od.toFixed(2)) +
      ' ' +
      'CS' +
      parseFloat(this.cs.toFixed(2)) +
      ' ' +
      'HP' +
      parseFloat(this.hp.toFixed(2)) +
      '\n' +
      this.ncircles +
      ' circles, ' +
      this.nsliders +
      ' sliders, ' +
      this.nspinners +
      ' spinners' +
      '\n' +
      this.maxCombo() +
      ' max combo' +
      '\n';
    return res;
  }
}

module.exports = {
  modes: modes,
  beatmap: beatmap,
};
