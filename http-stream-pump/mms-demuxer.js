var sys = require('sys');
var strtok = require('strtok');

var assert = require('assert');

var MMSPacket = function(ready_cb, error_cb) {
    /* This is going to involve copies. I don't really care for that, to be honest.
     * Maybe I should keep references to slices instead.
     */

    // the number of fields so far parsed in the header since the PacketID field
    this.fields_parsed = 0;

    // the packet length size given in 
    this.packet_length = 0;

    // the (optional) reason field that some packets have
    this.reason = 0;

    // packet has been entirely loaded
    this.finished = false;

    // the (optional) Buffer containing the payload
    this.payload = undefined;

    /**
     * Submit the next expected token produced by strtok.
     * This function has tokens delegated to it by the MMSDemuxer.
     */
    this.consumeToken = function(token) {
	if(this.fields_parsed === 0) {
	    // length field
	    this.packet_length = token;
	    if(this.has_reason) {
		this.fields_parsed = 1;
		// expecting reason field next
		return strtok.UINT32_LE;
	    } else {
		this.fields_parsed = 2;
		// skipping it, going directly to payload
		return new strtok.BufferType(this.packet_length);
	    }
	} else if(this.fieldsParsed === 1) {
	    // reason field
	    this.reason = token;
	    return new strtok.BufferType(this.packet_length);
	} else if(this.fields_parsed === 2) {
	    // payload field
	    /* even though not all packet types include payload fields,
	       it's safe to try to load them with the necessarily specified
	       length of zero. */
	    this.payload = token;
	    ready_cb(token);
	    this.validate();
	    this.finished = true;
	    return strtok.DONE;
	} else {
	    assert.ok(false);
	}
    };
};

var DataPacket = function(ready_cb) {
    this.has_reason = false;
    this.name = "Data";

    MMSPacket.call(this, ready_cb);

    this.validate = function() {
	
    };
};
sys.inherits(DataPacket, MMSPacket);

// MMS Framing Demuxer
var MMSDemuxer = function(stream, errorHandler) {
    this.packet_cbs = [];

    // parsing state.
    this.fieldsParsed = 0;
    this.current_packet = undefined;

    // submit a callback to be fired once an MMS packet has been completely received
    this.whenPacketReceived = function(cb) {
	this.packet_cbs.push(cb);
    };

    /**
     * Strtok handler function; receives and asks for tokens.
     * Responsible for detecting the magic number, B-bit (immediate followup),
     * and Packet Type fields.
     * Once it has those, it delegates to the appropriate MMSPacket object
     */
    this.consumeToken = function(field) {
	// do we have the first four bytes of the packet header yet?
	// if so, we know how much data we can expect.
	// if(this.currentPacket.downloaded < 4) {
	//     // okay, we want to make sure that we've loaded
	// }

	if(this.fieldsParsed === 0) {
	    // strtok always begins the sequence with undefined
	    assert.ok(field == undefined);
	    this.fieldsParsed = 1;
	    return strtok.UINT8;
	} else if(this.fieldsParsed === 1) {
	    if(field !== 0x24) {
		// TODO check for the immediate-continuation field, "B"
		console.log("Not a valid MMS packet!");
		errorHandler();
		return strtok.DONE;
	    }
	    this.fieldsParsed = 2;
	    return strtok.UINT8;
	} else if(this.fieldsParsed === 2) {
	    this.fieldsParsed = 3;
	    var Tipe = undefined;
	    switch(field) {
	    case 0x44: // $D!
		Tipe = DataPacket;
		break;
	    default:
		console.log("I don't support MMS packet type #" + field + " yet!");
		errorHandler();
		return strtok.DONE;
	    }
	    this.current_packet = new Tipe(function() {
		console.log("Packet of " + Tipe.name + " arrived!");
		this.packet_cbs.forEach(function(cb) {
		    cb(this.current_packet);
		}.bind(this));
	    }.bind(this),
					   function() {
					       console.log("Problem reconstituting packet!");
					       errorHandler();
					       // error'd :(
					   });
	    return strtok.UINT16_LE;
	    
	} else if(this.fieldsParsed === 3) {
	    // now delegating to MMSPacket!
	    return this.current_packet.consumeToken(field);
	} else {
	    assert.fail();
	}
    };
	
    // start the pipeline!
    strtok.parse(stream, this.consumeToken.bind(this));
};

exports.MMSDemuxer = MMSDemuxer;
exports.MMSPacket = MMSPacket;
