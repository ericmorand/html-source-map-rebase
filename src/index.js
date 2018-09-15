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

    /**
     * @param tag {SAXParser.StartTagToken}
     */
    let processTag = (tag) => {
      let attributes = tag.attrs;

      attributes.forEach((attribute) => {
        switch (attribute.name) {
          case 'href':
          case 'src':
            let attributeValue = unquote(attribute.value);

            if (shouldBeRebased(attributeValue)) {
              let location = tag.sourceCodeLocation;
              let tagStartLine = location.startLine;
              let tagStartColumn = location.startCol - 1;

              let i = 0;
              let tagRegion = null;
              let regions = this._getRegions();

              while ((i < regions.length) && (tagRegion === null)) {
                let region = regions[i];

                if (
                  ((region.startLine < tagStartLine) || ((region.startLine === tagStartLine) && (region.startColumn >= tagStartColumn))) &&
                  ((region.endLine === null) || (region.endLine > tagStartLine) || ((region.endLine === tagStartLine) && (region.endColumn >= tagStartColumn)))
                ) {
                  tagRegion = region;
                }

                i++;
              }

              let rebasedPath = path.join(path.dirname(tagRegion.source), attributeValue);

              attribute.value = slash(path.join('.', rebasedPath));

              this.emit('rebase', slash(rebasedPath));
            }

            break;
        }
      });
    };

    processTag(tag);
  }
}

module.exports = Rebaser;