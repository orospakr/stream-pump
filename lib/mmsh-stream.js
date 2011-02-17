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

/**
 * MMSHStream - Stream of Windows Media HTTP Streaming Protocol format (MS-WMSP)
 *
 * I only explicitly support HTTP 1.1 with chunked encoding (ie., I require version11-enabled)
 * I only support push streams at the moment; I don't do pulling yet (although I will!)
 */
module.exports.MMSHStream = function(strm, error_cb) {
    this.header = undefined;

    this.callbacks_sequence = 0;
    this.callbacks = [];

    this.data_sequence_number = 0;

    this.demuxer = new mmsh_demuxer.MMSHDemuxer(strm, function(packet) {
	// packet
	var repacked_data = undefined;
	if(packet.name === "Header") {
	    // TODO don't allow header to be changed twice
	    log.debug(c, "Header has been received!");
	    this.header = packet;
	    repacked_data = packet.repackWithPreheader();
	} else if (packet.name === "Data") {
	    log.debug(c, "Repacking data with preheader");
	    repacked_data = packet.repackWithPreheader(this.data_sequence_number++);
	} else {
	    repacked_data = packet.repackWithPreheader();
	}

	this.callbacks.forEach(function(cb) {
	    if((cb[1] === "all") || (cb[1] === packet.name)) {
		cb[2](packet, repacked_data);
	    }
	}.bind(this));
	// console.log("First 16 bytes: " + util.inspect(packet.payload.slice(0, 16)));
    }.bind(this), function() {
	// error :(
	error_cb();
    }.bind(this));

    this.isHeaderAvailable = function() {
	return(this.header !== undefined);
    };

    this.getHeader = function() {
	return(this.header);
    };

    /**
      * Register a callback to receive notification when this Stream receives data packets
      * Returns an integer token you can use to unregister this callback in the future.
      */
    this.onPacket = function(kind, cb) {
	this.callbacks.push([++(this.callbacks_sequence), kind, cb]);
	return this.callbacks_sequence;
    };

    this.rmOnPacket = function(cb_token) {
	for(c = 0; c < this.callbacks; c++) {
	    if(this.callbacks[c][0] === cb_token) {
		this.callbacks = this.callbacks.splice(c, 1);
		return;
	    }
	}
	log.error(c, "Asked to remove a callback with a token that is not registered token: " + cb_token);
    };
};
sys.inherits(module.exports.MMSHStream, stream.Stream);
