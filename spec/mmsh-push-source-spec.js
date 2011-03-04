// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var mmsh_push_source = require("../lib/mmsh-push-source");

describe("MMSH Push Source", function() {
    beforeEach(function() {
	stream_source = {};
	source = new mmsh_push_source.MMSHPushSource(stream_source);
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

    it("should handle a push start request and create a stream", function() {
	var req = {headers:{"content-type":"application/x-wms-pushsetup"}};
    });
});
