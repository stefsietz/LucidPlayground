import * as tf from '@tensorflow/tfjs';

export function jitter (d) {
  const inner = (tImage) => {
    const tShp = tImage.shape;
    const cropShape = [
      tShp[0], tShp[1]-d,
      tShp[2]-d, tShp[3]];
    const rx = Math.floor(Math.random() * d + 0.5);
    const ry = Math.floor(Math.random() * d + 0.5);
    const crop = tImage.slice(
      [0, rx, ry, 0],
      [cropShape[0], cropShape[1], cropShape[2], cropShape[3]]);
    return crop;
  };
  return inner;
}

export function fixedScale (tShp) {
  const inner = (tImage) => {
    const resized = tf.image.resizeBilinear (
      tImage, [Math.floor(tShp[1]), Math.floor(tShp[0])], true);
    return resized;
  };
  return inner;
}

export function randomScale (scales) {
  const inner = (tImage) => {
    const rndScale = Math.floor(Math.random() * scales().length-0.0001);
    const scale = scales()[rndScale];
    const tShp = tImage.shape;
    const scaleShape = [
      tShp[0], Math.floor(tShp[1]*scale),
      Math.floor(tShp[2]*scale), tShp[3]];
    const resized = tf.image.resizeBilinear (
      tImage, [Math.floor(tShp[1]*scale), Math.floor(tShp[2]*scale)], true);
    return resized;
  };
  return inner;
}

export function compose (transforms) {
  const inner = (x) => {
    return tf.tidy(() => {
      let x_ = x;
      for (let transform of transforms) {
        x_ = transform(x_);
      }

      return x_;
    });
  };

  return inner;
}

export const standardTransforms = [
  jitter(3),

  /*
  randomScale(
    () => {
      let scales = [];
      for (let i=0; i<31; i++) {
        const sc = 1 + (i+30)/50;
        scales.push(sc);
      }
      return scales;
    }
  ),  */

  jitter(2),
  //fixedScale([224, 224]),
];
