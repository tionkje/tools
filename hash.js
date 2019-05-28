var crypto = require('crypto');

function sha512(password, salt){
  return crypto.createHmac('sha512',salt).update(password).digest('base64').toString('base64');
}
function genRandomString(length){
  return crypto.randomBytes(Math.ceil(length/2))
    .toString('base64')
    .slice(0,length);
}

function hash(password, saltLength=16){
  var salt = genRandomString(saltLength);

  var hashed = sha512(password, salt);
  return hashed+';'+salt;
}

function compare(password, hash){
  var [hashed,salt] = hash.split(';');
  return hashed === sha512(password, salt);
}


var assert = require('assert');
assert(compare('test123',hash('test123')));

module.exports = {hash, compare, genRandomString};
