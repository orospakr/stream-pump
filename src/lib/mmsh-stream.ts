// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

import * as stream from './stream';
import { MMSHDemuxer, MMSHPacket } from './mmsh-demuxer';
import * as log from './logging';
import { EventEmitter } from 'events';

const c = "MMSHStream";

// This interface extends the MMSHPacket interface from mmsh-demuxer
// to include the properties we need in MMSHStream
interface Packet extends MMSHPacket {
    name: string;
    payload?: Buffer;
    repackWithPreheader: (sequenceNumber?: number) => Buffer;
}

/**
 * MMSHStream - Stream of Windows Media HTTP Streaming Protocol format (MS-WMSP)
 *
 * I only explicitly support HTTP 1.1 with chunked encoding (ie., I require version11-enabled)
 * I only support push streams at the moment; I don't do pulling yet (although I will!)
 */
export class MMSHStream extends stream.Stream {
    private header: Packet | undefined;
    private data_sequence_number: number;
    private _done: boolean;
    private demuxer: MMSHDemuxer;

    constructor(strm: any, includes_preheaders: boolean) {
        super();
        this.header = undefined;
        this.data_sequence_number = 0;
        this._done = false;

        this.demuxer = new MMSHDemuxer(
            strm, 
            includes_preheaders, 
            (packet: MMSHPacket) => {
                // Cast the packet to our extended Packet interface
                const mmshPacket = packet as unknown as Packet;
                
                // packet
                if(this._done) {
                    return;
                }
                let repacked_data: Buffer | undefined = undefined;
                if(mmshPacket.name === "Header") {
                    // don't allow header to be changed twice
                    if(this.header !== undefined) {
                        log.warn(c, "What?  Received another header?!");
                    }
                    this.header = mmshPacket;
                    repacked_data = mmshPacket.repackWithPreheader();
                    this.emit("ready", mmshPacket, repacked_data);
                } else if (mmshPacket.name === "Data") {
                    // log.debug(c, "Repacking data with preheader");
                    repacked_data = mmshPacket.repackWithPreheader(this.data_sequence_number++);
                } else if (mmshPacket.name === "End of Stream") {
                    this.done();
                } else {
                    log.warn(c, "I need to repack (or do I?) a packet type that I don't know how to repack yet for: " + mmshPacket.name);
                }
                this.emit(mmshPacket.name, mmshPacket, repacked_data);
                this.emit("all", mmshPacket, repacked_data);

                // console.log("First 16 bytes: " + util.inspect(packet.payload.slice(0, 16)));
            }, 
            (e: Error) => {
                // error :(
                log.warn(c, "Stream has ended: " + e);
                this.done();
            }
        );
    }

    done(): void {
        if(this._done) {
            return;
        }
        this.emit("done");
        this._done = true;

        // hopefully this will help avoid an object island
        this.demuxer = undefined;
    }

    isHeaderAvailable(): boolean {
        return(this.header !== undefined);
    }

    getHeader(): Packet | undefined {
        return(this.header);
    }
} 