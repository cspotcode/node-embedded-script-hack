// This is a human-readable version of the embedded bootstrapper script.
// The actual embedded code is in bootstrap.min.js, which is hand-minified based on this file. (I'm sure that could be automated in the future)

if(true){
// Read the script blob from the end of node's binary
////
const startOffset = STARTOFFSETGOESHERE; // size of node's binary before appending script blob
////
const fs = NativeModule.require('fs');
const path = NativeModule.require('path');
const nodePath = process.argv[0];
const fd = fs.openSync(nodePath, 'r');
const fileLength = fs.statSync(nodePath).size;
const codeBuffer = new Buffer(fileLength - startOffset);
fs.readSync(fd, codeBuffer, 0, fileLength - startOffset, startOffset);
const code = codeBuffer.toString('utf8');

// Create and execute a main module from that blob of code
const Module = NativeModule.require('module');
const module = new Module(nodePath, null);
process.mainModule = module;
module.id = '.';
Module._cache[nodePath] = module;
// Mimic `module.load(nodePath);` below:
module.filename = nodePath;
module.paths = Module._nodeModulePaths(path.dirname(nodePath));
// Mimic `Module._extensions[extension](this, nodePath);` below:
module._compile(code, nodePath);
module.loaded = true;
}else if(false){// Relies on the embedded bootstrapper script being the correct length to end in the middle of a comment.