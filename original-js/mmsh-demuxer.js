// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var sys = require('sys');
var strtok = require('strtok');

var assert = require('assert');

var log = require('./logging');
var mmsh_packet = require('./mmsh-packet');

var c = "MMSHDemuxer";

// MMSH Framing Demuxer
var MMSHDemuxer = function(stream, includes_preheaders, packetHandler, errorHandler) {
    this.packet_cbs = [];

    // parsing state.
    this.fields_parsed = 0;

    // submit a callback to be fired once an MMSH packet has been completely received
    this.whenPacketReceived = function(cb) {
	this.packet_cbs.push(cb);
    };

    this.whenPacketReceived(packetHandler);

    /**
     * Strtok handler function; receives and asks for tokens.
     * Responsible for detecting the magic number, B-bit (immediate followup),
     * and Packet Type fields.
     * Once it has those, it delegates to the appropriate MMSHPacket object
     */
    this.consumeToken = function(field) {
	// do we have the first four bytes of the packet header yet?
	// if so, we know how much data we can expect.
	// if(this.currentPacket.downloaded < 4) {
	//     // okay, we want to make sure that we've loaded
	// }

	if(this.fields_parsed === 0) {
	    // strtok always begins the sequence with undefined
	    assert.ok(field == undefined);
	    this.fields_parsed = 1;
	    return strtok.UINT8;
	} else if(this.fields_parsed === 1) {
	    if(field !== 0x24) {
		// TODO check for the immediate-continuation field, "B"
		log.warn(c, "Not a valid MMSH packet, has wrong magic field!");
		errorHandler("Not a valid MMSH packet, has wrong magic field!");
		return strtok.DONE;
	    }
	    this.fields_parsed = 2;
	    return strtok.UINT8;
	} else if(this.fields_parsed === 2) {
	    this.fields_parsed = 3;
	    var Tipe = undefined;
	    // TODO DRY violation with repack(); Packet types themselves should know their own IDs
	    switch(field) {
	    case 0x44: // $D
		Tipe = mmsh_packet.DataPacket;
		break;
	    case 0x43: // $C
		Tipe = mmsh_packet.StreamChangePacket;
		break;
	    case 0x45: // $E
		Tipe = mmsh_packet.EndOfStreamPacket;
		break;
	    case 0x46: // $F (?!)
		Tipe = mmsh_packet.FuckPacket;
		break;
	    case 0x48: // $H
		Tipe = mmsh_packet.HeaderPacket;
		break;
	    case 0x4D: // $M
		Tipe = mmsh_packet.MetadataPacket;
		break;
	    default:
		log.warn(c, "I don't support MMSH packet type #" + field + " yet!");
		errorHandler("I don't support MMSH packet type #" + field + " yet!");
		return strtok.DONE;
	    }
	    this.current_packet = new Tipe(includes_preheaders, function() {
		// success'd! :D
		log.debug(c, "Packet: " + this.current_packet.inspect());
		this.packet_cbs.forEach(function(cb) {
		    cb(this.current_packet);
		}.bind(this));
		// we skip the first iteration where it provides the type
		// for the first toten; we have to return that in the right
		// callback chain, so I have to do it in the MMSHPacket side
		// of things.
		this.fields_parsed = 1;
		this.current_packet = undefined;
	    }.bind(this),
	    function() {
		// error'd :(
		log.error(c, "Problem reconstituting packet!");
		errorHandler("Problem reconstituting packet!");
	    }.bind(this));
	    return strtok.UINT16_LE;

	} else if(this.fields_parsed === 3) {
	    // now delegating to MMSHPacket!
	    return this.current_packet.consumeToken(field);
	} else {
	    assert.fail();
	}
    };

    // start the pipeline!
    strtok.parse(stream, this.consumeToken.bind(this));
};

exports.MMSHDemuxer = MMSHDemuxer;

