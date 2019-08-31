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

// Functions for transforming and constraining color channels.

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

export function linearDecorrelateColor(t) {
  let tFlat = tf.reshape(t, [-1, 3]);
  tFlat = tf.matMul(tFlat, colorCorrelationNormalized, false, true);
  t = tf.reshape(tFlat, t.shape);
  return t;
}

export function inverseDecorrelate(t) {
  t = t.sub(colorMean);
  let tFlat = tf.reshape(t, [-1, 3]);
  tFlat = tf.matMul(tFlat, colorCorrelationNormalizedInverse, false, true);
  t = tf.reshape(tFlat, t.shape);
  return t;
}
