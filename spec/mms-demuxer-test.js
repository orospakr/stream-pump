var testCase = require('nodeunit').testCase;

var mms_demuxer = require('../lib/mms-demuxer.js');

var events = require('events');

var sys = require('sys');
var util = require('util');

var MockStream = function() {
    events.EventEmitter.call(this);

    // Call with a Buffer of data you want to submit.
    this.injectData = function(data) {
	this.emit("data", data);
    };
};
sys.inherits(MockStream, events.EventEmitter);

var bufferDump = function(buf) {
    var result = [];
    for(i = 0; i < buf.length; i++) {
	result.push("0x" + buf[i].toString(16));
    }
    return util.inspect(result);
};

var _compareBuffers = function(b1, b2) {
    if(b1.length !== b2.length) {
	console.log("lengths did not match");
	return false;
    }

    for(i = 0; i<b1.length; i++) {
	if(b1[i] !== b2[i]) {
	    console.log("octet at position " + i + " did not match.");
	    return false;
	}
    }
    return true;
};

var compareBuffers = function(b1, b2) {
    if(!_compareBuffers(b1, b2)) {
	console.log(bufferDump(b1) + " did not match " + bufferDump(b2));
	return false;
    }
    return true;
};

module.exports = testCase({
    SimpleHeaderAndData: function(cb) {
    	// MMS "data" packet, "B" bit not set, 5 bytes payload
    	var simplePacket = new Buffer([0x24, 0x44, 0x05, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04]);
    	var stream = new MockStream();
    	var testD = new mms_demuxer.MMSDemuxer(stream, function(packet) {
    	    cb.equal(packet.payload.length, 5);
    	    cb.done();
    	}.bind(this), function(error) {
	    console.log("Got an error: " + error);
    	    cb.ok(false);
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
    	var testD = new mms_demuxer.MMSDemuxer(stream, function(packet) {
	    if(received === 0) {
		cb.equal(packet.payload.length, 5);
		cb.equal(packet.name, "Data");
		received = 1;
	    } else if(received === 1) {
		cb.equal(packet.payload, undefined);
		cb.equal(packet.name, "End of Stream");
		cb.done();
	    }
	}.bind(this), function(error) {
    	    cb.ok(false);
    	}.bind(this));

	received = 0;
	stream.injectData(simplePacket);
    },

    InvalidMagicShouldErrorOut: function(cb) {
    	var simplePacket = new Buffer([0x19, 0x44, 0x05]);
    	var stream = new MockStream();
    	var testD = new mms_demuxer.MMSDemuxer(stream, function(packet) {
    	    cb.error();
    	}.bind(this), function(error) {
    	    cb.done();
    	}.bind(this));
    	stream.injectData(simplePacket);
    },

    "Packet Types": {
    	StreamChangeNotification: function(cb) {
    	    var stream = new MockStream();
    	    var testD = new mms_demuxer.MMSDemuxer(stream, function(packet) {
    		cb.equal(packet.data_length, 4);
    		cb.equal(packet.reason, 0x00);
    		cb.done();
    	    }.bind(this), function(error) {
    		cb.ok(false);
    	    }.bind(this));
	    
    	    stream.injectData(new Buffer([0x24, 0x43, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00]));
    	},

    	// Data: function(cb) {
    	// },

    	EndOfStream: {
    	    Finished: function(cb) {
    		var stream = new MockStream();
    		var testD = new mms_demuxer.MMSDemuxer(stream, function(packet) {
    		    cb.equal(packet.data_length, 4);
    		    cb.equal(packet.reasonOkay(), true);
    		    cb.done();
    		}.bind(this), function(error) {
    		    cb.ok(false);
    		}.bind(this));
    		stream.injectData(new Buffer([0x24, 0x45, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00]));
    	    }
    	},

    	Header: function(cb) {
    	    var stream = new MockStream();
    	    var testD = new mms_demuxer.MMSDemuxer(stream, function(packet) {
    		cb.equal(packet.data_length, 5);
    		cb.equal(packet.payload.length, 5);
    		cb.done();
    	    }.bind(this), function(error) {
    		cb.ok(false);
    	    }.bind(this));
    	    stream.injectData(new Buffer([0x24, 0x48, 0x05, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05]));
    	},

	HeaderRepack: function(cb) {
	    var h = new mms_demuxer.HeaderPacket(function() {}, function() {});
	    var expected = new Buffer([0x24, 0x48, 0x05, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
	    h.payload = new Buffer([1,2,3,4,5]);
	    h.data_length = 5;
	    var result = h.repack();
	    cb.ok(result !== undefined);
	    cb.ok(compareBuffers(expected, result));
	    cb.done();
	},

    	Metadata: function(cb) {
    	    var stream = new MockStream();
    	    var testD = new mms_demuxer.MMSDemuxer(stream, function(packet) {
    		cb.equal(packet.data_length, 5);
    		cb.equal(packet.payload.length, 5);
    		cb.done();
    	    }.bind(this), function(error) {
    		cb.ok(false);
    	    }.bind(this));
    	    stream.injectData(new Buffer([0x24, 0x4D, 0x05, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05]));
    	},

    	// PacketPair: function(cb) {
	    
    	// },

    	// TestData: function(cb) {
    	// }
    }
});
