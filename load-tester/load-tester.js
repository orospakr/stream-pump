#!/usr/bin/env node

var http = require('http');
var util = require('util');
// "stream2.webdiffusion-webcasting.org"

var options = {host: "10.54.201.128",
	       port: "80",
	       path: "/streams/test"};

var users = 20;

http.getAgent(options.host, options.port).maxSockets = 10000;

var startFetcher = function(me) {
    setTimeout(function() {
	console.log("Attaching user #" + me + "!");
	var req = http.request(options, function(res) {
	    
	    console.log("got connection result for #" + me + "! " + util.inspect(res.headers));
	    res.on('data', function(chunk) {
    		// console.log("Got " + chunk.length + " bytes of data.");
	    });
	}).on('error', function(e) {
	    console.log("got error :( " + e);
	});

	req.setHeader("User-Agent", "NSPlayer");
	req.setHeader("Pragma", "xPlayStrm=1");

	req.end();
    }, 150 * me);
    
};

for(i = 0; i < users; i++) {
    startFetcher(i);
}
console.log("All stream pullers running!");
