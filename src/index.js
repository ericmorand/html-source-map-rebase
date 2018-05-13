const path = require('path');
const unquote = require('unquote');
const parse5 = require('parse5');
const Transform = require('stream').Transform;
const Url = require('url');
const {SourceMapConsumer} = require('source-map');

class Rebaser extends Transform {
  constructor(options) {
    options = options || {};

    super(options);

    this.map = options.map;
  }

  _transform(chunk, encoding, callback) {
    try {
      let self = this;

      let shouldBeRebased = function (uri) {
        if (path.isAbsolute(uri)) {
          return false;
        }

        let url = Url.parse(uri);

        // if the url host is set, it is a remote uri
        if (url.host) {
          return false;
        }

        return true;
      };

      const document = parse5.parse(chunk.toString(), {
        locationInfo: true
      });

      let done = () => {
        self.push(parse5.serialize(document));

        callback();
      };

      if (self.map) {
        let sourceMapConsumer = new SourceMapConsumer(self.map);
        let regions = [];

        sourceMapConsumer.eachMapping(function (mapping) {
          regions.push(mapping);
        }, null);

        let processNode = function (node) {
          if (node.__location) {
            let location = node.__location;

            let nodeStartLine = location.line;
            let nodeStartColumn = location.col - 1;

            let i = 0;
            let nodeRegion = null;
            let done = false;

            while ((i < regions.length) && (done === false)) {
              let region = regions[i];

              if ((region.generatedLine <= nodeStartLine) && (region.generatedColumn <= nodeStartColumn)) {
                nodeRegion = region;
              }

              if ((region.generatedLine >= nodeStartLine) && (region.generatedColumn > nodeStartColumn)) {
                done = true;
              }

              i++;
            }

            let attributes = node.attrs;

            if (attributes) {
              attributes.forEach(function (attribute) {
                switch (attribute.name) {
                  case 'src':
                    let attributeValue = unquote(attribute.value);

                    if (shouldBeRebased(attributeValue)) {
                      attribute.value = path.relative('.', path.join(path.dirname(nodeRegion.source), attributeValue));

                      self.emit('rebase', attribute.value);
                    }

                    break;
                }
              });
            }
          }

          if (node.childNodes) {
            node.childNodes.forEach(function (childNode) {
              processNode(childNode);
            })
          }
        };

        processNode(document);

        done();
      }
      else {
        done();
      }
    }
    catch (err) {
      callback(err);
    }
  }
}

module.exports = Rebaser;