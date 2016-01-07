var {Parser} = require('ringo/args');
var {Worker} = require('ringo/worker');
var system = require('system');

var parser = new Parser();
parser.addOption('h', 'host', 'IP', 'Server host IP or domain name (default localhost)');
parser.addOption('p', 'port', 'PORT', 'Server port (default 8080)');
parser.addOption(null, 'path', 'STRING', 'Path of request (default /)');
parser.addOption('t', 'threads', 'NUMBER', 'workers to start (default 10)');
parser.addOption('c', 'connections', 'NUMBER', 'connections per worker (default 10)')
parser.addOption('d', 'duration', 'SECONDS', 'how long the benchmark should run (default 60)')
parser.addOption('f', 'failure', 'PERCENT', 'Percent chance of connection getting closed (default 0)');
parser.addOption(null, 'failuretime', 'SECONDS', 'Seconds to failure = failturetime*RANDOM(0,1) + failturetime/2 ');
//parser.addOption(null, 'debug', null, 'Enable debug output')
var options = parser.parse(system.args.slice(1));

options.host = options.host || 'localhost';
options.port = options.port || '8080';
options.threads = options.threads || 10;
options.connections = options.connections || 5;
options.duration = options.duration || 60;
options.path = options.path || '/';
options.failure = parseInt(options.failure, 10) || 0;
options.failuretime = parseInt(options.failuretime, 10) || 60;

console.log('Benchmarking', options.host + ':' + options.port + options.path);
console.log(options.threads, 'worker threads with', options.connections, 'connections each for', options.duration, 'seconds');
if (options.failure > 0) {
   console.log(options.failure, '% chance of failure per connection after ~', options.failuretime/2, 'seconds');
}

var workers = [];
for (var i = 0; i < options.threads; i++) {
   workers.push(new Worker(module.resolve('./client-worker')));
}

workers.forEach(function(worker) {
   worker.onerror = function(event) {
      console.dir(event.data);
   };
   worker.postMessage(options);
});

setTimeout(function() {
   workers.forEach(function(w) {
      w.terminate();
   })
}, options.duration * 1000);