// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var stream = require('./stream');
var mms_demuxer = require('./mms-demuxer');
var log = require("./logging");

var c = "MMSStream";

var sys = require('sys');

/**
 * MMSStream - Stream of Windows Media HTTP Streaming Protocol format (MS-WMSP)
 *
 * I only explicitly support HTTP 1.1 with chunked encoding (ie., I require version11-enabled)
 * I only support push streams at the moment; I don't do pulling yet (although I will!)
 */
module.exports.MMSStream = function(strm, error_cb) {
    this.header = undefined;

    this.data_callbacks_sequence = 0;
    this.data_callbacks = [];

    this.demuxer = new mms_demuxer.MMSDemuxer(strm, function(packet) {
	// packet
	if(packet.name === "Header") {
	    // TODO don't allow header to be changed twice
	    log.debug(c, "Header has been received!");
	    this.header = packet;
	} else if(packet.name === "Data") {
	    var repacked_data = packet.repack();
	    this.data_callbacks.forEach(function(cb) {
		cb[1](packet, repacked_data);
	    }.bind(this));
	}
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
    this.onDataPacket = function(cb) {
	this.data_callbacks.push([++(this.data_callbacks_sequence), cb]);
	return this.data_callbacks_sequence;
    };

    this.rmOnDataPacket = function(cb_token) {
	for(c = 0; c < this.data_callbacks; c++) {
	    if(this.data_callbacks[c][0] === cb_token) {
		this.data_callbacks = this.data_callbacks.splice(c, 1);
		return;
	    }
	}
	log.error(c, "Asked to remove a callback with a token that is not registered token: " + cb_token);
    };
};
sys.inherits(module.exports.MMSStream, stream.Stream);
