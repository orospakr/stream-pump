HTTP Stream Pump
================

HTTP live video stream reflector written in Node.js.  It currently
only supports Microsoft MMSH video streams.

Copyright 2010-2011 Government of Canada

Written by Andrew Clunis <aclunis@credil.org>, at CREDIL
(http://www.credil.org)

Licensed under the GNU General Public License, version 3.  Please see
COPYING for details.

Website
=======

[http://code.credil.org/projects/stream-pump](http://code.credil.org/projects/stream-pump)

Synopsis
========

Stream Pump is intended as a way to "multiply" a live video stream
over HTTP from one source to many clients, and do it with something a
little smaller and lighter than the big, proprietary, (and expensive)
media server applications (like Windows Media Server).  It was
originally written to serve a need for serving video to many clients
behind a bottle-neck.

It does:

* bounce a live HTTP video stream from one source to many clients
  (currently only MMSH supported)
* simple setup
* nest within itself; that is, you can daisy-chain Stream Pumps

It does *not* do:

* transcoding
* format/protocol conversion
* manipulation of anything deeper than the highest layer of
  encapsulation
* sophisticated playlist control
* DRM (well, duh)

Dependencies
============

* Node.js v0.4
* `jasmine-node` (http://pivotal.github.com/jasmine/), installed for use with
  Node
* `strtok` (https://github.com/pgriess/node-strtok)

Both of those packages are available in NPM under the name given.

NB. Older versions of Node.js v0.4 doesn't realize that Pragma HTTP
headers can be joined with commas.  Add `case 'pragma':` to the switch
statement in `IncomingMessage.prototype._addHeaderLine` in node's
lib/http.js.  The spec suite tests make sure that this issue is fixed.

Usage
=====

To increase confidence of sanity, run the test suite first:

    $ ./specs.js

Look in `config.js.example`, copy and adjust to taste.

Create as many streams as you like in config.js.  The only two types
you choose right now are `mmsh_push` and `mmsh_pull`.  The stream
becomes available at the HTTP path `/streams/$pathname`, at the path
name you provided.

The "push" type makes a push endpoint available at
`/streams/$pathname_push`.  Push a video stream to it with Microsoft
Expression Encoder 4 (the old Windows Media Encoder 9 will probably
also work).

The "pull" type will attempt to connect to an MMSH stream server at
the place you provide (which could in fact be another Stream Pump),
and attempt to pull a stream from that.

No authentication for pushers or viewers yet, unfortunately.

Run the Pump itself with:

    $ ./http-stream-pump.js config.js

Pushing from the Encoder with SSL
=================================

EE4 (and presumably similar) don't seem to support pushing over HTTPS.
However, Stream Pump supports SSL perfectly well (look in
`config.js.example`).

You can solve this problem by using Stunnel 4 as the SSL client.

1. Install a copy of Stunnel 4 (Windows version is available
http://www.stunnel.org, although you have to look in the Downloads
directory to see it), and configure it using the example config below.

2. Configure Stream Pump to use SSL (see `config.js.example`).

3. Point your EE4 at it (ie., change the hostname and port part of the
push URL to point at your Stunnel client instead of directly at the
pump), and you'll be pushing over SSL in no time.

I found this particularly useful because I had to push from EE4 on a
rather hostile network with an enforced (thankfully HTTP CONNECT
capable) proxy to a Pump outside on the Public Internet.

Stunnel 4 example config as follows:

    ;; Some performance tunings
    socket = l:TCP_NODELAY=1
    socket = r:TCP_NODELAY=1

    debug = 6

    client = yes

    [mmsh]
    ;; listen on port 8080 on 127.0.0.1; this is what you point your EE4 to.
    accept = localhost:8080

    ;; to use an HTTP CONNECT proxy, add these lines:
    ; protocol = connect
    ; protocolHost = mypump.org:8089 
    ;; but wait! you have to put your target (ie., pump's address) here,
    ;; *not* your proxy's address.  Silly Stunnel.

    ;; coordinates of the SSL service of your Stream Pump:
    ;; and, to use an HTTP CONNECT proxy, put your proxy server's
    ;; coordinates here, *not* your pump's address.
    connect = mypump.org:8089

TODO
====

This is still very new, and kind of buggy.  My TODO notes follow:

* add docstrings
* add authentication
* handle source stream terminating (either nice EOS or socket close),
  and reattaching/reconnecting
* do the integration tests
* handle VLC and GStreamer clients
* make appropriate behavoural descisions for the different user agents
  as per the MMSH spec, such as it is
* Warn and fail if fragmented ASF headers (any packets?) arrive
* Does the MMSH preheader location id field have a appropriate wrap
  behaviour when it overflows the 32-bits?
* proper IPv6 support
