# node-embedded-script-hack
Hacky idea to embed scripts into the node executable without rebuilding it from source.

Node's binary can be rebuilt from source to include arbitrary script files.  (lots of node's core modules are implemented this way)
Therefore you can create a single binary that executes your own scripts; perhaps a CLI tool or something else.

What if we could create such an embedded bundle from the CLI without rebuilding node from source?  E.g. take the node binary from nodejs.org and append a blob of JS to the end of it.

Here's how I think it can work:

```
# Compile your project into a single blob of JS by using some sort of bundler
webpack
# Append that blob onto the node executable
cat my-bundled-scripts.js >> node
# TODO hack the executable to load and invoke our appended code
```

Next we need to muck with Node's binary to load and run our blob of code as the main module.  Fortunately JavaScript source code is embedded in the binary verbatim, so using a hex editor we can find it easily.

I think this is a good entry point:
https://github.com/nodejs/node/blob/master/lib/internal/bootstrap_node.js#L67

```
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

# TODOs / Gotchas

Will the embedded script play nice with forking / clustering?  Probably not without special thought.
