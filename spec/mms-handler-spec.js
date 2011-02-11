var util = require('util');

var spec_helper = require("./spec_helper.js");

var mms_handler = require('../lib/mms-handler.js');
var mms_stream = require('../lib/mms-stream.js');
var mms_client_session = require('../lib/mms-client-session.js');

describe("MMS Handler's Pragma request parser", function() {
    it("should retrieve values when Pragma field exists", function() {
	var req = {
	    headers: {"Pragma": "woot=5000,somethingelse,myfield"}
	}
	expect(mms_handler.getPragmaFields(req)["myfield"]).toBeTruthy();
	expect(mms_handler.getPragmaFields(req)["myfieldx"]).toBeFalsy();
	expect(mms_handler.getPragmaFields(req)["woot"]).toEqual("5000");
    });

    it("should should return an empty hash when Pragma field is missing", function() {
	var req = {
	    headers: {"Pragmasafdsafdsaf": "woot=5000,somethingelse,myfield"}
	}
	expect(mms_handler.getPragmaFields(req)).toEqual({});
    });
});

describe('MMS Handler', function() {
    var handler = undefined;
    beforeEach(function() {
	handler = new mms_handler.MMSHandler();
    });
  
    it("should respond to a push setup request", function() {
	var req = {
	    headers: {"content-type": "application/x-wms-pushsetup"},
	};
	var received_head = false, received_end = false;
	
	var response = {
	    writeHead: function(code, headers) {
		expect(code).toEqual(204);
		received_head = true;
	    },
	    end: function() {
		expect(received_head).toBeTruthy();
		received_end = true;
	    }
	};
	handler.consumeRequest(req, response);
	expect(received_end).toBeTruthy();
    });

    describe("when stream has started pushing", function() {
	var stream = undefined;
	var mock_header = undefined;
	var header_is_available = undefined;

	// it should begin streaming...
	beforeEach(function() {
	    stream = undefined;
	    mock_header = { data_length: 42, repack: function() { return "blorp";} };
	    header_is_available = false;

	    var req = {
		headers: {"content-type": "application/x-wms-pushstart"},
	    };
	    var response = {};
	    
	    var orig_stream = mms_stream.MMSStream;

	    var setStreamMock = function(mock) {
		stream = mock;
	    }.bind(this);
	    
	    var constructor_called = false;
	    var demuxer_constructor_called = false;

	    mms_stream.MMSStream = function(breq, error_cb) {
		expect(breq).toBe(req);
		setStreamMock(this);
		constructor_called = true;

		this.isHeaderAvailable = function() {
		    return header_is_available;
		}

		this.getHeader = function() {
		    return mock_header;
		};
	    };

	    handler.consumeRequest(req, response);
	    
	    expect(constructor_called).toBeTruthy();
	    
	    mms_stream.MMSStream = orig_stream;
	});
	
	it("should open stream in response to an pushstart request", function() {
	    // if we got here, success :)
	});

	it("should send a new client an error if stream is not ready", function() {
	    var req = {
		    headers: {}
	    };
	    var got_head = false;
	    var got_end = false;
	    var response = {
		writeHead: function(code, headers) {
		    expect(code).toEqual(503);
		    got_head = true;
		},
		end: function(data) {
		    expect(got_head).toBeTruthy();
		    got_end = true;
		}
	    };
	    handler.consumeRequest(req, response);
	    expect(got_end).toBeTruthy();
	});

	describe("and when the header packet has arrived and stream is ready", function() {
	    beforeEach(function() {
		header_is_available = true;
	    });

	    it("should create a new session for an incoming client", function() {
		var req = {
	     	    headers: {}
	     	};
		var response = {};
		var orig_mms_client_session = mms_client_session.MMSClientSession;
		var got_mms_client_constructor = false;
		var got_consume_request = false;
		mms_client_session.MMSClientSession = function(strm, verifier_routine) {
		    expect(strm).toBe(stream);
		    got_mms_client_constructor = true;
		    // TODO unit test the verifier routine here... awkward, because I'd have to do
		    // this whole thing over again
		    this.consumeRequest = function(rq, resp) {
			expect(rq).toBe(req);
			expect(resp).toBe(response);
			got_consume_request = true;
		    };
		};
		handler.consumeRequest(req, response);
		expect(got_mms_client_constructor).toBeTruthy();
		expect(got_consume_request).toBeTruthy();
		mms_client_session.MMSClientSession = orig_mms_client_session;
	    });

	    // it("should send clients the header", function() {
	    // 	var req = {
	    // 	    headers: {}
	    // 	};
	    // 	var got_head = false;
	    // 	var got_end = false;
	    // 	var found_content_length_header = false;
	    // 	var found_content_type_header = false;
	    // 	var response = {
	    // 	    writeHead: function(code, headers) {
	    // 		headers.forEach(function(pair) {
	    // 		    if(pair[0] === "Content-Length") {
	    // 			found_content_length_header = true;
	    // 			expect(pair[1]).toEqual("42");
	    // 		    }
	    // 		    if(pair[0] === "Content-Type") {
	    // 			found_content_type_header = true;
	    // 			expect(pair[1]).toEqual("application/vnd.ms.wms-hdr.asfv1");
	    // 		    }
	    // 		});
	    // 		expect(code).toEqual(200);
	    // 		got_head = true;
	    // 	    },
	    // 	    end: function(data) {
	    // 		expect(data).toEqual("blorp");
	    // 		expect(got_head).toBeTruthy();
	    // 		got_end = true;
	    // 	    }
	    // 	};
	    // 	handler.consumeRequest(req, response);
	    // 	expect(got_end).toBeTruthy();
	    // 	expect(found_content_length_header).toBeTruthy();
	    // 	expect(found_content_type_header).toBeTruthy();
	    // });

	    // it("should attach clients asking to xPlayStrm=1 to the Stream", function() {
	    // 	var req = {
	    // 	    headers: {}
	    // 	};
	    // });
	});
    });
});
