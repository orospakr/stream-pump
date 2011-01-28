var stream = require('./stream');
var mms_demuxer = require('./mms-demuxer');

var sys = require('sys');

/**
 * MMSStream - Stream of Windows Media HTTP Streaming Protocol format (MS-WMSP)
 *
 * I only explicitly support HTTP 1.1 with chunked encoding (ie., I require version11-enabled)
 * I only support push streams at the moment; I don't do pulling yet (although I will!)
 */
module.exports.MMSStream = function(strm, error_cb) {
    this.header = undefined;

    this.demuxer = new mms_demuxer.MMSDemuxer(strm, function(packet) {
	// packet
	if(packet.name === "Header") {
	    // TODO don't allow header to be changed twice
	    console.log("Header has been received!");
	    this.header = packet;
	}
    }.bind(this), function() {
	// error :(
	error_cb();
    }.bind(this));

    this.isReady = function() {
	return(this.header !== undefined);
    };
};
sys.inherits(module.exports.MMSStream, stream.Stream);
