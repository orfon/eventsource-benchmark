var {AsynchronousSocketChannel, CompletionHandler} = java.nio.channels;
var {ByteBuffer} = java.nio;
var {InetSocketAddress} = java.net;
var {JavaEventEmitter} = require('ringo/events');

var BUFFER_SIZE = 768;

// async read
function readAndDiscard(channel, options) {
   var buffer = ByteBuffer.allocate(BUFFER_SIZE);;
   var fakeCompletionHandler = {
         completed: function() {},
         failed: function() {}
   };
   var completionEmitter = JavaEventEmitter.call(fakeCompletionHandler, CompletionHandler, {
      'completed': 'completed',
      'failed': 'failed'
   });
   completionEmitter.on('completed', function(bytes) {
      if (bytes == -1) {
         return;
      }
      buffer.clear();
      readAndDiscard(channel, options);
   });
   completionEmitter.on('failed', function(exception) {
      //console.error('Channel read failure', exception);
   });
   channel.read(buffer, null, completionEmitter.impl);
};

function writeHTTPRequest(channel, options) {
   var handshake = "";
   handshake += "GET " + options.path + " HTTP/1.1\r\n";
   handshake += "Host: " + options.host + ":" + options.port + "\r\n";
   handshake += "Accept: text/event-stream\r\n";
   handshake += "\r\n"
   var bytes = ByteBuffer.wrap(String(handshake).toByteArray('utf-8'));
   channel.write(bytes).get();
}

function startChannel(options) {
   var channel = AsynchronousSocketChannel.open();
   channel.connect(new InetSocketAddress(options.host, options.port)).get();
   writeHTTPRequest(channel, options);
   readAndDiscard(channel, options);

   if (options.failure > 0) {
      // shut down this channel after a while?
      if (Math.random() < (options.failure/100)) {
         setTimeout(function() {
            channel.close();
            startChannel(options);
         }, options.failuretime * Math.random() + (options.failuretime / 2) * 1000);
      }
   }
}

function onmessage(event) {
   var options = event.data;

   for (var i=0; i < options.connections; i++) {
      startChannel(options);
   }
}

