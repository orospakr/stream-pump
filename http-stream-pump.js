#!/usr/bin/env node
/* First attempt at node.js version of HTTP StreamPump, since Twisted turned out to suck. */

var http = require('http');

var util = require('util');

var url = require('url');

var fs = require('fs');

var strtok = require('strtok');

// var wingas = require('./http_stream_pump/');

// http://blog.vjeux.com/2010/javascript/javascript-binary-reader.html

var reqHandler = function(req, response) {
    var pathname = url.parse(req.url).pathname;
    if(pathname.match(/^\/video/i)) {
	if(req.headers["content-type"] === "application/x-wms-pushsetup") {
	    response.writeHead(204, {"Server": "Cougar/9.6.7600.16564",
				     "Pragma": "no-cache, timeout=60000",
				     "Set-Cookie": "push-id=42424242",
				     "Supported": "com.microsoft.wm.srvppair, com.microsoft.wm.sswitch, com.microsoft.wm.predstrm, com.microsoft.wm.fastcache, com.microsoft.wm.startupprofile"});
	    response.end();
	    console.log("WMS Push Setup request received!");
	    return;
	} else if(req.headers["content-type"] === "application/x-wms-pushstart") {
	    console.log("Starting stream!!");
	    // var fd = fs.createWriteStream("/tmp/10dectest.mms", {'flags': 'w'});
	    // if(fd === undefined) {
	    // 	console.log("WTFFFF");
	    // }
	    // req.on('data', function(data) {
	    // 	fd.write(data);
	    // 	console.log("Got " + data.length + " bytes!");
	    // });

	    strtok.parse(req, function(value) {
		// console.log("GOT MY CALLBACK: " + value);
		// response.writeHead(422, {"Content-Type": "text/plain"});
		// response.end("Hum.  That doesn't make too much sense to me...");
		
		return strtok.UINT8;
	    }.bind(this));
	    console.log(util.inspect(req.headers));
	    return;
	} else {
	    // response.writeHead(422, {"Content-Type": "text/plain"});
	    // response.end("Hum.  That doesn't make too much sense to me...");
	    // console.log("Unexpected fetch of /video with content type of " + req.headers["content-type"]);

	    // there is some question as to what will happen here in terms of
	    // HTTP protocol control; I kind of have to assume that the stream is
	    // not aware of chunked encoding, and all that entails.
	    strtok.parse(req, function(value) {
		console.log("GOT MY CALLBACK");
		// response.writeHead(422, {"Content-Type": "text/plain"});
		// response.end("Hum.  That doesn't make too much sense to me...");

		return strtok.UINT8;
	    }.bind(this));
	    console.log(util.inspect(req.headers));
	    return;
	}
    } else {
	response.writeHead(404, {"Content-Type": "text/html"});
	response.end("Sorry, nothing here!");
	console.log("404'd: Attempt to fetch " + pathname);
	
	return;
    }

    // console.log(util.inspect(response));
};

var serverv4 = http.createServer(reqHandler);
// var serverv6 = http.createServer(reqHandler);

serverv4.listen(8086, "0.0.0.0")
//serverv6.listen(8086, "::");
