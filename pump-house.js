#!/usr/bin/env node
// Stream Pump - live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var fs = require('fs');
var path = require('path');
var util = require('util');
var http = require('http');

var log = require('./lib/logging');
var server =require('./lib/pump-house/server.js');

var c = "Pump House";

var parseJSON = function(filename, json_data) {
    try {
	var r = JSON.parse(json_data);
	return r;
    } catch(err) {
	log.error(c, "Problem parsing JSON in (" + filename + "), error: " + err.message);
	process.exit(-1);
    }
};


var pumphouse_config_path = process.argv[2];



log.info(c, "Starting Pump House!");

if(pumphouse_config_path === undefined) {
    log.error(c, "usage: pump-house.js <pumphouse config json>");
    process.exit(-1);
}

var resolved_config_path = path.resolve(pumphouse_config_path);
if(!(path.existsSync(resolved_config_path))) {
    log.error(c, "Specified config (" + resolved_config_path + ") does not exist.");
    process.exit(-1);
}

var config_txt = fs.readFileSync(resolved_config_path);

var config = parseJSON(resolved_config_path, config_txt);

var config_dir = path.dirname(resolved_config_path);

var roster_path;
if(config.pumps_roster_json[0] === '/') {
    roster_path = config.pumps_roster_json;
} else {
    roster_path = path.resolve(config_dir, config.pumps_roster_json);
}

if(!(path.existsSync(roster_path))) {
    log.error(c, "Specified pumps roster (" + roster_path + ") does not exist.");
    process.exit(-1);
}

var pumps_roster_txt = fs.readFileSync(roster_path);
var pumps_roster = parseJSON(roster_path, pumps_roster_txt);

this.pumphouse_server = new server.Server();

var submitRequest = function(req, response) {
    this.pumphouse_server.consumeRequest(req, response); 
};
var serverv4 = http.createServer(submitRequest.bind(this));

var port = config.port || 8081;
serverv4.listen(port, "0.0.0.0");

log.info(c, "HTTP now listening on 0.0.0.0:" + port);
