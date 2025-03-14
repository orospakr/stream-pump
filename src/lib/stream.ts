// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

import { EventEmitter } from 'events';
import { HttpRequest, HttpResponse } from './types';

/**
 * Stream - Configured Ongoing Stream
 *
 * A Stream is a configured session that should receive streaming content from upstream
 * and make it available to clients.
 *
 * HTTP requests coming in on their configured path should be delegated to an instance
 * of this stream object.
 *
 * They are usually configured ahead of time.  Derivatives of this object implement
 * different streaming protocols.
 */
export class Stream extends EventEmitter {
    constructor() {
        super();
    }

    consumeRequest(req: HttpRequest, response: HttpResponse): void {
        console.log("Implement me!");
    }
} 