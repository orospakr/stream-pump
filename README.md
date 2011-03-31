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

NB. Node.js v0.4 doesn't realize that Pragma HTTP headers can be
joined with commas.  Add `case 'pragma':` to the switch statement in
`IncomingMessage.prototype._addHeaderLine` in node's lib/http.js.  The
spec suite tests make sure that this issue is fixed.

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
