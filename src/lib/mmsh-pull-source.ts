// TypeScript migration of mmsh-pull-source.js
// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

import * as url from 'url';
import * as http from 'http';
import * as dns from 'dns';
import * as net from 'net';
import * as util from 'util';
import { EventEmitter } from 'events';
import { MMSHStream } from './mmsh-stream';
import * as log from './logging';
import * as hsp_util from './util';

const c = "MMSHPullSource";

interface HttpParams {
  host: string;
  port: string | number;
  path: string;
  headers?: Record<string, string>;
}

export class MMSHPullSourceAttempt extends EventEmitter {
  private http_client: http.ClientRequest;

  constructor(private http_params: HttpParams) {
    super();

    if(hsp_util.config.use_http_proxy) {
      // we have to look up the host they've given us to find out if it is appropriate to use the proxy
      if(net.isIPv4(http_params.host)) {
        // we know already
        this.initiateWithProxyIfAppropriate(http_params.host);
      } else {
        // gotta look it up
        log.debug(c, "Looking up address for pull source: " + http_params.host);
        dns.lookup(http_params.host, 4, (err, address, family) => {
          if(err === null) {
            log.debug(c, "Got address for pull source: " + address);
            this.initiateWithProxyIfAppropriate(address);
          } else {
            this.onError("Couldn't look up pull source hostname: " + err);
          }
        });
      }
    } else {
      this.initiate(http_params.path, http_params.host, http_params.port);
    }
  }

  onError(e: string | Error): void {
    log.error(c, "Error making request: " + e);
    this.close();
  }

  close(): void {
    if (this.http_client) {
      this.http_client.end();
    }
    this.emit("done");
  }

  /**
   * Initiate the HTTP client connection, with a specified hostname and port to connect to
   */
  initiate(path: string, connect_host: string, connect_port: string | number): void {
    const options = {
      hostname: connect_host,
      port: connect_port,
      path: path,
      method: 'GET',
      headers: this.http_params.headers || {}
    };

    const req = http.request(options);
    this.http_client = req;

    req.on("error", this.onError.bind(this));

    req.once('response', (res) => {
      console.log("got result! " + util.inspect(res.headers));
      const stream = new MMSHStream(res, true);
      stream.on("done", () => {
        log.warn(c, "MMSH stream terminated!");
        this.close();
      });
      // stream.on("all", function(packet, repacked) {
      //     log.debug(c, "First 16 bytes: " + util.inspect(packet.payload.slice(0, 16)));
      // });
      stream.on("ready", () => {
        log.info(c, "Pulled stream has become ready, informing owner MMSHHandler!");
        this.emit("ready", stream);
      });
      // res.on('data', function(chunk) {
      //   console.log("Got " + chunk.length + " bytes of data.");
      // });
    });

    req.on('error', (e) => {
      this.onError(e);
    });

    req.on('close', (graceful) => {
      this.onError(graceful ? "closed gracefully" : "closed ungracefully");
    });

    // Set timeout
    setTimeout(() => {
      this.onError("Closing pull request due to timeout; I'm not receiving data.");
    }, 15000);

    req.setHeader("User-Agent", "NSPlayer");
    req.setHeader("Pragma", "xPlayStrm=1");

    req.end();
  }

  /**
   * The proxy setting is turned on, but we need to validate if the address I want to reach
   * is appropriate to use the proxy for. If so, connect with the proxy.
   */
  initiateWithProxyIfAppropriate(address: string): void {
    if(hsp_util.isLocalIP(address) && !(hsp_util.config.use_proxy_for_local_addresses)) {
      log.debug(c, "Pull Source address is local, bypassing proxy.");
      this.initiate(this.http_params.path, this.http_params.host, this.http_params.port);
    } else {
      log.debug(c, "Pull Source address is not local (or proxy forced), using proxy.");
      // HACK
      this.initiate(
        "http://" + this.http_params.host + ":" + this.http_params.port + this.http_params.path, 
        hsp_util.config.http_proxy_host, 
        hsp_util.config.http_proxy_port
      );
    }
  }
}

export class MMSHPullSource extends EventEmitter {
  private streaming: boolean = false;

  constructor(private http_params: HttpParams) {
    super();
    this.startNewAttempt();
  }

  startNewAttempt(): void {
    // wrap MMSHPullSource attempt and continually retry it
    log.info(c, "Attempting to connect to pull source...");
    const attempt = new MMSHPullSourceAttempt(this.http_params);
    
    attempt.once("ready", (stream) => {
      // excellent.
      if(this.streaming === true) {
        log.warn(c, "Whoa, MMSHPullSource became ready more than once? Broken.");
      }
      this.streaming = true;
      this.emit("ready", stream);
    });
    
    attempt.once("done", () => {
      // Attempt will return done even if it never went ready, but I don't want to leak that upstairs.
      if(this.streaming) {
        this.emit("done");
        this.streaming = false;
      }
      const variance = Math.random() * 10000;
      log.warn(c, "Stream ended or not connectable. Waiting 10 seconds (+" + (Math.floor(variance/1000)) + " of variance) before attempting to reengage.");
      setTimeout(this.startNewAttempt.bind(this), 10000 + variance);
    });
  }
}
