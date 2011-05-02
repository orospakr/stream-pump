#!/usr/bin/env node

var http = require('http');
var util = require('util');
// "stream2.webdiffusion-webcasting.org"

var options = {host: "stream3.webdiffusion-webcasting.org",
	       port: "80",
	       path: "/streams/april8"};

var users = 150;

http.getAgent(options.host, options.port).maxSockets = 10000;


var startFetcher = function(me) {
    
    setTimeout(function() {
	var http_client = http.createClient(80, "proxy.prv")
	console.log("Attaching user #" + me + "!");
//	var req = http.request(options, function(res) {
	var req = http_client.request('GET', "http://stream3.webdiffusion-webcasting.org/streams/april8");
	req.once('response', function(res) {
	    
	    console.log("got connection result for #" + me + "! " + res.statusCode + " - " + util.inspect(res.headers));
	    // res.on('data', function(chunk) {
    	    // 	// console.log("Got " + chunk.length + " bytes of data.");
	    // 	console.log(chunk.toString('utf8'));
	    // });
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
