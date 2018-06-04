const Rebaser = require('../src');
const tap = require('tap');
const fs = require('fs');
const path = require('path');
const through = require('through2');
const Twing = require('twing');
const Readable = require('stream').Readable;

let warmUp = function (templates) {
  let loader = new Twing.TwingLoaderFilesystem(path.resolve('test/fixtures'));
  let twing = new Twing.TwingEnvironment(loader, {
    source_map: true
  });

  return twing;
};

tap.test('rebaser', function (test) {
  test.test('should handle well-formed map', function (test) {
    let twing = warmUp();

    let html = twing.render('index.twig');
    let map = twing.getSourceMap();

    let rebaser = new Rebaser({
      map: map.toString()
    });

    let data = null;
    let stream = new Readable();

    stream
      .pipe(rebaser)
      .pipe(through(function (chunk, enc, cb) {
        data = chunk;

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

  test.test('should emit "error" event on badly formed map', function (test) {
    let twing = warmUp();

    let html = twing.render('index.twig');

    let rebaser = new Rebaser({
      map: 'foo'
    });

    let data = null;
    let stream = new Readable();

    rebaser.on('error', function (err) {
      test.ok(err);

      test.end();
    });

    stream
      .pipe(rebaser)
      .pipe(through(function (chunk, enc, cb) {
        data = chunk;

        cb();
      }))
      .on('finish', function () {
        test.fail();

        test.end();
      });

    stream.push(html);
    stream.push(null);
  });
  //
  test.test('should emit "rebase" event', function (test) {
    let twing = warmUp();

    let html = twing.render('index.twig');
    let map = twing.getSourceMap();

    let rebaser = new Rebaser({
      map: map.toString()
    });

    let rebased = [];
    let stream = new Readable();

    rebaser.on('rebase', function (file) {
      rebased.push(file);
    });

    stream
      .pipe(rebaser)
      .pipe(through(function (chunk, enc, cb) {
        cb();
      }))
      .on('finish', function () {
        test.same(rebased.sort(), [
          'assets/foo.png',
          'assets/foo.png',
          'partials/assets/foo-1.png',
          'partials/assets/foo-2.png'
        ].sort());

        test.end();
      });

    stream.push(html);
    stream.push(null);
  });

  test.test('should handle remote and absolute paths', function (test) {
    let twing = warmUp();

    let html = twing.render('remote-and-absolute/index.twig');
    let map = twing.getSourceMap();

    let rebaser = new Rebaser({
      map: map.toString()
    });

    let data = null;

    let stream = new Readable();

    stream
      .pipe(rebaser)
      .pipe(through(function (chunk, enc, cb) {
        data = chunk;

        cb();
      }))
      .on('finish', function () {
        fs.readFile(path.resolve('test/fixtures/remote-and-absolute/wanted.html'), function (err, readData) {
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

    let data = null;
    let stream = new Readable();

    stream
      .pipe(rebaser)
      .pipe(through(function (chunk, enc, cb) {
        data = chunk;

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

  test.end();
});