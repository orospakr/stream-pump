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
var dns = require('dns');
var net = require('net');

var c = "MMSHPullSource";

exports.MMSHPullSourceAttempt = function(http_params) {
    events.EventEmitter.call(this);

    this.onError = function(e) {
	log.error(c, "Error making request: " + e);
	this.close();
    };

    this.close = function(e) {
	this.http_client.end();
	this.emit("done");
    };

    /**
      * Initiate the HTTP client connection, with a specified hostname and port to connect to
      */
    this.initiate = function(path, connect_host, connect_port) {
	this.http_client = http.createClient(connect_port, connect_host);

	this.http_client.on("error", this.onError.bind(this));

	var req = this.http_client.request('GET', path, http_params);
	req.once('response', function(res) {
	    console.log("got result! " + util.inspect(res.headers));
	    stream = new mmsh_stream.MMSHStream(res, true);
	    stream.on("done", function() {
		log.warn(c, "MMSH stream terminated!");
		this.close();
	    }.bind(this));
	    // stream.on("all", function(packet, repacked) {
    	    //     log.debug(c, "First 16 bytes: " + util.inspect(packet.payload.slice(0, 16)));
	    // });
	    stream.on("ready", function() {
		log.info(c, "Pulled stream has become ready, informing owner MMSHHandler!");
		this.emit("ready", stream);
	    }.bind(this));
	    // res.on('data', function(chunk) {
	    // 	console.log("Got " + chunk.length + " bytes of data.");
	    // });
	}.bind(this));
	req.on('error', function(e) {
	    this.onError(e);
	}.bind(this));
	req.on('close', function(graceful) {
	    this.onError(graceful ? "closed gracefully" : "closed ungracefully");
	}.bind(this));
	this.http_client.setTimeout(15000, function() {
	    this.onError("Closing pull request due to timeout; I'm not receiving data.");
	}.bind(this));

	req.setHeader("User-Agent", "NSPlayer");
	req.setHeader("Pragma", "xPlayStrm=1");

	req.end();
    };

    /**
      * The proxy setting is turned on, but we need to validate if the address I want to reach
      * is appropriate to use the proxy for.  If so, connect with the proxy.
      */
    this.initiateWithProxyIfAppropriate = function(address) {
	if(hsp_util.isLocalIP(address) && !(hsp_util.config.use_proxy_for_local_addresses)) {
	    log.debug(c, "Pull Source address is local, bypassing proxy.");
	    this.initiate(http_params.path, http_params.host, http_params.port);
	} else {
	    log.debug(c, "Pull Source address is not local (or proxy forced), using proxy.");
	    // HACK
	    this.initiate("http://" + http_params.host + ":" + http_params.port + http_params.path, hsp_util.config.http_proxy_host, hsp_util.config.http_proxy_port);
	}
    };

    if(hsp_util.config.use_http_proxy) {
	// we have to look up the host they've given us to find out if it is appropriate to use the proxy
	if(net.isIPv4(http_params.host)) {
	    // we know already
	    this.initiateWithProxyIfAppropriate(host_params.host);
	} else {
	    // gotta look it up
	    log.debug(c, "Looking up address for pull source: " + http_params.host);
	    dns.lookup(http_params.host, 4, function(err, address, family) {
		if(err === null) {
		    log.debug(c, "Got address for pull source: " + address)
		    this.initiateWithProxyIfAppropriate(address);
		} else {
		    this.onError("Couldn't look up pull source hostname: " + err);
		}
	    }.bind(this));
	}
    } else {
	this.initiate(http_params.path, http_params.host, http_params.port);
    }
};
sys.inherits(exports.MMSHPullSourceAttempt, events.EventEmitter);

module.exports.MMSHPullSource = function(http_params) {
    events.EventEmitter.call(this);

    this.streaming = false;

    this.startNewAttempt = function() {
	// wrap MMSHPullSource attempt and continually retry it
	log.info(c, "Attempting to connect to pull source...");
	attempt = new module.exports.MMSHPullSourceAttempt(http_params);
	attempt.once("ready", function(stream) {
	    // excellent.
	    if(this.streaming === true) {
		log.warn(c, "Whoa, MMSHPullSource became ready more than once?  Broken.");
	    }
	    this.streaming = true;
	    this.emit("ready", stream);
	}.bind(this));
	attempt.once("done", function() {
	    // Attempt will return done even if it never went ready, but I don't want to leak that upstairs.
	    if(this.streaming) {
		this.emit("done");
		this.streaming = false;
	    }
	    var variance = Math.random() * 10000;
	    log.warn(c, "Stream ended or not connectable.  Waiting 10 seconds (+" + (Math.floor(variance/1000)) + " of variance) before attempting to reengage.");
	    setTimeout(this.startNewAttempt.bind(this), 10000 + variance);
	}.bind(this));
    };

    this.startNewAttempt();
};
sys.inherits(exports.MMSHPullSource, events.EventEmitter);
