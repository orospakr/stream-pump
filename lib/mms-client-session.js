/**
  * Track the session state of a client (keyed on the client-id field)
  * stream: the stream that this client will be receiving video from (I'm not going to try to handle on the fly stream changes for now)
  */
module.exports.MMSClientSession = function(stream, verifyIsIDUnique) {
    this.client_id = 0;
    do {
	this.client_id = Math.floor(Math.random * 4294967295);
    } while(!verifyIsIDUnique(this.client_id));

    this.consumeRequest = function(req, response) {

	var header_bin = header.repackWithGoofyHeader();
	// TODO handle the Stream is not writable error here, just in case
	response.writeHead(200, [["Server", "Rex/12.0.7600.16385"], ["Content-Type", "application/vnd.ms.wms-hdr.asfv1"], ["Content-Length", header_bin.length + ""], ["Pragma", "no-cache"], ["Pragma", "client-id=23232323"], ["Pragma", "features=\"broadcast,playlist\""], ["Pragma", "pipeline-experiment=1"], ["Supported", "com.microsoft.wm.srvppair, com.microsoft.wm.sswitch, com.microsoft.wm.predstrm,com.microsoft.wm.fastcache, com.microsoft.wm.startupprofile"], ["Pragma", "xResetStrm=1"]]);
	
	response.end(header_bin);
    };
};
