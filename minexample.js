var readline = require("readline");
var osu = require("./ojsama");

var parser = new osu.parser();
readline.createInterface({input: process.stdin, terminal: false})
.on("line", parser.feed_line.bind(parser))
.on("close", function() {
    console.log(osu.ppv2({map: parser.map}).toString());
});
