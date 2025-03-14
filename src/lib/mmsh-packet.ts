// HTTP Stream Pump - HTTP live video stream reflector written in Node.js
// Copyright (C) 2010-2011  Government of Canada
// Written by Andrew Clunis <aclunis@credil.org>
// See COPYING for license terms.

// This is a simplified version of the mmsh-packet module with just the necessary exports
// A full conversion would require more work

export class EndOfStreamPacket {
  public reason: number = 0;
  
  constructor(includes_preheaders?: boolean, successCallback?: () => void, errorCallback?: () => void) {
    // Call success callback if provided
    if (successCallback) {
      successCallback();
    }
  }
  
  repackWithPreheader(): Buffer {
    // This is a simplified implementation
    return Buffer.alloc(0);
  }
  
  inspect(): string {
    return `EndOfStreamPacket (reason: ${this.reason})`;
  }
  
  consumeToken(field: any): any {
    // Simplified implementation
    return null;
  }
} 