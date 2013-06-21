/*
 * -------------------------------------------------------------------------------
 * server.js
 *
 * Server for various client example applications as a proof of concept.
 * -------------------------------------------------------------------------------
 */

var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , fio = require('socket.io').listen(server).of('/fortunes')
  , program = require('commander')
  , _ = require('underscore')
  , path = require('path')
  , fortunes = require('fortunes')
  , defaultPort = 9000
  , socketData = {}
  ;

program
  .usage('node server.js [-p ' + defaultPort + '] clientDirectory1')
  .option('-p, --port [port]', 'Specify the port to listen on (default ' + defaultPort + ')', defaultPort)
  .parse(process.argv)
  ;

if (program.args.length == 0) {
  program.help();
}

var port = program.port
  , clientDir = path.resolve(program.args[0])
  , indexFile = path.resolve(path.join(clientDir, 'index.html'))
  ;

// --------------------------------------------------------
// Log to stdout what is being requested for regular requests.
// --------------------------------------------------------
app.use(function(req, res, next) {
  console.log('%s: %s', req.method, req.url);
  next();
});


// --------------------------------------------------------
// Interface to the fortunes module via Socket.io.
// --------------------------------------------------------
fio.on('connection', function(socket) {
  console.log('Connection established: %s', socket.store.id);

  // --------------------------------------------------------
  // Establish a place to store data per socket.
  // --------------------------------------------------------
  socketData[socket.id] = {
    socketJobs: []
  };

  socket.on('disconnect', function() {
    // --------------------------------------------------------
    // Clear any setIntervals() that were in place for this socket.
    // --------------------------------------------------------
    if (socketData[socket.id]) {
      _.each(socketData[socket.id]['socketJobs'], function(key) {
        clearInterval(key);
      });
    }
  });

  // --------------------------------------------------------
  // Return the search results via the callback specified.
  // --------------------------------------------------------
  socket.on('search', function(options, cb) {
    if (typeof cb === 'undefined' && typeof options === 'function') {
      cb = options;
      options = {};
    }
    fortunes.search(options, function(data) {
      cb(data);
    });
  });

  // --------------------------------------------------------
  // Return the random fortune to the callback specified, unless
  // options.interval is specified, then return via the callback
  // the message key that will be emitted every options.interval
  // seconds to the socket.
  // --------------------------------------------------------
  socket.on('random', function(options, cb) {
    var intervalKey
      , randomKey
      ;
    if (typeof cb === 'undefined' && typeof options === 'function') {
      cb = options;
      options = {};
    }
    if (options.interval) {
      // --------------------------------------------------------
      // Emit fortunes at a set interval, respond with message
      // key via the callback. Also store the setInterval() key
      // so that it can be discontinued when the socket is
      // disconnected.
      // --------------------------------------------------------
      randomKey = socket.id + ':random:' + options.interval;
      intervalKey = setInterval(function() {
        fortunes.random(options, function(data) {
          socket.emit(randomKey, data);
        });
      }, 1000 * options.interval);
      socketData[socket.id]['socketJobs'].push(intervalKey);
      cb(randomKey);
    } else {
      // --------------------------------------------------------
      // Normal random, respond with fortune via the callback.
      // --------------------------------------------------------
      fortunes.random(options, function(data) {
        cb(data);
      });
    }
  });

});

// --------------------------------------------------------
// Static resources.
// --------------------------------------------------------
app.use(express.static(clientDir));

// --------------------------------------------------------
// All routes are answered with the index.html file for now.
// --------------------------------------------------------
app.all('*', function(req, res) {
  res.sendfile(indexFile);
});

server.listen(port);
console.log('Serving static: %s', clientDir);
console.log('Listening on port %d', port);
