// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var util = require('util');
var sys = require('sys');
var events = require('events');

var MockStream = function() {
    events.EventEmitter.call(this);

    // Call with a Buffer of data you want to submit.
    this.injectData = function(data) {
	this.emit("data", data);
    };
};
sys.inherits(MockStream, events.EventEmitter);

var bufferDump = function(buf) {
    var result = [];
    for(i = 0; i < buf.length; i++) {
	result.push("0x" + buf[i].toString(16));
    }
    return util.inspect(result);
};

var _compareBuffers = function(b1, b2) {
    if(b1.length !== b2.length) {
	console.log("lengths did not match");
	return false;
    }

    for(i = 0; i < b1.length; i++) {
	if(b1[i] !== b2[i]) {
	    console.log("octet at position " + i + " did not match.");
	    return false;
	}
    }
    return true;
};

var compareBuffers = function(b1, b2) {
    if(!_compareBuffers(b1, b2)) {
	console.log(bufferDump(b1) + " did not match " + bufferDump(b2));
	return false;
    }
    return true;
};

var configureSpec = function() {
    this.addMatchers({
	toNotGetHere: function() { return false; },
	toMatchBuffer: function(expected) { return compareBuffers(expected, this.actual); }
    });
    
};

module.exports.configureSpec = configureSpec;
module.exports.MockStream = MockStream;