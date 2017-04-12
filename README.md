# node-embedded-script-hack
Hacky idea to embed scripts into the node executable without rebuilding it from source.

Node's binary can be rebuilt from source to include arbitrary script files.  (lots of node's core modules are implemented this way)
Therefore you can create a single binary that executes your own scripts; perhaps a CLI tool or something else.

What if we could create such an embedded bundle from the CLI without rebuilding node from source?  E.g. download the node binary from nodejs.org and append a blob of JS to the end of it.

Here's a tool that does that.

## Quick usage

```
node ./cli.js --node <path to node binary> --script <path to js script to be embedded> --out <output file with embedded script>
```

For example, on bash:

```
node ./cli.js --node `which node` --script ./sample-embeddable-script.js --out helloworld
helloworld
```

...or on Windows Powershell:

```
node ./cli.js --node (command node).source --script sample-embeddable-script.js --out helloworld.exe
./helloworld
```

the `--script` flag is optional.  If you omit it, you'll get a node binary that does nothing but can have a script appended to it later.  For example:

```
node ./cli.js --node node --out embeddable-node

./embeddable-node
# Does nothing

cat sample-embeddable-script.js >> embeddable-node

./embeddable-node
# Prints "Hello from node.js!"
```

## TODOs / Gotchas

This was tested with node v7.8.0.  YMMV on other version.

node CLI flags still take effect.  For example `--version` will not run the embedded script; it'll show node's version number.  To reliably pass CLI arguments to your node script, the first argument has to be a string that doesn't begin with '-'.  For example `my-executable " " --actual-arg --another-arg`

Will the embedded script play nice with forking / clustering?  Probably not without special thought.

-------------

# Old Notes:

*Below this point are older notes I wrote when this was only an idea I had not implemented yet.*

--------------

Here's how I think it can work:

```bash
# Compile your project into a single blob of JS by using some sort of bundler
webpack
# Append that blob onto the node executable
cat my-bundled-scripts.js >> node
# TODO hack the executable to load and invoke our appended code
```

Next we need to muck with Node's binary to load and run our blob of code as the main module.  Fortunately JavaScript source code is embedded in the binary verbatim, so using a hex editor we can find it easily.

I think this is a good entry point:
https://github.com/nodejs/node/blob/master/lib/internal/bootstrap_node.js#L67

```js
// Embed the following script into the node binary, overwriting parts of node's lib/internal/bootstrap_node.js
{
  // Read the script blob from the end of node's binary
  const startOffset = TODO; // size of node's binary before appending script blob
  const fs = NativeModule.require('fs');
  const nodePath = process.argv[0];
  const fd = fs.open(nodePath);
  const fileLength = fs.statSync(nodePath).size;
  const codeBuffer = new Buffer(fileLength - startOffset);
  fs.readSync(fd, codeBuffer, 0, fileLength - startOffset);
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
}
```

