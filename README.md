# html-source-map-rebase

[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coverage percentage][coveralls-image]][coveralls-url]

Rebase your HTML assets relatively to the source file they were imported from.

## Example

Consider the following Twig sources:

index.twig

``` html
<img src="./foo.png">

{% include "partials/bar.twig" %}
```

partials/bar.twig

``` html
<img src="../bar.png">
```

By rebasing the assets relatively to the file they were imported from, the resulting HTML would be:

``` html
<img src="foo.png">
<img src="bar.png">
```

## How it works

html-source-map-rebase uses the mapping provided by source maps to resolve the original file the assets where imported from. That's why it *needs* a source map to perform its magic. Any tool able to generate a source map from a source file is appropriate. Here is how one could use [Twing](https://www.npmjs.com/package/twing) and html-source-map-rebase together to render an HTML document and rebase its assets.

``` javascript
const {TwingEnvironment, TwingLoaderFilesystem} = require('twing');
const Readable = require('stream').Readable;
const through = require('through2');
const Rebaser = require('html-source-map-rebase');

let loader = new TwingLoaderFilesystem('src');
let twing = new TwingEnvironment(loader, {
  source_map: true
});

let html = twing.render('index.twig');

let rebaser = new Rebaser({
  map: twing.getSourceMap()
});

let data = '';
let stream = new Readable({
    encoding: 'utf8'
});

stream
  .pipe(rebaser)
  .pipe(through(function (chunk, enc, cb) {
    data += chunk;

    cb();
  }))
  .on('finish', function () {
    console.log(data); // data contains the rendered HTML with rebased assets
  })
;

stream.push(html);
stream.push(null);
```

## API

`let Rebaser = require('html-source-map-rebase')`

### rebaser = new Rebaser(opts={})

Return an object transform stream `rebaser` that expects entry filenames.

Optionally pass in some opts:

* opts.map:
  
    The belonging source map in the form of a JSON string. Defaults to `null`. Note that this module basically does nothing without a source map.

* opts.rebase:
    
    Handles when the rebaser encounters an asset that may need rebasing.
  
    * Type: `Function`
    * Default: `undefined`
    * Signature:
        * `url (Url)` - the [Url](https://nodejs.org/api/url.html) of the asset that may need rebasing.
        * `source (String)` - the path of the file the asset was imported from.
        * `done (Function)` - a callback function to invoke on completion. Accepts either `false`, `null`, `undefined` or an [Url](https://nodejs.org/api/url.html) as parameter. When called with `false`, the asset will not be rebased. When called with either `null` or `undefined`, the asset will be rebased using the [default rebasing logic](#rebasing-logic). When called with an Url, the asset will be rebased to that Url.

## <a name="rebasing-logic"></a>Rebasing logic

When html-source-map-rebase encounters an asset that may need rebasing, it first checks if it is a remote or a local asset. In the former case, the asset is not rebased at all. In the latter case, the asset is rebased be appending the asset path to the path of the source it's coming from.

For example, a `foo/bar.png` asset coming from `/lorem/ipsum/index.twig` would be rebased to `/lorem/ipsum/foo/bar.png`.

## Events

In addition to the usual events emitted by node.js streams, html-source-map-rebase emits the following events:

### rebaser.on('rebase', function(url) {})

Every time an asset is rebased, this event fires with the rebased [Url](https://nodejs.org/api/url.html).

## Installation

```bash
npm install html-source-map-rebase
```

## Contributing

* Fork the main repository
* Code
* Implement tests using [node-tap](https://github.com/tapjs/node-tap)
* Issue a pull request keeping in mind that all pull requests must reference an issue in the issue queue

## License

Apache-2.0 © [Eric MORAND]()

[npm-image]: https://badge.fury.io/js/html-source-map-rebase.svg
[npm-url]: https://npmjs.org/package/html-source-map-rebase
[travis-image]: https://travis-ci.org/ericmorand/html-source-map-rebase.svg?branch=master
[travis-url]: https://travis-ci.org/ericmorand/html-source-map-rebase
[coveralls-image]: https://coveralls.io/repos/github/ericmorand/html-source-map-rebase/badge.svg
[coveralls-url]: https://coveralls.io/github/ericmorand/html-source-map-rebase