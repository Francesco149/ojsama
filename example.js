var readline = require("readline");
var osu = require("./ojsama");

var mods = osu.modbits.none;
var acc_percent;
var combo;
var nmiss;

// get mods, acc, combo, misses from command line arguments
// format: +HDDT 95% 300x 1m
var argv = process.argv;

for (var i = 2; i < argv.length; ++i)
{
    if (argv[i].startsWith("+")) {
        mods = osu.modbits.from_string(argv[i].slice(1) || "");
    }

    else if (argv[i].endsWith("%")) {
        acc_percent = parseFloat(argv[i]);
    }

    else if (argv[i].endsWith("x")) {
        combo = parseInt(argv[i]);
    }

    else if (argv[i].endsWith("m")) {
        nmiss = parseInt(argv[i]);
    }
}

var parser = new osu.parser();
readline.createInterface({input: process.stdin, terminal: false})
.on("line", parser.feed_line.bind(parser))
.on("close", function() {
    var map = parser.map;
    console.log(map.toString());

    if (mods) {
        console.log("+" + osu.modbits.string(mods));
    }

    var stars = new osu.diff().calc({map: map, mods: mods});
    console.log(stars.toString());

    var pp = osu.ppv2({
        stars: stars,
        combo: combo,
        nmiss: nmiss,
        acc_percent: acc_percent,
    });

    var max_combo = map.max_combo();
    combo = combo || max_combo;

    console.log(pp.computed_accuracy.toString());
    console.log(combo + "/" + max_combo + "x");

    console.log(pp.toString());
});
