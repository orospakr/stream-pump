// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

const log = (level: string, component: string, message: string): void => {
    const d = new Date();
    console.log(`${level} (${(d.getTime() / 1000).toFixed(3)}): [${component}] ${message}`);
};

export const warn = (component: string, message: string): void => {
    log("WRN", component, message);
};

export const error = (component: string, message: string): void => {
    log("ERR", component, message);
};

export const info = (component: string, message: string): void => {
    log("INF", component, message);
};

export const debug = (component: string, message: string): void => {
    log("DBG", component, message);
}; 