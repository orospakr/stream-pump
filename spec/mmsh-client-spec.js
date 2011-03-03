// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var util = require('util');

var spec_helper = require("./spec_helper.js");

var mmsh_handler = require('../lib/mmsh-handler.js');
var mmsh_stream = require('../lib/mmsh-stream.js');
var mmsh_client_session = require('../lib/mmsh-client-session.js');

// describe('MMSH Handler', function() {
//     beforeEach(function() {
// 	spec_helper.configureSpec.bind(this)();
// 	handler = new mmsh_handler.MMSHHandler();
//     });
  
//     it("should respond to a push setup request", function() {
// 	var req = {
// 	    headers: {"content-type": "application/x-wms-pushsetup"},
// 	    socket: {remoteAddress: "127.0.0.1"}
// 	};
// 	var received_head = false, received_end = false;
	
// 	var response = {
// 	    writeHead: function(code, headers) {
// 		expect(code).toEqual(204);
// 		received_head = true;
// 	    },
// 	    end: function() {
// 		expect(received_head).toBeTruthy();
// 		received_end = true;
// 	    }
// 	};
// 	handler.consumeRequest(req, response);
// 	expect(received_end).toBeTruthy();
//     });

//     describe("when stream has started pushing", function() {
// 	var stream = undefined;
// 	var mock_header = undefined;
// 	var header_is_available = undefined;

// 	// it should begin streaming...
// 	beforeEach(function() {
// 	    stream = undefined;
// 	    mock_header = { data_length: 42, repack: function() { return "blorp";} };
// 	    header_is_available = false;

// 	    var req = {
// 		headers: {"content-type": "application/x-wms-pushstart"},
// 		socket: {remoteAddress: "127.0.0.1"}
// 	    };
// 	    var response = {};
	    
// 	    var orig_stream = mmsh_stream.MMSHStream;

// 	    var setStreamMock = function(mock) {
// 		stream = mock;
// 	    }.bind(this);
	    
// 	    var constructor_called = false;
// 	    var demuxer_constructor_called = false;

// 	    mmsh_stream.MMSHStream = function(breq, error_cb) {
// 		expect(breq).toBe(req);
// 		setStreamMock(this);
// 		constructor_called = true;

// 		this.isHeaderAvailable = function() {
// 		    return header_is_available;
// 		}

// 		this.getHeader = function() {
// 		    return mock_header;
// 		};
// 	    };

// 	    handler.consumeRequest(req, response);
	    
// 	    expect(constructor_called).toBeTruthy();
	    
// 	    mmsh_stream.MMSHStream = orig_stream;
// 	});
	
// 	it("should open stream in response to an pushstart request", function() {
// 	    // if we got here, success :)
// 	});

// 	it("should send a new client an error if stream is not ready", function() {
// 	    var req = {
// 		headers: {},
// 		socket: {remoteAddress: "127.0.0.1"}
// 	    };
// 	    var got_head = false;
// 	    var got_end = false;
// 	    var response = {
// 		writeHead: function(code, headers) {
// 		    expect(code).toEqual(503);
// 		    got_head = true;
// 		},
// 		end: function(data) {
// 		    expect(got_head).toBeTruthy();
// 		    got_end = true;
// 		}
// 	    };
// 	    handler.consumeRequest(req, response);
// 	    expect(got_end).toBeTruthy();
// 	});

// 	describe("and when the header packet has arrived and stream is ready", function() {
// 	    beforeEach(function() {
// 		header_is_available = true;
// 	    });

// 	    it("should create a new session for an incoming client", function() {
// 		var req = {
// 	     	    headers: {},
// 		    socket: {remoteAddress: "127.0.0.1"}
// 	     	};
// 		var response = {};
// 		var orig_mmsh_client_session = mmsh_client_session.MMSHClientSession;
// 		var got_mmsh_client_constructor = false;
// 		var got_consume_request = false;
// 		mmsh_client_session.MMSHClientSession = function(strm, verifier_routine) {
// 		    expect(strm).toBe(stream);
// 		    got_mmsh_client_constructor = true;
// 		    // TODO unit test the verifier routine here... awkward, because I'd have to do
// 		    // this whole thing over again
// 		    this.consumeRequest = function(rq, resp) {
// 			expect(rq).toBe(req);
// 			expect(resp).toBe(response);
// 			got_consume_request = true;
// 		    };
// 		};
// 		handler.consumeRequest(req, response);
// 		expect(got_mmsh_client_constructor).toBeTruthy();
// 		expect(got_consume_request).toBeTruthy();
// 		mmsh_client_session.MMSHClientSession = orig_mmsh_client_session;
// 	    });
// 	});
//     });
// });
