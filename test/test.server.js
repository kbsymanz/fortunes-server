/* 
 * -------------------------------------------------------------------------------
 * test.server.js
 *
 * Test the server API and features.
 * ------------------------------------------------------------------------------- 
 */

var should = require('should')
  , sUrl = 'http://localhost:9000/fortunes'
  , sio = require('socket.io-client')
  , opts = {
    'reconnection delay': 0
    , 'reopen delay': 0
    , 'force new connection': true
    , 'transports': ['websocket']
    , 'port': 9000
  }
  ;

describe('Fortune server >>', function() {
  describe('Socket.io Connection >>', function() {
    var client;

    before(function(done) {
      client = sio.connect(sUrl, opts);
      client.on('connecting', function(transport) {
        //console.log('Connecting using %s ...', transport);
      });
      client.on('connect', function(data) {
        //console.log('Connect');
        done();
      });
      client.on('close', function() {
        //console.log('CLOSE');
      });
      client.on('disconnect', function() {
        //console.log('DISCONNECT');
      });
    });

    after(function(done) {
      if (client.socket.connected) {
        //console.log('Disconnecting ...');
        client.disconnect();
      }
      done();
    });

    it('Connect to Fortunes namespace', function(done) {
        client.name.should.eql('/fortunes');
        client.socket.connected.should.be.true;
        done();
    });



  });
});

