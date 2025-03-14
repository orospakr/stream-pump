// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

import * as http from 'http';
import { EventEmitter } from 'events';
import { MMSHStream } from './mmsh-stream';
import { MMSHPacket } from './mmsh-demuxer';
import * as log from './logging';

interface MMSHClientOptions {
  host: string;
  port: number;
  path: string;
  headers?: Record<string, string>;
}

// Extend the MMSHPacket interface with the properties we need
interface ExtendedPacket extends MMSHPacket {
  name: string;
  payload?: Buffer;
  repackWithPreheader: (sequenceNumber?: number) => Buffer;
}

/**
 * "Pull" a video stream from a live MMSH server.
 */
export class MMSHClient extends EventEmitter {
  private stream?: MMSHStream;
  private request?: http.ClientRequest;
  private options: MMSHClientOptions;

  /**
   * Create a new MMSH client to pull a stream from a server
   * @param host The hostname of the MMSH server
   * @param port The port of the MMSH server
   * @param path The path to the stream on the server
   * @param headers Optional additional headers to send with the request
   */
  constructor(host: string, port: number, path: string, headers?: Record<string, string>) {
    super();
    
    this.options = {
      host,
      port,
      path,
      headers
    };
  }

  /**
   * Connect to the MMSH server and start receiving the stream
   */
  connect(): void {
    const options = {
      host: this.options.host,
      port: this.options.port,
      path: this.options.path,
      headers: {
        'User-Agent': 'NSPlayer',
        'Pragma': 'xPlayStrm=1',
        ...this.options.headers
      }
    };

    this.request = http.request(options, (response) => {
      log.debug('MMSHClient', `Connected to stream: ${JSON.stringify(response.headers)}`);
      
      // Create the MMSHStream with the HTTP response
      // The second parameter is includes_preheaders (false for client streams)
      this.stream = new MMSHStream(response, false);
      
      // Set up event handlers for the stream
      // MMSHStream extends EventEmitter through the Stream class
      
      // Forward the 'all' event to our own 'packet' event
      this.setupStreamEventHandler('all', (packet: ExtendedPacket, repacked: Buffer) => {
        this.emit('packet', packet, repacked);
        
        if (packet.payload) {
          this.emit('data', packet.payload);
        }
      });
      
      // Forward the 'done' event to our own 'end' event
      this.setupStreamEventHandler('done', () => {
        this.emit('end');
      });
      
      // Forward any errors
      this.setupStreamEventHandler('error', (error: Error) => {
        this.emit('error', error);
      });
      
      this.emit('connect', this.stream);
    });

    this.request.on('error', (error) => {
      this.emit('error', error);
    });

    this.request.end();
  }
  
  /**
   * Helper method to set up event handlers for the stream
   * This is a workaround for TypeScript not recognizing the 'on' method on MMSHStream
   */
  private setupStreamEventHandler(event: string, handler: (...args: any[]) => void): void {
    if (this.stream) {
      // Use EventEmitter.prototype.on to add the event handler
      EventEmitter.prototype.on.call(this.stream, event, handler);
    }
  }

  /**
   * Close the connection to the MMSH server
   */
  close(): void {
    if (this.request) {
      this.request.abort();
      this.request = undefined;
    }
    
    if (this.stream) {
      // Call the done method
      this.stream.done();
      this.stream = undefined;
    }
    
    this.emit('close');
  }
} 