const {isUndefined} = require('./interals');
const {modes} = require('./beatmap');
const {modbits, std_diff, std_beatmap_stats} = require('./difficultycalc');

/**
 * osu!standard accuracy calculator
 * if percent and nobjects are specified, n300, n100 and n50 will
 * be automatically calculated to be the closest to the given
 * acc percent
 */
class StdAccuracy {
  /**
   *
   * @param {*} values
   */
  constructor(values) {
    this.nmiss = values.nmiss || 0;
    if (values.n300 === undefined) {
      this.n300 = -1;
    } else {
      this.n300 = values.n300;
    }
    this.n100 = values.n100 || 0;
    this.n50 = values.n50 || 0;
    let nobjects;
    if (values.nobjects) {
      let n300 = this.n300;
      nobjects = values.nobjects;
      let hitcount;
      if (n300 < 0) {
        n300 = Math.max(0, nobjects - this.n100 - this.n50 - this.nmiss);
      }
      hitcount = n300 + this.n100 + this.n50 + this.nmiss;
      if (hitcount > nobjects) {
        n300 -= Math.min(n300, hitcount - nobjects);
      }
      hitcount = n300 + this.n100 + this.n50 + this.nmiss;
      if (hitcount > nobjects) {
        this.n100 -= Math.min(this.n100, hitcount - nobjects);
      }
      hitcount = n300 + this.n100 + this.n50 + this.nmiss;
      if (hitcount > nobjects) {
        this.n50 -= Math.min(this.n50, hitcount - nobjects);
      }
      hitcount = n300 + this.n100 + this.n50 + this.nmiss;
      if (hitcount > nobjects) {
        this.nmiss -= Math.min(this.nmiss, hitcount - nobjects);
      }
      this.n300 = nobjects - this.n100 - this.n50 - this.nmiss;
    }
    if (values.percent !== undefined) {
      nobjects = values.nobjects;
      if (nobjects === undefined) {
        throw new TypeError('nobjects is required when specifying percent');
      }
      const max300 = nobjects - this.nmiss;
      const maxacc =
        new StdAccuracy({
          n300: max300,
          n100: 0,
          n50: 0,
          nmiss: this.nmiss,
        }).value() * 100.0;
      let accPercent = values.percent;
      accPercent = Math.max(0.0, Math.min(maxacc, accPercent));
      // just some black magic maths from wolfram alpha
      this.n100 = Math.round(
          -3.0 * ((accPercent * 0.01 - 1.0) * nobjects + this.nmiss) * 0.5
      );
      if (this.n100 > max300) {
        // acc lower than all 100s, use 50s
        this.n100 = 0;
        this.n50 = Math.round(
            -6.0 * ((accPercent * 0.01 - 1.0) * nobjects + this.nmiss) * 0.5
        );
        this.n50 = Math.min(max300, this.n50);
      }
      this.n300 = nobjects - this.n100 - this.n50 - this.nmiss;
    }
  }

  /**
   * computes the accuracy value (0.0-1.0)
   * If n300 was specified in the constructor, nobjects is not
   * required and will be automatically computed
   * @param {*} nobjects
   * @return {int} Accuracy
   */
  value(nobjects) {
    let n300 = this.n300;
    if (n300 < 0) {
      if (!nobjects) {
        throw new TypeError('either n300 or nobjects must be specified');
      }
      n300 = nobjects - this.n100 - this.n50 - this.nmiss;
    } else {
      nobjects = n300 + this.n100 + this.n50 + this.nmiss;
    }
    const res =
      (n300 * 300.0 + this.n100 * 100.0 + this.n50 * 50.0) / (nobjects * 300.0);
    return Math.max(0, Math.min(res, 1.0));
  }
  /**
   * Debug Function.
   * @return {string}
   */
  toString() {
    return (
      (this.value() * 100.0).toFixed(2) +
      '% ' +
      this.n100 +
      'x100 ' +
      this.n50 +
      'x50 ' +
      this.nmiss +
      'xmiss'
    );
  }
}

//
/**
 * osu! standard ppv2 calculator
 */
class StdPPv2 {
  /**
   * Constructs the class.
   */
  constructor() {
    this.aim = 0.0;
    this.speed = 0.0;
    this.acc = 0.0;
    // accuracy used in the last calc() call
    this.computed_accuracy = undefined;
  }
  // metaparams:
  // map, stars, acc_percent
  //
  // params:
  // aim_stars, speed_stars, max_combo, nsliders, ncircles,
  // nobjects, base_ar = 5, base_od = 5, mode = modes.std,
  // mods = modbits.nomod, combo = max_combo - nmiss,
  // n300 = nobjects - n100 - n50 - nmiss, n100 = 0, n50 = 0,
  // nmiss = 0, score_version = 1
  //
  // if stars is defined, map and mods are obtained from stars as
  // well as aim_stars and speed_stars
  //
  // if map is defined, max_combo, nsliders, ncircles, nobjects,
  // base_ar, base_od will be obtained from this beatmap
  //
  // if map is defined and stars is not defined, a new difficulty
  // calculator will be created on the fly to compute stars for map
  //
  // if acc_percent is defined, n300, n100, n50 will be automatically
  // calculated to be as close as possible to this value

  /**
   *
   * @param {*} params
   * @return {StdPPv2}
   */
  calc(params) {
    // parameters handling
    let stars = params.stars;
    let map = params.map;
    let maxCombo;
    let nSliders;
    let nCircles;
    let nObjects;
    let baseAR;
    let baseOD;
    let mods;
    let aimStars;
    let speedStars;
    if (stars) {
      map = stars.map;
    }
    if (map) {
      maxCombo = map.maxCombo();
      nSliders = map.nsliders;
      nCircles = map.ncircles;
      nObjects = map.objects.length;
      baseAR = map.ar;
      baseOD = map.od;
      if (!stars) {
        stars = new std_diff().calc(params);
      }
    } else {
      maxCombo = params.max_combo;
      if (!maxCombo || maxCombo < 0) {
        throw new TypeError('max_combo must be > 0');
      }
      nSliders = params.nsliders;
      nCircles = params.ncircles;
      nObjects = params.nobjects;
      if ([nSliders, nCircles, nObjects].some(isNaN)) {
        throw new TypeError(
            'nsliders, ncircles, nobjects are required (must be numbers) '
        );
      }
      if (nObjects < nSliders + nCircles) {
        throw new TypeError('nobjects must be >= nsliders + ncircles');
      }
      baseAR = params.base_ar;
      if (isUndefined(baseAR)) baseAR = 5;
      baseOD = params.base_od;
      if (isUndefined(baseOD)) baseOD = 5;
    }
    if (stars) {
      mods = stars.mods;
      aimStars = stars.aim;
      speedStars = stars.speed;
    } else {
      mods = params.mods || modbits.nomod;
      aimStars = params.aim_stars;
      speedStars = params.speed_stars;
    }
    if ([aimStars, speedStars].some(isNaN)) {
      throw new TypeError('aim and speed stars required (must be numbers)');
    }
    const nmiss = params.nmiss || 0;
    let n50 = params.n50 || 0;
    let n100 = params.n100 || 0;
    let n300 = params.n300;
    if (n300 === undefined) {
      n300 = nObjects - n100 - n50 - nmiss;
    }
    let combo = params.combo;
    if (combo === undefined) {
      combo = maxCombo - nmiss;
    }
    const scoreVersion = params.score_version || 1;
    // common values used in all pp calculations
    const nObjectsOver2k = nObjects / 2000.0;
    let lengthBonus = 0.95 + 0.4 * Math.min(1.0, nObjectsOver2k);
    if (nObjects > 2000) {
      lengthBonus += Math.log10(nObjectsOver2k) * 0.5;
    }
    const missPenality = Math.pow(0.97, nmiss);
    const comboBreak = Math.pow(combo, 0.8) / Math.pow(maxCombo, 0.8);
    const mapstats = new std_beatmap_stats({
      ar: baseAR,
      od: baseOD,
    }).with_mods(mods);
    this.computed_accuracy = new StdAccuracy({
      percent: params.acc_percent,
      nobjects: nObjects,
      n300: n300,
      n100: n100,
      n50: n50,
      nmiss: nmiss,
    });
    n300 = this.computed_accuracy.n300;
    n100 = this.computed_accuracy.n100;
    n50 = this.computed_accuracy.n50;
    const accuracy = this.computed_accuracy.value();
    // high/low ar bonus
    let arBonus = 1.0;
    if (mapstats.ar > 10.33) {
      arBonus += 0.3 * (mapstats.ar - 10.33);
    } else if (mapstats.ar < 8.0) {
      arBonus += 0.01 * (8.0 - mapstats.ar);
    }
    // aim pp
    let aim = this._base(aimStars);
    aim *= lengthBonus;
    aim *= missPenality;
    aim *= comboBreak;
    aim *= arBonus;
    let hdBonus = 1.0;
    if (mods & modbits.hd) {
      hdBonus *= 1.0 + 0.04 * (12.0 - mapstats.ar);
    }
    aim *= hdBonus;
    if (mods & modbits.fl) {
      let flBonus = 1.0 + 0.35 * Math.min(1.0, nObjects / 200.0);
      if (nObjects > 200) {
        flBonus += 0.3 * Math.min(1.0, (nObjects - 200) / 300.0);
      }
      if (nObjects > 500) {
        flBonus += (nObjects - 500) / 1200.0;
      }
      aim *= flBonus;
    }
    const accBonus = 0.5 + accuracy / 2.0;
    const odSquared = Math.pow(mapstats.od, 2);
    const odBonus = 0.98 + odSquared / 2500.0;
    aim *= accBonus;
    aim *= odBonus;
    this.aim = aim;
    // speed pp
    let speed = this._base(speedStars);
    speed *= lengthBonus;
    speed *= missPenality;
    speed *= comboBreak;
    if (mapstats.ar > 10.33) {
      speed *= arBonus;
    }
    speed *= hdBonus;
    // similar to aim acc and od bonus
    speed *= 0.02 + accuracy;
    speed *= 0.96 + odSquared / 1600.0;
    this.speed = speed;
    // accuracy pp
    //
    // scorev1 ignores sliders and spinners since they are free
    // 300s
    let realAcc = accuracy;
    switch (scoreVersion) {
      case 1:
        const nspinners = nObjects - nSliders - nCircles;
        realAcc = new StdAccuracy({
          n300: Math.max(0, n300 - nSliders - nspinners),
          n100: n100,
          n50: n50,
          nmiss: nmiss,
        }).value();
        realAcc = Math.max(0.0, realAcc);
        break;
      case 2:
        nCircles = nObjects;
        break;
      default:
        throw new {
          name: 'NotImplementedError',
          message: 'unsupported scorev' + scoreVersion,
        }();
    }
    let acc = Math.pow(1.52163, mapstats.od) * Math.pow(realAcc, 24.0) * 2.83;
    acc *= Math.min(1.15, Math.pow(nCircles / 1000.0, 0.3));
    if (mods & modbits.hd) acc *= 1.08;
    if (mods & modbits.fl) acc *= 1.02;
    this.acc = acc;
    // total pp
    let finalMultiplier = 1.12;
    if (mods & modbits.nf) finalMultiplier *= 0.9;
    if (mods & modbits.so) finalMultiplier *= 0.95;
    this.total =
      Math.pow(
          Math.pow(aim, 1.1) + Math.pow(speed, 1.1) + Math.pow(acc, 1.1),
          1.0 / 1.1
      ) * finalMultiplier;
    return this;
  }
  /**
   * @return {string}
   */
  toString() {
    return (
      this.total.toFixed(2) +
      ' pp (' +
      this.aim.toFixed(2) +
      ' aim, ' +
      this.speed.toFixed(2) +
      ' speed, ' +
      this.acc.toFixed(2) +
      ' acc)'
    );
  }
  // _(internal)_ base pp value for stars
  /**
   *
   * @param {*} stars
   * @return {int}
   */
  _base(stars) {
    return Math.pow(5.0 * Math.max(1.0, stars / 0.0675) - 4.0, 3.0) / 100000.0;
  }
}

// generic pp calc function that figures out what calculator to use
// based on the params' mode and passes through params and
// return value for calc()
/**
 *
 * @param {*} params
 * @return {Object}
 */
function ppv2(params) {
  let mode;
  if (params.map) {
    mode = params.map.mode;
  } else {
    mode = params.mode || modes.std;
  }
  switch (mode) {
    case modes.std:
      return new StdPPv2().calc(params);
  }
  throw new Error('Not Implemented Error: Gamemode Not yet supported.');
}

module.exports = {
  std_accuracy: StdAccuracy,
  std_ppv2: StdPPv2,
  ppv2: ppv2,
};
