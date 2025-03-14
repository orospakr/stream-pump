// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

/* Various handy utility functions */

import * as net from 'net';
import * as strtok from 'strtok';
import { Config, HttpRequest } from './types';

// Global config reference
let _config: Config = null;
export const getConfig = (): Config => _config;
export const setConfig = (config: Config): void => { _config = config; };

const toHex = (v: number, l: number): string => {
    let r = v.toString(16);
    while(r.length < (l*2)) {
        r = "0" + r;
    }
    return r;
};

/* Read GUIDs from a Buffer, arranged such that strtok will like it.
   Well, at least the way Microsoft encodes them. */
export const GUID = {
    len: 16,
    get: function(buf: Buffer, off: number): string {
        const d1 = strtok.UINT32_LE.get(buf, 0);
        const d2 = strtok.UINT16_LE.get(buf, 4);
        const d3 = strtok.UINT16_LE.get(buf, 6);
        const d4 = strtok.UINT16_BE.get(buf, 8);
        const d5_1 = strtok.UINT16_BE.get(buf, 10);
        const d5_2 = strtok.UINT16_BE.get(buf, 12);
        const d5_3 = strtok.UINT16_BE.get(buf, 14);
        return (toHex(d1, 4) + "-" + toHex(d2, 2) + "-" + toHex(d3, 2) + "-" + toHex(d4, 2) + "-" + toHex(d5_1, 2) + toHex(d5_2, 2) + toHex(d5_3, 2)).toUpperCase();
    }
};

export const getPragmaFields = (req: HttpRequest): Record<string, string | boolean> => {
    const f = req.headers["Pragma"] || req.headers["pragma"];
    const r: Record<string, string | boolean> = {};
    if(f === undefined) {
        return r;
    }
    (f.split(",")).forEach((p: string) => {
        const cleaned = p.replace(/^\s+|\s+$/g, ''); // clean whitespace
        const pair = cleaned.split('=');
        if(pair[1] === undefined) {
            r[pair[0]] = true;
        } else {
            r[pair[0]] = pair[1];
        }
    });
    return r;
};

// Bleaugh.  TODO This is kind of terrible.
// I wish you could get a real numerical address type in node. that would
// make things less ugly.
// Used for HTTP proxy policy.
export const isLocalIP = (addr: string): boolean => {
    if(net.isIPv4(addr)) {
        const octets = addr.split(".");
        if(octets[0] === "127") {
            return true;
        }
        if(octets[0] === "172" && octets[1] === "16") {
            // um, this test isn't exactly correct, since I'm doing it at the
            // octet level. the netmask is actually /12.  sorry...
            return true;
        }
        if(octets[0] === "192" && octets[1] === "168") {
            return true;
        }
        if(octets[0] === "10") {
            return true;
        }
        if(octets[0] === "169" && octets[1] === "254") {
            return true;
        }
        return false;
    } else {
        return false;
    }
};

// For backward compatibility
export const config = {
    get use_http_proxy() { return _config?.use_http_proxy; },
    get http_proxy_host() { return _config?.http_proxy_host; },
    get use_proxy_for_local_addresses() { return _config?.use_proxy_for_local_addresses; },
    get http_proxy_port() { return _config?.http_proxy_port; },
    get redirect_404_to() { return _config?.redirect_404_to; },
}; 