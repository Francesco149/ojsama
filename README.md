



this is free and unencumbered software released into the public
domain. refer to the attached UNLICENSE or http://unlicense.org/

[![Build Status](
https://travis-ci.org/Francesco149/ojsama.svg?branch=master)](
https://travis-ci.org/Francesco149/ojsama)

pure javascript implementation of
https://github.com/Francesco149/oppai-ng intended to be easier
to use and set up for js developers as well as more portable
than straight up bindings at the cost of some performance

installation:
----------------------------------------------------------------








since this is a single-file library, you can just drop the file
into your project:
```sh
cd my/project
curl https://waa.ai/ojsama > ojsama.js
```

or include it directly in a html page:
```html
<script type="text/javascript" src="ojsama.min.js"></script>
```

it's also available as a npm package:
```sh
npm install ojsama
```

you can find full documentation of the code at
http://hnng.moe/stuff/ojsama.html or simply read ojsama.js

usage (nodejs):
----------------------------------------------------------------








(change ./ojsama to ojsama if you installed through npm)

```js
var readline = require("readline");
var osu = require("./ojsama");

var parser = new osu.parser();
readline.createInterface({
  input: process.stdin, terminal: falsei
})
.on("line", parser.feed_line.bind(parser))
.on("close", function() {
  console.log(osu.ppv2({map: parser.map}).toString());
});
```

```sh
$ curl https://osu.ppy.sh/osu/67079 | node minexample.js
133.24 pp (36.23 aim, 40.61 speed, 54.42 acc)
```

advanced usage (nodejs with acc, mods, combo...):
----------------------------------------------------------------








```js
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
readline.createInterface({
  input: process.stdin, terminal: false
})
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
```

```sh
$ curl https://osu.ppy.sh/osu/67079 | node example.js
TERRA - Tenjou no Hoshi ~Reimeiki~ [BMax] mapped by ouranhshc

AR5 OD8 CS4 HP8
262 circles, 69 sliders, 5 spinners
469 max combo

4.33 stars (2.09 aim, 2.19 speed)
100.00% 0x100 0x50 0xmiss
469/469x
133.24 pp (36.23 aim, 40.61 speed, 54.42 acc)

$ curl https://osu.ppy.sh/osu/67079 \
| node example.js +HDDT 98% 400x 1m
...
+HDDT
6.13 stars (2.92 aim, 3.11 speed)
97.92% 9x100 0x50 1xmiss
400/469x
266.01 pp (99.70 aim, 101.68 speed, 60.41 acc)
```

usage (in the browser)
----------------------------------------------------------------








```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <script type="text/javascript" src="ojsama.min.js"></script>
  <script type="text/javascript">
  function load_file()
  {
    var frame = document.getElementById("osufile");
    var contents = frame.contentWindow
      .document.body.childNodes[0].innerHTML;

    var parser = new osu.parser().feed(contents);
    console.log(parser.toString());

    var str = parser.map.toString();
    str += osu.ppv2({map: parser.map}).toString();

    document.getElementById("result").innerHTML = str;
  }
  </script>
</head>
<body>
  <iframe id="osufile" src="test.osu" onload="load_file();"
  style="display: none;">
  </iframe>
  <blockquote><pre id="result">calculating...</pre></blockquote>
</body>
</html>
```

(this example assumes you have a test.osu beatmap in the same
directory)

performance
----------------------------------------------------------------








this is around 50-60% slower than the C implementation and uses
~10 times more memory.
```sh
$ busybox time -v node --use_strict test.js
...
User time (seconds): 16.58
System time (seconds): 0.43
Percent of CPU this job got: 101%
Elapsed (wall clock) time (h:mm:ss or m:ss): 0m 16.70s
...
Maximum resident set size (kbytes): 314080
Minor (reclaiming a frame) page faults: 20928
Voluntary context switches: 72138
Involuntary context switches: 16689
```








