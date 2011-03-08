// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var mmsh_packet = require('../lib/mmsh-packet');
var spec_helper = require('./spec_helper.js');

describe("MMSH Packet", function() {
    beforeEach(function() {
	spec_helper.configureSpec.bind(this)();
    });

    describe("packet unpacking", function() {
	// This logic is tested in MMSHDemuxerSpec.
    });

    describe("packet repacking", function() {
	it("should repack a header packet", function() {
	    var h = new mmsh_packet.HeaderPacket(function() {}, function() {});
	    var expected = new Buffer([0x24, 0x48, 0x05, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
	    h.payload = new Buffer([1,2,3,4,5]);
	    h.data_length = 5;
	    var result = h.repack();
	    expect(result).toMatchBuffer(expected);
	});

	it("should repack a header packet with a manually specified MMSH payload preheader", function() {
	    var h = new mmsh_packet.HeaderPacket(function() {}, function() {});
	    var expected = new Buffer([0x24, 0x48, 0x0d, 0x00, 0x44, 0x33, 0x22, 0x11, 0xee, 0xaf, 0x0d, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
	    h.payload = new Buffer([1,2,3,4,5]);
	    h.data_length = 5;
	    var result = h.repackWithPreheaderFields(287454020, 238, 175);
	    expect(result).toMatchBuffer(expected);
	});

	it("should repack a header packet with the appropriate MMSH payload preheader", function() {
	    var h = new mmsh_packet.HeaderPacket(function() {}, function() {});
	    var expected = new Buffer([0x24, 0x48, 0x0d, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x0d, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
	    h.payload = new Buffer([1,2,3,4,5]);
	    h.data_length = 5;
	    var result = h.repackWithPreheader();
	    expect(result).toMatchBuffer(expected);
	});

	it("should pack a test data notification packet", function() {
	    var t = new mmsh_packet.TestDataPacket(function() {}, function() {});
	    var expected = new Buffer([0x24, 0x54, 0x00, 0x00]);
	    var result = t.repack();
	    expect(result).toMatchBuffer(expected);
	});

	it("should pack a data packet", function() {
	    var d = new mmsh_packet.DataPacket(function() {}, function() {});
	    var expected = new Buffer([0x24, 0x44, 0x05, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04]);
	    d.payload = new Buffer([0x00, 0x01, 0x02, 0x03, 0x04]);
	    d.data_length = 5;
	    var result = d.repack();
	    expect(result).toMatchBuffer(expected);
	});

	it("should pack a data packet with the appropriate MMSH payload preheader", function() {
	    var d = new mmsh_packet.DataPacket(function() {}, function() {});
	    var expected = new Buffer([0x24, 0x44, 0x0d, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0d, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
	    d.payload = new Buffer([0x01, 0x02, 0x03, 0x04, 0x05]);
	    d.data_length = 5;
	    var result = d.repackWithPreheader(1);
	    expect(result).toMatchBuffer(expected);
	});

	it("should pack an end of stream packet", function() {
	    var d = new mmsh_packet.EndOfStreamPacket(function() {}, function() {});
	    var expected = new Buffer([0x24, 0x45, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00]);
	    var result = d.repack();
	    expect(result).toMatchBuffer(expected);
	});
    });
});
