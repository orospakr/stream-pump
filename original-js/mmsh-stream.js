// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var stream = require('./stream');
var mmsh_demuxer = require('./mmsh-demuxer');
var log = require("./logging");

var c = "MMSHStream";

var sys = require('sys');
var util = require('util');
var events = require('events');

/**
 * MMSHStream - Stream of Windows Media HTTP Streaming Protocol format (MS-WMSP)
 *
 * I only explicitly support HTTP 1.1 with chunked encoding (ie., I require version11-enabled)
 * I only support push streams at the moment; I don't do pulling yet (although I will!)
 */
module.exports.MMSHStream = function(strm, includes_preheaders) {
    events.EventEmitter.call(this);
    this.header = undefined;

    this.data_sequence_number = 0;

    this._done = false;
    this.done = function() {
	if(this._done) {
	    return;
	}
	this.emit("done");
	this._done = true;

	// hopefully this will help avoid an object island
	this.demuxer = undefined;
    };

    this.demuxer = new mmsh_demuxer.MMSHDemuxer(strm, includes_preheaders, function(packet) {
	// packet
	if(this._done) {
	    return;
	}
	var repacked_data = undefined;
	if(packet.name === "Header") {
	    // don't allow header to be changed twice
	    if(this.header !== undefined) {
		log.warn(c, "What?  Received another header?!");
	    }
	    this.header = packet;
	    repacked_data = packet.repackWithPreheader();
	    this.emit("ready", packet, repacked_data);
	} else if (packet.name === "Data") {
	    // log.debug(c, "Repacking data with preheader");
	    repacked_data = packet.repackWithPreheader(this.data_sequence_number++);
	} else if (packet.name === "End of Stream") {
	    this.done();
	} else {
	    log.warn(c, "I need to repack (or do I?) a packet type that I don't know how to repack yet for: " + packet.name);
	}
	this.emit(packet.name, packet, repacked_data);
	this.emit("all", packet, repacked_data);

	// console.log("First 16 bytes: " + util.inspect(packet.payload.slice(0, 16)));
    }.bind(this), function(e) {
	// error :(
	log.warn("Stream has ended: " + e);
	this.done();
    }.bind(this));

    this.isHeaderAvailable = function() {
	return(this.header !== undefined);
    };

    this.getHeader = function() {
	return(this.header);
    };
};
sys.inherits(module.exports.MMSHStream, stream.Stream);
sys.inherits(module.exports.MMSHStream, events.EventEmitter);
