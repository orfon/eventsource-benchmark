var {AsynchronousSocketChannel, CompletionHandler} = java.nio.channels;
var {ByteBuffer} = java.nio;
var {InetSocketAddress} = java.net;
var {JavaEventEmitter} = require('ringo/events');

var BUFFER_SIZE = 768;

// async read
function readAndDiscard(channel) {
   // allocate is expensive
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
      //console.log(java.lang.Thread.currentThread().getName() + " READ " + bytes);
      buffer.clear();
      readAndDiscard(channel);
   });
   completionEmitter.on('failed', function(exception) {
      //console.error('Channel read failure', exception);
   });
   channel.read(buffer, null, completionEmitter.impl);
   //console.log('Channel connected and waiting for read');
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

var channels = [];
function onmessage(event) {
   var options = event.data;

   for (var i=0; i < options.connections; i++) {
      var channel = AsynchronousSocketChannel.open();
      channel.connect(new InetSocketAddress(options.host, options.port)).get();
      channels.push(channel);
      writeHTTPRequest(channel, options);
      readAndDiscard(channel);
   }
}

