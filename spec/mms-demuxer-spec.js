
var mms_demuxer = require('../lib/mms-demuxer.js');

var spec_helper = require('./spec_helper.js');

var fixtures = require('./mms-demuxer-fixtures');

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

describe('MMS Demuxer', function() {
    beforeEach(function() {
	spec_helper.configureSpec.bind(this)();
    });

    it('should demux a stream of multiple packets', function() {
	// Two MMS packets in a row; make sure we can parse multiple packets.
	var simplePacket = new Buffer([0x24, 0x44, 0x05, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x24, 0x45, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00]);
	var stream = new MockStream();
	var received = 0;
    	var testD = new mms_demuxer.MMSDemuxer(stream, function(packet) {
	    if(received === 0) {
		expect(packet.payload.length).toEqual(5);
		expect(packet.name).toEqual("Data");
		received = 1;
	    } else if(received === 1) {
		expect(packet.payload).not.toBeDefined();
		expect(packet.name).toEqual("End of Stream");
		received = 2;
	    }
	}.bind(this), function(error) {
	    expect(false).toBeTruthy();
    	}.bind(this));

	stream.injectData(simplePacket);
	expect(received).toEqual(2);
    });

    it('should error out on a packet without the correct magic number', function() {
	var simplePacket = new Buffer([0x19, 0x44, 0x05]);
    	var stream = new MockStream();
	var got_error = false;
    	var testD = new mms_demuxer.MMSDemuxer(stream, function(packet) {
	    expect().toNotGetHere();
    	}.bind(this), function(error) {
	    got_error = true;
    	}.bind(this));
    	stream.injectData(simplePacket);
	expect(got_error).toBeTruthy();
    });

    describe("packet parsing", function() {
	it("should parse a Data packet", function() {
	    // MMS "data" packet, "B" bit not set, 5 bytes payload
    	    var simplePacket = new Buffer([0x24, 0x44, 0x05, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04]);
    	    var stream = new MockStream();
	    var gotPacket = false;
    	    var testD = new mms_demuxer.MMSDemuxer(stream, function(packet) {
    		expect(packet.payload.length).toEqual(5);
		gotPacket = true;
    	    }.bind(this), function(error) {
		console.log("Got an error: " + error);
    		expect(false).toBeTruthy();
    	    }.bind(this));

    	    stream.injectData(simplePacket);
	    expect(gotPacket).toBeTruthy();
    	    // TODO can I make the test explicitly fail if that callback never
    	    // happens?  instead it causes the rest of the test suite to not run
    	    // because I never call done()...
	});

	it("should demux a stream change notification packet", function() {
	    var stream = new MockStream();
	    var got_packet = false;
    	    var testD = new mms_demuxer.MMSDemuxer(stream, function(packet) {
    		expect(packet.data_length).toEqual(4);
    		expect(packet.reason).toEqual(0x00);
		got_packet = true;
    	    }.bind(this), function(error) {
		expect().toNotGetHere();
    	    }.bind(this));
	    
    	    stream.injectData(new Buffer([0x24, 0x43, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00]));
	    expect(got_packet).toBeTruthy();
	});

	it("should parse an end of stream packet", function() {
	    var stream = new MockStream();
	    var got_packet = false;
    	    var testD = new mms_demuxer.MMSDemuxer(stream, function(packet) {
    		expect(packet.data_length).toEqual(4);
    		expect(packet.reasonOkay()).toBeTruthy();
		got_packet = true;
    	    }.bind(this), function(error) {
		expect().toNotGetHere();
    	    }.bind(this));
    	    stream.injectData(new Buffer([0x24, 0x45, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00]));
	    expect(got_packet).toBeTruthy();
	});

	it("should parse a header packet", function() {
	    var stream = new MockStream();
	    var got_packet = false;
    	    var testD = new mms_demuxer.MMSDemuxer(stream, function(packet) {
    		expect(packet.data_length).toEqual(5);
    		expect(packet.payload.length).toEqual(5);
		got_packet = true;
    	    }.bind(this), function(error) {
		expect().toNotGetHere();
    	    }.bind(this));
    	    stream.injectData(new Buffer([0x24, 0x48, 0x05, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05]));
	    expect(got_packet).toBeTruthy();
	});

	it("should parse a metadata packet", function() {
	    var stream = new MockStream();
	    var got_packet = false;
    	    var testD = new mms_demuxer.MMSDemuxer(stream, function(packet) {
    		expect(packet.data_length).toEqual(5);
    		expect(packet.payload.length).toEqual(5);
		got_packet = true;
    	    }.bind(this), function(error) {
    		expect().notToGetHere();
    	    }.bind(this));
    	    stream.injectData(new Buffer([0x24, 0x4D, 0x05, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05]));
	    expect(got_packet).toBeTruthy();
	});
    });

    describe("packet repacking", function() {
	it("should repack a header packet", function() {
	    var h = new mms_demuxer.HeaderPacket(function() {}, function() {});
	    var expected = new Buffer([0x24, 0x48, 0x05, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
	    h.payload = new Buffer([1,2,3,4,5]);
	    h.data_length = 5;
	    var result = h.repack();
	    expect(result).toBeDefined();
	    expect(result).toMatchBuffer(expected);
	});
    });

    describe("(integration testing)", function() {
	it("should do bit-exact demux/unpack and repack of Header packet", function() {
	    var stream = new MockStream();
	    var packet_received = false;
	    expect(fixtures.header_packet).toBeDefined();
	    expect(fixtures.header_packet.length).toEqual(5499);
	    var demux = new mms_demuxer.MMSDemuxer(stream, function(packet) {
		expect(packet_received).toBeFalsy();
		expect(packet.name).toEqual("Header");
		expect(packet.repack()).toMatchBuffer(fixtures.header_packet);
		packet_received = true;
	    }.bind(this), function(error) {
		expect().toNotGetHere();
	    }.bind(this));
	    stream.injectData(fixtures.header_packet);
	    expect(packet_received).toBeTruthy();
	});
    });
});
