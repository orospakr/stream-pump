#!/usr/bin/env node
// Stream Pump - live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var fs = require('fs');
var path = require('path');

var log = require('./lib/logging');

var pumps_roster_path = process.argv[2];

var c = "Pump House";

log.info(c, "Starting Pump House!");

if(pumps_roster_path === undefined) {
    log.error(c, "usage: pump-house.js <pumps roster json>");
    process.exit(-1);
}

var resolved_roster_path = path.resolve(pumps_roster_path);
if(!(path.existsSync(resolved_roster_path))) {
    log.error(c, "Specified pumps roster (" + resolved_roster_path + ") does not exist.");
    process.exit(-1);
}

var pumps_roster_txt = fs.readFileSync(resolved_roster_path);

var pumps_roster = JSON.parse(pumps_roster_txt);
