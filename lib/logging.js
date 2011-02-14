// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var log = function(level, component, message) {
    var d = new Date();
    console.log(level + " (" + (d.getTime() / 1000) + "): [" + component + "] " + message);
};

exports.warn = function(component, message) {
    log("WARN", component, message);
};

exports.error = function(component, message) {
    log("ERROR", component, message);
};

exports.info = function(component, message) {
    log("INFO", component, message);
};

exports.debug = function(component, message) {
    log("DEBUG", component, message);
};
