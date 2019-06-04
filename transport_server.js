var util = require('./Util.js');
var WebSocket = require('ws');


module.exports = class Transport{
  constructor(conf){
    if(!conf.log) throw new Error('Expected log on conf');
    const eventListeners = this.eventListeners = [];
    this.eventListeners.push(function(eventName, data, conn){
      conn.log.trace(conn.log.colors.recv+'RECV<', eventName, data);
    });
    const connections = this.connections = {};
    const log = this.log = conf.log;

    const wss = this.wss = new WebSocket.Server(conf);

    // close server when we receive signal
    process.on('SIGTERM', e=>{
      log.trace('transport: Received SIGTERM, closing wss');
      wss.close(e=>log.trace('transport: closed wss successfully'));
    });

    wss.on('connection',(ws, req) => {
      const connId = util.makeid();
      const connection = this.connections[connId] = {
        ws:ws, connId:connId, remoteAddress:(req || ws.upgradeReq).headers['x-forwarded-for'] || (req||ws.upgradeReq).connection.remoteAddress,
        remotePort:(req||ws.upgradeReq).connection.remotePort,
        log:log.child(connId+log.colors.transport)
      };
      // log.trace('transport: Upgrade Headers:', connId, ws.upgradeReq.headers);
      if(conf.validateConnection){
        return conf.validateConnection(connection, function(err, res){
          if(!err && res) connected();
          else {
            this.log.warn('Denied connection', err, res);
            ws.close();
          }
        })
      } else connected();
      function connected(){
        eventListeners.forEach(function(f){ f('connected', {ip:connection.remoteAddress,port:connection.remotePort}, connection); });
        ws.on('message', function incoming(message) { 
          if(message == 'ping') return ws.send('pong');
          var data;
          try{
            data = JSON.parse(message);
          } catch(e){
            data = {event:'error', data:{info:'Failed to Parse', err:e, message:message}};
          }

          if(!data.eventName || !data.data) return log.warn('Received invalid message', message);

          eventListeners.forEach(function(f){ f(data.eventName, data.data, connection); })
        });

        ws.on('error', function(err){
          connection.log.error({connId:connId, err:err}, 'Websocket Failed');
          throw err;
        });

        ws.on('close',(code, message)=>{
          delete connections[connId];
          eventListeners.forEach(function(f){ f('disconnected', {connId, code, message, ip:connection.remoteAddress,port:connection.remotePort}, connection); });
        });
      }
    });

    wss.on('error', function(err){
      this.log.fatal(err, 'Websocket Server Failed');
      throw err;
    });
  }

  _send(connId, data){
    if(!this.connections[connId]) {
      this.log.warning('connId:'+connId+' does not exist', (new Error()).stack);
      return false;
    }
    try{
      this.connections[connId].ws.send(data);
    }catch(e){ return false; } // socket is prob closing and will be removed soon
    return true;
  }

  sendEvent(connId, eventName, data, noLog){
    if(!noLog && this.connections[connId]) this.connections[connId].log.trace(this.log.colors.send+'SEND>', eventName, data);
    return this._send(connId, JSON.stringify({eventName, data}));
  }

  broadcast(eventName, data, except){
    this.log.trace('BRDCST>', Object.keys(this.connections).length, eventName, data);
    const sendData = JSON.stringify({eventName, data});
    Object.keys(this.connections).forEach(function(connId){
      if(connId == except) return;
      this._send(connId, sendData);
    });
  }

  addEventListener(listener){
    this.eventListeners.push(listener);
  }

  removeEventListener (listener){
    const idx = this.eventListeners.indexOf(listener);
    if(idx == -1) throw new Error('listener for event '+eventname+' not found');
    this.eventListeners.splice(idx,1);
  }

  getConnections(){ 
    return Object.keys(this.connections).map(c=>({connId:this.connections[c].connId, ip:this.connections[c].remoteAddress})); 
  }
}

