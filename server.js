/* 
 * -------------------------------------------------------------------------------
 * server.js
 *
 * Server for various client example applications as a proof of concept. 
 * ------------------------------------------------------------------------------- 
 */

var express = require('express')
  , app = express()
  , program = require('commander')
  , path = require('path')
  ;

program
  .usage('node server.js [-p 9000] clientDirectory1 [clientDir2 clientDir3 ...]')
  .option('-p, --port [port]', 'Specify the port to listen on (default 8050)')
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

app.listen(port);
console.log('Serving static: %s', clientDir);
console.log('Listening on port %d', port);
