// hit objects
// ----------------------------------------------------------------
// partial structure of osu! hitobjects with just enough data for
// pp calculation

// bitmask constants for object types. note that the type can
// contain other flags so you should always check type with
// ```if (type & objtypes.circle) { ... }```

const objtypes = {
  circle: 1 << 0,
  slider: 1 << 1,
  spinner: 1 << 3,
};

// all we need from circles is their position. all positions
// stored in the objects are in playfield coordinates (512*384
// rect)
class circle {
  constructor(values) {
    this.pos = values.pos || [0, 0];
  }
  toString() {
    return 'pos: [' + arrayToFixed(this.pos, 2) + ']';
  }
}

// to calculate max combo we need to compute slider ticks
//
// the beatmap stores the distance travelled in one repetition and
// the number of repetitions. this is enough to calculate distance
// per tick using timing information and slider velocity.
//
// note that 1 repetition means no repeats (1 loop)
class slider {
  constructor(values) {
    this.pos = values.pos || [0, 0];
    this.distance = values.distance || 0.0;
    this.repetitions = values.repetitions || 1;
  }
  toString() {
    return (
      'pos: ' +
      arrayToFixed(this.pos, 2) +
      ', ' +
      'distance: ' +
      this.distance.toFixed(2) +
      ', ' +
      'repetitions: ' +
      this.repetitions
    );
  }
}
const {arrayToFixed, isUndefined} = require('./interals');
// generic hitobject
//
// the only common property is start time (in millisecond).
// object-specific properties are stored in data, which can be
// an instance of circle, slider, or null
class hitobject {
  constructor(values) {
    this.time = values.time || 0.0;
    this.type = values.type || 0;
    if (!isUndefined(values.data)) this.data = values.data;
  }
  typestr() {
    let res = '';
    if (this.type & objtypes.circle) res += 'circle | ';
    if (this.type & objtypes.slider) res += 'slider | ';
    if (this.type & objtypes.spinner) res += 'spinner | ';
    return res.substring(0, Math.max(0, res.length - 3));
  }
  toString() {
    return (
      '{ time: ' +
      this.time.toFixed(2) +
      ', ' +
      'type: ' +
      this.typestr() +
      (this.data ? ', ' + this.data.toString() : '') +
      ' }'
    );
  }
}
module.exports = {
  objtypes: objtypes,
  circle: circle,
  slider: slider,
  hitobject: hitobject,
};
