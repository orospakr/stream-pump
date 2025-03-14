// TypeScript migration of mmsh-handler.js
// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

/* Incoming Request handler for MMSH Streams */

import { EventEmitter } from 'events';
import * as mmsh_stream from './mmsh-stream';
import * as mmsh_demuxer from './mmsh-demuxer';
import * as mmsh_client_session from './mmsh-client-session';
import * as hsp_util from './util';
import * as log from './logging';
import { HttpRequest, HttpResponse } from './types';

const c = "MMSHHandler";

interface StreamSource extends EventEmitter {
  on(event: 'ready', listener: (stream: any) => void): this;
  on(event: 'done', listener: () => void): this;
  once(event: string, listener: Function): this;
}

interface ClientStream extends EventEmitter {
  once(event: 'done', listener: () => void): this;
}

export class MMSHHandler extends EventEmitter {
  private stream: any;
  private sessions: Record<string, any> = {};
  private client_streams: ClientStream[] = [];
  private seen_header_buffers: Buffer[] = [];
  private short_name: string;

  constructor(short_name: string, private stream_source: StreamSource) {
    super();
    this.short_name = short_name;
    this.stream = undefined;

    this.on("active-clients-changed", (ct: number) => {
      log.info(`${c}/${this.short_name}`, "There are now " + ct + " clients connected.");
    });

    this.emit("active-clients-changed", 0);

    stream_source.on("ready", (stream: any) => {
      if(this.stream !== undefined) {
        log.warn(`${c}/${this.short_name}`, "Yikes!  Somehow, I already have a stream ready and I'm being informed of a new one?!");
      }
      log.debug(`${c}/${this.short_name}`, "Stream has become ready, clients can now attach!");
      
      this.sessions = {};
      this.stream = stream;
    });

    stream_source.on("done", () => {
      log.debug(`${c}/${this.short_name}`, "Stream has finished, booting clients and denying new ones.");
      // TODO boot clients?
      this.stream = undefined;
    });
  }

  clientStartedStreaming(client_stream: ClientStream): void {
    this.client_streams.push(client_stream);
    client_stream.once("done", () => {
      const idx = this.client_streams.indexOf(client_stream);
      this.client_streams.splice(idx, 1);
      this.emit("active-clients-changed", this.client_streams.length);
    });
    this.emit("active-clients-changed", this.client_streams.length);
  }

  consumeRequest(req: HttpRequest, response: HttpResponse): void {
    const noStream = () => {
      log.info(`${c}/${this.short_name}`, "Client arrived before stream is up.  Disappointing them.");
      response.writeHead(503, {"Content-Type": "text/plain"});
      response.end("You're early!  Stream isn't up yet!");
    };
    
    if(this.stream === undefined) {
      noStream();
    } else {
      // assume that we have a client (we don't do the User-Agent check
      // mandated by the MS-WMSP spec, on account of it being just
      // too douchey :P)
      const pragmaFields = hsp_util.getPragmaFields(req);
      const client_id = pragmaFields["client-id"] as string | undefined;

      const newSession = () => {
        const sess = new mmsh_client_session.MMSHClientSession(
          () => this.stream,
          (client_id: string) => (!(parseInt(client_id) in this.sessions))
        );
        this.sessions[sess.client_id] = sess;
        log.debug(`${c}/${this.short_name}`, "New client arrived from " + req.socket.remoteAddress + ", assigned client id: " + sess.client_id);
        sess.on("client", this.clientStartedStreaming.bind(this));
        sess.consumeRequest(req, response);
      };
      
      if(client_id === undefined) {
        newSession();
      } else {
        const sess = this.sessions[client_id];
        if(sess === undefined) {
          // client sent me an unknown client ID
          log.warn(`${c}/${this.short_name}`, "Client with an unknown client ID showed up");
          newSession();
        } else {
          //log.debug(c, "Delegating client with ID '" + client_id + " ', arriving from address '" + req.socket.remoteAddress + "' to existing session.");
          sess.consumeRequest(req, response);
        }
      }
    }
    return;
  }
}
