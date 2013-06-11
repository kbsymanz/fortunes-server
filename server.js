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
  , fortunes = require('socket.io').listen(server).of('/fortunes')
  , program = require('commander')
  , path = require('path')
  , defaultPort = 9000
  ;

program
  .usage('node server.js [-p ' + defaultPort + '] clientDirectory1 [clientDir2 clientDir3 ...]')
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
// Log to stdout what is being requested.
// --------------------------------------------------------
app.use(function(req, res, next) {
  console.log('%s: %s', req.method, req.url);
  next();
});
fortunes.on('connection', function(socket) {
  console.log('Connection established: %s', socket.store.id);
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
