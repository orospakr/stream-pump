/* Incoming Request handler for MMS Streams */

var mms_stream = require("./mms-stream.js");
var mms_demuxer = require("./mms-demuxer.js");
var strtok = require('strtok');

var log = require("./logging.js");

var c = "MMSHandler";

var fixtures = require("../spec/mms-demuxer-fixtures");


exports.MMSHandler = function() {
    this.stream = undefined;

    this.handlePushSetup = function(req, response) {
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

	    this.stream = new mms_stream.MMSStream(req, function() {
		log.info(c, "Returning 422 to pusher due to some sort of protocol error.");
		response.writeHead(422, {"Content-Type": "text/plain"});
		// TODO: would be very nice to push my shiny protocol errors up to here.
		response.end("Sorry, but your stream did not make any sense!");	
	    }.bind(this));
	    return;
	} else {
	    var noStream = function() {
		log.info(c, "Client arrived before stream is up.  Disappointing them.");
		response.writeHead(503, {"Content-Type": "text/plain"});
		response.end("You're early!  Stream isn't up yet!");
	    };
	    // if(this.stream === undefined) {
	    // 	noStream();
	    // } else if (!(this.stream.isHeaderAvailable())) {
	    // 	noStream();
	    // } else {
	     	log.debug(c, "Client doing a Describe, sending them the header!");
		//var header = this.stream.getHeader();
		//var header_bin = header.repack();
	    // var payload = new Buffer(fixtures.header_packet_payload.length + 8);
	    // (new Buffer([0,0,0,0,0, 0x0c, 0xa9, 0x15])).copy(payload, 0);
	    // fixtures.header_packet_payload.copy(payload, 8);
	    var payload = new Buffer(fixtures.header_packet2_payload.length + 8);
	    for(i = 0; i < 8; i++) {
		payload[i] = 0;
	    }
	    payload[5] = 0x0c;
	    strtok.UINT16_LE.put(payload, 6, payload.length);
	    
	    fixtures.header_packet2_payload.copy(payload, 8, 0);
	     var packt = new mms_demuxer.HeaderPacket(function() {}, function() {});
	     packt.payload = payload;
	     packt.data_length = payload.length;
	     var header_bin = packt.repack();
		response.writeHead(200, [["Server", "Rex/12.0.7600.16385"], ["Content-Type", "application/vnd.ms.wms-hdr.asfv1"], ["Content-Length", header_bin.length + ""], ["Pragma", "no-cache"], ["Pragma", "client-id=23232323"], ["Pragma", "features=\"broadcast,playlist\""], ["Pragma", "pipeline-experiment=1"], ["Supported", "com.microsoft.wm.srvppair, com.microsoft.wm.sswitch, com.microsoft.wm.predstrm,com.microsoft.wm.fastcache, com.microsoft.wm.startupprofile"], ["Pragma", "xResetStrm=1"]]);
		response.end(header_bin);
	   //}

	    return;
	}
    };
};
