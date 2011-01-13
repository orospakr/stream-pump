var testCase = require('nodeunit').testCase;

var mms_demuxer = require('../http-stream-pump/mms-demuxer.js');

var events = require('events');

var sys = require('sys');

var MockStream = function() {
    events.EventEmitter.call(this);

    // Call with a Buffer of data you want to submit.
    this.injectData = function(data) {
	this.emit("data", data);
    };
};
sys.inherits(MockStream, events.EventEmitter);

module.exports = testCase({
    SimpleHeaderAndData: function(callback) {
	// MMS "data" packet, "B" bit not set, 5 bytes payload
	var simplePacket = new Buffer([0x24, 0x44, 0x05, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04]);
	var stream = new MockStream();
	var testD = new mms_demuxer.MMSDemuxer(stream);

	testD.whenPacketReceived(function(packet) {
	    callback.equal(packet.payload.length, 5);
	    callback.done();
	}.bind(this));
	stream.injectData(simplePacket);
	// TODO can I make the test explicitly fail if that callback never
	// happens?  instead it causes the rest of the test suite to not run
	// because I never call done()...
    },

    InvalidMagicShouldErrorOut: function(cb) {
    	var simplePacket = new Buffer([0x19, 0x44, 0x05]);
    	var stream = new MockStream();
    	var testD = new mms_demuxer.MMSDemuxer(stream, function(error) {
    	    cb.done();
    	}.bind(this));
    	testD.whenPacketReceived(function(packet) {
    	    cb.error();
    	}.bind(this));
    	stream.injectData(simplePacket);
    },

    PacketTypes: {
    	StreamChangeNotification: function(cb) {
    	    cb.done();
    	},

    	// Data: function(cb) {
    	// },

    	// EOS: function(cb) {
    	// },

    	// Header: function(cb) {
    	// },

    	// PacketPair: function(cb) {
	    
    	// },

    	// TestData: function(cb) {
    	// }
    }
});
