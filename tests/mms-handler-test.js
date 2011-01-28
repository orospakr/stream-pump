var testCase = require('nodeunit').testCase;

var util = require('util');

var mms_handler = require('../http-stream-pump/mms-handler.js');

var mms_stream = require('../http-stream-pump/mms-stream.js');

module.exports = testCase({
    setUp: function(cb) {
	this.handler = new mms_handler.MMSHandler();
	cb.done();
    },

    pushSetup: function(cb) {
	var req = {
	    headers: {"content-type": "application/x-wms-pushsetup"},
	};
	var response = {
	    received_head: false,
	    writeHead: function(code, headers) {
		cb.equal(204, code);
		this.received_head = true;
	    },
	    end: function() {
		cb.ok(this.received_head);
		cb.done();
	    }
	};
	this.handler.consumeRequest(req, response);
    },

    pushStart: function(cb) {
	var req = {
	    headers: {"content-type": "application/x-wms-pushstart"},
	};
	var response = {};

	var orig_stream = mms_stream.MMSStream;

	var setStreamMock = function(mock) {
	    this.stream = mock;
	}.bind(this);
	
	mms_stream.MMSStream = function(breq, error_cb) {
	    cb.equals(req, breq);
	    setStreamMock(this);
	    cb.done();
	};
	
	this.handler.consumeRequest(req, response);

	mms_stream.MMSStream = orig_stream;
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
});
