// TypeScript migration of mmsh-demuxer.js
// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

import * as assert from 'assert';
import { Readable } from 'stream';
import * as strtok from 'strtok';

import * as log from './logging';
import { EndOfStreamPacket } from './mmsh-packet';

const c = "MMSHDemuxer";

// Define interfaces for packet types
export interface MMSHPacket {
  consumeToken(field: any): any;
  inspect(): string;
}

// MMSH Framing Demuxer
export class MMSHDemuxer {
  private packet_cbs: Array<(packet: MMSHPacket) => void>;
  private fields_parsed: number;
  private current_packet?: MMSHPacket;
  private includes_preheaders: boolean;

  constructor(
    stream: Readable,
    includes_preheaders: boolean,
    packetHandler: (packet: MMSHPacket) => void,
    errorHandler: (error: Error | string) => void
  ) {
    this.packet_cbs = [];
    this.fields_parsed = 0;
    this.includes_preheaders = includes_preheaders;

    // Add the packet handler to the callbacks
    this.whenPacketReceived(packetHandler);

    // Start the parsing pipeline
    strtok.parse(stream, this.consumeToken.bind(this));
  }

  // Submit a callback to be fired once an MMSH packet has been completely received
  public whenPacketReceived(cb: (packet: MMSHPacket) => void): void {
    this.packet_cbs.push(cb);
  }

  /**
   * Strtok handler function; receives and asks for tokens.
   * Responsible for detecting the magic number, B-bit (immediate followup),
   * and Packet Type fields.
   * Once it has those, it delegates to the appropriate MMSHPacket object
   */
  private consumeToken(field: any): any {
    // do we have the first four bytes of the packet header yet?
    // if so, we know how much data we can expect.
    // if(this.currentPacket.downloaded < 4) {
    //     // okay, we want to make sure that we've loaded
    // }

    if (this.fields_parsed === 0) {
      // strtok always begins the sequence with undefined
      assert.ok(field === undefined);
      this.fields_parsed = 1;
      return strtok.UINT8;
    } else if (this.fields_parsed === 1) {
      if (field !== 0x24) {
        // TODO check for the immediate-continuation field, "B"
        log.warn(c, "Not a valid MMSH packet, has wrong magic field!");
        throw new Error("Not a valid MMSH packet, has wrong magic field!");
      }
      this.fields_parsed = 2;
      return strtok.UINT8;
    } else if (this.fields_parsed === 2) {
      this.fields_parsed = 3;
      let Tipe: any = undefined;
      
      // In the simplified version, we only have EndOfStreamPacket implemented
      // Other packet types would need to be implemented in mmsh-packet.ts
      switch (field) {
        case 0x45: // $E
          Tipe = EndOfStreamPacket;
          break;
        default:
          log.warn(c, `I don't support MMSH packet type #${field} yet!`);
          throw new Error(`I don't support MMSH packet type #${field} yet!`);
      }
      
      // Create the packet with the appropriate callbacks
      this.current_packet = new Tipe(
        this.includes_preheaders,
        () => {
          // Success callback
          if (this.current_packet) {
            log.debug(c, `Packet: ${this.current_packet.inspect()}`);
            this.packet_cbs.forEach((cb) => {
              cb(this.current_packet!);
            });
          }
          
          // Reset for next packet
          this.fields_parsed = 1;
          this.current_packet = undefined;
        },
        () => {
          // Error callback
          log.error(c, "Problem reconstituting packet!");
          throw new Error("Problem reconstituting packet!");
        }
      );
      
      return strtok.UINT16_LE;
    } else if (this.fields_parsed === 3 && this.current_packet) {
      // now delegating to MMSHPacket!
      return this.current_packet.consumeToken(field);
    } else {
      assert.fail();
      return strtok.DONE;
    }
  }
}

