// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

import * as url from 'url';
import * as log from './logging';
import * as mmsh_handler from './mmsh-handler';
import * as mmsh_pull_source from './mmsh-pull-source';
import * as mmsh_push_source from './mmsh-push-source';
import { Config, StreamConfig, Handler, HttpRequest, HttpResponse } from './types';

const c = "Server";

export class Server {
    private handlers: Handler[] = [];

    constructor(private config: Config, streams: StreamConfig[]) {
        if (!streams || !Array.isArray(streams)) {
            log.warn(c, "No streams provided or streams is not an array");
            return;
        }

        streams.forEach((strm: StreamConfig) => {
            if(!(strm.enabled)) {
                return;
            }
            log.info(c, "Setting up stream: " + strm.name);
            const failure = (reason: string) => {
                log.error(c, "... unable to start stream (" + strm.name + "), because: " + reason);
            };

            if (!(strm.path.match(/^[a-zA-Z0-9_]*$/))) {
                failure("Specified stream path contains inappropriate characters: " + strm.path);
                return;
            }

            let r: Handler = { path: '', handler: null };
            if(strm.type === "mmsh_pull") {
                r.path = strm.path;
                r.source = new mmsh_pull_source.MMSHPullSource(strm.source_options);
                r.handler = new mmsh_handler.MMSHHandler(strm.path, r.source);
                this.handlers.push(r);
            } else if(strm.type === "mmsh_push") {
                r.path = strm.path;
                r.source = new mmsh_push_source.MMSHPushSource();
                r.handler = new mmsh_handler.MMSHHandler(strm.path, r.source);
                this.handlers.push(r);
                // add an extra handler for the push source
                this.handlers.push({path: strm.path + "_push", handler: r.source});
            } else {
                log.error(c, "Unknown source type: " + strm.type);
                return;
            }
        });

        if(this.handlers.length === 0) {
            log.warn(c, "No streams have been configured.  Idle...");
        }
    }

    consumeRequest(req: HttpRequest, response: HttpResponse): void {
        const pathname = url.parse(req.url).pathname;

        log.debug(c, req.method + " " + pathname + " (from: " + req.socket.remoteAddress + ")");
        // + util.inspect(req.headers));

        let hit_handler = false;
        this.handlers.forEach((handler: Handler) => {
            const regex_str = "^\\/streams\\/" + handler.path + "(\\/$|$)";
            if(pathname.match(new RegExp(regex_str, "i"))) {
                handler.handler.consumeRequest(req, response);
                hit_handler = true;
            }
        });

        if(!hit_handler) {
            if(this.config.redirect_404_to !== undefined) {
                response.writeHead(302, {"Location": this.config.redirect_404_to });
                response.end();
            } else {
                response.writeHead(404, {"Content-Type": "text/html"});
                response.end("Sorry, nothing here!");
                log.warn(c, "404'd: Attempt to fetch " + pathname);
            }
            
            return;
        }
    }
} 