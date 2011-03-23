#!/usr/bin/env node

var http = require('http');
var util = require('util');
// "stream2.webdiffusion-webcasting.org"

var options = {host: "localhost",
	       port: "8086",
	       path: "/streams/pushed_video"};

var users = 1000;

http.getAgent(options.host, options.port).maxSockets = 10000;

var startFetcher = function(me) {
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
};

for(i = 0; i < users; i++) {
    startFetcher(i);
}
console.log("All stream pullers running!");
