const {Timing} = require('./timing');
const {Objtypes, Circle, Slider, Hitobject} = require('./hitobjects');
const {modes, Beatmap} = require('./beatmap');
const {Parser} = require('./parser');
const {StdAccuracy, StdPPv2, ppv2} = require('./ppclac');
const {
  modbits,
  StdDiff,
  StdBeatmapStats,
  StdDiffHitobject,
  Diff,
} = require('./difficultycalc');
// TODO : This will be at the last.
const osu = {
  Timing: Timing,
  Objtypes: Objtypes,
  Circle: Circle,
  Slider: Slider,
  Hitobject: Hitobject,
  modes: modes,
  Beatmap: Beatmap,
  Parser: Parser,
  modbits: modbits,
  StdBeatmapStats: StdBeatmapStats,
  StdDiffHitobject: StdDiffHitobject,
  StdDiff: StdDiff,
  Diff: Diff,
  std_accuracy: StdAccuracy,
  std_ppv2: StdPPv2,
  ppv2: ppv2,
  VERSION_MAJOR: 1,
  VERSION_MINOR: 2,
  VERSION_PATCH: 1,
};

module.exports = {
  osu: osu,
};
