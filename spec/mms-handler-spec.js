var util = require('util');

var spec_helper = require("./spec_helper.js");

var mms_handler = require('../lib/mms-handler.js');
var mms_stream = require('../lib/mms-stream.js');


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

	describe("and when the header packet has arrived", function() {
	    beforeEach(function() {
		header_is_available = true;
	    });

	    it("should send clients the header", function() {
		var req = {
		    headers: {}
		};
		var got_head = false;
		var got_end = false;
		var found_content_length_header = false;
		var response = {
		    writeHead: function(code, headers) {
			headers.forEach(function(pair) {
			    if(pair[0] === "Content-Length") {
				found_content_length_header = true;
				expect(pair[1]).toEqual("42");
			    }
			});
			expect(code).toEqual(200);
			got_head = true;
		    },
		    end: function(data) {
			expect(data).toEqual("blorp");
			expect(got_head).toBeTruthy();
			got_end = true;
		    }
		};
		handler.consumeRequest(req, response);
		expect(got_end).toBeTruthy();
		expect(found_content_length_header).toBeTruthy();
	    });    
	});
    });
});
