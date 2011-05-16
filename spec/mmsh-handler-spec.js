// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var events = require("events");
var sys = require('sys');
var mmsh_handler = require("../lib/mmsh-handler");
var hsp_util = require("../lib/util");
var mmsh_client_session = require("../lib/mmsh-client-session");

describe("MMSH Handler", function() {
    describe("before stream", function() {
	beforeEach(function() {
	    source = new events.EventEmitter();
	    
	    handler = new mmsh_handler.MMSHHandler("teststrm", source);
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
		    mmsh_client_session.MMSHClientSession = function(getStrm, client_id_checker) {
			events.EventEmitter.call(this);
			expect(client_id_checker(1337)).toBeTruthy();
			this.client_id = 1337;
			expect(getStrm()).toBe(stream);
			sess = this;
			this.consumeRequest = function(req, response) {
			    expect(req).toBe(req);
			    expect(response).toBe(response);
			    sess_got_request = true;
			};
		    };
		    sys.inherits(mmsh_client_session.MMSHClientSession, events.EventEmitter);

		    handler.consumeRequest(req, response);
		    expect(sess_got_request).toBeTruthy();

		    mmsh_client_session.MMSHClientSession = orig_mcs;
		});

		it("Should increment/decrement active sessions count as a session starts and stops streaming", function() {
		    expect(handler.client_streams.length).toEqual(0);
		    var got_changed = 0;
		    handler.on("active-clients-changed", function(count) {
			if(got_changed === 0) {
			    expect(count).toEqual(1)
			    got_changed = 1;
			} else if(got_changed === 1) {
			    expect(count).toEqual(0);
			    got_changed = 2;
			} else {
			    expect().toNotGetHere();
			}
		    });
		    var client = new events.EventEmitter();
		    sess.emit("client", client);
		    expect(handler.client_streams.length).toEqual(1);
		    client.emit("done");
		    expect(handler.client_streams.length).toEqual(0);
		    expect(got_changed).toEqual(2);
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
		    
		    mmsh_client_session.MMSHClientSession = function(getStrm, client_id_checker) {
			expect(client_id_checker(1339)).toBeTruthy();
			this.client_id = 1339;
			expect(getStrm()).toBe(stream);
			new_sess = this;
			this.consumeRequest = function(req, response) {
			    expect(req).toBe(req);
			    expect(response).toBe(response);
			    new_sess_got_req = true;
			};
			this.on = function() {};
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
