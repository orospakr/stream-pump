// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

import { EventEmitter } from 'events';
import * as mmsh_packet from './mmsh-packet';
import * as log from './logging';
import { HttpRequest, HttpResponse } from './types';

const c = "MMSHClientStream";

interface MMSHClientSession {
  client_id: number;
}

interface MMSHStream extends EventEmitter {
  header: {
    name: string;
    repackWithPreheader: () => Buffer;
  };
  on(event: 'Data', listener: (data_packet: any, repacked_data: Buffer) => void): this;
  on(event: 'done', listener: () => void): this;
  removeListener(event: 'Data', listener: Function): this;
  removeListener(event: 'done', listener: Function): this;
}

/* session: MMSHClientSession this belongs to
 * whenReady: invokes this routine to say that it's ready to be announced as a client
 * stream: MMSHStream containing the content
 * req: incoming HTTP request from the client itself
 * respones: HTTP response object to send content back out through to the client itself
 */
export class MMSHClientStream extends EventEmitter {
  private finished: boolean = false;
  private data_handler: (data_packet: any, repacked_data: Buffer) => void;

  constructor(
    private session: MMSHClientSession,
    private whenReady: (client: MMSHClientStream) => void,
    private stream: MMSHStream,
    private req: HttpRequest,
    private response: HttpResponse
  ) {
    super();

    this.data_handler = (data_packet: any, repacked_data: Buffer) => {
      // log.debug(c, session.client_id + ": sending data packet to attached client...");
      try {
        response.write(repacked_data);
      } catch(e) {
        // client disconnected, otherwise unavailable. happens sometimes when clients disconnected and there's some buffering going on.
        this.done();
      }
    };

    const header_bin = stream.header.repackWithPreheader();
    log.debug(c, session.client_id + ": Received stream Play request.");
    
    try {
      response.writeHead(200, {
        "Server": "Rex/12.0.7600.16385",
        "Content-Type": "application/x-mms-framed",
        "Pragma": "no-cache,client-id=" + session.client_id + ",features=\"broadcast,playlist\"",
        "Supported": "com.microsoft.wm.srvppair, com.microsoft.wm.sswitch, com.microsoft.wm.predstrm,com.microsoft.wm.fastcache, com.microsoft.wm.startupprofile"
      });
      response.write(header_bin);
    } catch(e) {
      log.warn(c, "Wow, a client left very early.");
      return;
    }
    
    stream.on("Data", this.data_handler);
    
    req.socket.once("close", (if_error: boolean) => {
      log.debug(c, session.client_id + ": disconnected " + (if_error ? "due to error" : "gracefully"));
      this.done();
    });
    
    stream.on("done", this.done.bind(this));
    whenReady(this);
  }

  done(): void {
    // TODO unregister from stream handler
    if(this.finished) {
      return;
    }
    
    this.finished = true;
    
    try {
      const eos = new mmsh_packet.EndOfStreamPacket();
      eos.reason = 0;
      this.response.end(eos.repackWithPreheader());
    } catch(e) {
      // socket already closed, or whatnot.
    }
    
    this.stream.removeListener("done", this.done);
    this.stream.removeListener("Data", this.data_handler);
    this.emit("done");
  }
}
