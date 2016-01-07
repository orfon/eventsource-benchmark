// Simple event source server demo
var arrays = require("ringo/utils/arrays");
var strings = require('ringo/utils/strings');
var {EventSource, isEventSourceRequest} = require("ringo/jsgi/eventsource");
var {Parser} = require('ringo/args');
var system = require('system');
var {Server} = require("ringo/httpserver");

var parser = new Parser();
parser.addOption('h', 'host', 'IP', 'Server host IP or domain name (default localhost)');
parser.addOption('p', 'port', 'PORT', 'Server port (default 8080)');
parser.addOption('s', 'size', 'CHARACTERS', 'Payload message size (default 11)');

var connections = module.singleton('connections', function() {
   return new java.util.concurrent.ConcurrentLinkedQueue();
});

exports.jsgiApp = function jsgiApp(req) {
      var eventSource = new EventSource(req);
      eventSource.start({
         'Access-Control-Allow-Origin': '*'
      });
      connections.add(eventSource);
      return eventSource.response;
};

function doPing() {
    console.info("Sending ping to all ", connections.size() ,"connections");
    connections.toArray().forEach(function(eventSource) {
        try {
           eventSource.data(msgPayload);
        } catch (e) {
           connections.remove(eventSource);
        }
    });
}

var msgPayload = "Hello World";
if (require.main == module) {
   var options = parser.parse(system.args.slice(1));
   msgPayload = strings.repeat('X', options.size);
   var server = new Server({
      host: options.host || '127.0.0.1',
      port: options.port || '8080',
      appModule: module.id,
      appName: 'jsgiApp'
   });
   server.start();
   setInterval(doPing, 2 * 1000);
}