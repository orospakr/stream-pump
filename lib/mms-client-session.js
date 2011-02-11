/**
  * Track the session state of a client (keyed on the client-id field)
  * stream: the stream that this client will be receiving video from (I'm not going to try to handle on the fly stream changes for now).  This Stream is expected to be active.
  * TODO should probably take a closure that I guarantee I invoke when I am done and need to be cleaned up
  */
module.exports.MMSClientSession = function(stream, verifyIsIDUnique) {
    this.client_id = 0;
    do {
	this.client_id = Math.floor(Math.random() * 4294967295);
    } while(!verifyIsIDUnique(this.client_id));

    this.consumeRequest = function(req, response) {
	var header_bin = stream.header.repackWithGoofyHeader();
	// TODO handle the Stream is not writable error here, just in case
	response.writeHead(200, {"Server": "Rex/12.0.7600.16385",
				 "Content-Type": "application/vnd.ms.wms-hdr.asfv1",
				 "Content-Length": header_bin.length + "",
				 "Pragma": "no-cache,client-id=" + this.client_id + ",features=\"broadcast,playlist\",pipeline-experiment=1,xResetStrm=1",
				 "Supported": "com.microsoft.wm.srvppair, com.microsoft.wm.sswitch, com.microsoft.wm.predstrm,com.microsoft.wm.fastcache, com.microsoft.wm.startupprofile"});
	response.end(header_bin);
    };
};
