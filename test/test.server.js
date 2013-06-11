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

  describe('Socket.io Fortune Queries >>', function() {
    var client;

    before(function(done) {
      client = sio.connect(sUrl, opts);
      client.on('connect', function(data) {
        done();
      });
    });

    after(function(done) {
      if (client.socket.connected) {
        client.disconnect();
      }
      done();
    });

    describe('Using one connection >>', function(done) {
      it('Search with default options', function(done) {
        var options = {};

        client.emit('search', options, function(data) {
          data.should.be.an.instanceOf(Array);
          should.strictEqual(data.length, 10);
          done();
        });
      });

      it('Search for 4 men', function(done) {
        var options = {};
        options.term = 'men';
        options.max = 4;

        client.emit('search', options, function(data) {
          should.strictEqual(data.length, 4);
          done();
        });
      });

      it('Random with options', function(done) {
        var options = {};
        options.term = 'men';
        options.max = 4;
        options.isShort = true;

        client.emit('random', options, function(data) {
          data.should.be.a('string');
          / men /i.test(data).should.be.true;
          data.length.should.be.below(161);
          done();
        });
      });

    });
  });
});

