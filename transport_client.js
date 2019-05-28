
  // var socketURL = 'ws://bastiaandeknudt.be/vevoer5/ws';
var attemptin = 0;

function Transport(socketURL){
  this.verbose = 0;
  this.connected = false; // if not connected we queue messages until reconnected
  this.sendQueue = []; // queue messages when not connected here
  this.eventListeners = [function(eventName, data){ if(this.verbose) console.log( '%cRECV '+eventName, 'background-color:yellow;', data); }.bind(this)]; // eventlistener for logging of received messages
  this.onOpen = function () {
    attemptin=0; // time in seconds before attempting to reconnect
    this.connected = true; // we are connected
    setTimeout(function(){
      var msg; while(msg=this.sendQueue.shift()){ this._send(msg); } // send queue
    }.bind(this), 100);
    this.eventListeners.forEach(function(f){ f('connected',{}); }); // send connected event to all listeners
  }.bind(this);

  this.onMessage = function(e) { 
    if(e.data=='pong') return; // ignore heartbeat messages
    // Parse the message
    var data;
    try{
      data = JSON.parse(e.data);
    } catch(e){
      data = {eventName:'error', data:{info:'Failed to Parse', err:e, message:e.data}};
    }
    this.eventListeners.forEach(function(f){ f(data.eventName, data.data); }); // send message to listeners
  }.bind(this);

  this.onClose = function (e) {
    if(this.connected){
      this.connected = false; // Not connected anymore
      this.eventListeners.forEach(function(f){ f('disconnected', e); }); // notify listeners
    }
    if(this.noReconnect) return; // dont reconnect on manual disconnect
    // try to reconnect with exponential backoff
    attemptin = Math.min(attemptin*2 || 1, 32);
    setTimeout(connect, attemptin*1000 + Math.random()*1000);
  }.bind(this);

  var connect = function (){
    // connect, setup websocket and messages
    var ws = this.ws = new WebSocket(socketURL);
    ws.addEventListener('open', this.onOpen);
    ws.addEventListener('message', this.onMessage);
    ws.addEventListener('close', this.onClose);
    hartBeatWS(ws);
  }.bind(this);

  connect();
}

function hartBeatWS(ws){
  var timeout = null;
  function pingTimeout(){ timeout = setTimeout(function(){ ws.send('ping'); timeout=null; },20000);}
  ws.addEventListener('open', pingTimeout); // start pinging on connect
  ws.addEventListener('message', function(e){ if(e.data=='pong' && !timeout) pingTimeout(); }); // listen for pong and resend ping
  ws.addEventListener('close', function(){if(timeout) clearTimeout(timeout); timeout=null;}); // stop everything on close
}

// Internal send method
Transport.prototype._send = function(data){
  // send a message. if not connected, add to queue
  if(!this.connected){
    this.sendQueue.push(data);
    return;
  }
  this.ws.send(data);
};

// public faceing send method, logs everything comming true
Transport.prototype.sendEvent = function(eventName, data = {}, nolog){
  if(!nolog && this.verbose) console.log( '%cSEND '+eventName, 'background-color:cyan;', data);
  this._send(JSON.stringify({eventName:eventName, data:data}));
};

Transport.prototype.addEventListener = function(listener){
  this.eventListeners.push(listener);
};

Transport.prototype.removeEventListener = function(listener){
  var idx = this.eventListeners.indexOf(listener);
  if(idx == -1) return console.error('listener for event '+eventname+' not found');
  this.eventListeners.splice(idx,1);
};

// manual disconnect of socket
Transport.prototype.disconnect = function(){
  this.noReconnect = true;
  this.ws.close();
};

module.exports = Transport;
