var sys = require('sys');
var strtok = require('strtok');

var assert = require('assert');

var log = require('./logging');

var c = "MMSDemuxer";

var MMSPacket = function(ready_cb, error_cb) {
    /* This is going to involve copies. I don't really care for that, to be honest.
     * Maybe I should keep references to slices instead, somehow?
     */

    // the number of fields so far parsed in the header since the PacketID field
    this.fields_parsed = 0;

    // the packet length size given in
    this.data_length = 0;

    // the (optional) reason field that some packets have
    this.reason = 0;

    // packet has been entirely loaded
    this.finished = false;

    // the (optional) Buffer containing the payload
    this.payload = undefined;

    /** Internal routine; packet is done, send it out to consumers.
      */
    this.packetReady = function() {
	ready_cb();
	this.validate(function(error_explanation) {
	    log.warn(c, "Aww, this packet is invalid, because: " + error_explanation);
	    error_cb();
	}.bind(this));
	this.finished = true;
    };

    /**
      * Check that this packet has sane values.
      * Virtual.  Override this in the specific Packet type impelementations.
      */
    this.validate = function() {
	// override me
    };

    this.inspect = function() {
	return "MMS: " + this.name + ": " + this.inspectHeader() + "; " + this.inspectPayload();
    };

    this.inspectPayload = function() {
	if(this.payload) {
	    return "payload: " + this.payload.length + " bytes";
	} else {
	    return "";
	}
    };

    this.inspectHeader = function() {
	if(this.has_reason) {
	    return "reason: " + this.reason;
	} else {
	    return "";
	}
    };

    /**
     * Submit the next expected token produced by strtok.
     * This function has tokens delegated to it by the MMSDemuxer.
     */
    this.consumeToken = function(token) {
	if(this.fields_parsed === 0) {
	    // length field
	    this.data_length = token;
	    if(this.has_reason) {
		this.fields_parsed = 1;
		// expecting reason field next
		return strtok.UINT32_LE;
	    } else {
		this.fields_parsed = 2;
		// skipping it, going directly to payload
		return new strtok.BufferType(this.data_length);
	    }
	} else if(this.fields_parsed === 1) {
	    // reason field
	    this.reason = token;
	    this.fields_parsed = 2;
	    // for PacketPair type, ask for ensuing buffer of appropriate length, otherwise:
	    this.packetReady();
	    return strtok.DONE;
	} else if(this.fields_parsed === 2) {
	    // payload field
	    /* even though not all packet types include payload fields,
	       it's safe to try to load them with the necessarily specified
	       length of zero. */
	    this.payload = token;
	    this.packetReady();
	    // HACK -- we have to return the type of the next packet
	    // for strtok here.  a little encapsulation-breaking.
	    return strtok.UINT8;
	} else {
	    // yikes! Never supposed to get here...
	    log.error(c, "Whoa, for some reason I have counted an inappropriate number of parsed fields: " + this.fields_parsed);
	    assert.ok(false);
	}
    };

    this.repack = function() {
	var buf = new Buffer(4 + this.data_length);
	strtok.UINT8.put(buf, 0, 0x24, false); // TODO: B field
	strtok.UINT8.put(buf, 1, 0x48, false); // hardcoded for Header type
	strtok.UINT16_LE.put(buf, 2, this.data_length);
	if(this.has_reason) {
	    strtok.UINT32_LE.put(buf, 4, this.reason);
	    this.payload.copy(buf, 8, 0);
	} else {
	    this.payload.copy(buf, 4, 0);
	}
	return buf;
    };
};
exports.MMSPacket = MMSPacket;

var DataPacket = function(ready_cb, error_cb) {
    this.has_reason = false;
    this.name = "Data";

    MMSPacket.call(this, ready_cb, error_cb);

    this.validate = function(err_cb) {
	
    };
};
sys.inherits(DataPacket, MMSPacket);

var StreamChangePacket = function(ready_cb, error_cb) {
    this.has_reason = true;
    this.name = "Stream Change";

    MMSPacket.call(this, ready_cb, error_cb);

    this.validate = function(err_cb) {
	if(this.data_length != 4) {
	    err_cb("Invalid MMS Stream Change Packet: length must always be 4.");
	    return;
	}
    };
};
sys.inherits(StreamChangePacket, MMSPacket);

var EndOfStreamPacket = function(ready_cb, error_cb) {
    this.has_reason = true;
    this.name = "End of Stream";

    MMSPacket.call(this, ready_cb, error_cb);

    this.reasonOkay = function() {
	return (this.reason == 0);
    };

    this.validate = function(err_cb) {
	if(this.data_length != 4) {
	    err_cb("Invalid MMS End of Stream Packet: length must always be 4.");
	    return;
	}
    };
};
sys.inherits(EndOfStreamPacket, MMSPacket);

var HeaderPacket = function(ready_cb, error_cb) {

    MMSPacket.call(this, ready_cb, error_cb);

    this.has_reason = false;
    this.name = "Header";

    this.repackWithGoofyHeader = function() {
	var buf = new Buffer(4 + this.data_length + 8);
	strtok.UINT8.put(buf, 0, 0x24, false); // TODO: B field
	strtok.UINT8.put(buf, 1, 0x48, false); // hardcoded for Header type
	strtok.UINT16_LE.put(buf, 2, this.data_length + 8);
	for(i = 0; i < 8; i++) {
	    buf[4+i] = 0;
	}
	buf[4+5] = 0x0c;
	strtok.UINT16_LE.put(buf, 4 + 6, this.data_length + 8);
	this.payload.copy(buf, 12, 0);
	return buf;
    };
};
sys.inherits(HeaderPacket, MMSPacket);
exports.HeaderPacket = HeaderPacket;

var MetadataPacket = function(ready_cb, error_cb) {
    this.has_reason = false;
    this.name = "Metadata";

    MMSPacket.call(this, ready_cb, error_cb);
};
sys.inherits(MetadataPacket, MMSPacket);
    

// MMS Framing Demuxer
var MMSDemuxer = function(stream, packetHandler, errorHandler) {
    this.packet_cbs = [];

    // parsing state.
    this.fields_parsed = 0;

    // submit a callback to be fired once an MMS packet has been completely received
    this.whenPacketReceived = function(cb) {
	this.packet_cbs.push(cb);
    };

    this.whenPacketReceived(packetHandler);

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

	if(this.fields_parsed === 0) {
	    // strtok always begins the sequence with undefined
	    assert.ok(field == undefined);
	    this.fields_parsed = 1;
	    return strtok.UINT8;
	} else if(this.fields_parsed === 1) {
	    if(field !== 0x24) {
		// TODO check for the immediate-continuation field, "B"
		log.warn(c, "Not a valid MMS packet, has wrong magic field!");
		errorHandler("Not a valid MMS packet, has wrong magic field!");
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
		Tipe = DataPacket;
		break;
	    case 0x43: // $C
		Tipe = StreamChangePacket;
		break;
	    case 0x45: // $E
		Tipe = EndOfStreamPacket;
		break;
	    case 0x48:
		Tipe = HeaderPacket;
		break;
	    case 0x4D:
		Tipe = MetadataPacket;
		break;
	    default:
		log.warn(c, "I don't support MMS packet type #" + field + " yet!");
		errorHandler("I don't support MMS packet type #" + field + " yet!");
		return strtok.DONE;
	    }
	    this.current_packet = new Tipe(function() {
		// success'd! :D
		log.debug(c, "Packet: " + this.current_packet.inspect());
		this.packet_cbs.forEach(function(cb) {
		    cb(this.current_packet);
		}.bind(this));
		// we skip the first iteration where it provides the type
		// for the first toten; we have to return that in the right
		// callback chain, so I have to do it in the MMSPacket side
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
