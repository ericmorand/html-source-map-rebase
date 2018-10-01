const path = require('path');
const unquote = require('unquote');
const slash = require('slash');
const Url = require('url');
const {SourceMapConsumer} = require('source-map');
const RewritingStream = require('parse5-html-rewriting-stream');

class Rebaser extends RewritingStream {
  constructor(options) {
    options = options || {};

    super(options);

    this._regions = null;

    this.map = options.map;
    this.rebase = options.rebase;

    if (this.map) {
      this.on('startTag', (tag) => {
        this._transformStartTag(tag);
        this.emitStartTag(tag);
      })
    }
  }

  _getRegions() {
    if (!this._regions) {
      let sourceMapConsumer = new SourceMapConsumer(this.map);

      let regions = [];
      let region = null;
      let currentSource = null;

      sourceMapConsumer.eachMapping((mapping) => {
        let source = mapping.source;

        if (source !== currentSource) {
          // end the current region...
          if (region) {
            region.endLine = mapping.generatedLine;
            region.endColumn = mapping.generatedColumn;
          }

          //...and start a new one
          region = {
            source: source,
            startLine: mapping.generatedLine,
            startColumn: mapping.generatedColumn,
            endLine: null,
            endColumn: null
          };

          regions.push(region);

          currentSource = source;
        }
      }, null);

      this._regions = regions;
    }

    return this._regions;
  }

  /**
   * @param tag {SAXParser.StartTagToken}
   * @private
   */
  _transformStartTag(tag) {
    /**
     * @param tag {SAXParser.StartTagToken}
     */
    let processTag = (tag) => {
      let attributes = tag.attrs;

      attributes.forEach((attribute) => {
        switch (attribute.name) {
          case 'href':
          case 'src':
            let url = Url.parse(unquote(attribute.value));

            let location = tag.sourceCodeLocation;
            let tagStartLine = location.startLine;
            let tagStartColumn = location.startCol - 1;

            let i = 0;
            let tagRegion = null;
            let regions = this._getRegions();

            while ((i < regions.length) && (tagRegion === null)) {
              let region = regions[i];

              if (
                ((region.startLine < tagStartLine) || ((region.startLine === tagStartLine) && (region.startColumn <= tagStartColumn))) &&
                ((region.endLine === null) || (region.endLine > tagStartLine) || ((region.endLine === tagStartLine) && (region.endColumn >= tagStartColumn)))
              ) {
                tagRegion = region;
              }

              i++;
            }

            let rebase = this.rebase;

            let done = (rebasedUrl) => {
              if (rebasedUrl !== false) {
                let attributeValue;

                if (!rebasedUrl) { // default rebasing
                  if (url.host) {
                    attributeValue = url.href;
                  }
                  else {
                    attributeValue = path.join(path.dirname(tagRegion.source), url.href);
                  }

                  rebasedUrl = Url.parse(attributeValue);
                }

                if (!rebasedUrl.host) {
                  attributeValue = slash(path.join('.', rebasedUrl.href));
                }

                attribute.value = attributeValue;

                this.emit('rebase', rebasedUrl);
              }
            };

            if (!rebase) {
              rebase = (url, source, done) => {
                done();
              };
            }

            rebase(url, tagRegion.source, done);

            break;
        }
      });
    };

    processTag(tag);
  }
}

module.exports = Rebaser;