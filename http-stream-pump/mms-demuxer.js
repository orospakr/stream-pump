var sys = require('sys');
var strtok = require('strtok');

var MMSPacket = function() {
    Buffer.call(this, 4096 * 17); // 69632 (65K plus 4096 of breathing room)

    this.downloaded = 0;

    this.payloadSize = function() {
    };

    this.remainingNeededBytesForHeader = function() {
    };

    this.remainingNeededBytes = function() {
    };

    this.isHeaderDownloaded = function() {
    };

    this.isCompletelyLoaded = function() {
    };
};

sys.inherits(MMSPacket, Buffer);

var testPacket = new MMSPacket();

// MMS Framing Demuxer
var MMSDemuxer = function(stream, errorHandler) {
    this.packet_cbs = [];
    this.fieldsParsed = 0;
    this.currentPacket = undefined;
    
    this.newPacket = function() {
	this.currentPacket = new MMSPacket();
    },

    // submit a callback to be fired once an MMS packet has been completely received
    this.whenPacketReceived = function(cb) {
	this.packet_cbs.push(cb);
    };

    // Submit a Buffer containing some packet data.
    this.submitData = function(field) {
	// do we have the first four bytes of the packet header yet?
	// if so, we know how much data we can expect.
	// if(this.currentPacket.downloaded < 4) {
	//     // okay, we want to make sure that we've loaded
	// }

	if(field === undefined) {
	    // strtok always begins the sequence with undefined
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
	    if(field == 0x44) {
		// $D type!
		this.fieldsParsed = 3;
		return strtok.UINT16_LE;
	    } else {
		console.log("I don't support MMS packet type #" + field + " yet!");
		errorHandler();
		return strtok.DONE;
	    }
	} else if(this.fieldsParsed === 3) {
	    this.fieldsParsed = 4;
	    return new strtok.BufferType(field);
	} else if(this.fieldsParsed === 4) {
	    this.fieldsParsed = 5;
	    this.packet_cbs.forEach(function(cb) {
	        cb(field);
	    });
	    return strtok.DONE;
	}
	
    };

    // start the pipeline!
    strtok.parse(stream, this.submitData.bind(this));
};

exports.MMSDemuxer = MMSDemuxer;
exports.MMSPacket = MMSPacket;
