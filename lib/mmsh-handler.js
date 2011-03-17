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
  *
  * TODO: this needs to be refactored.  checking for stream === undefined is dumb
  */
exports.MMSHHandler = function(stream_source) {
    this.stream = undefined;

    this.seen_header_buffers = [];

    stream_source.on("ready", function(stream) {
	if(this.stream !== undefined) {
	    log.warn(c, "Yikes!  Somehow, I already have a stream ready and I'm being informed of a new one?!");
	}
	log.debug(c, "Stream has become ready, clients can now attach!");
	
	this.sessions = {};
	this.stream = stream;
	// log.debug(c, "... header1: " + util.inspect(this.stream.header.payload.slice(0, 32)));
	
    }.bind(this));

    stream_source.on("done", function() {
    	// TODO I no longer have a stream, return to original state
	log.debug(c, "Stream has finished, booting clients and denying new ones.");
	this.stream = undefined;
    }.bind(this));

    this.consumeRequest = function(req, response) {
	// log.debug(c, "... header2: " + util.inspect(this.stream.header.payload.slice(0, 32)));
	// var found = false;
	// this.seen_header_buffers.forEach(function(buf) {
	//     if(buf === this.stream.header.payload) {
	// 	found = true;
	//     }
	// }.bind(this));
	// if(!found) {
	//     this.seen_header_buffers.push(this.stream.header.payload);
	//     log.debug(c, "Found a different stream header!?");
	// }
	var noStream = function() {
	    // TODO as per a comment earlier, more sophisticated stream
	    log.info(c, "Client arrived before stream is up.  Disappointing them.");
	    response.writeHead(503, {"Content-Type": "text/plain"});
	    response.end("You're early!  Stream isn't up yet!");
	};
	if(this.stream === undefined) {
	    noStream();
	} else {
	    // assume that we have a client (we don't do the User-Agent check
	    // mandated by the MS-WMSP spec, on account of it being just
	    // too douchey :P)
	    var client_id = hsp_util.getPragmaFields(req)["client-id"];
	    
	    if(client_id === undefined) {
		var sess = new mmsh_client_session.MMSHClientSession(this.stream, function(client_id) {
		    return (!(parseInt(client_id) in this.sessions));
		}.bind(this));
		this.sessions[sess.client_id] = sess;
		log.debug(c, "New client arrived from " + req.socket.remoteAddress + ", assigned client id: " + sess.client_id);
		sess.consumeRequest(req, response);
	    } else {
		// TODO: figure out what the spec says about an unknown client ID showing up.
		// can I tell it to forget its ID, and then kick it off rudely?
		log.debug(c, "Delegating client with ID '" + client_id + " ', arriving from address '" + req.socket.remoteAddress + "' to existing session.");
		var sess = this.sessions[client_id];
		sess.consumeRequest(req, response);
	    }
	}
	return;
    };
};
