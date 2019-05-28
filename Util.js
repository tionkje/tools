1&&function(){if(typeof GLOBAL == 'undefined'){ ['log', 'warn', 'error'].forEach(function(e){ var _log = console[e]; console[e] = (x=>{_log.apply(console, ['SERVER:'].concat(arguments))}); }); }}
// Carefull, Leaf nodes only

var possible = "abcdefghijklmnopqrstuvwxyz0123456789";

function makeid(len){
  var text = "";

  for( var i=0; i < (len||10); i++ )
      text += possible.charAt(Math.floor(Math.random() * possible.length));

  return 'u'+text;
}

function dateID(){
  return new Date().toISOString()+'_'+makeid(2).replace(/_/g, '-');
}

exports.makeid = makeid;
exports.dateID = dateID;
