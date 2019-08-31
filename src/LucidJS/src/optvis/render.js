import {randImage} from './param/image.js';
import {deepdream, asObjective} from './objectives.js';
import {standardTransforms, compose} from './transform.js';
import * as tf from '@tensorflow/tfjs';

export function renderVis(model, objectiveF, paramF=null, optimizer=null,
  transforms=null, thresholds=[512,], printObjectives=null,
  verbose=true, reluGradientOverride=true, useFixedSeed=false) {
    if(useFixedSeed) {
      throw 'Fixed seed not yet implemented!';
    }

    T = makeVisT(model, objectiveF, paramF, optimizer, transforms)
  }

export function makeVisT(
  model, objectiveF, paramF=undefined, optimizer=undefined,
  transforms=undefined, reluGradientOverride=false) {
    const tImage = makeTImage(paramF);
    const _objectiveF = asObjective(objectiveF);
    const _transformF = makeTransformF(transforms);
    const _optimizer = makeOptimizer(optimizer);

    let T;
    if (reluGradientOverride) {
      throw "reluGradientOverride not implemented yet!";
    } else {
      T = model;
    }
    const loss = _objectiveF._call(T);

    const visOp = _optimizer.minimize(-loss);

    return {'loss': loss, 'visOp': visOp, 'input':T.inputs[0]};
  }

function makeTImage(paramF) {
  let tImage;
  if (paramF === undefined) {
    tImage = image(128);
  } else if (paramF.dtype !== undefined) { // asuming this means it is a tf.Tensor
    tImage = paramF;
  } else {
    throw "Not yet implemented!";
  }
  return tImage;
}

function makeTransformF(transforms) {
  let _transforms;
  if(typeof transforms !== 'Array'){
    _transforms = standardTransforms;
  } else {
    _transforms = transforms;
  }
  const transformF = compose(_transforms);
  return transformF;
}

function makeOptimizer(optimizer) {
  if (!optimizer) {
    return tf.train.adam(0.05);
  } else if (typeof optimizer === 'tf.train.Optimizer') {
    return optimizer;
  } else {
    throw "Could not convert optimizer argument to usable optimizer. " +
          "Needs to be null or tf.train.Optimizer instance.";
  }
}

export function importModel(model, tImage, tImageRaw) {
  throw 'importModel not implemented yet!';

  const T = (layer) => {
    if(layer === 'input') {
      return tImageRaw;
    } else if (layer === 'labels') {
      throw 'Labels not implemented yet!';
    }
    return tImage
  }
}
