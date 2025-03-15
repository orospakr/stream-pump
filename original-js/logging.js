// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var log = function(level, component, message) {
    var d = new Date();
    console.log(level + " (" + (d.getTime() / 1000).toFixed(3) + "): [" + component + "] " + message);
};

exports.warn = function(component, message) {
    log("WRN", component, message);
};

exports.error = function(component, message) {
    log("ERR", component, message);
};

exports.info = function(component, message) {
    log("INF", component, message);
};

exports.debug = function(component, message) {
    log("DBG", component, message);
};
