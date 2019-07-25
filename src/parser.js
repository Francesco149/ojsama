const {log} = require('./interals');
const {Beatmap} = require('./beatmap');
const {isUndefined} = require('./interals');
const {Timing} = require('./timing');
const {Hitobject, Objtypes, Circle, Slider} = require('./hitobjects');

/**
 * partial .osu file parser built around pp calculation
 */
class parser {
  /**
   *
   */
  constructor() {
    // once you're done feeding data to the parser, you will find
    // the parsed beatmap in this object
    this.map = new Beatmap();
    this.reset();
  }
  /**
   * @return {Object}
   */
  reset() {
    // parser state: number of lines fed, last touched line,
    // last touched substring and the current section name
    //
    // these can be used to debug syntax errors
    this.nline = 0;
    this.curline = '';
    this.lastpos = '';
    this.section = '';
    return this;
  }
  // you can feed a single line or a whole block of text which
  // will be split into lines. partial lines are not allowed
  //
  // both feed functions return the parser instance for easy
  // chaining
  /**
   *
   * @param {*} line
   * @return {Object}
   */
  feedLine(line) {
    this.curline = this.lastpos = line;
    ++this.nline;
    // comments
    if (line.startsWith(' ') || line.startsWith('_')) {
      return this;
    }
    // now that we've handled space comments we can trim space
    line = this.curline = line.trim();
    if (line.length <= 0) {
      return this;
    }
    // c++ style comments
    if (line.startsWith('//')) {
      return this;
    }
    // [SectionName]
    if (line.startsWith('[')) {
      // on old maps there's no ar and ar = od
      if (this.section == 'Difficulty' && isUndefined(this.map.ar)) {
        this.map.ar = this.map.od;
      }
      this.section = line.substring(1, line.length - 1);
      return this;
    }
    if (!line) {
      return this;
    }
    switch (this.section) {
      case 'Metadata':
        this._metadata();
        break;
      case 'General':
        this._general();
        break;
      case 'Difficulty':
        this._difficulty();
        break;
      case 'TimingPoints':
        this._timingPoints();
        break;
      case 'HitObjects':
        this._objects();
        break;
      default:
        const fmtpos = line.indexOf('file format v');
        if (fmtpos < 0) {
          break;
        }
        this.map.format_version = parseInt(line.substring(fmtpos + 13));
        break;
    }
    return this;
  }
  /**
   *
   * @param {*} str
   * @return {Object}
   */
  feed(str) {
    let lines = (lines = str.split('\n'));
    for (let i = 0; i < lines.length; ++i) {
      this.feedLine(lines[i]);
    }
    return this;
  }
  // returns the parser state formatted into a string. useful
  // for debugging syntax errors
  /**
   * @return {string}
   */
  toString() {
    return (
      'at line ' +
      this.nline +
      '\n' +
      this.curline +
      '\n' +
      '-> ' +
      this.lastpos +
      ' <-'
    );
  }
  // _(internal)_ parser utilities
  /**
   *
   * @param {*} str
   * @return {Object}
   */
  _setpos(str) {
    this.lastpos = str.trim();
    return this.lastpos;
  }
  /**
   *
   */
  _warn() {
    log.warn.apply(null, Array.prototype.slice.call(arguments));
    log.warn(this.toString());
  }
  /**
   * @return {Object}
   */
  _property() {
    const s = this.curline.split(':', 2);
    s[0] = this._setpos(s[0]);
    s[1] = this._setpos(s[1]);
    return s;
  }
  // _(internal)_ line parsers for each section
  /**
   *
   */
  _metadata() {
    const p = this._property();
    switch (p[0]) {
      case 'Title':
        this.map.title = p[1];
        break;
      case 'TitleUnicode':
        this.map.title_unicode = p[1];
        break;
      case 'Artist':
        this.map.artist = p[1];
        break;
      case 'ArtistUnicode':
        this.map.artist_unicode = p[1];
        break;
      case 'Creator':
        this.map.creator = p[1];
        break;
      case 'Version':
        this.map.version = p[1];
        break;
    }
  }
  /**
   *
   */
  _general() {
    const p = this._property();
    if (p[0] !== 'Mode') {
      return;
    }
    this.map.mode = parseInt(this._setpos(p[1]));
  }
  /**
   *
   */
  _difficulty() {
    const p = this._property();
    switch (p[0]) {
      case 'CircleSize':
        this.map.cs = parseFloat(this._setpos(p[1]));
        break;
      case 'OverallDifficulty':
        this.map.od = parseFloat(this._setpos(p[1]));
        break;
      case 'ApproachRate':
        this.map.ar = parseFloat(this._setpos(p[1]));
        break;
      case 'HPDrainRate':
        this.map.hp = parseFloat(this._setpos(p[1]));
        break;
      case 'SliderMultiplier':
        this.map.sv = parseFloat(this._setpos(p[1]));
        break;
      case 'SliderTickRate':
        this.map.tick_rate = parseFloat(this._setpos(p[1]));
        break;
    }
  }
  /**
   *
   */
  _timingPoints() {
    const s = this.curline.split(',');
    if (s.length > 8) {
      this._warn('timing point with trailing values');
    } else if (s.length < 2) {
      this._warn('ignoring malformed timing point');
      return;
    }
    const t = new Timing({
      time: parseFloat(this._setpos(s[0])),
      ms_per_beat: parseFloat(this._setpos(s[1])),
    });
    if (s.length >= 7) {
      t.change = s[6].trim() !== '0';
    }
    this.map.timing_points.push(t);
  }
  /**
   *
   */
  _objects() {
    const s = this.curline.split(',');
    let d;
    if (s.length > 11) {
      this._warn('object with trailing values');
    } else if (s.length < 4) {
      this._warn('ignoring malformed hitobject');
      return;
    }
    const obj = new Hitobject({
      time: parseFloat(this._setpos(s[2])),
      type: parseInt(this._setpos(s[3])),
    });
    if (isNaN(obj.time) || isNaN(obj.type)) {
      this._warn('ignoring malformed hitobject');
      return;
    }
    if ((obj.type & Objtypes.circle) != 0) {
      ++this.map.ncircles;
      d = obj.data = new Circle({
        pos: [parseFloat(this._setpos(s[0])), parseFloat(this._setpos(s[1]))],
      });
      if (isNaN(d.pos[0]) || isNaN(d.pos[1])) {
        this._warn('ignoring malformed circle');
        return;
      }
    } else if ((obj.type & Objtypes.spinner) != 0) {
      ++this.map.nspinners;
    } else if ((obj.type & Objtypes.slider) != 0) {
      if (s.length < 8) {
        this._warn('ignoring malformed slider');
        return;
      }
      ++this.map.nsliders;
      d = obj.data = new Slider({
        pos: [parseFloat(this._setpos(s[0])), parseFloat(this._setpos(s[1]))],
        repetitions: parseInt(this._setpos(s[6])),
        distance: parseFloat(this._setpos(s[7])),
      });
      if (
        isNaN(d.pos[0]) ||
        isNaN(d.pos[1]) ||
        isNaN(d.repetitions) ||
        isNaN(d.distance)
      ) {
        this._warn('ignoring malformed slider');
        return;
      }
    }
    this.map.objects.push(obj);
  }
}

module.exports = {
  parser: parser,
};
