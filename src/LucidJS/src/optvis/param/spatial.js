// Copyright 2019 The Lucid Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// ==============================================================================
import * as tf from '@tensorflow/tfjs';
import {inverseDecorrelate} from './color.js';

export function pixelImage(shape, sd=undefined, initVal=undefined) {
  if (sd !== undefined && initVal !== undefined) {
    console.log("`pixel_image` received both an initial value and a sd " +
    "argument. Ignoring sd in favor of the supplied initial value.");
  }

  const _sd = sd ? sd : 0.01;
  initVal = initVal ? initVal : tf.randomNormal(
    shape, 0, _sd, 'float32');
  return tf.variable(initVal);
}

export function makeLaplacianPyramidFromImgData(shape, imgData, nLevels=6,
invDec=true){
  const [summedImg, layers] = tf.tidy(() => {
    const imgShape = [1, imgData.height, imgData.width, 4];
    const [b, h, w, ch] = shape;

    let refImg = tf.tensor(Uint8Array.from(imgData.data),
     imgShape, 'float32');
    refImg = tf.image.resizeBilinear(refImg, [w, h]).div(255);
    refImg = refImg.slice([0, 0, 0, 0], [b, h, w, ch]);
    if(invDec){
      refImg = inverseDecorrelate(refImg);
    }

    let currentImg = tf.zeros(shape, 'float32');
    let layers = [];
    for(let i=nLevels-1; i>=0; i--) {
      const k = Math.pow(2, i);
      const wk = Math.floor(w/k);
      const hk = Math.floor(h/k);
      const diff = refImg.sub(currentImg);
      const layer = tf.image.resizeBilinear(diff, [wk, hk]);
      layers.push(layer.dataSync());
      const upsampledLayer = tf.image.resizeBilinear(layer, [w, h]);
      currentImg = currentImg.add(upsampledLayer);
    }
    return [currentImg, layers];
  });
  return [summedImg, layers];
}

export function baseImageLaplacianPyramid(shape, imgData, nLevels=6, decorrelate){
  if(shape.length !== 4 ){
    throw "shape needs batch dimension!";
  }
  const [summedImg, baseImagePyramid] =
  makeLaplacianPyramidFromImgData(shape, imgData, nLevels, decorrelate);
  const [b, w, h, ch]= shape;

  let trainable = [];
  let level;
  for(let i=0; i<nLevels; i++){
    const k = Math.pow(2, nLevels-1-i);
    const wk = Math.floor(w/k);
    const hk = Math.floor(h/k);
    const _shape = [b, wk, hk, ch];
    const downSampledBaseImage =
    tf.tensor(baseImagePyramid[i], _shape);
    level = tf.variable(downSampledBaseImage, true);
    trainable.push(level);
  }
  let f = (xArray) => {
    let pyramid = tf.zeros(shape);
    for(let i=0; i<xArray.length; i++){
      let level = xArray[i];
      level = tf.image.resizeBilinear(level, [w, h]);
      pyramid = pyramid.add(level);
    }
    return pyramid
  }
  return [f, trainable];
}

export function laplacianPyramid(shape, sd, nLevels=6){
  if(shape.length !== 4 ){
    throw "shape needs batch dimension!";
  }
  const [b, w, h, ch]= shape;
  const _sd = sd ? sd : 0.01;

  const gaussianBlur = gaussianBlur2D3x3(ch);

  const start = 0;
  let trainable = [];
  let level;
  for(let n=start; n<nLevels+start; n++){
    const k = Math.pow(2, n);
    const wk = Math.floor(w/k);
    const hk = Math.floor(h/k);
    const _shape = [b, wk, hk, ch];
    level = tf.variable(
      tf.randomNormal(_shape, 0, _sd, 'float32'), true);
    trainable.push(level);
  }
  let f = (xArray, weights) => {
    let pyramid = tf.zeros(shape);
    const _weights = weights ? weights : ones(nLevels);

    for(let i=0; i<xArray.length; i++){
      let level = xArray[i];
      const wght = Math.max(_weights[i], 0.000001);
      if(i > 0 && false) {
        level = gaussianBlur.apply(level);
        level = gaussianBlur.apply(level);
      }
      level = tf.image.resizeBilinear(level, [w, h], true);
      //pyramid = pyramid.add(level.mul(wght));
      pyramid = pyramid.add(level);
    }
    return pyramid
  }
  return [f, trainable];
}

function gaussianBlur2D3x3(ch) {
  const conv2d = tf.layers.depthwiseConv2d(
    {kernelSize: 3, padding: 'same', trainable: false, updatable: false,
      weights: gaussianKernel3x3(ch)});
  return conv2d;
}

function gaussianKernel3x3(ch) {
  const c = 1/16;
  const s = 1/8;
  const m = 1/4;

  let weights = tf.tensor2d([[c, s, c], [s, m, s], [c, s, c]]);
  weights = tf.reshape(weights, [1, 1, 3, 3]);
  weights = tf.transpose(weights, [2, 3, 0, 1]);
  weights = tf.tile(weights, [1, 1, ch, 1]);

  const bias = tf.zeros([ch]);

  return [weights, bias];
}

function ones(n){
  const ret = [];
  for(let i=0; i<n; i++){
    ret.push(1);
  }
  return ret;
}
