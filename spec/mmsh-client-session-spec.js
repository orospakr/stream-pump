// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var mmsh_client_session = require("../lib/mmsh-client-session");
var spec_helper = require('./spec_helper');
var hsp_util = require("../lib/util");
var mmsh_packet = require("../lib/mmsh-packet");
var mmsh_client_stream = require("../lib/mmsh-client-stream");

var events = require('events');
var util = require('util');

describe("An MMSH Client Session", function() {
    beforeEach(function() {
	spec_helper.configureSpec.bind(this)();
    });
    
    describe("when new", function() {
    	describe("consumes a Describe request", function() {
    	    beforeEach(function() {
    		stream = new events.EventEmitter();

    		stream["header"] = {repackWithPreheader:function() {
    			return "I AM HEADER";
    		}};
		
    		var verifyIsIDUnique = function(id) { return true; };
		
    		var orig_rand = Math.random;
    		Math.random = function() {
    		    return 0.5;
    		}
    		session = new mmsh_client_session.MMSHClientSession(function() { return stream;}, verifyIsIDUnique);

    		var req = {
    		    headers: {}
    		};
    		var got_head = false;
    		var got_end = false;
    		var response = {
    		    writeHead: function(code, headers) {
    			expect(headers["Content-Length"]).toEqual("11");
    			expect(headers["Content-Type"]).toEqual("application/vnd.ms.wms-hdr.asfv1");
    			expect(hsp_util.getPragmaFields({"headers": headers})["client-id"]).toEqual("2147483647");
    	    		expect(code).toEqual(200);
    	    		got_head = true;
    		    },
    		    end: function(data) {
    	    		expect(data).toEqual("I AM HEADER");
    	    		expect(got_head).toBeTruthy();
    	    		got_end = true;
    		    }
    		};
    		session.consumeRequest(req, response);
    		expect(got_end).toBeTruthy();
    		Math.random = orig_rand;
    	    });

    	    it("successfully", function() {});
	    
    	    it("should create an MMSHClientStream when asked to start playing the stream", function() {
    		close_cb = undefined;
    		req = {
    		    headers: {"Pragma": "xPlayStrm=1"},
    		    socket: {once: function(event, cb) {
    			expect(event).toEqual("close");
    			close_cb = cb;
    		    }}
    		};
		var orig_mcst = mmsh_client_stream.MMSHClientStream;
		var instantiated_mcst = false;
		mmsh_client_stream.MMSHClientStream = function(sess, readyCb, strm, rq, resp) {
		    expect(session).toBe(sess);
		    // TODO test readyCb
		    expect(strm).toBe(stream);
		    expect(rq).toBe(req);
		    expect(resp).toBe(response);
		    instantiated_mcst = true;
		};
		

    		var step = 0; // 0: nowhere, 1: got HTTP headers, 2: got ASF header, 3: got data packet
    		var header_packet = {};
    		response = {
    		};
    		session.consumeRequest(req, response);
		expect(instantiated_mcst).toBeTruthy();
		mmsh_client_stream.MMSHClientStream = orig_mcst;
    	    });
    	});
    });
});
