// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

/* Incoming Request handler for MMSH Streams */

var events = require('events');
var sys = require('sys');

var mmsh_stream = require("./mmsh-stream");
var mmsh_demuxer = require("./mmsh-demuxer");
var mmsh_client_session = require('./mmsh-client-session');
var hsp_util = require('./util');
var strtok = require('strtok');
var util = require('util');
var log = require("./logging");



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
exports.MMSHHandler = function(short_name, stream_source) {
    events.EventEmitter.call(this);

    var c = "MMSHHandler/" + short_name;
    
    this.stream = undefined;

    this.on("active-clients-changed", function(ct) {
	log.info(c, "There are now " + ct + " clients connected.");
    });

    this.client_streams = [];
    this.emit("active-clients-changed", 0);

    this.seen_header_buffers = [];

    stream_source.on("ready", function(stream) {
	if(this.stream !== undefined) {
	    log.warn(c, "Yikes!  Somehow, I already have a stream ready and I'm being informed of a new one?!");
	}
	log.debug(c, "Stream has become ready, clients can now attach!");
	
	this.sessions = {};
	this.stream = stream;
    }.bind(this));

    stream_source.on("done", function() {
	log.debug(c, "Stream has finished, booting clients and denying new ones.");
	// TODO boot clients?
	this.stream = undefined;
    }.bind(this));

    this.clientStartedStreaming = function(client_stream) {
	this.client_streams.push(client_stream);
	client_stream.once("done", function() {
	    var idx = this.client_streams.indexOf(client_stream);
	    this.client_streams.splice(idx, 1);
	    this.emit("active-clients-changed", this.client_streams.length);
	}.bind(this));
	this.emit("active-clients-changed", this.client_streams.length);
    };

    this.consumeRequest = function(req, response) {
	var noStream = function() {
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

	    var newSession = function() {
		var sess = new mmsh_client_session.MMSHClientSession(function() { return this.stream; }.bind(this), function(client_id) {
		    return (!(parseInt(client_id) in this.sessions));
		}.bind(this));
		this.sessions[sess.client_id] = sess;
		log.debug(c, "New client arrived from " + req.socket.remoteAddress + ", assigned client id: " + sess.client_id);
		sess.on("client", this.clientStartedStreaming.bind(this));
		sess.consumeRequest(req, response);
	    }.bind(this);
	    
	    if(client_id === undefined) {
		newSession();
	    } else {
		var sess = this.sessions[client_id];
		if(sess === undefined) {
		    // client sent me an unknown client ID
		    log.warn(c, "Client with an unknown client ID showed up");
		    newSession();
		} else {
		    //log.debug(c, "Delegating client with ID '" + client_id + " ', arriving from address '" + req.socket.remoteAddress + "' to existing session.");
		    sess.consumeRequest(req, response);
		}
	    }
	}
	return;
    };
};
sys.inherits(exports.MMSHHandler, events.EventEmitter);
