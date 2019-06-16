var http = require('http');
var url = require('url');

function trunc(str, len){ if(!str || str.length<len) return str; return str.substring(0,len)+'...'; };

function HttpServer(opts, cb){
  this.log = opts.log || require('./logger.js').child('HttpServer');
  this.server = http.createServer();
  this.server.on('request',this._handler.bind(this));
  var o = {port:opts.port||8080};
  this.port = o.port;
  this.server.listen(o, cb);

  // close server when we receive signal
  process.on('SIGTERM', ()=>{
    this.log.trace('Received SIGTERM, closing httpserver');
    this.server.close();
  });

  this.handlers = [];
  this.reqIdCount = 1;
}

HttpServer.prototype._handler = function(req, res){
  req.parsedUrl = url.parse(req.url, true);
  req.log = this.log.child('reqId:'+this.reqIdCount++);
  var handler = this.handlers.find(h=>req.parsedUrl.pathname==h.path);
  if(!handler) {
    req.log.info('No handler found for %s', req.parsedUrl.pathname);
    res.writeHead(400, { });
    res.end(req.parsedUrl.pathname+' not Supported');
    return;
  }

  var body = [];
  req.on('data', function(chunk){ body.push(chunk); });
  req.on('end', function(){
    var headers = {}; // TODO: add default headers
    // TODO: add remote IP

    // parse body
    try{
      body = Buffer.concat(body).toString();
    }catch(err){
      req.log.warn(err, 'Failed parsing body');
      res.writeHead(400, headers);
      res.end('Failed parsing body');
      return;
    }

    if(!handler.noLog) req.log.debug('%s - %s %s', req.method, req.parsedUrl.pathname, JSON.stringify(req.parsedUrl.query), body);

    if(body){
      // Json bodies
      if(req.headers['content-type'].indexOf('application/json')>=0){
        try{ body = JSON.parse(body); } catch(err) {
          req.log.warn(err, 'Failed parsing json body');
          res.writeHead(400, headers);
          res.end('Failed parsing body');
          return;
        }
      }
    }

    // Parse Cookies
    req.cookies = {};
    if(req.headers.cookie) {
      req.headers.cookie.split(';').map(c=>{ c = c.split('=');  req.cookies[c.shift().trim()] = decodeURIComponent(c.join('='));});
    }

    const start = Date.now();

    handler.handler({
      method:req.method,
      query:req.parsedUrl.query,
      cookies:req.cookies,
      body,
      headers,
      log:req.log,
    },function(err, result){
      // encodeURIComponent
      if(headers['set-cookie']){ }

      res.writeHead(200, headers);
      if(err){
        req.log.warn(err, 'result error:');
        res.end(JSON.stringify({ok:false, err:err.message}));
        return;
      }
      if(!handler.noLog) req.log.debug(req.log.colors.time+(Date.now()-start)+'ms'+req.log.colors.reset,'result:', trunc(JSON.stringify(result), 500));
      res.end(JSON.stringify({ok:true, res:result}));
    }, req, res);
  });
};

HttpServer.prototype.addHandler = function(opts, handler){
  if(typeof opts == 'string'){
    opts = {path:opts};
  }
  opts.handler = handler;
  this.handlers.push(opts);
};

module.exports = HttpServer;
