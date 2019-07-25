const readline = require('readline');
const osu = require('./src');

let mods = osu.modbits.none;
let acc_percent;
let combo;
let nmiss;

// get mods, acc, combo, misses from command line arguments
// format: +HDDT 95% 300x 1m
const argv = process.argv;

for (let i = 2; i < argv.length; ++i) {
  if (argv[i].startsWith('+')) {
    mods = osu.modbits.from_string(argv[i].slice(1) || '');
  } else if (argv[i].endsWith('%')) {
    acc_percent = parseFloat(argv[i]);
  } else if (argv[i].endsWith('x')) {
    combo = parseInt(argv[i]);
  } else if (argv[i].endsWith('m')) {
    nmiss = parseInt(argv[i]);
  }
}

const parser = new osu.parser();
readline
    .createInterface({input: process.stdin, terminal: false})
    .on('line', parser.feedLine.bind(parser))
    .on('close', function() {
      const map = parser.map;
      console.log(map.toString());

      if (mods) {
        console.log('+' + osu.modbits.string(mods));
      }

      const stars = new osu.diff().calc({map: map, mods: mods});
      console.log(stars.toString());

      const pp = osu.ppv2({
        stars: stars,
        combo: combo,
        nmiss: nmiss,
        acc_percent: acc_percent,
      });

      const max_combo = map.maxCombo();
      combo = combo || max_combo;

      console.log(pp.computed_accuracy.toString());
      console.log(combo + '/' + max_combo + 'x');

      console.log(pp.toString());
    });
