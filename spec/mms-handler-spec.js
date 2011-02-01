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

    it("should begin streaming in response to an opened pushstart request", function() {
	var req = {
	    headers: {"content-type": "application/x-wms-pushstart"},
	};
	var response = {};

	var orig_stream = mms_stream.MMSStream;

	var setStreamMock = function(mock) {
	    this.stream = mock;
	}.bind(this);

	var constructor_called = false;
	
	mms_stream.MMSStream = function(breq, error_cb) {
	    expect(breq).toBe(req);
	    setStreamMock(this);
	    constructor_called = true;
	};
	
	handler.consumeRequest(req, response);

	expect(constructor_called).toBeTruthy();

	mms_stream.MMSStream = orig_stream;
    });
});




derp = {
    setUp: function(cb) {
    },

    pushSetup: function(cb) {

    },

    pushStart: function(cb) {
	
    },

    clientArrivesAfterPushStart: function(cb) {
	console.log(util.inspect(this));
	this.pushStart();
	var req = {
	    headers: {}
	};
	var response = {
	    received_head: false,
	    writeHead: function(code, headers) {
		cb.equal(200, code);
		this.received_head = true;
	    },
	    end: function(data) {
		cb.ok(this.received_head);
		cb.done();
	    }
	};
	this.handler.consumeRequest(req, response);
    },
};
