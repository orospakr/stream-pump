// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var events = require('events');
var sys = require('sys');
var http = require('http');
var hsp_util = require('../lib/util');

var mmsh_stream = require("../lib/mmsh-stream");
var mmsh_pull_source = require("../lib/mmsh-pull-source");

describe("MMSH Pull Source Attempt", function() {
    describe("when connecting", function() {
	beforeEach(function() {
	    params = {
		host: "video.ca",
		port: 80,
		path: "/"
	    };

	    orig_config = hsp_util.config;
	    config = {
		use_http_proxy: false
	    };
	    hsp_util.config = config;

	    orig_hcc = http.createClient;
	    http_client = new events.EventEmitter();

	    http.createClient = function(connect_port, connect_host) {
		expect(connect_port).toEqual(80);
		expect(connect_host).toEqual("video.ca");
		return http_client;
	    };
	    
	    request = new events.EventEmitter();

	    expected_headers = [
		{"Pragma": "xPlayStrm=1"},
		{"User-Agent": "NSPlayer"}
	    ];
	    request.setHeader = function(k, v) {
		expected = expected_headers.pop();
		expect(expected[k]).toEqual(v);
	    };
	    got_end = false;
	    request.end = function() {
		expect(expected_headers.length).toEqual(0);
		got_end = true;
	    };

	    timeout_cb = undefined;
	    http_client.setTimeout = function(duration, cb) {
		expect(duration).toEqual(15000);
		timeout_cb = cb;
	    };
	    
	    http_client.request = function(method, path, parms) {
		expect(method).toEqual('GET');
		expect(path).toEqual('/');
		return request;
	    };

	    pull_source = new mmsh_pull_source.MMSHPullSourceAttempt(params);
	    expect(got_end).toBeTruthy();
	    expect(timeout_cb).not.toBeUndefined();
	});

	it("successfully", function() {
	    
	});

	describe(", receives response and sets up stream", function() {
	    beforeEach(function() {
		response = {};

		orig_stream = mmsh_stream.MMSHStream;
		stream = undefined;
		mmsh_stream.MMSHStream = function(res, incl_preheaders) {
		    events.EventEmitter.call(this);
		    expect(incl_preheaders).toBeTruthy();
		    expect(res).toBe(response);
		    expect(stream).toBeUndefined();
		    stream = this;
		};
		sys.inherits(mmsh_stream.MMSHStream, events.EventEmitter);

		request.emit('response', response);
		
	    });

	    it("successfully", function() {});

	    describe("and stream becomes ready", function() {
		beforeEach(function() {
		    got_ready = false;
		    pull_source.on("ready", function(strm) {
			expect(strm).toEqual(stream);
			got_ready = true;
		    });
		    stream.emit("ready");
		    expect(got_ready).toBeTruthy();
		});

		it("should inform that the stream is ready", function() {});

		it("should inform when the stream is done/errored", function() {
		    got_done = 0;
		    pull_source.on("done", function() {
			got_done++;
		    });
		    var got_end = false;
		    http_client.end = function() {
			got_end = true;
		    };
		    stream.emit("done");
		    expect(got_done).toEqual(1);
		    expect(got_end).toBeTruthy();
		});

		it("should inform when the socket has received no data for a long period", function() {
		    got_done = 0;
		    pull_source.on("done", function() {
			got_done++;
		    });
		    var got_end = false;
		    http_client.end = function() {
			got_end = true;
		    };
		    timeout_cb();
		    expect(got_done).toEqual(1);
		    expect(got_end).toBeTruthy();
		});
	    });

	    afterEach(function() {
		mmsh_stream.MMSHStream = orig_stream;
	    });
	});

	describe("and a connect error happens immediately, fire done event", function() {
	    it("successfully stop, and try again", function() {
		var got_done = 0;
		pull_source.on("done", function() {
		    got_done ++;
		});
		var got_end = false;
		http_client.end = function() {
		    got_end = true;
		};
		request.emit("error", "nope, no server for you");
		expect(got_done).toEqual(1);
		expect(got_end).toBeTruthy();
	    });
	});

	afterEach(function() {
	    http.createClient = orig_hcc;
	    hsp_util.config = orig_config;
	});
    });
});
