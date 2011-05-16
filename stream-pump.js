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
var server = require('./lib/server');

var c = "Main";

var config_path = process.argv[2];
if(config_path === undefined) {
    console.log("usage: stream-pump.js <config file> # see config.js.example");
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

console.log("Starting up Stream Pump!");

this.pump_server = new server.Server(config.config, config.config.streams);

var submitRequest = function(req, response) {
    this.pump_server.consumeRequest(req, response); 
};
var serverv4 = http.createServer(submitRequest.bind(this));

if(config.config.ssl) {
    var ssl_options = {
        key: fs.readFileSync(config.config.ssl_key),
        cert: fs.readFileSync(config.config.ssl_cert)
    };
    var serverv4https = https.createServer(ssl_options, submitRequest);
    serverv4https.listen(config.config.ssl_port, "0.0.0.0");
}
// var serverv6 = http.createServer(reqHandler);

serverv4.listen(config.config.port, "0.0.0.0");
log.info(c, "HTTP now listening on 0.0.0.0:" + config.config.port);
// serverv4https.listen(8084, "0.0.0.0");
//serverv6.listen(8086, "::");

