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
    SimpleHeaderAndData: function(cb) {
    	// MMS "data" packet, "B" bit not set, 5 bytes payload
    	var simplePacket = new Buffer([0x24, 0x44, 0x05, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04]);
    	var stream = new MockStream();
    	var testD = new mms_demuxer.MMSDemuxer(stream, function(error) {
    	    cb.ok(false);
    	}.bind(this));

    	testD.whenPacketReceived(function(packet) {
    	    cb.equal(packet.payload.length, 5);
    	    cb.done();
    	}.bind(this));
    	stream.injectData(simplePacket);
    	// TODO can I make the test explicitly fail if that callback never
    	// happens?  instead it causes the rest of the test suite to not run
    	// because I never call done()...
    },

    PacketStreaming: function(cb) {
	// Two MMS packets in a row; make sure we can parse multiple packets.
	var simplePacket = new Buffer([0x24, 0x44, 0x05, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x24, 0x45, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00]);
	var stream = new MockStream();
    	var testD = new mms_demuxer.MMSDemuxer(stream, function(error) {
    	    cb.ok(false);
    	}.bind(this));

	received = 0;
	testD.whenPacketReceived(function(packet) {
	    if(received === 0) {
		cb.equal(packet.payload.length, 5);
		cb.equal(packet.name, "Data");
		received = 1;
		console.log("FIRST ONE");
	    } else if(received === 1) {
		console.log("SECOND ONE");
		cb.equal(packet.payload, undefined);
		cb.equal(packet.name, "End of Stream");
		cb.done();
	    }
	}.bind(this));
	stream.injectData(simplePacket);
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
    	    var stream = new MockStream();
    	    var testD = new mms_demuxer.MMSDemuxer(stream, function(error) {
    		cb.ok(false);
    	    }.bind(this));
	    
    	    testD.whenPacketReceived(function(packet) {
    		cb.equal(packet.packet_length, 4);
    		cb.equal(packet.reason, 0x00);
    		cb.done();
    	    }.bind(this));
    	    stream.injectData(new Buffer([0x24, 0x43, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00]));
    	},

    	// Data: function(cb) {
    	// },

    	EndOfStream: {
    	    Finished: function(cb) {
    		var stream = new MockStream();
    		var testD = new mms_demuxer.MMSDemuxer(stream, function(error) {
    		    cb.ok(false);
    		}.bind(this));
    		testD.whenPacketReceived(function(packet) {
    		    cb.equal(packet.packet_length, 4);
    		    cb.equal(packet.reasonOkay(), true);
    		    cb.done();
    		}.bind(this));
    		stream.injectData(new Buffer([0x24, 0x45, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00]));
    	    }
    	},

    	Header: function(cb) {
    	    var stream = new MockStream();
    	    var testD = new mms_demuxer.MMSDemuxer(stream, function(error) {
    		cb.ok(false);
    	    }.bind(this));
    	    testD.whenPacketReceived(function(packet) {
    		cb.equal(packet.packet_length, 5);
    		cb.equal(packet.payload.length, 5);
    		cb.done();
    	    }.bind(this));
    	    stream.injectData(new Buffer([0x24, 0x48, 0x05, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05]));
    	},

    	Metadata: function(cb) {
    	    var stream = new MockStream();
    	    var testD = new mms_demuxer.MMSDemuxer(stream, function(error) {
    		cb.ok(false);
    	    }.bind(this));
    	    testD.whenPacketReceived(function(packet) {
    		cb.equal(packet.packet_length, 5);
    		cb.equal(packet.payload.length, 5);
    		cb.done();
    	    }.bind(this));
    	    stream.injectData(new Buffer([0x24, 0x4D, 0x05, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05]));
    	},

    	// PacketPair: function(cb) {
	    
    	// },

    	// TestData: function(cb) {
    	// }
    }
});
