import * as tf from '@tensorflow/tfjs';

const colorCorrelationNormalized = tf.tensor(
  [[0.563, 0.195, 0.043],
  [0.585, 0.00, -0.108],
  [0.585, -0.195, 0.065]]);

const colorCorrelationNormalizedInverse = tf.tensor(
  [[0.577, 0.577, 0.577],
  [2.773, -0.3135, -2.3552],
  [3.1256, -6.1337, 3.1256]]);

const colorMean = tf.tensor([0.48, 0.46, 0.41]);

/**
 * Transforms the optimization parameter values into valid RGB space and applies optional
 * additional functions.
 * @param {*} t Input tensor
 * @param {boolean} decorrelate Decorrelate colors
 * @param {boolean} sigmoid Apply sigmoid
 * @param {boolean} normalize Normalize to 1.0
 */
export function toValidRgb(t, decorrelate=false, sigmoid=false, normalize=true) {
  if (decorrelate) {
    t = linearDecorrelateColor(t);
  }
  if(decorrelate && !sigmoid){
    t = t.add(colorMean);
  }
  if(normalize) {
    t = t.div(t.abs().max());
  }
  if (sigmoid) {
    t = tf.sigmoid(t);
  }
  return t;
}

/**
 * Applies linear decorrelation to input tensor.
 * @param {*} t Input tensor
 */
export function linearDecorrelateColor(t) {
  let tFlat = tf.reshape(t, [-1, 3]);
  tFlat = tf.matMul(tFlat, colorCorrelationNormalized, false, true);
  t = tf.reshape(tFlat, t.shape);
  return t;
}

/**
 * Applies inverse decorrelation: can be used to preserve color values when the input is initalized
 * with an image and decorrelation is applied afterwards in the computation graph.
 * @param {*} t Input tensor
 */
export function inverseDecorrelate(t) {
  t = t.sub(colorMean);
  let tFlat = tf.reshape(t, [-1, 3]);
  tFlat = tf.matMul(tFlat, colorCorrelationNormalizedInverse, false, true);
  t = tf.reshape(tFlat, t.shape);
  return t;
}
