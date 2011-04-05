// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

var events = require('events');

var mmsh_stream = require('../lib/mmsh-stream');
var server = require('../lib/server');

var spec_helper = require('./spec_helper.js');

describe("MMSH integration", function() {
    beforeEach(function() {
	spec_helper.configureSpec.bind(this)();
    });

    describe("before push", function() {
	it("should deny clients", function() {
	    // TODO
	});
    });
    describe("push stream", function() {
	describe("should start, ", function() {
	    beforeEach(function() {
		streams = [{
		    name: "Test Stream",
		    enabled: true,
		    type: "mmsh_push",
		    source_options: {host: "example.com", port: "8080", part: "/"},
		    path: "test",
		}];
		pump = new server.Server({}, streams);

		push_req = new spec_helper.MockStream();
		push_req.method = "POST";
		push_req.url = "http://example.com:8080/streams/test_push";
		push_req.headers = {"content-type": "application/x-wms-pushstart"};
		push_req.socket = {"remoteAddress": ""};

		push_response = {
		    writeHead: function(code, heads) {
			expect().toNotGetHere();
		    },
		    end: function() {
			expect().toNotGetHere();
		    }
		};
		pump.consumeRequest(push_req, push_response);
	    });

	    it("successfully", function() {
		
	    });

	    describe("before a header is received, ", function() {
		it("should deny clients", function() {
		    var req = {
			url: "http://example.com:8080/streams/test",
			socket: {"remoteAddress": ""},
		    };
		    var got_end = false;
		    var got_head = false;
		    var response = {
			writeHead: function(code, headers) {
			    expect(code).toEqual(503);
			    got_head = true;
			},
			end: function() {
			    expect(got_head).toBeTruthy();
			    got_end = true;
			}
		    };
		    pump.consumeRequest(req, response);
		    expect(got_end).toBeTruthy();
		});
		
	    });

	    describe("begin receiving a stream, ", function() {
		beforeEach(function() {
		    header = new Buffer([0x24, 0x48, 0x05, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04]);
		    expected_header_with_preheader = new Buffer([0x24, 0x48, 0x0d, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x0d, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04]);
		    push_req.injectData(header);
		});

		it("successfully", function() {
		});

		describe("a client arrives, ", function() {
		    it("should send a client the header", function() {
			var req_socket = new events.EventEmitter();
			req_socket.remoteAddress = "";
			req = {
			    url: "/streams/test",
			    socket: req_socket,
			    method: "GET",
			    headers: {},
			};
			got_head = false;
			got_end = false;
			response = {
			    writeHead: function(code, heads) {
				expect(code).toEqual(200);
				got_head = true;
			    },
			    end: function(data) {
				expect(got_head).toBeTruthy();
				expect(data).toMatchBuffer(expected_header_with_preheader);
				got_end = true;
			    },
			};
			
			pump.consumeRequest(req, response);
			expect(got_end).toBeTruthy();
		    });
		    
		    describe("asks to start receiving the stream, ", function() {
			beforeEach(function() {
			    var req_socket = new events.EventEmitter();
			    req_socket.remoteAddress = "";
			    req = {
				url: "/streams/test",
				socket: req_socket,
				method: "GET",
				headers: {"pragma": "xPlayStrm=1"},
			    };
			    got_head = false;
			    got_write = false;
			    response = {
				writeHead: function(code, heads) {
				    expect(code).toEqual(200);
				    got_head = true;
				},
				write: function(data) {
				    expect(got_head).toBeTruthy();
				    expect(data).toMatchBuffer(expected_header_with_preheader);
				    got_write = true;
				}
			    };
			    pump.consumeRequest(req, response);
			    expect(got_write).toBeTruthy();
			});

			it("should send the client the header", function() {});

			it("should be sent a data packet as it arrives", function() {
			    var data_packet = new Buffer([0x24, 0x48, 0x05, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04]);
			});
		    });
		});
	    });
	});
    });
});

//module.exports = testCase({
    // setUp: function(cb) {
    // 	this.stream = new mmsh_stream.MMSHStream();
    // },

    // shouldRefuseNewClientsWhenStreamNotStarted: {
    // 	// before a pushstart has occured, refuse everyone
    // },

    // shouldreceivePushSetup: function() {
    // 	this.stream.consumeRequest(req);
    // 	// bollocks, how do I stub things (replace a constructor to produce mocks, for instance?) temporarily inside nodeunit tests?

    // 	// let request have content type "application/x-wms-pushsetup"
    // 	// a real WMS server will create a new stream (permissions notwithstanding),
    // 	// context based on this.  Since H-S-P is configured ahead of time,
    // 	// merely send HTTP 204 back to confirm that yes, this is the right place :)
    // },

    // streamOpened: {
    // 	setUp: function(cb) {
    // 	    // it should start MMSHDemuxer, begin listening for MMSH packets from it
    // 	    // receiving PushStart request containing stream

    // 	    // let request have content type "application/x-wms-pushstart"
    // 	    // this request is the big one, the one that will contain the entire video stream
    // 	},

    // 	clientConnected: function(cb) {
    // 	    // a client has connected but we haven't received the headers yet.
    // 	    // do we block them (please hold...!) instead of shitcanning them immediately
    // 	    // like we do in the fully unconnected state?  Maybe not a bad idea.
    // 	},

    // 	receivedHeaders: {
    // 	    setUp: function(cb) {
    // 		// send it a HeaderPacket
    // 		// at this point, it should consider itself Ready for Clients
    // 	    },

    // 	    clientConnected: {
    // 		setUp: {
    // 		    // a client arrives, see ee4_to_wmp9.pcap
    // 		    // it should send the client the saved header!
    // 		    // client should be mocked, of course
    // 		    // ... (and put it in the list to receive packets in the future)
    // 		},

    // 		dataReceived: {
    // 		    // it should send DataPackets to the client as they arrive
    // 		    // iterate a few, to be sure
    // 		},

    // 		clientDisconnected: {
    // 		    // disconnect the client, make sure that sending more
    // 		    // DataPackets is fine
    // 		}
    // 	    },
    // 	},

    // 	sourceDisconnected: function(cb) {
    // 	    // if the source has disconnected/sent EOS, close it send EOS to all the clients and go back into our starting state
    // 	}
    // },
//});
