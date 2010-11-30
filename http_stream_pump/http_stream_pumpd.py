#!/usr/bin/env python

from twisted.web2 import server, resource, stream, http, http_headers, responsecode, channel, log as weblog
from twisted.internet import reactor, defer
from twisted.python import log
import sys

import logging

def pretty_request(request):
    result = ""
    result += "%s\n" % (repr(request))
    result += ".. %s\n" % (repr(request.getAllHeaders()))
    result += ".. %s\n" % (repr(request.content.getvalue()))
    return result

def is_header_set_to(request, header, value):
    answer = False
    found = request.headers.getRawHeaders(header)
    if(found is None):
        return False
    for h in found:
        if(h == value):
            answer = True
    return answer

# class Root(resource.Resource):
#     def render(self, request):
#         logging.debug("Got request on root")
#         string = "<html>Root!</html>"
#         return http.Response(responsecode.OK,
#                              {'content-type': http_headers.MineType('text', 'html')}, string)


class WMSPushStreamResource(resource.PostableResource):
    def http_POST(self, request):
        """
        Overloads the herp derp version in web2's resource that fucks up on anything that has
        a non-typical MIME type.

        We don't want to use the argument-parsing from formencoded feature.
        """
        d = defer.succeed(None)
        d.addCallback(lambda res: self.render(request))
        return d

    def render(self, request):
        if is_header_set_to(request, "Content-Type", "application/x-wms-pushsetup"):
            # check if already set up, otherwise...
            logging.debug("Got WMS setup pushsetup request!")
            answer = http.Response(204, {}, "")
            answer.headers.setRawHeaders("Supported", ["com.microsoft.wm.srvppair, com.microsoft.wm.sswitch, com.microsoft.wm.predstrm, com.microsoft.wm.fastcache, com.microsoft.wm.startupprofile"])
            answer.headers.setRawHeaders("Set-Cookie", ["push-id=4242424"])
            answer.headers.setRawHeaders("Server", ["Cougar/9.6.7600.16564"])
            answer.headers.setRawHeaders("Cache-Control", ["no-cache"])
            return answer
        elif is_header_set_to(request, "Content-Type", "application/x-wms-pushstart"):
            logging.debug("A WMS push stream is beginning!")

        return http.Response(422, {}, "")
            
class Base(resource.Resource):
    # def __init__(self):
    #     resource.Resource.__init__(self)
    #     self.r = Root()
    #     self.wms = WMSPushStreamResource()

    addSlash = True

    child_wms = WMSPushStreamResource()

    # def getChild(self, name, request):
    #     logging.error(pretty_request(request))
    #     if(name == ""):
    #         return self.r
    #     if(name == "mystream"):
    #         return self.wms
    #     else:
    #         logging.debug("404'd!")
    #         return resource.NoResource()

    def render(self, request):
        logging.debug("Got request")
        string = "<html>Root!</html>"
        return http.Response(responsecode.OK,
                             {'content-type': http_headers.MimeType('text', 'html')}, string)

if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    res = Base()
    site = server.Site(weblog.LogWrapperResource(res))
    weblog.DefaultCommonAccessLoggingObserver().start()
    log.startLogging(sys.stderr)

    chan = channel.HTTPFactory(site)
    reactor.listenTCP(8086, chan)
    reactor.run()
