// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var events = require("events");
var mmsh_handler = require("../lib/mmsh-handler");
var hsp_util = require("../lib/util");
var mmsh_client_session = require("../lib/mmsh-client-session");

describe("MMSH Handler", function() {
    describe("before stream", function() {
	beforeEach(function() {
	    source = new events.EventEmitter();
	    
	    handler = new mmsh_handler.MMSHHandler(source);
	});

	it("should reject all new clients", function() {
	    var req = {headers: {}}
	    
	    var got_head = false;
	    var got_end = false;
	    var response = {
		writeHead: function(code, headers) {
		    expect(code).toEqual(503);
		    expect(headers["Content-Type"]).toEqual("text/plain");
		    got_head = true;
		},
		end: function(msg) {
		    expect(got_head).toBeTruthy();
		    got_end = true;
		}
	    };
	    handler.consumeRequest(req, response);
	    expect(got_end).toBeTruthy();
	});

	describe(", then when stream becomes ready", function() {
	    beforeEach(function() {
		stream = {};
		source.emit("ready", stream);
	    });

	    describe("with a client associated", function() {
		beforeEach(function() {
		    var orig_mcs = mmsh_client_session.MMSHClientSession;
		    sess = undefined;
		    var sess_got_request = false;
		    req = {headers: {}, socket: {remoteAddress: ""}};
		    response = {};
		    mmsh_client_session.MMSHClientSession = function(strm, client_id_checker) {
			expect(client_id_checker(1337)).toBeTruthy();
			this.client_id = 1337;
			expect(strm).toBe(stream);
			sess = this;
			this.consumeRequest = function(req, response) {
			    expect(req).toBe(req);
			    expect(response).toBe(response);
			    sess_got_request = true;
			};
		    };

		    handler.consumeRequest(req, response);
		    expect(sess_got_request).toBeTruthy();

		    mmsh_client_session.MMSHClientSession = orig_mcs;
		});

		it("should create a new session for a client with no ID", function() {
		});

		it("should delegate a client request with a client ID to its existing session", function() {
		    var orig_mcs = mmsh_client_session.MMSHClientSession;
		    
		    req = {headers: {"Pragma":"client-id=1337"}};
		    response = {};
		    
		    mmsh_client_session.MMSHClientSession = function(strm, client_id_checker) {
			expect().toNeverGetHere();
		    };
		    var got_request = false;
		    sess.consumeRequest = function(req, response) {
			got_request = true;
		    };
		    handler.consumeRequest(req, response);
		    expect(got_request).toBeTruthy();
		    
		    mmsh_client_session.MMSHClientSession = orig_mcs;
		});

		it("should create a new session anyway for a request with a non-existent client ID", function() {
		    var orig_mcs = mmsh_client_session.MMSHClientSession;
		    var new_sess = undefined;
		    var new_sess_got_req = false;

		    req = {headers: {"Pragma":"client-id=1338"}, socket: {remoteAddress: ""}};
		    response = {};
		    
		    mmsh_client_session.MMSHClientSession = function(strm, client_id_checker) {
			expect(client_id_checker(1339)).toBeTruthy();
			this.client_id = 1339;
			expect(strm).toBe(stream);
			new_sess = this;
			this.consumeRequest = function(req, response) {
			    expect(req).toBe(req);
			    expect(response).toBe(response);
			    new_sess_got_req = true;
			};
		    };

		    handler.consumeRequest(req, response);
		    expect(new_sess_got_req).toBeTruthy();

		    mmsh_client_session.MMSHClientSession = orig_mcs;
		});
		
		describe("and stream finishes", function() {
		    // test for kicking off of existing clients
		});
	    });
	});
    });
});
