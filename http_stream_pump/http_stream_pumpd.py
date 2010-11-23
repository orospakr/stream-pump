#!/usr/bin/env python

from twisted.web import server, resource
from twisted.internet import reactor

import logging

logging.basicConfig(level=logging.DEBUG)

def pretty_request(request):
    result = ""
    result += "%s\n" % (repr(request))
    result += ".. %s\n" % (repr(request.getAllHeaders()))
    result += ".. %s\n" % (repr(request.content.getvalue()))
    return result

def is_header_set_to(request, header, value):
    answer = False
    for h in request.requestHeaders.getRawHeaders(header):
        if(h == value):
            answer = True
    return answer

class Root(resource.Resource):
    isLeaf = True
    def render_GET(self, request):
        logging.debug("Got request")
        return "<html>Root!</html>"

class WMSPushStreamResource(resource.Resource):
    isLeaf = True
    def render_POST(self, request):
        if is_header_set_to(request, "Content-Type", "application/x-wms-pushsetup"):
            # check if already set up, otherwise...
            logging.debug("Got WMS setup pushsetup request!")
            request.setResponseCode(204) # no content
            request.responseHeaders.removeHeader("Server") # EE4 gets upset if it thinks it's talking to this thing called "TwistedWeb"...
            request.responseHeaders.addRawHeader("Server", "Cougar/9.6.7600.16564")
            request.responseHeaders.addRawHeader("Supported", "com.microsoft.wm.srvppair, com.microsoft.wm.sswitch, com.microsoft.wm.predstrm, com.microsoft.wm.fastcache, com.microsoft.wm.startupprofile")
            request.responseHeaders.addRawHeader("Cache-Control", "no-cache")
            request.responseHeaders.addRawHeader("Set-Cookie", "push-id=4242424")
            return ""
        elif is_header_set_to(request, "Content-Type", "application/x-wms-pushstart"):
            logging.debug("A WMS push stream is beginning!")
            

class Base(resource.Resource):
    def __init__(self):
        resource.Resource.__init__(self)
        self.r = Root()
        self.wms = WMSPushStreamResource()

    def getChild(self, name, request):
        logging.error(pretty_request(request))
        if(name == ""):
            return self.r
        if(name == "mystream"):
            return self.wms
        else:
            logging.debug("404'd!")
            return resource.NoResource()

    def render_GET(self, request):
        logging.debug("Got request")
        return "<html>Shouldn't see this!</html>"

site = server.Site(Base())
reactor.listenTCP(8086, site)
reactor.run()
