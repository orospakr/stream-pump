// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var events = require('events');
var sys = require('sys');
var log = require("./logging");
var mmsh_stream = require("./mmsh-stream");
var util = require('util');

var c = "MMSHPushSource";

exports.MMSHPushSource = function() {
    events.EventEmitter.call(this);

    this.handlePushSetup = function(req, response) {
	// TODO factor this out into "MMSHPushSource"
	// yes, the pusher is in the right place!  Let them feel like they've created
	// me so they feel comfortable. ;)
	
	// TODO I'm kind of lying here. how many of those can I remove/actually implement?
	// I don't care about push-id.  Either you push to me or you don't.
	response.writeHead(204, {"Server": "Cougar/9.6.7600.16564",
				 "Pragma": "no-cache, timeout=60000",
				 "Set-Cookie": "push-id=42424242",
				 "Supported": "com.microsoft.wm.srvppair, com.microsoft.wm.sswitch, com.microsoft.wm.predstrm, com.microsoft.wm.fastcache, com.microsoft.wm.startupprofile"}); 
	response.end();
	log.info(c, "WMS Push Setup request received!");
    };

    this.consumeRequest = function(req, response) {
	if(req.headers["content-type"] === "application/x-wms-pushsetup") {
	    this.handlePushSetup(req, response);
	    return;
	} else if(req.headers["content-type"] === "application/x-wms-pushstart") {
	    log.info(c, "Starting stream!");
	    // TODO should receive a message here when MMSHStream has completed, so I can inform the clients that the stream has gone
	    // TODO should receive message here when a data packet has arrived, so I can send it along to my clients
	    // TODO if there's already a stream up, use the server-side stream switching
	    // notification to notify and switch the existing clients
	    this.stream = new mmsh_stream.MMSHStream(req, false);
	    var is_done = false;
	    var done = function() {
		if(!is_done) {
		    this.emit("done");
		    is_done = true;
		}
	    }.bind(this);
	    
	    this.stream.on("done", function() {
		log.info(c, "Returning 422 to pusher due to some sort of protocol error.");
		response.writeHead(422, {"Content-Type": "text/plain"});
		// TODO: would be very nice to push my shiny protocol errors up to here.
		response.end("Sorry, but your stream did not make any sense!");	
		done();
	    }.bind(this));
	    req.on("close", function(graceful) {
		done();
	    }.bind(this));
	    this.stream.on("ready", function() {
		this.emit("ready", this.stream);
	    }.bind(this));
	    return;
	}
    };
};
sys.inherits(exports.MMSHPushSource, events.EventEmitter);
