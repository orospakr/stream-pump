// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var log = require('./logging');
var url = require('url');
var mmsh_handler = require('./mmsh-handler');
var mmsh_pull_source = require('./mmsh-pull-source');
var mmsh_push_source = require('./mmsh-push-source');

var c = "Server";

exports.Server = function(config, streams) {
    this.handlers = [];

    streams.forEach(function(strm) {
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
	    r.handler = new mmsh_handler.MMSHHandler(strm.path, r.source);
	    this.handlers.push(r);
	} else if(strm.type === "mmsh_push") {
	    r.path = strm.path;
	    r.source = new mmsh_push_source.MMSHPushSource();
	    r.handler = new mmsh_handler.MMSHHandler(strm.path, r.source);
	    this.handlers.push(r);
	    // add an extra handler for the push source
	    this.handlers.push({path: strm.path + "_push", handler: r.source});
	} else {
	    log.error(c, "Unknown source type: " + strm.type);
	    return;
	}
    }.bind(this));

    if(this.handlers.length === 0) {
	log.warn(c, "No streams have been configured.  Idle...");
    }

    this.consumeRequest = function(req, response) {
	var pathname = url.parse(req.url).pathname;

	log.debug(c, req.method + " " + pathname + " (from: " + req.socket.remoteAddress + ")");
	// + util.inspect(req.headers));

	var hit_handler = false;
	this.handlers.forEach(function(handler) {
	    var regex_str = "^\\/streams\\/" + handler.path + "(\\/$|$)"
	    if(pathname.match(new RegExp(regex_str, "i"))) {
		handler.handler.consumeRequest(req, response);
		hit_handler = true;
	    }
	});

	if(!hit_handler) {
	    if(config.redirect_404_to !== undefined) {
		response.writeHead(302, {"Location": config.redirect_404_to });
		response.end();
	    } else {
		response.writeHead(404, {"Content-Type": "text/html"});
		response.end("Sorry, nothing here!");
		log.warn(c, "404'd: Attempt to fetch " + pathname);
	    }
	    
	    return;
	}
    };
};
