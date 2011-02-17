#!/usr/bin/env node

// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var http = require('http');

var util = require('util');

var url = require('url');

var fs = require('fs');

var strtok = require('strtok');


var mmsh_handler = require('./lib/mmsh-handler');

var stream_handler = new mmsh_handler.MMSHHandler();

var reqHandler = function(req, response) {
    var pathname = url.parse(req.url).pathname;

    console.log(req.method + " " + pathname + " (from: " + req.socket.remoteAddress + "): " + util.inspect(req.headers));

    if(pathname.match(/^\/video/i)) {
	stream_handler.consumeRequest(req, response);
    } else {
	response.writeHead(404, {"Content-Type": "text/html"});
	// console.log("Do they support chunked?!");
	// if(response.chunkedEncoding) {
	//     console.log("... yes!");
	// } else {
	//     console.log("... no :(");
	// }
	response.end("Sorry, nothing here!");
	console.log("404'd: Attempt to fetch " + pathname);
	
	return;
    }

    // console.log(util.inspect(response));
};

console.log("Starting up HTTP Stream Pump!");

var serverv4 = http.createServer(reqHandler);
// var serverv6 = http.createServer(reqHandler);

serverv4.listen(8086, "0.0.0.0")
//serverv6.listen(8086, "::");
