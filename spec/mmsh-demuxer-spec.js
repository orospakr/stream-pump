// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var mmsh_demuxer = require('../lib/mmsh-demuxer.js');

var spec_helper = require('./spec_helper.js');

var fixtures = require('./mmsh-demuxer-fixtures');

var sys = require('sys');
var util = require('util');

describe('MMSH Demuxer', function() {
    beforeEach(function() {
	spec_helper.configureSpec.bind(this)();
    });

    it('should demux a stream of multiple packets', function() {
	// Two MMSH packets in a row; make sure we can parse multiple packets.
	var simplePacket = new Buffer([0x24, 0x44, 0x05, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x24, 0x45, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00]);
	var stream = new spec_helper.MockStream();
	var received = 0;
    	var testD = new mmsh_demuxer.MMSHDemuxer(stream, false, function(packet) {
	    if(received === 0) {
		expect(packet.payload.length).toEqual(5);
		expect(packet.name).toEqual("Data");
		received = 1;
	    } else if(received === 1) {
		expect(packet.payload.length).toEqual(0);
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
    	var stream = new spec_helper.MockStream();
	var got_error = false;
    	var testD = new mmsh_demuxer.MMSHDemuxer(stream, false, function(packet) {
	    expect().toNotGetHere();
    	}.bind(this), function(error) {
	    got_error = true;
    	}.bind(this));
    	stream.injectData(simplePacket);
	expect(got_error).toBeTruthy();
    });

    describe("packet parsing", function() {
	it("should parse a Data packet", function() {
	    // MMSH "data" packet, "B" bit not set, 5 bytes payload
    	    var simplePacket = new Buffer([0x24, 0x44, 0x05, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04]);
    	    var stream = new spec_helper.MockStream();
	    var gotPacket = false;
    	    var testD = new mmsh_demuxer.MMSHDemuxer(stream, false, function(packet) {
    		expect(packet.payload.length).toEqual(5);
		expect(packet.name).toEqual("Data");
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
	    var stream = new spec_helper.MockStream();
	    var got_packet = false;
    	    var testD = new mmsh_demuxer.MMSHDemuxer(stream, false, function(packet) {
    		expect(packet.data_length).toEqual(4);
    		expect(packet.reason).toEqual(0x00);
		expect(packet.name).toEqual("Stream Change");
		got_packet = true;
    	    }.bind(this), function(error) {
		expect().toNotGetHere();
    	    }.bind(this));
	    
    	    stream.injectData(new Buffer([0x24, 0x43, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00]));
	    expect(got_packet).toBeTruthy();
	});

	it("should parse an end of stream packet", function() {
	    var stream = new spec_helper.MockStream();
	    var got_packet = false;
    	    var testD = new mmsh_demuxer.MMSHDemuxer(stream, false, function(packet) {
    		expect(packet.data_length).toEqual(4);
    		expect(packet.reasonOkay()).toBeTruthy();
		expect(packet.name).toEqual("End of Stream");
		got_packet = true;
    	    }.bind(this), function(error) {
		expect().toNotGetHere();
    	    }.bind(this));
    	    stream.injectData(new Buffer([0x24, 0x45, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00]));
	    expect(got_packet).toBeTruthy();
	});

	it("should parse a header packet", function() {
	    var stream = new spec_helper.MockStream();
	    var got_packet = false;
    	    var testD = new mmsh_demuxer.MMSHDemuxer(stream, false, function(packet) {
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
	    var stream = new spec_helper.MockStream();
	    var got_packet = false;
    	    var testD = new mmsh_demuxer.MMSHDemuxer(stream, false, function(packet) {
    		expect(packet.data_length).toEqual(5);
    		expect(packet.payload.length).toEqual(5);
		expect(packet.payload).toMatchBuffer(new Buffer([0x01, 0x02, 0x03, 0x04, 0x05]));
		got_packet = true;
    	    }.bind(this), function(error) {
    		expect().notToGetHere();
    	    }.bind(this));
    	    stream.injectData(new Buffer([0x24, 0x4D, 0x05, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05]));
	    expect(got_packet).toBeTruthy();
	});

	describe("with the MMSH preheader", function() {
	    // TODO for now, we're just going to strip that shit off and regenerate ourselves when the time comes
	    it("should parse a header packet", function() {
		var stream = new spec_helper.MockStream();
		var got_packet = false;
    		var testD = new mmsh_demuxer.MMSHDemuxer(stream, true, function(packet) {
    		    expect(packet.data_length).toEqual(5);
    		    expect(packet.payload.length).toEqual(5);
		    expect(packet.payload).toMatchBuffer(new Buffer([0x01, 0x02, 0x03, 0x04, 0x05]));
		    got_packet = true;
    		}.bind(this), function(error) {
		    expect().toNotGetHere();
    		}.bind(this));
    		stream.injectData(new Buffer([0x24, 0x48, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x0D, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05]));
		expect(got_packet).toBeTruthy();
	    });
	});
    });

    describe("(integration testing)", function() {
	it("should do bit-exact demux/unpack and repack of Header packet", function() {
	    var stream = new spec_helper.MockStream();
	    var packet_received = false;
	    expect(fixtures.header_packet).toBeDefined();
	    expect(fixtures.header_packet.length).toEqual(5499);
	    var demux = new mmsh_demuxer.MMSHDemuxer(stream, false, function(packet) {
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

	it("should do bit-exact demux/unpack and repack of another Header packet", function() {
	    var stream = new spec_helper.MockStream();
	    var packet_received = false;
	    expect(fixtures.header_packet2).toBeDefined();
	    expect(fixtures.header_packet2.length).toEqual(5465);
	    var demux = new mmsh_demuxer.MMSHDemuxer(stream, false, function(packet) {
		expect(packet_received).toBeFalsy();
		expect(packet.name).toEqual("Header");
		expect(packet.repack()).toMatchBuffer(fixtures.header_packet2);
		packet_received = true;
	    }.bind(this), function(error) {
		expect().toNotGetHere();
	    }.bind(this));
	    stream.injectData(fixtures.header_packet2);
	    expect(packet_received).toBeTruthy();
	});
    });
});
