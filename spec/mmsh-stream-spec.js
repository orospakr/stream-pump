// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var util = require('util');

var spec_helper = require("./spec_helper");

var mmsh_demuxer = require('../lib/mmsh-demuxer');
var mmsh_stream = require('../lib/mmsh-stream');

describe('MMSH Handler', function() {
    beforeEach(function() {
	spec_helper.configureSpec.bind(this)();
	demuxer = {
	};

	req_stream = {
	};

	handler_func = {};
    });

    describe("with MMSH preheaders enabled", function() {
	beforeEach(function() {
	    var orig_dmux = mmsh_demuxer.MMSHDemuxer;
	    mmsh_demuxer.MMSHDemuxer = function(strm, includes_preheaders, handler_func_) {
		expect(includes_preheaders).toBeTruthy();
		expect(strm).toBe(req_stream);
		handler_func = handler_func_;
	    };
	    stream = new mmsh_stream.MMSHStream(req_stream, true, function() {});
	    mmsh_demuxer.MMSHDemuxer = orig_dmux;
	});
    });

    describe("without MMSH preheaders enabled", function() {
	beforeEach(function() {
	    var orig_dmux = mmsh_demuxer.MMSHDemuxer;
	    dmux_error_handler_func = undefined;
	    mmsh_demuxer.MMSHDemuxer = function(strm, includes_preheaders, handler_func_, error_handler_func_) {
		expect(includes_preheaders).toBeFalsy();
		dmux_error_handler_func = error_handler_func_;
		expect(strm).toBe(req_stream);
		handler_func = handler_func_;
	    };
	    stream = new mmsh_stream.MMSHStream(req_stream, false, function() {}, function() {error_handler_func(); });
	    mmsh_demuxer.MMSHDemuxer = orig_dmux;
	});

	it("should inform a registered handler of an incoming data packet", function() {
	    var got_handler = false;
	    var test_packet = {name:"Data",
			       repackWithPreheader: function(seq) {
				   expect(seq).toEqual(0);
				   return "dorp";
			       }};
	    var ignore_packet = {name:"Header", repackWithPreheader: function() {return "dorp"}};
	    stream.on("Data", function(packet, repacked_packet) {
		expect(packet).toBe(test_packet);
		expect(repacked_packet).toEqual("dorp");
		got_handler = true;
	    }.bind(this));
	    handler_func(test_packet);
	    handler_func(ignore_packet);
	    expect(got_handler).toBeTruthy();
	});

	it("should fire a ready event when it has received its header", function() {
	    var got_ready = false;
	    var header_packet = {name:"Header", repackWithPreheader: function() {return "dorp"}};
	    var ready_handler = function(packet, repacked_data) {
		expect(packet).toBe(header_packet);
		expect(repacked_data).toEqual("dorp");
		got_ready = true;
	    }.bind(this);

	    stream.on("ready", function() {
		got_ready = true;
	    });

	    handler_func(header_packet);

	    expect(got_ready).toBeTruthy();
	});

	it("should remove a registered handler", function() {
	    var got_handler = false;
	    var test_packet = {name:"Data",
			       repackWithPreheader: function(seq) {
				   expect(seq).toEqual(0);
				   return "dorp";
			       }};
	    var after_packet = {name: "Data", repackWithPreheader: function(seq){ }};
	    var ignore_packet = {name:"Header", repackWithPreheader: function() {return "dorp"}};
	    var data_handler = function(packet, repacked_packet) {
		expect(got_handler).toBeFalsy();
		expect(packet).toBe(test_packet);
		expect(repacked_packet).toEqual("dorp");
		got_handler = true;
	    }.bind(this); 
	    stream.on("Data", data_handler);
	    handler_func(test_packet);
	    handler_func(ignore_packet);
	    stream.removeListener("Data", data_handler);
	    handler_func(after_packet);
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
	    
	    stream.on("all", function(packet, repacked_packet) {
		if(got_handlers === 0) {
		    expect(packet).toBe(test_packet);
		    expect(repacked_packet).toEqual("dorp");
		    got_handlers = 1;
		} else if(got_handlers === 1) {
		    expect(packet).toBe(test_packet1);
		    expect(repacked_packet).toEqual("dorp1");
		    got_handlers = 2;
		}
	    }.bind(this));
	    handler_func(test_packet);
	    handler_func(test_packet1);
	    expect(got_handlers).toEqual(2);
	});

	it("should emit done when it gets EoS", function() {
	    var end_packet = {name:"End of Stream"};
	    var got_done = false;
	    stream.on("done", function() {
		got_done = true;
	    });
	    handler_func(end_packet);
	    expect(got_done).toBeTruthy();
	});

	it("should emit done when MMSHDemuxer fails or stops", function() {
	    var got_done = false;
	    stream.on("done", function() {
		got_done = true;
	    });
	    dmux_error_handler_func();
	    expect(got_done).toBeTruthy();
	});

	it("shouldn't emit done twice when it gets both EoS and demuxer done", function() {
	    var end_packet = {name:"End of Stream"};
	    var got_dones = 0;
	    stream.on("done", function() {
		got_dones += 1;
	    });
	    handler_func(end_packet);
	    dmux_error_handler_func();
	    expect(got_dones).toEqual(1);
	    
	});

    });

    // TODO test handler removal
});
