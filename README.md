# Fortunes-server

Server for various client example applications as a proof of concept. Data comes from the fortunes module. The intention is to build separate clients in various Backbonejs frameworks such as Chaplinjs, Marionette, and Aura in order to experiment with different front-end technologies. All of this in order to help choose a specific client framework for development.

## Components

- Nodejs application server
    - Express 3.x
    - Serves fortunes (see: https://github.com/kbsymanz/fortunes)
    - Socketio communications with the clients

## Prerequisites

Due to the prerequisites of the fortunes package, this application is designed to be run on Linux. It has been tested on Ubuntu 12.04 but various other flavors may very well work, or other Unixes, etc.

__The fortunes module (installed with ```npm install```) has a prerequisite for the Ubuntu fortune-mod package.__

## Installation

    git clone https://github.com/kbsymanz/fortunes-server
    cd fortunes-server
    npm install

## Usage

    node server.js [-p port] clientDirectory

Server listens on the localhost, port 9000 by default. Use -p to change the port. Browse to: http://localhost:9000.

The clientDirectory is the directory which will be exposed via http as static files through Express. It is expected that an ```index.html``` file exists in this directory. This file will be served for all http routes.

## API

The server responds to Socket.io requests from the client (it is assumed that the client is loaded from the clientDirectory in index.html). The client emits either a ```search``` or ```random``` message, sending along an options object (optional) and a callback.

See test/test.server.js for examples.

## Testing

Start the server in another terminal, then:

    mocha test/test.server.js


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


