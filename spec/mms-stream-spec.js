// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var util = require('util');

var spec_helper = require("./spec_helper");

var mms_demuxer = require('../lib/mms-demuxer');
var mms_stream = require('../lib/mms-stream');

describe('MMS Handler', function() {
    beforeEach(function() {
	spec_helper.configureSpec.bind(this)();
	demuxer = {
	};

	req_stream = {
	};

	handler_func = {};
	
	var orig_dmux = mms_demuxer.MMSDemuxer;
	mms_demuxer.MMSDemuxer = function(strm, handler_func_) {
	    expect(strm).toBe(req_stream);
	    handler_func = handler_func_;
	};
	stream = new mms_stream.MMSStream(req_stream, function() {});
	mms_demuxer.MMSDemuxer = orig_dmux;
    });

    it("should inform a registered handler of an incoming data packet", function() {
	var got_handler = false;
	var test_packet = {name:"Data",
			   repackWithPreheader: function(seq) {
			       expect(seq).toEqual(0);
			       return "dorp";
			   }};
	var ignore_packet = {name:"Header", repackWithPreheader: function() {return "dorp"}};
	stream.onPacket("Data", function(packet, repacked_packet) {
	    expect(packet).toBe(test_packet);
	    expect(repacked_packet).toEqual("dorp");
	    got_handler = true;
	});
	handler_func(test_packet);
	handler_func(ignore_packet);
	expect(got_handler).toBeTruthy();
    });

    it("should inform a registered handler of all packets", function() {
	var got_handlers = 0;
	var test_packet = {name:"Header", repackWithPreheader: function() {return "dorp"}};
	var test_packet1 = {name:"Data",
			    repackWithPreheader: function(seq) {
				expect(seq).toEqual(0);
				return "dorp1";
			    }};
	
	stream.onPacket("all", function(packet, repacked_packet) {
	    if(got_handlers === 0) {
		expect(packet).toBe(test_packet);
		expect(repacked_packet).toEqual("dorp");
		got_handlers = 1;
	    } else if(got_handlers === 1) {
		expect(packet).toBe(test_packet1);
		expect(repacked_packet).toEqual("dorp1");
		got_handlers = 2;
	    }
	});
	handler_func(test_packet);
	handler_func(test_packet1);
	expect(got_handlers).toEqual(2);
    });

    // TODO test handler removal
});
