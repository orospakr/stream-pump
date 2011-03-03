// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

/* Incoming Request handler for MMSH Streams */

var mmsh_stream = require("./mmsh-stream");
var mmsh_demuxer = require("./mmsh-demuxer");
var mmsh_client_session = require('./mmsh-client-session');
var hsp_util = require('./util');
var strtok = require('strtok');
var util = require('util');
var log = require("./logging");

var c = "MMSHHandler";

/**
  * Waits for the stream to become ready, and then attaches incoming clients
  * to the Stream via a new MMSHClientSession.
  * Receives requests from MMSH clients, connects them to running stream.
  *
  * stream_source: object which I should listen to in order to be informed
  *                of an MMSHStream being ready that I should use.
  */
exports.MMSHHandler = function(stream_source) {
    this.stream = undefined;
    this.sessions = {};

    stream_source.on("ready", function(stream) {
	log.debug(c, "Stream has become ready, clients can now attach!");
	this.stream = stream;
    }.bind(this));

    stream_source.on("done", function() {
    	// I no longer have a stream, kick the clients off with EOS, return to original state
	log.debug(c, "Stream has finished, booting clients and denying new ones.");
	this.stream = undefined;
    }.bind(this));

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
	    // TODO should receive a message here when MMSHtream has completed, so I can inform the clients that the stream has gone
	    // TODO should receive message here when a data packet has arrived, so I can send it along to my clients
	    // TODO if there's already a stream up, use the server-side stream switching
	    // notification to notify and switch the existing clients
	    this.stream = new mmsh_stream.MMSHStream(req, function() {
		log.info(c, "Returning 422 to pusher due to some sort of protocol error.");
		response.writeHead(422, {"Content-Type": "text/plain"});
		// TODO: would be very nice to push my shiny protocol errors up to here.
		response.end("Sorry, but your stream did not make any sense!");	
	    }.bind(this));
	    return;
	} else {
	    var noStream = function() {
		// TODO as per a comment earlier, more sophisticated stream
		log.info(c, "Client arrived before stream is up.  Disappointing them.");
		response.writeHead(503, {"Content-Type": "text/plain"});
		response.end("You're early!  Stream isn't up yet!");
	    };
	    if(this.stream === undefined) {
	    	noStream();
	    } else {
		// assume that we have a client (we don't do the User-Agent check mandated by the MS-WMSP spec,
		// on account of it being just too douchey :P)
		var client_id = hsp_util.getPragmaFields(req)["client-id"];
		
		if(client_id === undefined) {

		    var sess = new mmsh_client_session.MMSHClientSession(this.stream, function(client_id) {
			return (!(parseInt(client_id) in this.sessions));
		    }.bind(this));
		    this.sessions[sess.client_id] = sess;
		    log.debug("New client arrived from " + req.socket.remoteAddress + ", assigned client id: " + sess.client_id);
		    sess.consumeRequest(req, response);
		} else {
		    // TODO: figure out what the spec says about an unknown client ID showing up.
		    // can I tell it to forget its ID, and then kick it off rudely?
		    var sess = this.sessions[client_id];
		    sess.consumeRequest(req, response);
		}
	    }
	    return;
	}
    };
};
