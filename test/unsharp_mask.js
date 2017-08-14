'use strict';

const assert      = require('assert');
const mathlib_raw = require('../');


function fill(target, arr) {
  if (!Array.isArray(arr)) arr = [ arr ];

  for (let i = 0; i < target.length; i++) target[i] = arr[i % arr.length];
}


describe('unsharp_mask', function () {

  describe('glur_mono16', function () {

    it('js', function () {
      const glur_js = require('glur/mono16');

      let sample = new Uint16Array(100 * 100);

      fill(sample, 33333);

      let orig = sample.slice(0, sample.length);

      glur_js(sample, 100, 100, 2);

      assert.deepEqual(sample, orig);
    });


    it('wasm', function () {
      const glur_js   = require('glur/mono16');
      const mlib_wasm = mathlib_raw({ js: false }).use(require('../lib/unsharp_mask'));

      // unsharp_mask wasm module does not provide API for direct glur16 call
      // Here is simple wrapper for testing
      function glur16_wasm_invoke(thisobj, src, width, height, radius) {
        var elem_cnt = width * height;
        var src_byte_cnt = elem_cnt * 2;
        var out_byte_cnt = elem_cnt * 2;
        var tmp_byte_cnt = elem_cnt * 2;
        var line_byte_cnt = Math.max(width, height) * 4; // float32 array
        var coeffs_byte_cnt = 8 * 4;
        var src_offset = 0;
        var out_offset = src_byte_cnt;
        var tmp_offset = src_byte_cnt + out_byte_cnt;
        var line_offset = src_byte_cnt + out_byte_cnt + tmp_byte_cnt;
        var coeffs_offset = src_byte_cnt + out_byte_cnt + tmp_byte_cnt + line_byte_cnt;

        var instance = thisobj.__instance(
          'unsharp_mask',
          src_byte_cnt + out_byte_cnt + tmp_byte_cnt + line_byte_cnt + coeffs_byte_cnt,
          { exp: Math.exp }
        );

        var mem32 = new Uint16Array(thisobj.__memory.buffer);
        mem32.set(src);

        var fn = instance.exports.blurMono16 || instance.exports._blurMono16;

        fn(src_offset, out_offset, tmp_offset, line_offset, coeffs_offset, width, height, radius);

        return new Uint16Array(thisobj.__memory.buffer.slice(out_offset, out_offset + out_byte_cnt));
      }


      return mlib_wasm.init().then(function () {
        let sample = new Uint16Array(100 * 100);
        fill(sample, [ 0, 255 ]);

        let sample_js   = sample.slice(0, sample.length);

        glur_js(sample_js, 100, 100, 2);

        let sample_wasm = glur16_wasm_invoke(mlib_wasm, sample, 100, 100, 2);

        assert.deepEqual(sample_js, sample_wasm);
      });
    });
  });


  describe('unsharp_mask', function () {

    function createSample(width, height) {
      const result = new Uint8Array(width * height * 4);

      for (let i = 0; i < result.length; i++) result[i] = 20 + i;

      return result;
    }


    it('js should not throw without wasm', function () {
      const mlib = mathlib_raw({ wasm: false }).use(require('../lib/unsharp_mask'));

      let sample = createSample(100, 100);
      mlib.unsharp_mask(sample, 100, 100, 80, 2, 2);
    });


    it('wasm', function () {
      const mlib_js = mathlib_raw({ wasm: false }).use(require('../lib/unsharp_mask'));
      const mlib_wasm = mathlib_raw({ js: false }).use(require('../lib/unsharp_mask'));

      return mlib_wasm.init().then(function () {
        let sample_js   = createSample(100, 100);
        let sample_wasm = createSample(100, 100);

        mlib_js.unsharp_mask(sample_js, 100, 100, 80, 2, 2);
        mlib_wasm.unsharp_mask(sample_wasm, 100, 100, 80, 2, 2);

        assert.deepEqual(sample_js, sample_wasm);
      });
    });
  });
});
