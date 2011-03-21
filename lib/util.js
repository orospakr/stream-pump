// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

/* Various handy utility functions */

var net = require('net');

var strtok = require('strtok');

var toHex = function(v, l) {
    var r = v.toString(16);
    while(r.length < (l*2)) {
	r = "0" + r
    }
    return r;
};

/* Read GUIDs from a Buffer, arranged such that strtok will like it.
   Well, at least the way Microsoft encodes them. */
module.exports.GUID = {
    len: 16,
    get: function(buf, off) {
	d1 = strtok.UINT32_LE.get(buf, 0);
	d2 = strtok.UINT16_LE.get(buf, 4);
	d3 = strtok.UINT16_LE.get(buf, 6);
	d4 = strtok.UINT16_BE.get(buf, 8);
	d5_1 = strtok.UINT16_BE.get(buf, 10);
	d5_2 = strtok.UINT16_BE.get(buf, 12);
	d5_3 = strtok.UINT16_BE.get(buf, 14);
	return(toHex(d1, 4) + "-" + toHex(d2, 2) + "-" + toHex(d3, 2) + "-" + toHex(d4, 2) + "-" + toHex(d5_1, 2) + toHex(d5_2, 2) + toHex(d5_3, 2)).toUpperCase();
    }
};

var getPragmaFields = function(req) {
    var f = req.headers["Pragma"] || req.headers["pragma"];
    var r = {};
    if(f === undefined) {
	return r;
    }
    (f.split(",")).forEach(function(p) {
	var cleaned = p.replace(/^\s+|\s+$/g, ''); // clean whitespace
	var pair = cleaned.split('=');
	if(pair[1] === undefined) {
	    r[pair[0]] = true;
	} else {
	    r[pair[0]] = pair[1];
	}
    });
    return r;
};
exports.getPragmaFields = getPragmaFields;

// Bleaugh.  TODO This is kind of terrible.
// I wish you could get a real numerical address type in node. that would
// make things less ugly.
// Used for HTTP proxy policy.
var isLocalIP = function(addr) {
    if(net.isIPv4(addr)) {
	var octets = addr.split(".");
	if(octets[0] === "127") {
	    return true;
	}
	if(octets[0] === "172" && octets[1] === "16") {
	    // um, this test isn't exactly correct, since I'm doing it at the
	    // octet level. the netmask is actually /12.  sorry...
	    return true;
	}
	if(octets[0] === "192" && octets[1] === "168") {
	    return true;
	}
	if(octets[0] === "10") {
	    return true;
	}
	if(octets[0] === "169" && octets[1] === "254") {
	    return true;
	}
	return false;
    } else {
	return false;
    }
};
exports.isLocalIP = isLocalIP;

// Deep copy for JSON-like structures, borrowed from
// http://my.opera.com/GreyWyvern/blog/show.dml/1725165
// Object.prototype.clone = function() {
//     var newObj = (this instanceof Array) ? [] : {};
//     for (i in this) {
// 	if (i == 'clone') continue;
// 	if (this[i] && typeof this[i] == "object") {
// 	    newObj[i] = this[i].clone();
// 	} else newObj[i] = this[i]
//     } return newObj;
// };
