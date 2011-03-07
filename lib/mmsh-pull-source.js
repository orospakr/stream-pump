// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var url = require('url');
var mmsh_stream = require("./mmsh-stream");
var events = require('events');
var http = require('http');
var sys = require('sys');
var log = require("./logging");
var hsp_util = require('./util');

var util = require('util');


var c = "MMSHPullSource";

exports.MMSHPullSource = function(http_params) {
    events.EventEmitter.call(this);

    var host = hsp_util.config.use_http_proxy ? hsp_util.config.http_proxy_host : http_params.host;
    var port = hsp_util.config.use_http_proxy ? hsp_util.config.http_proxy_port : http_params.port;

    var http_client = http.createClient(port, host);

    http_client.on("error", function(e) {
	log.error(c, "connection error making request: " + e);
    });

    var req = http_client.request('GET', http_params.path, http_params)
    req.once('response', function(res) {
	console.log("got result! " + util.inspect(res.headers));
	stream = new mmsh_stream.MMSHStream(res, true, function() {
	    log.error(c, "error on MMSH stream!");
	});
	stream.on("all", function(packet, repacked) {
    	    // log.debug(c, "First 16 bytes: " + util.inspect(packet.payload.slice(0, 16)));
	});
	stream.on("ready", function() {
	    log.info(c, "Pulled stream has become ready, informing owner MMSHHandler!");
	    this.emit("ready", stream);
	}.bind(this));
	// res.on('data', function(chunk) {
	// 	console.log("Got " + chunk.length + " bytes of data.");
	// });
    }.bind(this));
    req.on('error', function(e) {
	log.error(c, "got error making request: " + e);
    });

    req.setHeader("User-Agent", "NSPlayer");
    req.setHeader("Pragma", "xPlayStrm=1");

    req.end();
};
sys.inherits(exports.MMSHPullSource, events.EventEmitter);
