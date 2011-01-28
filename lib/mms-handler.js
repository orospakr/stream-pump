/* Incoming Request handler for MMS Streams */

var mms_stream = require("./mms-stream.js");

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
	console.log("WMS Push Setup request received!");
    };


    this.consumeRequest = function(req, response) {
	if(req.headers["content-type"] === "application/x-wms-pushsetup") {
	    this.handlePushSetup(req, response);
	    return;
	} else if(req.headers["content-type"] === "application/x-wms-pushstart") {
	    console.log("Starting stream!");
	    // var fd = fs.createWriteStream("/tmp/10dectest.mms", {'flags': 'w'});
	    // if(fd === undefined) {
	    // 	console.log("WTFFFF");
	    // }
	    // req.on('data', function(data) {
	    // 	fd.write(data);
	    // 	console.log("Got " + data.length + " bytes!");
	    // });

	    this.stream = new mms_stream.MMSStream(req, function() {
		console.log("Returning 422 to pusher due to some sort of protocol error.");
		response.writeHead(422, {"Content-Type": "text/plain"});
		// TODO: would be very nice to push my shiny protocol errors up to here.
		response.end("Sorry, but your stream did not make any sense!");	
	    }.bind(this));

	    // console.log(util.inspect(req.headers));
	    return;
	} else {
	    // just return them the header

	    // response.writeHead(422, {"Content-Type": "text/plain"});
	    // response.end("Hum.  That doesn't make too much sense to me...");
	    // console.log("Unexpected fetch of /video with content type of " + util.inspect(req));

	    if(this.stream === undefined) {
		response.writeHead(503, {"Content-Type": "text/plain"});
		response.end("You're early!  Stream isn't up yet!");
		
		console.log("Client arrived before stream is up.  Disappointing them.");
	    } else {
		response.writeHead(200, [["Content-Type", "application/vnd.ms.wms-hdr.asfv1"], ["Content-Length", this.stream.header.data_length], ["Pragma", "no-cache"], ["Pragma", "client-id=23232323"], ["Pragma", "features=\"broadcast,playlist\""]]);
		response.end(this.stream.header.repack());
	    }

//	    console.log(util.inspect(req.headers));
	    return;
	}
    };
};
