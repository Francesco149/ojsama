const {timing} = require('./timing');
const {objtypes, circle, slider, hitobject} = require('./hitobjects');
const {modes, beatmap} = require('./beatmap');
const {parser} = require('./parser');
const {std_accuracy, std_ppv2, ppv2} = require('./ppclac');

const {
  modbits,
  std_diff,
  std_beatmap_stats,
  std_diff_hitobject,
  diff,
} = require('./difficultycalc');
// TODO : This will be at the last.
const osu = {
  timing: timing,
  objtypes: objtypes,
  circle: circle,
  slider: slider,
  hitobject: hitobject,
  modes: modes,
  beatmap: beatmap,
  parser: parser,
  modbits: modbits,
  std_beatmap_stats: std_beatmap_stats,
  std_diff_hitobject: std_diff_hitobject,
  std_diff: std_diff,
  diff: diff,
  std_accuracy: std_accuracy,
  std_ppv2: std_ppv2,
  ppv2: ppv2,
  VERSION_MAJOR: 1,
  VERSION_MINOR: 2,
  VERSION_PATCH: 1,
};

module.exports = osu;
