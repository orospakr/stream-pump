// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var sys = require('sys');
var strtok = require('strtok');

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
	strtok.UINT8.put(buf, 1, this.type_id, false);
	strtok.UINT16_LE.put(buf, 2, this.data_length);
	if(this.has_reason) {
	    strtok.UINT32_LE.put(buf, 4, this.reason);
	    this.payload.copy(buf, 8, 0);
	} else {
	    this.payload.copy(buf, 4, 0);
	}
	return buf;
    };

    this.repackWithPreheaderFields = function(location_id, incarnation, afflags) {
	var buf = new Buffer(4 + this.data_length + 8);
	strtok.UINT8.put(buf, 0, 0x24, false); // TODO: B field
	strtok.UINT8.put(buf, 1, this.type_id, false);

	// the funky extra fields:
	strtok.UINT16_LE.put(buf, 2, this.data_length + 8);
	strtok.UINT32_LE.put(buf, 4, location_id);
	strtok.UINT8.put(buf, 8, incarnation);
	strtok.UINT8.put(buf, 9, afflags);
	strtok.UINT16_LE.put(buf, 10, this.data_length + 8);

	if(this.has_reason) {
	    strtok.UINT32_LE.put(buf, 12, this.reason);
	    this.payload.copy(buf, 16, 0);
	} else {
	    this.payload.copy(buf, 12, 0);
	}
	return buf;
    };
};
exports.MMSPacket = MMSPacket;

var DataPacket = function(ready_cb, error_cb) {
    this.has_reason = false;
    this.name = "Data";
    this.type_id = 0x44;

    MMSPacket.call(this, ready_cb, error_cb);

    this.validate = function(err_cb) {
	
    };

    this.repackWithPreheader = function(sequence_number) {
	return this.repackWithPreheaderFields(sequence_number, 0, 0);
    };
};
sys.inherits(DataPacket, MMSPacket);
exports.DataPacket = DataPacket;

var StreamChangePacket = function(ready_cb, error_cb) {
    MMSPacket.call(this, ready_cb, error_cb);

    this.has_reason = true;
    this.name = "Stream Change";

    this.validate = function(err_cb) {
	if(this.data_length != 4) {
	    err_cb("Invalid MMS Stream Change Packet: length must always be 4.");
	    return;
	}
    };
};
sys.inherits(StreamChangePacket, MMSPacket);
exports.StreamChangePacket = StreamChangePacket;

var EndOfStreamPacket = function(ready_cb, error_cb) {
    MMSPacket.call(this, ready_cb, error_cb);

    this.has_reason = true;
    this.name = "End of Stream";

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
exports.EndOfStreamPacket = EndOfStreamPacket;

var HeaderPacket = function(ready_cb, error_cb) {
    MMSPacket.call(this, ready_cb, error_cb);

    this.has_reason = false;
    this.name = "Header";
    this.type_id = 0x48;

    this.repackWithPreheader = function() {
	return this.repackWithPreheaderFields(0, 0, 0x0c);
    };
};
sys.inherits(HeaderPacket, MMSPacket);
exports.HeaderPacket = HeaderPacket;

var MetadataPacket = function(ready_cb, error_cb) {
    MMSPacket.call(this, ready_cb, error_cb);

    this.has_reason = false;
    this.name = "Metadata";
};
sys.inherits(MetadataPacket, MMSPacket);
exports.MetadataPacket = MetadataPacket;

var TestDataPacket = function(ready_cb, error_cb) {
    MMSPacket.call(this, ready_cb, error_cb);
    this.has_reason = false;
    this.name = "Test Data Notification";
    this.type_id = 0x54;
    this.data_length = 0;
    this.payload = new Buffer(0);
};
sys.inherits(TestDataPacket, MMSPacket);
exports.TestDataPacket = TestDataPacket;
