#!/usr/bin/env node

// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import * as path from 'path';
import * as fs from 'fs';
import * as strtok from 'strtok';

import * as mmsh_push_source from './lib/mmsh-push-source';
import * as mmsh_pull_source from './lib/mmsh-pull-source';
import * as mmsh_handler from './lib/mmsh-handler';
import * as log from './lib/logging';
import * as hsp_util from './lib/util';
import { Server } from './lib/server';
import { Config, HttpRequest, HttpResponse } from './lib/types';

const c = "Main";

const config_path = process.argv[2];
if(config_path === undefined) {
    console.log("usage: stream-pump.js <config file> # see config.js.example");
    process.exit(-1);
}
const config_resolved_path = path.resolve(config_path);
if(!(fs.existsSync(config_resolved_path))) {
    log.error(c, "Specified config file (" + config_resolved_path + ") does not exist.");
    process.exit(-1);
}
const config = require(config_resolved_path).config as Config;

// TODO refactor this rather sneaky way to make the config globally available...
hsp_util.setConfig(config);

const handlers: any[] = [];

console.log("Starting up Stream Pump!");

const pump_server = new Server(config, config.streams);

const submitRequest = function(req: http.IncomingMessage, response: http.ServerResponse): void {
    // Convert IncomingMessage to our HttpRequest interface
    const httpReq = req as unknown as HttpRequest;
    const httpRes = response as unknown as HttpResponse;
    pump_server.consumeRequest(httpReq, httpRes); 
};
const serverv4 = http.createServer(submitRequest);

if(config.ssl) {
    const ssl_options = {
        key: fs.readFileSync(config.ssl_key),
        cert: fs.readFileSync(config.ssl_cert)
    };
    const serverv4https = https.createServer(ssl_options, submitRequest);
    serverv4https.listen(config.ssl_port, "0.0.0.0");
}
// var serverv6 = http.createServer(reqHandler);

serverv4.listen(config.port, "0.0.0.0");
log.info(c, "HTTP now listening on 0.0.0.0:" + config.port); 