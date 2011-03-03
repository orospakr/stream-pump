HTTP Stream Pump
================

HTTP live video stream reflector written in Node.js.  It currently
only supports Microsoft MMSH video streams.

Copyright 2010-2011 Government of Canada

Written by Andrew Clunis <aclunis@credil.org>

Licensed under the GNU General Public License, version 3.  Please see
COPYING for details.

Website
=======

[http://code.credil.org/projects/stream-pump](http://code.credil.org/projects/stream-pump)

Synopsis
========

Stream Pump is intended as a way to "bounce" or "reflect" a live video
stream over HTTP from one source to many clients, and do it with
something a little smaller and lighter than the big, proprietary, (and
expensive) media server applications (like Windows Media Server).  It
was originally written to serve a need for serving video to many
clients behind a bottle-neck.

It does:

* Bounce a live HTTP video stream from one source to many clients
  (currently only MMSH supported)
* Not ridiculously complicated to set up
* Nest within itself; that is, you can daisy-chain Stream Pumps

It does *not*:

* Do transcoding
* Format/protocol conversion
* Anything deeper than the highest layer of encapsulation
* Do sophisticated playlist control
* Do DRM (well, duh)

Dependencies
============

* Node.js v0.4
* `jasmine-node` (http://pivotal.github.com/jasmine/), installed for use with
  Node
* `strtok` (https://github.com/pgriess/node-strtok)

NB. Node.js v0.4 doesn't realize that Pragma HTTP headers can be
joined with commas.  Add `case 'pragma':` to the switch statement in
`IncomingMessage.prototype._addHeaderLine` in node's lib/http.js.  I
test to make sure that this issue is fixed in my test cases.

Both jasmine-node and strtok are available in NPM.

Usage
=====

Run the test suite first, to ensure sanity:

    $ ./specs.js

Lots of stuff is still hardcoded.

    $ ./http-stream-pump.js

It listens on port 8086.  A Microsoft MMSH compatible endpoint is
available at /video.  Push a video stream to it with Microsoft
Expression Encoder 4 (the old Windows Media Encoder 9 will probably
also work).  Point Windows Media Player at the same URI to watch the
live video stream.  No security of any kind yet.

TODO
====

This is still very new, and kind of buggy.  My TODO notes follow:

* add docstrings
* handle push stream terminating (either nice EOS or socket close),
  and reattaching
* handle client leaving
* dealing with client showing up with unknown id
* do the integration tests
* handle VLC clients
* make appropriate behavoural descisions for the different user agents
  as per the MMSH spec, such as it is.
* Warn and fail if fragmented ASF headers (any packets?) arrive
* Does the MMSH preheader location id field have a appropriate wrap
  behaviour when it overflows the 32-bits?
