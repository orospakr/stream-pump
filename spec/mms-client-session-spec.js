// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var mms_client_session = require("../lib/mms-client-session");
var spec_helper = require('./spec_helper');
var hsp_util = require("../lib/util");

describe("An MMS Client Session", function() {
    beforeEach(function() {
	spec_helper.configureSpec.bind(this)();
    });
    
    describe("when new", function() {
	describe("consumes a Describe request", function() {
	    beforeEach(function() {
		var stream = { header: {
		    repackWithGoofyHeader: function() {
			return "I AM HEADER";
		    }
		}};
		var verifyIsIDUnique = function(id) { return true; };
		
		var orig_rand = Math.random;
		Math.random = function() {
		    return 0.5;
		}
		session = new mms_client_session.MMSClientSession(stream, verifyIsIDUnique);

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
	    

	    describe("and then consumes the first pipeline request", function() {
		beforeEach(function() {
		    var req = {
			headers: {"Pragma": "pipeline-request=1"}
		    };
		    var got_head = false;
		    var got_end = false;
		    var response = {
			writeHead: function(code, headers) {
			    expect(headers["Content-Length"]).toBeUndefined();
			    expect(headers["Content-Type"]).toBeUndefined();
	    		    expect(code).toEqual(200);
	    		    got_head = true;
			},
			end: function(data) {
	    		    expect(data).toMatchBuffer(new Buffer([0x24, 0x54, 0x00, 0x00])); // TODO encapsulation violation.  I really should mock out the TestDataPacket
	    		    expect(got_head).toBeTruthy();
	    		    got_end = true;
			}
		    };
		    session.consumeRequest(req, response);
		    expect(got_end).toBeTruthy();
		    
		});

		it("successfully", function() {});
	    });
	});
    });
});
