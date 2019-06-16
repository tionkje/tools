var util = require('util');

class Logger extends Function{
  constructor(prefix, levels){
    // extending function and calling it with this function param allows for calling log() without level
    super("value", "return arguments.callee.apply(arguments);");
    this.prefix = prefix || '';
    this.levels = levels||['fatal','warning', 'info', 'debug', 'trace', 'default']
    this.childSeperator = this.colorText('|', 'seperator');
    var aliases = { warning:['warn', 'error'] };

    this.levels.forEach(function(level){
      this[level] = logFunc.bind(this, level, prefix);
      if(aliases[level]) aliases[level].forEach(function(alias){
        this[alias] = this[level];
      }.bind(this));
    }.bind(this));
  }

  apply(args){ this.default(...args); }

  child(){
    var prefix = util.format.apply(util, arguments);
    return new Logger((this.prefix && (this.prefix+this.childSeperator) || '') +prefix, this.levels);
  }

  formatLevel(level){
    var leveltxt = (level.toUpperCase()+'         ').substring(0,this.levels.reduce((m,l)=>Math.max(m,l.length),3));
    leveltxt= '['+this.colorText(leveltxt, level)+'] ';
    return leveltxt;
  }

  rgbToColor(r,g,b){
    return `\x1b[38;2;${r};${g};${b}m`;
  }

  colorText(text, color){
    var start='';
    if(typeof color == 'string'){
      start = this.colors[color] || '';
    } else if(Array.isArray(color)){
      start = this.rgbToColor(...color);
    }
    return start + text + this.colors.reset;
  }
}

Logger.prototype.colors = {
  red: '\x1b[38;2;255;0;0m',
  green: '\x1b[38;2;0;255;0m',
  blue: '\x1b[38;2;0;0;255m',
  purple: '\x1b[38;2;255;0;255m',
  yellow: '\x1b[38;2;255;255;0m',
  cyan: '\x1b[38;2;0;255;255m',

  seperator: '\x1b[38;2;50;150;50m',
  dategrey: '\x1b[38;2;100;100;100m',

  fatal: '\x1b[38;2;255;0;0m',
  warning: '\x1b[38;2;255;255;0m',
  info: '\x1b[38;2;0;255;255m',
  debug: '\x1b[38;2;0;255;0m',
  trace: '\x1b[38;2;255;0;255m',
  default: '\x1b[38;2;255;255;255m',

  reset:  '\x1b[0m'
};

function formatDate(date){
  function pad(s,n){return ('0000000'+s).substr(-n);}
  return date.getFullYear()+''+ pad(date.getMonth()+1,2)+''+ pad(date.getDate(),2)+'.'+
    pad(date.getHours(),2)+':'+ pad(date.getMinutes(),2)+':'+ pad(date.getSeconds(),2)+'.'+
    pad(date.getMilliseconds(),3);
}

function logFunc(level, prefix, ...args){
  var msg = 
    this.formatLevel(level) +
    this.colorText(formatDate(new Date()), 'dategrey') +
    (this.prefix && (this.childSeperator+this.prefix) || '') + ': ' +
    util.format.apply(util, args);

  msg = msg.replace(/\n/g,' \\n'); // remove newlines in log

  console.log(msg+this.colors.reset);

  if(level == 'FATAL') throw new Error('FATAL');
}

module.exports = new Logger();
