const Rebaser = require('../src');
const tap = require('tap');
const fs = require('fs');
const path = require('path');
const through = require('through2');
const {TwingLoaderFilesystem, TwingEnvironment} = require('twing');
const Readable = require('stream').Readable;
const Url = require('url');

let warmUp = function () {
  let loader = new TwingLoaderFilesystem(path.resolve('test/fixtures'));

  return new TwingEnvironment(loader, {
    source_map: true
  });
};

tap.test('rebaser', function (test) {
  test.test('should handle well-formed map', function (test) {
    let twing = warmUp();

    let html = twing.render('index.twig');

    let map = twing.getSourceMap();

    let rebaser = new Rebaser({
      map: map
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
        fs.readFile(path.resolve('test/fixtures/wanted.html'), function (err, readData) {
          test.equal(data.toString(), readData.toString());

          test.end();
        });
      })
      .on('error', function (err) {
        test.fail(err);

        test.end();
      });

    stream.push(html);
    stream.push(null);
  });

  test.test('should emit "rebase" event', function (test) {
    let twing = warmUp();

    let html = twing.render('index.twig');
    let map = twing.getSourceMap();

    let rebaser = new Rebaser({
      map: map
    });

    let rebased = [];
    let stream = new Readable({
      encoding: 'utf8'
    });

    rebaser.on('rebase', function (url) {
      rebased.push(url.href);
    });

    stream
      .pipe(rebaser)
      .pipe(through(function (chunk, enc, cb) {
        cb();
      }))
      .on('finish', function () {
        test.same(rebased.sort(), [
          'test/fixtures/assets/foo.png',
          'test/fixtures/assets/foo.png',
          'test/fixtures/assets/foo.png',
          'test/fixtures/partials/assets/foo-1.png',
          'test/fixtures/partials/assets/foo-2.png'
        ].sort());

        test.end();
      });

    stream.push(html);
    stream.push(null);
  });

  test.test('should handle remote paths', function (test) {
    let twing = warmUp();

    let html = twing.render('remote/index.twig');
    let map = twing.getSourceMap();

    let rebaser = new Rebaser({
      map: map
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
        fs.readFile(path.resolve('test/fixtures/remote/wanted.html'), function (err, readData) {
          test.equal(data.toString(), readData.toString());

          test.end();
        });
      })
      .on('error', function (err) {
        test.fail(err);

        test.end();
      });

    stream.push(html);
    stream.push(null);
  });

  test.test('should support no map option', function (test) {
    let twing = warmUp();

    let html = twing.render('no-map/index.twig');

    let rebaser = new Rebaser();

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
        fs.readFile(path.resolve('test/fixtures/no-map/wanted.html'), function (err, readData) {
          test.equal(data.toString(), readData.toString());

          test.end();
        });
      })
      .on('error', function (err) {
        test.fail(err);

        test.end();
      });

    stream.push(html);
    stream.push(null);
  });

  test.test('should handle region boundaries', function (test) {
    let twing = warmUp();

    let html = twing.render('boundaries/index.twig', {
      foo: 'foo'
    });
    let map = twing.getSourceMap();

    let rebaser = new Rebaser({
      map: map
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
        fs.readFile(path.resolve('test/fixtures/boundaries/wanted.html'), function (err, readData) {
          test.equal(data.toString(), readData.toString());

          test.end();
        });
      })
      .on('error', function (err) {
        test.fail(err);

        test.end();
      });

    stream.push(html);
    stream.push(null);
  });

  test.test('should handle one liners', function (test) {
    let twing = warmUp();

    let html = twing.render('one-liner/index.twig', {
      foo: 'foo'
    });
    let map = twing.getSourceMap();

    let rebaser = new Rebaser({
      map: map
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
        fs.readFile(path.resolve('test/fixtures/one-liner/wanted.html'), function (err, readData) {
          test.equal(data.toString(), readData.toString());

          test.end();
        });
      })
      .on('error', function (err) {
        test.fail(err);

        test.end();
      });

    stream.push(html);
    stream.push(null);
  });

  test.test('should support rebase callback', function (test) {
    let twing = warmUp();

    let html = twing.render('rebase/index.twig');
    let map = twing.getSourceMap();

    test.test('with done called with false', (test) => {
      let rebaseUrl = null;

      let rebaser = new Rebaser({
        map: map,
        rebase: (url, source, done) => {
          done(false);
        }
      });

      rebaser.on('rebase', (url) => {
        rebaseUrl = url;
      });

      let stream = new Readable({
        encoding: 'utf8'
      });

      stream
        .pipe(rebaser)
        .on('finish', function () {
          test.false(rebaseUrl, 'rebasing does not happen');

          test.end();
        })
      ;

      stream.push(html);
      stream.push(null);
    });

    test.test('with done called with undefined', (test) => {
      let rebasedUrl = null;

      let rebaser = new Rebaser({
        map: map.toString(),
        rebase: (url, source, done) => {
          done();
        }
      });

      rebaser.on('rebase', (url) => {
        rebasedUrl = url;
      });

      let stream = new Readable({
        encoding: 'utf8'
      });

      stream
        .pipe(rebaser)
        .on('finish', function () {
          test.same(rebasedUrl.href, 'test/fixtures/assets/foo.png', 'rebasing happens with default logic');

          test.end();
        })
      ;

      stream.push(html);
      stream.push(null);
    });

    test.test('with done called with null', (test) => {
      let rebasedUrl = null;

      let rebaser = new Rebaser({
        map: map.toString(),
        rebase: (url, source, done) => {
          done(null);
        }
      });

      rebaser.on('rebase', (url) => {
        rebasedUrl = url;
      });

      let stream = new Readable({
        encoding: 'utf8'
      });

      stream
        .pipe(rebaser)
        .on('finish', function () {
          test.same(rebasedUrl.href, 'test/fixtures/assets/foo.png', 'rebasing happens with default logic');

          test.end();
        })
      ;

      stream.push(html);
      stream.push(null);
    });

    test.test('with done called with a value', (test) => {
      let rebasedUrl = null;

      let rebaser = new Rebaser({
        map: map.toString(),
        rebase: (url, source, done) => {
          done(Url.parse('/foo'));
        }
      });

      rebaser.on('rebase', (url) => {
        rebasedUrl = url;
      });

      let stream = new Readable({
        encoding: 'utf8'
      });

      stream
        .pipe(rebaser)
        .on('finish', function () {
          test.same(rebasedUrl.href, '/foo', 'rebasing happen using the provided value');

          test.end();
        })
      ;

      stream.push(html);
      stream.push(null);
    });

    test.end();
  });

  test.end();
});