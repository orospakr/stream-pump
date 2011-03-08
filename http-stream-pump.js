#!/usr/bin/env node

// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var http = require('http');
var https = require('https');
var util = require('util');
var url = require('url');
var path = require('path');
var fs = require('fs');

var strtok = require('strtok');

var mmsh_push_source = require('./lib/mmsh-push-source');
var mmsh_pull_source = require('./lib/mmsh-pull-source');
var mmsh_handler = require('./lib/mmsh-handler');
var log = require('./lib/logging');
var hsp_util = require('./lib/util');

var c = "Main";

var config_path = process.argv[2];
if(config_path === undefined) {
    console.log("usage: http-stream-pump.js <config file> # see config.js.example");
    process.exit(-1);
}
var config_resolved_path = path.resolve(config_path);
if(!(path.existsSync(config_resolved_path))) {
    log.error(c, "Specified config file (" + config_resolved_path + ") does not exist.");
    process.exit(-1);
}
var config = require(config_resolved_path);

// TODO refactor this rather sneaky way to make the config globally available...
hsp_util.config = config.config;

var handlers = [];

console.log("Starting up HTTP Stream Pump!");

config.config.streams.forEach(function(strm) {
    if(!(strm.enabled)) {
	return;
    }
    log.info(c, "Setting up stream: " + strm.name);
    var failure = function(reason) {
	log.error(c, "... unable to start stream (" + strm.name + "), because: " + reason);
    };

    if (!(strm.path.match(/^[a-zA-Z0-9_]*$/))) {
	failure("Specified stream path contains inappropriate characters: " + strm.path);
	return;
    }

    r = {};
    if(strm.type === "mmsh_pull") {
	r.path = strm.path;
	r.source = new mmsh_pull_source.MMSHPullSource(strm.source_options);
	r.handler = new mmsh_handler.MMSHHandler(r.source);
	handlers.push(r);
    } else if(strm.type === "mmsh_push") {
	r.path = strm.path;
	r.source = new mmsh_push_source.MMSHPushSource();
	r.handler = new mmsh_handler.MMSHHandler(r.source);
	handlers.push(r);
	// add an extra handler for the push source
	handlers.push({path: strm.path + "_push", handler: r.source});
    } else {
	log.error(c, "Unknown source type: " + strm.type);
	return;
    }
    log.info(c, "... stream ready!");
});

if(handlers.length === 0) {
    log.warn(c, "No streams have been configured.  Idle...");
}

var reqHandler = function(req, response) {
    var pathname = url.parse(req.url).pathname;

    log.debug(c, req.method + " " + pathname + " (from: " + req.socket.remoteAddress + "): " + util.inspect(req.headers));

    var hit_handler = false;
    handlers.forEach(function(handler) {
	var regex_str = "^\\/streams\\/" + handler.path + "(\\/$|$)"
	if(pathname.match(new RegExp(regex_str, "i"))) {
	    handler.handler.consumeRequest(req, response);
	    hit_handler = true;
	}
    });

    if(!hit_handler) {
	response.writeHead(404, {"Content-Type": "text/html"});

	response.end("Sorry, nothing here!");
	log.warn(c, "404'd: Attempt to fetch " + pathname);
	
	return;
    }
};

var serverv4 = http.createServer(reqHandler);

if(config.config.ssl) {

    var ssl_options = {
        key: fs.readFileSync(config.config.ssl_key),
        cert: fs.readFileSync(config.config.ssl_cert)
    };
    var serverv4https = https.createServer(ssl_options, reqHandler);
    serverv4https.listen(config.config.ssl_port, "0.0.0.0");
}
// var serverv6 = http.createServer(reqHandler);

serverv4.listen(config.config.port, "0.0.0.0");
// serverv4https.listen(8084, "0.0.0.0");
//serverv6.listen(8086, "::");
