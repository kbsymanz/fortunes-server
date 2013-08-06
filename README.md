# Fortunes-server

Server for various client example applications as a proof of concept. Data comes from the fortunes module. The intention is to build separate clients in various Backbonejs frameworks such as Chaplinjs, Marionette, and Aura in order to experiment with different front-end technologies. All of this in order to help choose a specific client framework for development.

## Components

- Nodejs application server
    - Express 3.x
    - Serves fortunes using the [Fortunes](https://github.com/kbsymanz/fortunes) module
    - Socketio communications with the clients

## Prerequisites

Due to the prerequisites of the [fortunes](https://github.com/kbsymanz/fortunes) package, this application is designed to be run on Linux where a native fortunes package needs to be installed. It has been tested on Ubuntu 12.04 but various other flavors may very well work, or other Unixes, etc.

On Ubuntu:

    sudo apt-get install fortune-mod

It essence, it is assumed that the server has a working ```fortune``` command. Make that happen and the Fortunes module should work.

## Installation (after prerequisites are satisfied)

    git clone https://github.com/kbsymanz/fortunes-server
    cd fortunes-server
    npm install

## Usage

    node server.js [-p port] clientDirectory

Server listens on the localhost, port 9000 by default. Use -p to change the port. Browse to: http://127.0.01:9000.

The clientDirectory is the directory which will be exposed via http as static files through Express. It is expected that an ```index.html``` file exists in this directory. This file will be served for all http routes.

Known valid clients include:

- [fortunes-chaplin](https://github.com/kbsymanz/fortunes-chaplin)
- fortunes-aura (coming ...)
- fortunes-marionette (coming ...)

For example, assuming that you are in the fortunes-server directory and the fortunes-chaplin project shares the same parent directory:

    node server.js -p 8888 ../fortunes-chaplin/
    

## API

The server responds to Socket.io requests from the client. The client emits either a ```search```, ```random```, or a ```whoami``` message in the ```fortunes``` channel.

### search

Searches for fortunes that contain specified terms. Returns an array of matches.

Params:

- options: see the [fortunes](https://github.com/kbsymanz/fortunes) module for valid options because the options that the server receives are passed straight through. The known valid clients mentioned above already send a subset of these options.
- callback

### random

Returns a random fortune unless an interval is specified in which case it will return a key for the client to listen on that the server will use to emit messages at regular intervals to the client.

Params:

- options: see the [fortunes](https://github.com/kbsymanz/fortunes) module for valid options because the options that the server receives are passed straight through. The known valid clients mentioned above already send a subset of these options.
  - options.interval: the number of seconds between server emits of a single fortune to the client.
- callback

### whoami

Returns the username that the server thinks that the client represents.

Params:

- callback

## Testing

**TODO:** Get test suite working again after bringing Passportjs and Session.socket.io into the project.

## License

The MIT License (MIT)

Copyright (c) 2013 Kurt Symanzik <kurt@kbsymanzik.org>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.


