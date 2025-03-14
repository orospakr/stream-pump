// TypeScript migration of mmsh-client-session.js
// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

import { EventEmitter } from 'events';
import * as util from 'util';
import * as hsp_util from './util';
import * as mmsh_packet from './mmsh-packet';
import * as mmsh_client_stream from './mmsh-client-stream';
import * as log from './logging';
import { HttpRequest, HttpResponse } from './types';

const c = "MMSHClientSession";

/**
 * Track the session state of a client (keyed on the client-id field)
 * getStream: method that will return the stream that this client will be receiving video from (I'm not going to try to handle on the fly stream changes for now).  This Stream is expected to be active.  This is only used to return the header to users.
 * Events:
 *   client: client starts streaming.  reference to MMSHClientStream will be provided as first argument.
 */
export class MMSHClientSession extends EventEmitter {
  public client_id: number;
  private data_handler: any;

  constructor(
    private getStream: () => any,
    private verifyIsIDUnique: (id: string) => boolean
  ) {
    super();
    this.client_id = 0;

    do {
      this.client_id = Math.floor(Math.random() * 4294967295);
    } while(!verifyIsIDUnique(this.client_id.toString()));
  }

  consumeRequest(req: HttpRequest, response: HttpResponse): void {
    const stream = this.getStream();
    const pragmas = hsp_util.getPragmaFields(req);
    
    if(pragmas["xPlayStrm"] === "1") {
      const whenReady = (client: any) => {
        this.emit("client", client);
      };
      
      const client = new mmsh_client_stream.MMSHClientStream(this, whenReady, stream, req, response);
    } else {
      log.debug(c, this.client_id + ": received Describe request, returning stream header.");
      log.debug(c, "Stream header is: " + stream.header.name);
      
      const header_bin = stream.header.repackWithPreheader();
      
      // TODO handle the Stream is not writable error here, just in case
      response.writeHead(200, {
        "Server": "Rex/12.0.7600.16385",
        "Content-Type": "application/vnd.ms.wms-hdr.asfv1",
        "Content-Length": header_bin.length + "",
        "Pragma": "no-cache,client-id=" + this.client_id + ",features=\"broadcast,playlist\"",
        "Supported": "com.microsoft.wm.srvppair, com.microsoft.wm.sswitch, com.microsoft.wm.predstrm,com.microsoft.wm.fastcache, com.microsoft.wm.startupprofile"
      });
      
      response.end(header_bin);
    }
  }
}
