var events = require('events');

var hsp_util = require("../lib/util");
var mmsh_client_stream = require("../lib/mmsh-client-stream");
var spec_helper = require('./spec_helper');

describe("An MMSH client session", function() {
    beforeEach(function() {
	spec_helper.configureSpec.bind(this)();
    });

    it("should gracefully handle a client disconnecting very early", function() {
	session = {}
	stream = new events.EventEmitter();
	stream.header =  {
	    repackWithPreheader: function() { return "blort"; }
	};
	req = {
	    socket: new events.EventEmitter()
	}
	got_head = false;
	response = {
	    writeHead: function(code, heads) {
		got_head = true;
		expect(code).toEqual(200);
		throw("whoa, client buggered off fast!");
	    },
	    write: function(data) {
		expect().toNeverGetHere();
	    }
	};
	var whenReady = function(client_stream_itself) {
	    expect().toNeverGetHere();
	};
	var client_stream = new mmsh_client_stream.MMSHClientStream(session, whenReady, stream, req, response);
	expect(got_head).toBeTruthy();
    });

    describe("with a connected client", function() {
	beforeEach(function() {
	    session = {client_id: "542352222"}
	    stream = new events.EventEmitter();
	    stream.header =  {
		repackWithPreheader: function() { return "blort"; }
	    };
	    req = {
		socket: new events.EventEmitter()
	    }
	    got_head = false;
	    got_data = true;
	    response = {
		writeHead: function(code, headers) {
		    expect(code).toEqual(200);
		    expect(headers["Content-Length"]).toBeUndefined();
		    expect(headers["Content-Type"]).toEqual("application/x-mms-framed");
		    expect(hsp_util.getPragmaFields({"headers": headers})["client-id"]).toEqual("542352222");
		    got_head = true;
		},
		write: function(data) {
		    expect(got_head).toBeTruthy();
		    // we expect to receive a copy of the header on startup
		    expect(data).toEqual("blort");
		    got_data = true;
		}
	    };
	    var got_ready = false;
	    var whenReady = function(client_stream_itself) {
		got_ready = client_stream_itself;
	    };
	    client_stream = new mmsh_client_stream.MMSHClientStream(session, whenReady, stream, req, response);
	    expect(got_ready).toBe(client_stream);
	    expect(got_data).toBeTruthy();
	});

	it("should answer the request and send the header to the client", function() { });

	it("should send MMSH data packets as they become available", function() {
	    var data_packet = {};
	    var data_packed = "data and stuff";
	    got_write = false;
	    response.write = function(data) {
		expect(data).toEqual(data_packed);
		got_write = true;
	    };
	    stream.emit("Data", data_packet, data_packed);
	    expect(got_write).toBeTruthy();
	});

	it("should shut down when the stream ends", function() {
	    response.write = function(data) {
		expect().toNeverGetHere();
	    };
	    var got_end = false;
	    response.end = function() {
		got_end = true;
	    };
	    var got_done = 0;
	    client_stream.on("done", function() {
		got_done ++;
	    });
	    stream.emit("done");
	    expect(stream.listeners("done").length).toEqual(0);
	    expect(stream.listeners("Data").length).toEqual(0);
	    expect(got_end).toBeTruthy();
	    expect(got_done).toEqual(1);
	});

	it("should shut down if the client disconnects", function() {
	    response.write = function(data) {
		expect().toNeverGetHere();
	    };
	    response.end = function() {
		throw "nope, socket already closed, guy!";
	    }
	    var got_done = 0;
	    client_stream.on("done", function() {
		got_done ++;
	    });
	    req.socket.emit("close", true);
	    expect(got_done).toEqual(1);
	    expect(stream.listeners("done").length).toEqual(0);
	    expect(stream.listeners("Data").length).toEqual(0);
	});

	it("should shut down if there is an error writing a data packet to the client", function() {
	    var data_packet = {};
	    var data_packed = "data and stuff";
	    got_write = false;
	    response.write = function(data) {
		expect(data).toEqual(data_packed);
		got_write = true;
		throw "whoa, socket is apsloded";
	    };
	    response.end = function() {
		throw "nope, socket already closed, guy!";
	    }
	    var got_done = 0;
	    client_stream.on("done", function() {
		got_done ++;
	    });
	    req.socket.emit("close", true);
	    expect(got_done).toEqual(1);
	    expect(stream.listeners("done").length).toEqual(0);
	    expect(stream.listeners("Data").length).toEqual(0);
	});

	it("shouldn't crash if stream ends, and the client is already disconnected", function() {
	    response.write = function(data) {
		expect().toNeverGetHere();
	    };
	    response.end = function() {
		raise("nope, socket closed!");
	    }
	    var got_done = 0;
	    client_stream.on("done", function() {
		got_done ++;
	    });
	    stream.emit("done");
	    expect(stream.listeners("done").length).toEqual(0);
	    expect(stream.listeners("Data").length).toEqual(0);
	    expect(got_done).toEqual(1);
	});
    });
});
