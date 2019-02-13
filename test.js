var fs = require("fs");
var readline = require("readline");
var osu = require("./ojsama");
var suite = require("./test_suite").suite;

// pp can be off by +- 2%
// margin is actually 3x for < 100pp, 2x for 100-200,
// 1.5x for 200-300

var ERROR_MARGIN = 0.02;

var parser = new osu.parser();
var stars, pp;

function do_file(i)
{
    // done testing all maps, test some more functions just for
    // some extra coverage

    if (i >= suite.length)
    {
        console.log("-".repeat(80));
        console.log("misc tests");

        console.log(parser.toString());
        console.log(parser.map.toString());

        for (var i = 0; i < parser.map.objects.length; ++i) {
            console.log(parser.map.objects[i].toString());
        }

        for (var i = 0; i < parser.map.timing_points.length; ++i) {
            console.log(parser.map.timing_points[i].toString());
        }

        for (var i = 0; i < stars.objects.length; ++i) {
            console.log(stars.objects[i].toString());
        }

        console.log(stars.toString());
        console.log(pp.toString());
        return;
    }

    parser.reset();

    readline.createInterface({
        input: fs.createReadStream(
            "test_suite/" + suite[i].id + ".osu"
        )
        .on("error", function() {
            console.error(
                "please download the test suite by running " +
                "./download_suite in the module's directory\n"
            );
            process.exit(1);
        })
    })
    .on("line", parser.feed_line.bind(parser))
    .on("close", function() {
        var map = parser.map;
        var str = suite[i].id.toString();

        if (suite[i].mods) {
            str += " +" + osu.modbits.string(suite[i].mods);
        }

        stars = new osu.diff().calc(
            {map: map, mods: suite[i].mods}
        );

        pp = osu.ppv2({
            stars: stars,
            nmiss: suite[i].n50,
            combo: suite[i].max_combo,
            nmiss: suite[i].nmiss,
            n300: suite[i].n300,
            n100: suite[i].n100,
            n50: suite[i].n50,
        });

        var margin = suite[i].pp * ERROR_MARGIN;

        if (suite[i].pp < 100) {
            margin *= 3;
        } else if (suite[i].pp < 200) {
            margin *= 2;
        } else if (suite[i].pp < 300) {
            margin *= 1.5;
        }

        str += " " + suite[i].max_combo + "x"
            + " " + pp.computed_accuracy
            + " " + pp.total + "pp";

        if (Math.abs(pp.total - suite[i].pp) >= margin) {
            console.error("!!!FAILED!!! "
                + str + " expected " + suite[i].pp);
            process.exit(1);
        }

        console.log(str);

        do_file(i + 1);
    });
}

do_file(0);
