// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var hsp_util = require('../lib/util');

var node_http = require('http');

describe("node.js", function() {
    it("should properly append Pragma HTTP headers as comma separated (this is a bug in node, see README)", function() {
	var fake_http = {
	    complete: true,
	    trailers: {}
	};
	(node_http.IncomingMessage.prototype._addHeaderLine.bind(fake_http))("pragma", "stuff=1");
	(node_http.IncomingMessage.prototype._addHeaderLine.bind(fake_http))("pragma", "hoorj");
	expect(fake_http.trailers["pragma"]).toEqual("stuff=1, hoorj");
    });
});

describe('utilities', function() {
    it("should convert an MS format binary UUID/GUID into its string representation", function() {
	var blob = new Buffer([0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9, 0x00, 0xaa, 0x00, 0x62, 0xce, 0x6c]);
	var expected = "75B22630-668E-11CF-A6D9-00AA0062CE6C";
	expect(hsp_util.GUID.get(blob, 0)).toEqual(expected);
    });

    describe("Pragma request header parser", function() {
	it("should retrieve values when Pragma field exists", function() {
	    var req = {
		headers: {"Pragma": "woot=5000,somethingelse,myfield"}
	    }
	    expect(hsp_util.getPragmaFields(req)["myfield"]).toBeTruthy();
	    expect(hsp_util.getPragmaFields(req)["myfieldx"]).toBeFalsy();
	    expect(hsp_util.getPragmaFields(req)["woot"]).toEqual("5000");
	});

	it("should retrieve values when Pragma field exists but is lowercase", function() {
	    var req = {
		headers: {"pragma": "woot=5000,somethingelse,myfield"}
	    }
	    expect(hsp_util.getPragmaFields(req)["myfield"]).toBeTruthy();
	    expect(hsp_util.getPragmaFields(req)["myfieldx"]).toBeFalsy();
	    expect(hsp_util.getPragmaFields(req)["woot"]).toEqual("5000");
	});

	it("should should return an empty hash when Pragma field is missing", function() {
	    var req = {
		headers: {"Pragmasafdsafdsaf": "woot=5000,somethingelse,myfield"}
	    }
	    expect(hsp_util.getPragmaFields(req)).toEqual({});
	});
    });
});
