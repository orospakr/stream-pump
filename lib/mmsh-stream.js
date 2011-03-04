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
module.exports.MMSHStream = function(strm, error_cb) {
    events.EventEmitter.call(this);
    this.header = undefined;

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
	this.emit(packet.name, packet, repacked_data);
	this.emit("all", packet, repacked_data);

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
};
sys.inherits(module.exports.MMSHStream, stream.Stream);
sys.inherits(module.exports.MMSHStream, events.EventEmitter);
