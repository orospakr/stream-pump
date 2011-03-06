// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var url = require('url');
var mmsh_stream = require("./mmsh-stream");
var events = require('events');
var http = require('http');
var sys = require('sys');
var log = require("./logging");
var util = require('util');

var c = "MMSHPullSource";

exports.MMSHPullSource = function(stream_uri) {
    events.EventEmitter.call(this);

    //var options = url.parse(stream_uri);
    //log.debug(c, "URI to pull from broken down into: " + util.inspect(options));

    var req = http.request(stream_uri, function(res) {
	console.log("got result! " + util.inspect(res.headers));
	stream = new mmsh_stream.MMSHStream(res, true, function() {
	    log.error(c, "error on mmsh stream!");
	});
	stream.on("all", function(packet, repacked) {
    	    // log.debug(c, "First 16 bytes: " + util.inspect(packet.payload.slice(0, 16)));
	});
	stream.on("ready", function() {
	    log.info(c, "Pulled stream has become ready, informing owner MMSHHandler!");
	    this.emit("ready", stream);
	}.bind(this));
	// res.on('data', function(chunk) {
	// 	console.log("Got " + chunk.length + " bytes of data.");
	// });
    }.bind(this)).on('error', function(e) {
	log.error(c, "got error :( " + e);
    });

    req.setHeader("User-Agent", "NSPlayer");
    req.setHeader("Pragma", "xPlayStrm=1");

    req.end();
};
sys.inherits(exports.MMSHPullSource, events.EventEmitter);
