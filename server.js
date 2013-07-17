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
  , RedisStore = require('connect-redis')(express)
  , sessionStoreOptions = {
    host: 'localhost'
    , port: 6379
    , db: 8
    , prefix: 'session:'
    }
  , ejs = require('ejs')
  , program = require('commander')
  , _ = require('underscore')
  , path = require('path')
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , SessionSockets = require('session.socket.io')
  , users = []
  , currUsers = {}
  , fortunes = require('fortunes')
  , clientDir
  , indexFile
  , defPort = 9000
  , port = defPort
  , defSessTimeout = 3600
  , sessTimeout = defSessTimeout
  , sessionSecret = 'incvjpasefsdvmaskjvk'
  , io = require('socket.io').listen(server)
  , sessionStore = new RedisStore(sessionStoreOptions)
  , cookieParser = express.cookieParser(sessionSecret)
  , sessionSockets = new SessionSockets(io, sessionStore, cookieParser)
  , redisDB = 8
  , redis = require('redis')
  , redisClient = redis.createClient()
  , numSetIntervals = 0
  , numIntervalEmits = 0
  , loginRoute = '/login'
  ;

// --------------------------------------------------------
// Configure the Redis database.
// --------------------------------------------------------
redisClient.select(redisDB, function() {
  console.log('Using Redis database %s', redisDB);
});

// --------------------------------------------------------
// Command line options and help.
// --------------------------------------------------------
program
  .usage('node server.js [-p ' + defPort + '] [-t ' + defSessTimeout + '] clientDirectory1')
  .option('-p, --port [port]', 'Specify the port to listen on (default ' + defPort + ')', defPort)
  .option('-t, --timeout [sessTimeout]', 'Specify session length in seconds (default ' + defSessTimeout + ')', defSessTimeout)
  .parse(process.argv)
  ;

if (program.args.length === 0) {
  program.help();
}

// --------------------------------------------------------
// Resolving paths and setting session timeout.
// --------------------------------------------------------
port = program.port
  , sessTimeout = program.timeout
  , clientDir = path.resolve(program.args[0])
  , indexFile = path.resolve(path.join(clientDir, 'index.html'))
  ;

// ========================================================
// ========================================================
// Passport sample implementation.
// ========================================================
// ========================================================

// --------------------------------------------------------
// These next three calls are per the example application at:
// https://github.com/jaredhanson/passport-local/blob/master/examples/express3-no-connect-flash/app.js
// --------------------------------------------------------
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(new LocalStrategy(
  function(username, password, done) {
    // Find the user by username.  If there is no user with the given
    // username, or the password is not correct, set the user to `false` to
    // indicate failure and set a flash message.  Otherwise, return the
    // authenticated `user`.
    findByUsername(username, function(err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
      if (user.password != password) { return done(null, false, { message: 'Invalid password' }); }
      return done(null, user);
    });
  }
));

// ========================================================
// ========================================================
// Express configuration.
// ========================================================
// ========================================================
app.use(express.favicon());

// --------------------------------------------------------
// Log to stdout what is being requested for regular requests.
// --------------------------------------------------------
app.use(function(req, res, next) {
  console.log('%s: %s', req.method, req.url);
  next();
});

// --------------------------------------------------------
// Setup sessions with Passport authentication.
// --------------------------------------------------------
app.use(cookieParser);
app.use(express.session({
  store: sessionStore
  , secret: sessionSecret
  , cookie: {maxAge: sessTimeout * 1000}
}));
app.use(express.bodyParser());
app.use(passport.initialize());
app.use(passport.session());

// --------------------------------------------------------
// Protect against cross site request forgeries.
// See: http://dailyjs.com/2012/09/13/express-3-csrf-tutorial/
// --------------------------------------------------------
app.use(express.csrf());
function csrf(req, res, next) {
  res.locals.token = req.session._csrf;
  next();
}

// --------------------------------------------------------
// The server presents a login page to establish authenticated
// sessions with the clients before allowing the client directories
// to be loaded. Uses CSRF protection.
// --------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.get(loginRoute, csrf, function(req, res) {
  res.render('login', {message: 'Please log in'});
});

// --------------------------------------------------------
// Static resources require authentication.
// --------------------------------------------------------
app.use(ensureAuthenticated);
app.use(express.static(clientDir));

// --------------------------------------------------------
// Handle a login attempt.
// --------------------------------------------------------
app.post(loginRoute, function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) {
      console.log('err: %s', err);
      return next(err);
    }
    if (!user) {
      if (req.session) {
        req.session.messages =  [info.message];
      }
      return res.redirect(loginRoute);
    }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      return res.redirect('/');
    });
  })(req, res, next);
});

// ========================================================
// ========================================================
// Private functions for working with fortunes.
// ========================================================
// ========================================================

/* --------------------------------------------------------
 * startRandomFortune()
 *
 * Start issuing socket messages to the specified client 
 * using the specified key and options. Insure that messages
 * stop once the session has expired and intervals are
 * cleared up for the sake of memory.
 *
 * param       key
 * param       options
 * param       socket
 * return      undefined
 * -------------------------------------------------------- */
var startRandomFortune = function(key, options, socket) {
  var intervalKey
    ;

  console.log('startRandomFortune(): %s, every %d seconds', key, options.interval);
  intervalKey = setInterval(function() {
    fortunes.random(options, function(data) {
      sessionSockets.getSession(socket, function(err, session) {
        if (err) {
          // --------------------------------------------------------
          // The session has expired so we don't send any more data.
          // Instead, we remove our interval so that memory can be
          // reclaimed.
          // --------------------------------------------------------
          console.log('Session expired: stopping random fortune job');
          clearInterval(intervalKey);
          sessionExpired(socket);
        } else {
          socket.emit(key, data);
          console.log('Number setIntervals/emits: %d/%d', numSetIntervals, ++numIntervalEmits);
        }
      });
    });
  }, 1000 * options.interval);
  numSetIntervals++;

  return intervalKey;
};

/* --------------------------------------------------------
 * sessionExpired()
 *
 * Send a message to the specified client that the session
 * has expired.
 *
 * param       socket
 * return      undefined
 * -------------------------------------------------------- */
var sessionExpired = function(socket) {
  socket.emit('sessionExpired', loginRoute);
};

// ========================================================
// ========================================================
// Interface to the client via Socket.io.
// ========================================================
// ========================================================
sessionSockets.of('/fortunes').on('connection', function(err, socket, session) {
  var user
    , sockId
    ;

  // --------------------------------------------------------
  // Guard the socket connection for use by authenticated
  // clients only.
  // --------------------------------------------------------
  if (err) {
    console.log(err);
    return;
  }
  if (! (session.passport && session.passport.user)) {
    console.log('Connection: Socket: no session');
    return;
  }

  // --------------------------------------------------------
  // Shortcuts.
  // --------------------------------------------------------
  user = session.passport.user;
  sockId = socket.store.id;

  // --------------------------------------------------------
  // Store some transient information about current users for
  // this server process.
  // --------------------------------------------------------
  currUsers[user] = {
    socket: sockId
    , intervals: {}
  };
  console.log('Connection established: %s/%s', user, sockId);

  // --------------------------------------------------------
  // Prepare a place in the session to track user jobs.
  // --------------------------------------------------------
  if (! session.jobs) session.jobs = {};

  // --------------------------------------------------------
  // Re-establish server emmissions to specific clients that
  // had them upon server start up.
  // --------------------------------------------------------
  console.log('Restarting jobs ...');
  _.each(session.jobs, function(job, key) {
    console.log('key: %s', key);
    console.dir(job);
    startRandomFortune(key, job.options, socket);
  });


  // --------------------------------------------------------
  // Handle disconnect events from clients.
  // --------------------------------------------------------
  socket.on('disconnect', function() {
    // --------------------------------------------------------
    // Clear any setIntervals() that were in place for this socket.
    // --------------------------------------------------------
    if (currUsers[user]) {
      console.log('Clearing intervals for user %s', user);
      _.each(currUsers[user].intervals, function(val, key) {
        console.log('Cleared interval: %s', key);
        clearInterval(val);
        numSetIntervals--;
      });
      delete currUsers[user];
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
      , clientJob = {}
      , job
      , jobs
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
      if (options.name) {
        // --------------------------------------------------------
        // Insure that we do not start a job that has already been
        // started before, for example, if the client refreshes the
        // browser. We search by whatever this client named the job
        // and return the same key as before so that the client can
        // be "reminded" to listen for what has already been established.
        // --------------------------------------------------------
        job = _.find(session.jobs, function(job) {
          return job.options.name === options.name;
        });
        if (job) {
          console.log('Re-establishing prior job: %s', job.key);
          return cb(job.key);
        }
      }
      jobs = session.jobs;
      console.dir(jobs);
      randomKey = socket.id + ':random:' + options.interval;
      intervalKey = startRandomFortune(randomKey, options, socket);

      // --------------------------------------------------------
      // Store the information so that a server restart can
      // continue as the clients expect. Interval key cannot be
      // stored here since it contains circular references and it
      // does not stringify properly.
      // --------------------------------------------------------
      clientJob.user = user;
      clientJob.options = options;
      clientJob.key = randomKey;
      session.jobs[randomKey] = clientJob;
      session.save();

      // --------------------------------------------------------
      // Store the interval key so that the interval can be
      // cancelled when the clients disconnect.
      // --------------------------------------------------------
      currUsers[user].intervals[randomKey] = intervalKey;

      // --------------------------------------------------------
      // Let the client know what message to listen for.
      // --------------------------------------------------------
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

server.listen(port);
console.log('Serving static: %s', clientDir);
console.log('Listening on port %d with a %d second session timeout', port, sessTimeout);


// ========================================================
// ========================================================
// Private utility functions for use by the sample Passport
// implementation.
//
// Code adapted from:
// https://github.com/jaredhanson/passport-local/blob/master/examples/express3-no-connect-flash/app.js
// ========================================================
// ========================================================

// --------------------------------------------------------
// Users for testing only.
// --------------------------------------------------------
users.push({username: 'user1', password: 'testuser1', id: 1});
users.push({username: 'user2', password: 'testuser2', id: 2});
users.push({username: 'user3', password: 'testuser3', id: 3});
users.push({username: 'user4', password: 'testuser4', id: 4});

/* --------------------------------------------------------
 * findById()
 *
 * param       id
 * param       fn
 * return      undefined
 * -------------------------------------------------------- */
function findById(id, fn) {
  var idx = id - 1;
  if (users[idx]) {
    fn(null, users[idx]);
  } else {
    fn(new Error('User ' + id + ' does not exist'));
  }
}

/* --------------------------------------------------------
 * findByUsername()
 *
 * param       username
 * param       fn
 * return      undefined
 * -------------------------------------------------------- */
function findByUsername(username, fn) {
  for (var i = 0, len = users.length; i < len; i++) {
    var user = users[i];
    if (user.username === username) {
      return fn(null, user);
    }
  }
  return fn(null, null);
}

/* --------------------------------------------------------
 * ensureAuthenticated()
 *
 * param       req
 * param       res
 * param       next
 * return      undefined
 * -------------------------------------------------------- */
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  console.log('Redirecting to login');
  res.redirect(loginRoute);
}

