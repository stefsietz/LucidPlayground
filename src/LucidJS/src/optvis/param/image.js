import {toValidRgb, inverseDecorrelate} from './color.js';
import {pixelImage, laplacianPyramid,
  makeLaplacianPyramidFromImgData, baseImageLaplacianPyramid} from './spatial.js';
import * as tf from '@tensorflow/tfjs';

export function naiveFromImage(
  imgArray, w, h=undefined, ch=3, batch=undefined, decorrelate=true) {
  const _w = w;
  const _h = h ? h : w;
  const _batch = batch ? batch : 1;
  const _channels = ch;
  const shape = [_batch, _w, _h, _channels];
  const imgShape = [_batch, imgArray.height, imgArray.width, 4];
  const _decorrelate = _channels === 3 ? decorrelate : false;

  let trainable = tf.tidy(() => {
    const arrayCopy = Uint8Array.from(imgArray.data);
    const origImg = tf.tensor(arrayCopy, imgShape, 'float32');
    const resizedRGBA = tf.image.resizeBilinear(origImg, [_w, _h]).div(255);
    let wantedChannels = resizedRGBA.slice([0, 0, 0, 0], [_batch, _w, _h, ch]);
    if(decorrelate){
      wantedChannels = inverseDecorrelate(wantedChannels);
    }
    return wantedChannels;
  });

  trainable = [tf.variable(trainable)];
  const t = (trainableVars) =>{
    let rgb = toValidRgb(trainableVars[0].slice(
      [0, 0, 0, 0], [_batch, _w, _h, ch]), _decorrelate, false);
    return rgb;
  }
  return [t, trainable];
}

export function randImage(
  w, h=undefined, ch=3, batch=undefined, sd=undefined,
  decorrelate=false, fft=false, alpha=false
) {
  const _w = w;
  const _h = h ? h : w;
  const _batch = batch ? batch : 1;
  const _channels = alpha ? ch+1 : ch;
  const shape = [_batch, _w, _h, _channels];
  const _decorrelate = _channels === 3 ? decorrelate : false;
  let paramF, ret, t, trainable;

  paramF = pixelImage;

  trainable = [paramF(shape,sd)];
  t = (trainableVars) => {
    const rgb = toValidRgb(trainableVars[0].slice([0, 0, 0, 0], [_batch, _w, _h, ch]),
                     _decorrelate, true);
    if (alpha) {
      const a = tf.sigmoid(trainableVars[0].slice([0, 0, 0, ch], [_batch, _w, _h, 1]));
      return tf.concat([rgb, a], -1);
    }
    return rgb;
  }
  return [t, trainable];
}

export function randLaplacianPyramid(
  w, h=undefined, ch=3, batch=undefined, sd=undefined,
  decorrelate=true, nLevels=6
) {
  const _w = w;
  const _h = h ? h : w;
  const _batch = batch ? batch : 1;
  const _channels = ch;
  const _decorrelate = _channels === 3 ? decorrelate : false;
  const shape = [_batch, _w, _h, _channels];

  const ret = laplacianPyramid(shape, sd, nLevels);
  const f = ret[0];
  const trainable = ret[1];
  let t = (xArray, weights) => {
    return toValidRgb(f(xArray, weights).slice([0, 0, 0, 0], [_batch, _w, _h, ch]),
                   _decorrelate, false);
  }
  return [t, trainable];
}

export function imgLaplacianPyramid(imgArray,
  w, h=undefined, ch=3, batch=undefined, decorrelate=true, nLevels=6) {
  const _w = w;
  const _h = h ? h : w;
  const _batch = batch ? batch : 1;
  const _channels = ch;
  const _decorrelate = _channels === 3 ? decorrelate : false;
  const shape = [_batch, _w, _h, _channels];

  const ret = baseImageLaplacianPyramid(shape, imgArray, nLevels, _decorrelate);
  const f = ret[0];
  const trainable = ret[1];
  let t = (xArray) => {
    return toValidRgb(f(xArray).slice([0, 0, 0, 0], [_batch, _w, _h, ch]),
                   _decorrelate, false);
  }
  return [t, trainable];
}
