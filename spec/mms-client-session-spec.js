var mms_client_session = require("../lib/mms-client-session");
var hsp_util = require("../lib/util");

describe("An MMS Client Session", function() {
    it("should respond to a Describe request", function() {
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
	var session = new mms_client_session.MMSClientSession(stream, verifyIsIDUnique);

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
});
