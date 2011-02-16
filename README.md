HTTP Stream Pump
================

HTTP live video stream reflector written in Node.js.  It currently
only supports Microsoft MMS video streams.

Copyright 2010-2011 Government of Canada

Written by Andrew Clunis <aclunis@credil.org>

Licensed under the GNU General Public License, version 3.  Please see
COPYING for details.

Dependencies
============

* Node.js v0.4
* jasmine (http://pivotal.github.com/jasmine/), installed for use with
  Node
* node-strtok (https://github.com/pgriess/node-strtok)

NB. Node.js v0.4 doesn't realize that Pragma HTTP headers can be
joined with commas.  Add `case 'pragma':` to the switch statement in
`IncomingMessage.prototype._addHeaderLine` in node's lib/http.js.

Both jasmine and node-strtok are available in NPM.

Usage
=====

Lots of stuff is still hardcoded.

    $ ./http-stream-pump.js

It listens on port 8086.  A Microsoft MMS compatible endpoint is
available at /video.  Push a video stream to it with Microsoft
Expression Encoder 4 (the old Windows Media Encoder 9 will probably
also work).  Point Windows Media Player at the same URI to watch the
live video stream.  No security of any kind yet.

Please note that this isn't actually finished yet, and as such won't
work.  Yet.  Stay tuned. :)

You can run the test suite with:

    $ ./specs.js
