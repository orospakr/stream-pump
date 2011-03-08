// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var hsp_util = require("./util");
var mmsh_packet = require("./mmsh-packet");
var util = require('util');
var log = require('./logging');

var c = "MMSHClientSession";

var SESSION_STATES = {
    NEW:                0,
    STREAMING:          1
};

/**
  * Track the session state of a client (keyed on the client-id field)
  * stream: the stream that this client will be receiving video from (I'm not going to try to handle on the fly stream changes for now).  This Stream is expected to be active.
  * TODO should probably take a closure that I guarantee I invoke when I am done and need to be cleaned up
      */
module.exports.MMSHClientSession = function(stream, verifyIsIDUnique) {
    this.client_id = 0;
    this.state = SESSION_STATES.NEW;

    log.debug(c, util.inspect(stream));

    do {
	this.client_id = Math.floor(Math.random() * 4294967295);
    } while(!verifyIsIDUnique(this.client_id));

    this.data_handler = undefined;

    this.done = function() {
	stream.removeListener("Data", this.data_handler);
	this.stream = undefined;
    };

    // MS did not make it easy to distinguish between their request types. cocks!
    this.consumeRequest = function(req, response) {
	var pragmas = hsp_util.getPragmaFields(req);
	if(pragmas["xPlayStrm"] === "1") {
	    var header_bin = stream.header.repackWithPreheader();
	    log.debug(c, this.client_id + ": Received stream Play request.");
	    response.writeHead(200, {"Server": "Rex/12.0.7600.16385",
				     "Content-Type": "application/x-mms-framed",
				     "Pragma": "no-cache,client-id=" + this.client_id + ",features=\"broadcast,playlist\"",
				     "Supported": "com.microsoft.wm.srvppair, com.microsoft.wm.sswitch, com.microsoft.wm.predstrm,com.microsoft.wm.fastcache, com.microsoft.wm.startupprofile"});
	    response.write(header_bin);
	    this.data_handler = function(data_packet, repacked_data) {
		log.debug(c, this.client_id + ": sending data packet to attached client...");
		response.write(repacked_data);
	    }.bind(this);
	    stream.on("Data", this.data_handler);
	    req.socket.once("close", function(if_error) {
		log.debug(c, this.client_id + ": disconnected " + (if_error ? "due to error" : "gracefully"));
		this.done();
	    }.bind(this));
	    stream.on("done", function() {
		// on stream done kick the client off w/ EOS!
		var eos = new mmsh_packet.EndOfStreamPacket();
		eos.reason = 0;
		response.end(eos.repackWithPreheader());
		this.done();
	    }.bind(this));
	    this.state == SESSION_STATES.STREAMING;
	} else {
	    log.debug(c, this.client_id + ": received Describe request, returning stream header.");
	    var header_bin = stream.header.repackWithPreheader();
	    // TODO handle the Stream is not writable error here, just in case
	    response.writeHead(200, {"Server": "Rex/12.0.7600.16385",
				     "Content-Type": "application/vnd.ms.wms-hdr.asfv1",
				     "Content-Length": header_bin.length + "",
				     "Pragma": "no-cache,client-id=" + this.client_id + ",features=\"broadcast,playlist\"",
				     "Supported": "com.microsoft.wm.srvppair, com.microsoft.wm.sswitch, com.microsoft.wm.predstrm,com.microsoft.wm.fastcache, com.microsoft.wm.startupprofile"});
	    response.end(header_bin);
	}
    };
};
