const fs = require('fs');
const yargs = require('yargs');
const assert = require('assert');

const opts = yargs.argv;
const {script, node, out} = opts;

const scriptContents = script ? fs.readFileSync(script) : undefined;

// Find out where to inject our bootstrapper
let nodeContent = fs.readFileSync(node);
const nodeSize = nodeContent.length;
const injectionPositionMarker = new Buffer(
`    // There are various modes that Node can run in. The most common two
    // are running from a script and running the REPL - but there are a few
    // others like the debugger or running --eval arguments. Here we decide
    // which mode we run in.`);
const injectionPosition = nodeContent.indexOf(injectionPositionMarker);
nodeContent = undefined;
assert(injectionPosition >= 0);

let bootstrapCode = fs.readFileSync(require.resolve('./bootstrap.min'), 'utf8');
bootstrapCode = bootstrapCode
.replace(/^\/\/\/\/[\s\S]*?\/\/\/\//m,
`const startOffset=${nodeSize};`)
// .replace(/\n/g, '');
const bootstrapBuffer = new Buffer(bootstrapCode, 'utf8');

const nodeInFd = fs.openSync(node, 'r');
const outFd = fs.openSync(out, 'w');
// write before the bootstrap
{
    const b = new Buffer(injectionPosition);
    fs.readSync(nodeInFd, b, 0, injectionPosition, 0);
    fs.writeSync(outFd, b);
}
// write the bootstrap
fs.writeSync(outFd, bootstrapBuffer);
// write everything after the bootstrap
{
    const b = new Buffer(nodeSize - injectionPosition - bootstrapBuffer.length);
    console.log(bootstrapBuffer.length);
    fs.readSync(nodeInFd, b, 0, b.length, injectionPosition + bootstrapBuffer.length);
    fs.writeSync(outFd, b);
}
// Append embedded script
if(scriptContents) {
    fs.writeSync(outFd, scriptContents);
}
fs.closeSync(outFd);
fs.closeSync(nodeInFd);
