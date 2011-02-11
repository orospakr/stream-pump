var strtok = require('strtok');

var toHex = function(v, l) {
    var r = v.toString(16);
    while(r.length < (l*2)) {
	r = "0" + r
    }
    return r;
};

/* Well, at least the way Microsoft encodes them. */
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
    var f = req.headers["Pragma"];
    var r = {};
    if(f === undefined) {
	return r;
    }
    (f.split(",")).forEach(function(p) {
	var cleaned = p.replace(/^\s+|\s+$/g, '');
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
