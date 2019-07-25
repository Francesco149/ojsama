const {isUndefined} = require('./interals');
const {modes} = require('./beatmap');
const {modbits, std_diff, std_beatmap_stats} = require('./difficultycalc');
// osu!standard accuracy calculator
//
// if percent and nobjects are specified, n300, n100 and n50 will
// be automatically calculated to be the closest to the given
// acc percent

function std_accuracy(values) {
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
      new std_accuracy({
        n300: max300,
        n100: 0,
        n50: 0,
        nmiss: this.nmiss,
      }).value() * 100.0;

    let acc_percent = values.percent;
    acc_percent = Math.max(0.0, Math.min(maxacc, acc_percent));

    // just some black magic maths from wolfram alpha

    this.n100 = Math.round(
        -3.0 * ((acc_percent * 0.01 - 1.0) * nobjects + this.nmiss) * 0.5
    );

    if (this.n100 > max300) {
      // acc lower than all 100s, use 50s
      this.n100 = 0;
      this.n50 = Math.round(
          -6.0 * ((acc_percent * 0.01 - 1.0) * nobjects + this.nmiss) * 0.5
      );
      this.n50 = Math.min(max300, this.n50);
    }

    this.n300 = nobjects - this.n100 - this.n50 - this.nmiss;
  }
}

// computes the accuracy value (0.0-1.0)
//
// if n300 was specified in the constructor, nobjects is not
// required and will be automatically computed

std_accuracy.prototype.value = function(nobjects) {
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
};

std_accuracy.prototype.toString = function() {
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
};

// osu! standard ppv2 calculator

function std_ppv2() {
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

std_ppv2.prototype.calc = function(params) {
  // parameters handling

  let stars = params.stars;
  let map = params.map;
  let maxCombo, nsliders, ncircles, nobjects, base_ar, base_od;
  let mods;
  let aim_stars, speed_stars;

  if (stars) {
    map = stars.map;
  }

  if (map) {
    maxCombo = map.maxCombo();
    nsliders = map.nsliders;
    ncircles = map.ncircles;
    nobjects = map.objects.length;
    base_ar = map.ar;
    base_od = map.od;

    if (!stars) {
      stars = new std_diff().calc(params);
    }
  } else {
    maxCombo = params.max_combo;
    if (!maxCombo || maxCombo < 0) {
      throw new TypeError('max_combo must be > 0');
    }

    nsliders = params.nsliders;
    ncircles = params.ncircles;
    nobjects = params.nobjects;
    if ([nsliders, ncircles, nobjects].some(isNaN)) {
      throw new TypeError(
          'nsliders, ncircles, nobjects are required (must be numbers) '
      );
    }
    if (nobjects < nsliders + ncircles) {
      throw new TypeError('nobjects must be >= nsliders + ncircles');
    }

    base_ar = params.base_ar;
    if (isUndefined(base_ar)) base_ar = 5;
    base_od = params.base_od;
    if (isUndefined(base_od)) base_od = 5;
  }

  if (stars) {
    mods = stars.mods;
    aim_stars = stars.aim;
    speed_stars = stars.speed;
  } else {
    mods = params.mods || modbits.nomod;
    aim_stars = params.aim_stars;
    speed_stars = params.speed_stars;
  }

  if ([aim_stars, speed_stars].some(isNaN)) {
    throw new TypeError('aim and speed stars required (must be numbers)');
  }

  const nmiss = params.nmiss || 0;
  let n50 = params.n50 || 0;
  let n100 = params.n100 || 0;

  let n300 = params.n300;
  if (n300 === undefined) {
    n300 = nobjects - n100 - n50 - nmiss;
  }

  let combo = params.combo;
  if (combo === undefined) {
    combo = maxCombo - nmiss;
  }

  const score_version = params.score_version || 1;

  // common values used in all pp calculations

  const nobjects_over_2k = nobjects / 2000.0;
  let length_bonus = 0.95 + 0.4 * Math.min(1.0, nobjects_over_2k);

  if (nobjects > 2000) {
    length_bonus += Math.log10(nobjects_over_2k) * 0.5;
  }

  const miss_penality = Math.pow(0.97, nmiss);
  const combo_break = Math.pow(combo, 0.8) / Math.pow(maxCombo, 0.8);
  const mapstats = new std_beatmap_stats({
    ar: base_ar,
    od: base_od,
  }).with_mods(mods);

  this.computed_accuracy = new std_accuracy({
    percent: params.acc_percent,
    nobjects: nobjects,
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

  let ar_bonus = 1.0;
  if (mapstats.ar > 10.33) {
    ar_bonus += 0.3 * (mapstats.ar - 10.33);
  } else if (mapstats.ar < 8.0) {
    ar_bonus += 0.01 * (8.0 - mapstats.ar);
  }

  // aim pp

  let aim = this._base(aim_stars);
  aim *= length_bonus;
  aim *= miss_penality;
  aim *= combo_break;
  aim *= ar_bonus;

  let hd_bonus = 1.0;
  if (mods & modbits.hd) {
    hd_bonus *= 1.0 + 0.04 * (12.0 - mapstats.ar);
  }

  aim *= hd_bonus;

  if (mods & modbits.fl) {
    let fl_bonus = 1.0 + 0.35 * Math.min(1.0, nobjects / 200.0);
    if (nobjects > 200) {
      fl_bonus += 0.3 * Math.min(1.0, (nobjects - 200) / 300.0);
    }
    if (nobjects > 500) {
      fl_bonus += (nobjects - 500) / 1200.0;
    }
    aim *= fl_bonus;
  }

  const acc_bonus = 0.5 + accuracy / 2.0;
  const od_squared = Math.pow(mapstats.od, 2);
  const od_bonus = 0.98 + od_squared / 2500.0;

  aim *= acc_bonus;
  aim *= od_bonus;

  this.aim = aim;

  // speed pp

  let speed = this._base(speed_stars);
  speed *= length_bonus;
  speed *= miss_penality;
  speed *= combo_break;
  if (mapstats.ar > 10.33) {
    speed *= ar_bonus;
  }
  speed *= hd_bonus;

  // similar to aim acc and od bonus

  speed *= 0.02 + accuracy;
  speed *= 0.96 + od_squared / 1600.0;

  this.speed = speed;

  // accuracy pp
  //
  // scorev1 ignores sliders and spinners since they are free
  // 300s

  let real_acc = accuracy;

  switch (score_version) {
    case 1:
      var nspinners = nobjects - nsliders - ncircles;
      real_acc = new std_accuracy({
        n300: Math.max(0, n300 - nsliders - nspinners),
        n100: n100,
        n50: n50,
        nmiss: nmiss,
      }).value();
      real_acc = Math.max(0.0, real_acc);
      break;
    case 2:
      ncircles = nobjects;
      break;
    default:
      throw new {
        name: 'NotImplementedError',
        message: 'unsupported scorev' + score_version,
      }();
  }

  let acc = Math.pow(1.52163, mapstats.od) * Math.pow(real_acc, 24.0) * 2.83;

  acc *= Math.min(1.15, Math.pow(ncircles / 1000.0, 0.3));
  if (mods & modbits.hd) acc *= 1.08;
  if (mods & modbits.fl) acc *= 1.02;

  this.acc = acc;

  // total pp

  let final_multiplier = 1.12;
  if (mods & modbits.nf) final_multiplier *= 0.9;
  if (mods & modbits.so) final_multiplier *= 0.95;

  this.total =
    Math.pow(
        Math.pow(aim, 1.1) + Math.pow(speed, 1.1) + Math.pow(acc, 1.1),
        1.0 / 1.1
    ) * final_multiplier;

  return this;
};

std_ppv2.prototype.toString = function() {
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
};

// _(internal)_ base pp value for stars
std_ppv2.prototype._base = function(stars) {
  return Math.pow(5.0 * Math.max(1.0, stars / 0.0675) - 4.0, 3.0) / 100000.0;
};

// generic pp calc function that figures out what calculator to use
// based on the params' mode and passes through params and
// return value for calc()

function ppv2(params) {
  let mode;
  if (params.map) {
    mode = params.map.mode;
  } else {
    mode = params.mode || modes.std;
  }
  switch (mode) {
    case modes.std:
      return new std_ppv2().calc(params);
  }
  throw {
    name: 'NotImplementedError',
    message: 'this gamemode is not yet supported',
  };
}

module.exports = {
  std_accuracy: std_accuracy,
  std_ppv2: std_ppv2,
  ppv2: ppv2,
};
