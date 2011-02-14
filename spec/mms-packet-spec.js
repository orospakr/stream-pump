// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var mms_packet = require('../lib/mms-packet');
var spec_helper = require('./spec_helper.js');

describe("MMS Packet", function() {
    beforeEach(function() {
	spec_helper.configureSpec.bind(this)();
    });

    describe("packet repacking", function() {
	it("should repack a header packet", function() {
	    var h = new mms_packet.HeaderPacket(function() {}, function() {});
	    var expected = new Buffer([0x24, 0x48, 0x05, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
	    h.payload = new Buffer([1,2,3,4,5]);
	    h.data_length = 5;
	    var result = h.repack();
	    expect(result).toMatchBuffer(expected);
	});

	it("should repack a header packet with the undocumented redundant goofy-header in front of the data", function() {
	    var h = new mms_packet.HeaderPacket(function() {}, function() {});
	    var expected = new Buffer([0x24, 0x48, 0x0d, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x0d, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
	    h.payload = new Buffer([1,2,3,4,5]);
	    h.data_length = 5;
	    var result = h.repackWithGoofyHeader();
	    expect(result).toMatchBuffer(expected);
	});

	it("should pack a test data notification packet", function() {
	    var t = new mms_packet.TestDataPacket(function() {}, function() {});
	    var expected = new Buffer([0x24, 0x54, 0x00, 0x00]);
	    var result = t.repack();
	    expect(result).toMatchBuffer(expected);
	});
    });
});