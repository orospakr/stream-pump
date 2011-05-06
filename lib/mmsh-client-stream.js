

// interface: done event


// once this piece is in order, look into refactoring integration test into steps!

// TODO add odometer

var mmsh_packet = require('./mmsh-packet');
var events = require('events');
var sys = require('sys');
var log = require('./logging');

var c = "MMSHClientStream";

/* session: MMSHClientSession this belongs to
 * whenReady: invokes this routine to say that it's ready to be announced as a client
 * stream: MMSHStream containing the content
 * req: incoming HTTP request from the client itself
 * respones: HTTP response object to send content back out through to the client itself
 */
module.exports.MMSHClientStream = function(session, whenReady, stream, req, response) {
    this.finished = false;

    this.done = function() {
	// TODO unregister from stream handler
	if(this.finished) {
	    return;
	}
	this.finished = true;
	try {
	    var eos = new mmsh_packet.EndOfStreamPacket();
	    eos.reason = 0;
	    response.end(eos.repackWithPreheader());
	} catch(e) {
	    // socket already closed, or whatnot.

	}
	stream.removeListener("done", this.done);
	stream.removeListener("Data", this.data_handler);
	this.emit("done");
    }.bind(this);

    this.data_handler = function(data_packet, repacked_data) {
	// log.debug(c, session.client_id + ": sending data packet to attached client...");
	try {
	    response.write(repacked_data);
	} catch(e) {
	    // client disconnected, otherwise unavailable.  happens sometimes when clients disconnected and there's some buffering going on.
	    this.done();
	}
    }.bind(this);

    var header_bin = stream.header.repackWithPreheader();
    log.debug(c, session.client_id + ": Received stream Play request.");
    try {
	response.writeHead(200, {"Server": "Rex/12.0.7600.16385",
			     "Content-Type": "application/x-mms-framed",
			     "Pragma": "no-cache,client-id=" + session.client_id + ",features=\"broadcast,playlist\"",
			     "Supported": "com.microsoft.wm.srvppair, com.microsoft.wm.sswitch, com.microsoft.wm.predstrm,com.microsoft.wm.fastcache, com.microsoft.wm.startupprofile"});
	response.write(header_bin);
   } catch(e) {
	log.warn(c, "Wow, a client left very early.");
	return;
   }
    
    stream.on("Data", this.data_handler);
    req.socket.once("close", function(if_error) {
	log.debug(c, session.client_id + ": disconnected " + (if_error ? "due to error" : "gracefully"));
	this.done();
    }.bind(this));
    stream.on("done", this.done);
    whenReady(this);
};
sys.inherits(module.exports.MMSHClientStream, events.EventEmitter);
