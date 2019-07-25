const {arrayToFixed} = require('./interals');
const {objtypes} = require('./hitobjects');
const {modes} = require('./beatmap');
// difficulty calculation
// ----------------------------------------------------------------

// mods bitmask constants
// NOTE: td is touch device, but it's also the value for the
// legacy no video mod

class modbits {
  constructor() {
    this.nomod = 0;
    this.nf = 1 << 0;
    this.ez = 1 << 1;
    this.td = 1 << 2;
    this.hd = 1 << 3;
    this.hr = 1 << 4;
    this.dt = 1 << 6;
    this.ht = 1 << 8;
    this.nc = 1 << 9;
    this.fl = 1 << 10;
    this.so = 1 << 12;
  }
}

// construct the mods bitmask from a string such as "HDHR"

modbits.from_string = function(str) {
  let mask = 0;
  str = str.toLowerCase();
  while (str != '') {
    let nchars = 1;
    for (const property in modbits) {
      if (property.length != 2) {
        continue;
      }
      if (!modbits.hasOwnProperty(property)) {
        continue;
      }
      if (str.startsWith(property)) {
        mask |= modbits[property];
        nchars = 2;
        break;
      }
    }
    str = str.slice(nchars);
  }
  return mask;
};

// convert mods bitmask into a string, such as "HDHR"

modbits.string = function(mods) {
  let res = '';
  for (const property in modbits) {
    if (property.length != 2) {
      continue;
    }
    if (!modbits.hasOwnProperty(property)) {
      continue;
    }
    if (mods & modbits[property]) {
      res += property.toUpperCase();
    }
  }
  if (res.indexOf('DT') >= 0 && res.indexOf('NC') >= 0) {
    res = res.replace('DT', '');
  }
  return res;
};

modbits.speed_changing = modbits.dt | modbits.ht | modbits.nc;
modbits.map_changing = modbits.hr | modbits.ez | modbits.speed_changing;

// _(internal)_
// osu!standard stats constants

const OD0_MS = 80;
const OD10_MS = 20;
const AR0_MS = 1800.0;
const AR5_MS = 1200.0;
const AR10_MS = 450.0;

const OD_MS_STEP = (OD0_MS - OD10_MS) / 10.0;
const AR_MS_STEP1 = (AR0_MS - AR5_MS) / 5.0;
const AR_MS_STEP2 = (AR5_MS - AR10_MS) / 5.0;

// _(internal)_
// utility functions to apply speed and flat multipliers to
// stats where speed changes apply (ar and od)

function modify_ar(base_ar, speed_mul, multiplier) {
  let ar = base_ar;
  ar *= multiplier;

  // convert AR into milliseconds window

  let arms =
    ar < 5.0 ? AR0_MS - AR_MS_STEP1 * ar : AR5_MS - AR_MS_STEP2 * (ar - 5.0);

  // stats must be capped to 0-10 before HT/DT which
  // brings them to a range of -4.42->11.08 for OD and
  // -5->11 for AR

  arms = Math.min(AR0_MS, Math.max(AR10_MS, arms));
  arms /= speed_mul;

  ar =
    arms > AR5_MS
      ? (AR0_MS - arms) / AR_MS_STEP1
      : 5.0 + (AR5_MS - arms) / AR_MS_STEP2;
  return ar;
}

function modify_od(base_od, speed_mul, multiplier) {
  let od = base_od;
  od *= multiplier;
  let odms = OD0_MS - Math.ceil(OD_MS_STEP * od);
  odms = Math.min(OD0_MS, Math.max(OD10_MS, odms));
  odms /= speed_mul;
  od = (OD0_MS - odms) / OD_MS_STEP;
  return od;
}

// stores osu!standard beatmap stats
class std_beatmap_stats {
  constructor(values) {
    this.ar = values.ar;
    this.od = values.od;
    this.hp = values.hp;
    this.cs = values.cs;
    this.speed_mul = 1.0;
    // previously calculated mod combinations are cached in a map
    this._mods_cache = {};
  }
  // applies difficulty modifiers to a map's ar, od, cs, hp and
  // returns the modified stats and the speed multiplier.
  //
  // unspecified stats are ignored and not returned
  with_mods(mods) {
    if (this._mods_cache[mods]) {
      return this._mods_cache[mods];
    }
    const stats = (this._mods_cache[mods] = new std_beatmap_stats(this));
    if (!(mods & modbits.map_changing)) {
      return stats;
    }
    if (mods & (modbits.dt | modbits.nc)) {
      stats.speed_mul = 1.5;
    }
    if (mods & modbits.ht) {
      stats.speed_mul *= 0.75;
    }
    let od_ar_hp_multiplier = 1.0;
    if (mods & modbits.hr) od_ar_hp_multiplier = 1.4;
    if (mods & modbits.ez) od_ar_hp_multiplier *= 0.5;
    if (stats.ar) {
      stats.ar = modify_ar(stats.ar, stats.speed_mul, od_ar_hp_multiplier);
    }
    if (stats.od) {
      stats.od = modify_od(stats.od, stats.speed_mul, od_ar_hp_multiplier);
    }
    if (stats.cs) {
      if (mods & modbits.hr) stats.cs *= 1.3;
      if (mods & modbits.ez) stats.cs *= 0.5;
      stats.cs = Math.min(10.0, stats.cs);
    }
    if (stats.hp) {
      stats.hp *= od_ar_hp_multiplier;
      stats.hp = Math.min(10.0, stats.hp);
    }
    return stats;
  }
}

// osu! standard hit object with difficulty calculation values
// obj is the underlying hitobject
class std_diff_hitobject {
  constructor(obj) {
    this.obj = obj;
    this.reset();
  }
  reset() {
    this.strains = [0.0, 0.0];
    this.normpos = [0.0, 0.0];
    this.angle = 0.0;
    this.is_single = false;
    this.delta_time = 0.0;
    this.d_distance = 0.0;
    return this;
  }
  toString() {
    return (
      '{ strains: [' +
      arrayToFixed(this.strains, 2) +
      '], normpos: [' +
      arrayToFixed(this.normpos, 2) +
      '], is_single: ' +
      this.is_single +
      ' }'
    );
  }
}

// _(internal)_
// 2D point operations

function vec_sub(a, b) {
  return [a[0] - b[0], a[1] - b[1]];
}
function vec_mul(a, b) {
  return [a[0] * b[0], a[1] * b[1]];
}
function vec_len(v) {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
}
function vec_dot(a, b) {
  return a[0] * b[0] + a[1] * b[1];
}

// _(internal)_
// difficulty calculation constants

const DIFF_SPEED = 0;
const DIFF_AIM = 1;
const SINGLE_SPACING = 125.0;
const DECAY_BASE = [0.3, 0.15];
const WEIGHT_SCALING = [1400.0, 26.25];
const DECAY_WEIGHT = 0.9;
const STRAIN_STEP = 400.0;
const CIRCLESIZE_BUFF_THRESHOLD = 30.0;
const STAR_SCALING_FACTOR = 0.0675;
const PLAYFIELD_SIZE = [512.0, 384.0];
const PLAYFIELD_CENTER = vec_mul(PLAYFIELD_SIZE, [0.5, 0.5]);
const EXTREME_SCALING_FACTOR = 0.5;

// osu!standard difficulty calculator
//
// does not account for sliders because slider calculations are
// expensive and not worth the small accuracy increase
class std_diff {
  constructor() {
    this.objects = [];
    this.reset();
    // make some parameters persist so they can be
    // re-used in subsequent calls if no new value is specified
    this.map = undefined;
    this.mods = modbits.nomod;
    this.singletap_threshold = 125.0;
  }
  reset() {
    // star rating
    this.total = 0.0;
    this.aim = 0.0;
    this.aim_difficulty = 0.0;
    this.aim_length_bonus = 0.0;
    this.speed = 0.0;
    this.speed_difficulty = 0.0;
    this.speed_length_bonus = 0.0;
    // number of notes that are seen as singletaps by the
    // difficulty calculator
    this.nsingles = 0;
    // number of notes that are faster than the interval given
    // in calc(). these singletap statistic are not required in
    // star rating, but they are a free byproduct of the
    // calculation which could be useful
    this.nsingles_threshold = 0;
  }
  _length_bonus(stars, difficulty) {
    return 0.32 + 0.5 * (Math.log10(difficulty + stars) - Math.log10(stars));
  }
  // calculate difficulty and return current instance, which
  // contains the results
  //
  // params:
  // * map: the beatmap we want to calculate difficulty for. if
  //   unspecified, it will default to the last map used
  //   in previous calls.
  // * mods: mods bitmask, defaults to modbits.nomod
  // * singletap_threshold: interval threshold in milliseconds
  //   for singletaps. defaults to 240 bpm 1/2 singletaps
  //   ```(60000 / 240) / 2``` .
  //   see nsingles_threshold
  calc(params) {
    const map = (this.map = params.map || this.map);
    if (!map) {
      throw new TypeError('no map given');
    }
    const mods = (this.mods = params.mods || this.mods);
    var singletap_threshold = (this.singletap_threshold =
      params.singletap_threshold || singletap_threshold);
    // apply mods to the beatmap's stats
    const stats = new std_beatmap_stats({cs: map.cs}).with_mods(mods);
    const speed_mul = stats.speed_mul;
    this._init_objects(this.objects, map, stats.cs);
    const speed = this._calc_individual(DIFF_SPEED, this.objects, speed_mul);
    this.speed = speed.difficulty;
    this.speed_difficulty = speed.total;
    const aim = this._calc_individual(DIFF_AIM, this.objects, speed_mul);
    this.aim = aim.difficulty;
    this.aim_difficulty = aim.total;
    this.aim_length_bonus = this._length_bonus(this.aim, this.aim_difficulty);
    this.speed_length_bonus = this._length_bonus(
        this.speed,
        this.speed_difficulty
    );
    this.aim = Math.sqrt(this.aim) * STAR_SCALING_FACTOR;
    this.speed = Math.sqrt(this.speed) * STAR_SCALING_FACTOR;
    if (mods & modbits.td) {
      this.aim = Math.pow(this.aim, 0.8);
    }
    // total stars mixes speed and aim in such a way that
    // heavily aim or speed focused maps get a bonus
    this.total =
      this.aim +
      this.speed +
      Math.abs(this.speed - this.aim) * EXTREME_SCALING_FACTOR;
    // singletap stats
    this.nsingles = 0;
    this.nsingles_threshold = 0;
    for (let i = 1; i < this.objects.length; ++i) {
      const obj = this.objects[i].obj;
      const prev = this.objects[i - 1].obj;
      if (this.objects[i].is_single) {
        ++this.nsingles;
      }
      if (!(obj.type & (objtypes.circle | objtypes.slider))) {
        continue;
      }
      const interval = (obj.time - prev.time) / speed_mul;
      if (interval >= singletap_threshold) {
        ++this.nsingles_threshold;
      }
    }
    return this;
  }
  toString() {
    return (
      this.total.toFixed(2) +
      ' stars (' +
      this.aim.toFixed(2) +
      ' aim, ' +
      this.speed.toFixed(2) +
      ' speed)'
    );
  }
  _spacing_weight(
      type,
      distance,
      delta_time,
      prev_distance,
      prev_delta_time,
      angle
  ) {
    let angle_bonus;
    const strain_time = Math.max(delta_time, 50.0);
    switch (type) {
      case DIFF_AIM: {
        const prev_strain_time = Math.max(prev_delta_time, 50.0);
        let result = 0.0;
        if (angle !== null && angle > AIM_ANGLE_BONUS_BEGIN) {
          angle_bonus = Math.sqrt(
              Math.max(prev_distance - ANGLE_BONUS_SCALE, 0.0) *
              Math.pow(Math.sin(angle - AIM_ANGLE_BONUS_BEGIN), 2.0) *
              Math.max(distance - ANGLE_BONUS_SCALE, 0.0)
          );
          result =
            (1.5 * Math.pow(Math.max(0.0, angle_bonus), 0.99)) /
            Math.max(AIM_TIMING_THRESHOLD, prev_strain_time);
        }
        const weighted_distance = Math.pow(distance, 0.99);
        return Math.max(
            result +
            weighted_distance / Math.max(AIM_TIMING_THRESHOLD, strain_time),
            weighted_distance / strain_time
        );
      }
      case DIFF_SPEED: {
        distance = Math.min(distance, SINGLE_SPACING);
        delta_time = Math.max(delta_time, MAX_SPEED_BONUS);
        let speed_bonus = 1.0;
        if (delta_time < MIN_SPEED_BONUS) {
          speed_bonus += Math.pow((MIN_SPEED_BONUS - delta_time) / 40.0, 2);
        }
        angle_bonus = 1.0;
        if (angle !== null && angle < SPEED_ANGLE_BONUS_BEGIN) {
          const s = Math.sin(1.5 * (SPEED_ANGLE_BONUS_BEGIN - angle));
          angle_bonus += Math.pow(s, 2) / 3.57;
          if (angle < Math.PI / 2.0) {
            angle_bonus = 1.28;
            if (distance < ANGLE_BONUS_SCALE && angle < Math.PI / 4.0) {
              angle_bonus +=
                (1.0 - angle_bonus) *
                Math.min((ANGLE_BONUS_SCALE - distance) / 10.0, 1.0);
            } else if (distance < ANGLE_BONUS_SCALE) {
              angle_bonus +=
                (1.0 - angle_bonus) *
                Math.min((ANGLE_BONUS_SCALE - distance) / 10.0, 1.0) *
                Math.sin(((Math.PI / 2.0 - angle) * 4.0) / Math.PI);
            }
          }
        }
        return (
          ((1 + (speed_bonus - 1) * 0.75) *
            angle_bonus *
            (0.95 + speed_bonus * Math.pow(distance / SINGLE_SPACING, 3.5))) /
          strain_time
        );
      }
    }
    throw {
      name: 'NotImplementedError',
      message: 'this difficulty type does not exist',
    };
  }
  // _(internal)_
  // calculate a single strain and store it in the diffobj
  _calc_strain(type, diffobj, prev_diffobj, speed_mul) {
    const obj = diffobj.obj;
    const prev_obj = prev_diffobj.obj;
    let value = 0.0;
    const time_elapsed = (obj.time - prev_obj.time) / speed_mul;
    const decay = Math.pow(DECAY_BASE[type], time_elapsed / 1000.0);
    diffobj.delta_time = time_elapsed;
    if ((obj.type & (objtypes.slider | objtypes.circle)) != 0) {
      const distance = vec_len(vec_sub(diffobj.normpos, prev_diffobj.normpos));
      diffobj.d_distance = distance;
      if (type == DIFF_SPEED) {
        diffobj.is_single = distance > SINGLE_SPACING;
      }
      value = this._spacing_weight(
          type,
          distance,
          time_elapsed,
          prev_diffobj.d_distance,
          prev_diffobj.delta_time,
          diffobj.angle
      );
      value *= WEIGHT_SCALING[type];
    }
    diffobj.strains[type] = prev_diffobj.strains[type] * decay + value;
  }
  // _(internal)_
  // calculate a specific type of difficulty
  //
  // the map is analyzed in chunks of STRAIN_STEP duration.
  // for each chunk the highest hitobject strains are added to
  // a list which is then collapsed into a weighted sum, much
  // like scores are weighted on a user's profile.
  //
  // for subsequent chunks, the initial max strain is calculated
  // by decaying the previous hitobject's strain until the
  // beginning of the new chunk
  //
  // the first object doesn't generate a strain
  // so we begin with an incremented interval end
  //
  // also don't forget to manually add the peak strain for the last
  // section which would otherwise be ignored
  _calc_individual(type, diffobjs, speed_mul) {
    const strains = [];
    const strain_step = STRAIN_STEP * speed_mul;
    let interval_end =
      Math.ceil(diffobjs[0].obj.time / strain_step) * strain_step;
    let max_strain = 0.0;
    let i;
    for (i = 0; i < diffobjs.length; ++i) {
      if (i > 0) {
        this._calc_strain(type, diffobjs[i], diffobjs[i - 1], speed_mul);
      }
      while (diffobjs[i].obj.time > interval_end) {
        strains.push(max_strain);
        if (i > 0) {
          const decay = Math.pow(
              DECAY_BASE[type],
              (interval_end - diffobjs[i - 1].obj.time) / 1000.0
          );
          max_strain = diffobjs[i - 1].strains[type] * decay;
        } else {
          max_strain = 0.0;
        }
        interval_end += strain_step;
      }
      max_strain = Math.max(max_strain, diffobjs[i].strains[type]);
    }
    strains.push(max_strain);
    let weight = 1.0;
    let total = 0.0;
    let difficulty = 0.0;
    strains.sort(function(a, b) {
      return b - a;
    });
    for (i = 0; i < strains.length; ++i) {
      total += Math.pow(strains[i], 1.2);
      difficulty += strains[i] * weight;
      weight *= DECAY_WEIGHT;
    }
    return {difficulty: difficulty, total: total};
  }
  // _(internal)_
  // positions are normalized on circle radius so that we can
  // calc as if everything was the same circlesize.
  //
  // this creates a scaling vector that normalizes positions
  _normalizer_vector(circlesize) {
    const radius =
      (PLAYFIELD_SIZE[0] / 16.0) * (1.0 - (0.7 * (circlesize - 5.0)) / 5.0);
    let scaling_factor = 52.0 / radius;
    // high circlesize (small circles) bonus
    if (radius < CIRCLESIZE_BUFF_THRESHOLD) {
      scaling_factor *=
        1.0 + Math.min(CIRCLESIZE_BUFF_THRESHOLD - radius, 5.0) / 50.0;
    }
    return [scaling_factor, scaling_factor];
  }
  // _(internal)_
  // initialize diffobjs (or reset if already initialized) and
  // populate it with the normalized position of the map's
  // objects
  _init_objects(diffobjs, map, circlesize) {
    if (diffobjs.length != map.objects.length) {
      diffobjs.length = map.objects.length;
    }
    const scaling_vec = this._normalizer_vector(circlesize);
    const normalized_center = vec_mul(PLAYFIELD_CENTER, scaling_vec);
    for (let i = 0; i < diffobjs.length; ++i) {
      if (!diffobjs[i]) {
        diffobjs[i] = new std_diff_hitobject(map.objects[i]);
      } else {
        diffobjs[i].reset();
      }
      var pos;
      const obj = diffobjs[i].obj;
      if (obj.type & objtypes.spinner) {
        diffobjs[i].normpos = normalized_center.slice();
      } else if (obj.type & (objtypes.slider | objtypes.circle)) {
        diffobjs[i].normpos = vec_mul(obj.data.pos, scaling_vec);
      }
      if (i >= 2) {
        const prev1 = diffobjs[i - 1];
        const prev2 = diffobjs[i - 2];
        const v1 = vec_sub(prev2.normpos, prev1.normpos);
        const v2 = vec_sub(diffobjs[i].normpos, prev1.normpos);
        const dot = vec_dot(v1, v2);
        const det = v1[0] * v2[1] - v1[1] * v2[0];
        diffobjs[i].angle = Math.abs(Math.atan2(det, dot));
      } else {
        diffobjs[i].angle = null;
      }
    }
  }
}

// _(internal)_
// calculate spacing weight for a difficulty type

// ~200BPM 1/4 streams
const MIN_SPEED_BONUS = 75.0;

// ~330BPM 1/4 streams
const MAX_SPEED_BONUS = 45.0;

const ANGLE_BONUS_SCALE = 90;
const AIM_TIMING_THRESHOLD = 107;
const SPEED_ANGLE_BONUS_BEGIN = (5 * Math.PI) / 6;
const AIM_ANGLE_BONUS_BEGIN = Math.PI / 3;

// generic difficulty calculator that creates and uses
// mode-specific calculators based on the map's mode field
class diff {
  constructor() {
    // calculators for different modes are cached for reuse within
    // this instance
    this.calculators = [];
    this.map = undefined;
  }
  // figures out what difficulty calculator to use based on the
  // beatmap's gamemode and calls it with params
  //
  // if no map is specified in params, the last map used in
  // previous calls will be used. this simplifies subsequent
  // calls for the same beatmap
  //
  // see gamemode-specific calculators above for params
  //
  // returns the chosen gamemode-specific difficulty calculator
  calc(params) {
    let calculator;
    const map = (this.map = params.map || this.map);
    if (!map) {
      throw new TypeError('no map given');
    }
    if (!this.calculators[map.mode]) {
      switch (map.mode) {
        case modes.std:
          calculator = new std_diff();
          break;
        default:
          throw {
            name: 'NotImplementedError',
            message: 'this gamemode is not yet supported',
          };
      }
      this.calculators[map.mode] = calculator;
    } else {
      calculator = this.calculators[map.mode];
    }
    return calculator.calc(params);
  }
}

module.exports = {
  modbits: modbits,
  std_diff: std_diff,
  std_beatmap_stats: std_beatmap_stats,
};
