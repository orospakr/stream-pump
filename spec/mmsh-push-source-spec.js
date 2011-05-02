// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var mmsh_push_source = require("../lib/mmsh-push-source");
var mmsh_stream = require("../lib/mmsh-stream");

var events = require('events');

var sys = require('sys');

var util = require('util');

describe("MMSH Push Source", function() {
    beforeEach(function() {
	source = new mmsh_push_source.MMSHPushSource();
    });

    it("should instantiate", function() {
	
    });

    it("should handle a push setup request", function() {
	var req = {headers:{"content-type":"application/x-wms-pushsetup"}};
	var got_head = false;
	var got_end = false;
	response = {
	    writeHead: function(code, heads) {
		expect(code).toEqual(204);
		expect(heads["Server"]).toEqual("Cougar/9.6.7600.16564");
		got_head = true;
	    },
	    end: function() {
		expect(got_head).toBeTruthy();
		got_end = true;
	    }
	};
	source.consumeRequest(req, response);
	expect(got_end).toBeTruthy();
    });

    describe("once a push is started", function() {
	beforeEach(function() {
	    orig_mmsh_stream = mmsh_stream.MMSHStream;
	    req = new events.EventEmitter();
	    req.headers = {"content-type":"application/x-wms-pushstart"};
	    stream_created = false;
	    stream = undefined;
	    mmsh_stream.MMSHStream = function(rq, includes_preheaders) {
		expect(includes_preheaders).toBeFalsy();
		expect(rq).toBe(req);
		stream_created = true;
		events.EventEmitter.call(this);
		stream = this;
	    };
	    sys.inherits(mmsh_stream.MMSHStream, events.EventEmitter);

	    response = {};
	    source.consumeRequest(req, response);
	    expect(stream_created).toBeTruthy();
	});

	it("should succeed", function() { });

	describe("and stream becomes ready", function() {
	    beforeEach(function() {
		var got_ready = false;
		source.on("ready", function(strm) {
		    expect(strm).toBe(stream);
		    got_ready = true;
		});
		stream.emit("ready");
		expect(got_ready).toBeTruthy();
	    });

	    it("should succeed", function() { });
	});

	it("should shut down and restart a new stream if one is already active if it receives a new push request", function() {
	});

	it("should inform when the stream fails or closes", function() {
	    got_head = false;
	    got_end = false;
	    got_done = 0;
	    response.writeHead = function(code, heads) {
		expect(code).toEqual(422);
		got_head = true;
	    };
	    response.end = function(msg) {
		expect(got_head).toBeTruthy();
		got_end = true;
	    };
	    /* Only want one done message */
	    source.on("done", function() {
		got_done += 1;
	    });
	    stream.emit("done");
	    req.emit("close", false);
	    expect(got_end).toBeTruthy();
	    expect(got_done).toEqual(1);
	});

	it("should finish suddenly if the request socket is closed", function() {
	    var got_done = false;
	    source.once("done", function() {
		got_done = true;
	    });
	    req.emit("close", false);
	    expect(got_done).toBeTruthy();
	});

	afterEach(function() {
	    mmsh_stream.MMSHStream = orig_mmsh_stream;
	});
    });
});
