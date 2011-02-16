#!/usr/bin/env node
// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

/**
 "Pull" a video stream from a live MMSH server. 
 */

var http = require('http');
var util = require('util');

var mms_stream = require('./mms-stream');

var stream = undefined;

var options = {host: "10.10.5.123",
	       port: "8080",
	       path: "/"}; 

var req = http.request(options, function(res) {
    console.log("got result! " + util.inspect(res.headers));
    stream = new mms_stream.MMSStream(res, function() {
	console.log("error on mms stream!");
    });
    stream.onPacket("all", function(packet, repacked) {
    	console.log("First 16 bytes: " + util.inspect(packet.payload.slice(0, 16)));
    });
    // res.on('data', function(chunk) {
    // 	console.log("Got " + chunk.length + " bytes of data.");
    // });
}).on('error', function(e) {
    console.log("got error :( " + e);
});

// Interestingly, if you don't specify the version 
req.setHeader("User-Agent", "NSPlayer");

req.end();
