import * as tf from '@tensorflow/tfjs';

export class Objective{
  constructor(objectiveFunc, name='', description=''){
    this.objectiveFunc = objectiveFunc;
    this.name = name;
    this.description = description;
  }

  add(other) {
    throw 'Adding objectives not implemented yet!';
  }

  neg() {
    throw 'Negating objective not implemented yet!';
  }

  sub() {
    throw 'Subtracting objectives not implemented yet!';
  }

  _call(T) {
    const auxModel = tf.model({inputs: T.inputs, outputs: this.objectiveFunc(T)});
    const lossFunction = () => auxModel.apply(T.inputs[0], {training: true});
    return lossFunction;
  }
}

export function wrapObjective(f, ...args){
/**
 *Decorator for creating Objective factories.
 *
 *
 * Changes f from the closure: (args) => () => TF Tensor
 * into an Obejective factory: (args) => Objective
 *
 * while perserving function name, arg info, docs... for interactive python.
 */

 const objectiveFunc = (args) => f(args);
 const objectiveName = f.name;
 const argsStr = 'args_str not yet implemented!'
 const description = objectiveName + ' ' + argsStr;
 const obj =  new Objective(objectiveFunc, objectiveName, description);
 return obj;
}

export function channel(model, options) {
  /**
   * Visualize a single channel.
   */
 const layerOutput = model.getLayer(options.layer).output;
 const auxModel = tf.model({inputs: model.inputs, outputs: layerOutput});
 const mul = options.neg ? 1 : -1;
 const s = layerOutput.shape;
 const ch = Math.min(options.channel, s[3]-1);

  const inner =  (inputs) => {
    return tf.mean(
        auxModel.apply(inputs, {training: true})
        .gather([ch], 3).mul(mul)
    );
  }
  return inner;
}


export function deepdream(model, options) {
  /**
   * Maximize 'interestingness' at some layer.
   *
   *
   * See Mordvintsev et al., 2015.
   */

   const layerOutput = model.getLayer(options.layer).output;
   const auxModel = tf.model({inputs: model.inputs, outputs: layerOutput});
   const mul = options.neg ? 1 : -1;

    const inner =  (inputs) => {
      return tf.mean(
          auxModel.apply(inputs, {training: true}).pow(2).mul(mul)
      );
    }
    return inner;
}

export function output(model, options) {
  /**
   *
   */

   const layerOutput = model.outputs[0].inputs[0];
   const auxModel = tf.model({inputs: model.inputs, outputs: layerOutput});
   const mul = options.neg ? 1 : -1;

    const inner =  (inputs) => {
      return tf.mean(
          auxModel.apply(inputs, {training: true})
          .reshape([1, -1]).slice([0, options.out], [1, 1]).mul(mul)
      );
    }
    return inner;
}

export function neuron(model, options) {
  /**
  * Visualize a single neuron of a single channel.
  *
  * Defaults to the center neuron. When width and height are even numbers, we
  * choose the neuron in the bottom right of the center 2x2 neurons.
  *
  * Odd width & height:               Even width & height:
  *
  * +---+---+---+                     +---+---+---+---+
  * |   |   |   |                     |   |   |   |   |
  * +---+---+---+                     +---+---+---+---+
  * |   | X |   |                     |   |   |   |   |
  * +---+---+---+                     +---+---+---+---+
  * |   |   |   |                     |   |   | X |   |
  * +---+---+---+                     +---+---+---+---+
  *                                   |   |   |   |   |
  *                                   +---+---+---+---+
  */

   const layerOutput = model.getLayer(options.layer).output;
   const auxModel = tf.model({inputs: model.inputs, outputs: layerOutput});
   const mul = options.neg ? 1 : -1;
   let x, y;
   const s = layerOutput.shape;
   if(!options.neuron) {
     x = Math.floor(s[1]/2);
     y = Math.floor(s[2]/2);
   } else {
     const [xn, yn] = options.neuron;
     x = Math.min(xn, s[2]-1);
     y = Math.min(yn, s[1]-1);
   }

   const ch = Math.min(options.channel, s[3]-1);

    const inner =  (inputs) => {
      return tf.mean(
        auxModel.apply(inputs, {training: true})
          .slice([0, y, x, ch], [1, 1, 1, 1])
          .mul(mul)
        );
    }
    return inner;
}

export function spatial(model, options) {

   const layerOutput = model.getLayer(options.layer).output;
   const auxModel = tf.model({inputs: model.inputs, outputs: layerOutput});
   const mul = options.neg ? 1 : -1;
   let x, y;
   const s = layerOutput.shape;
   if(!options.neuron) {
     x = Math.floor(s[1]/2);
     y = Math.floor(s[2]/2);
   } else {
     const [xn, yn] = options.neuron;
     x = Math.min(xn, s[2]-1);
     y = Math.min(yn, s[1]-1);
   }

    const inner =  (inputs) => {
      return tf.mean(
        auxModel.apply(inputs, {training: true})
          .slice([0, y, x, 0], [1, 1, 1, s[3]-1])
          .mul(mul)
        );
    }
    return inner;
}

export function style(model, contentImg, styleImg, contentLrs, styleLrs) {

  const targetStyleActivations = getActivationsForLayers(
    model, styleImg, styleLrs);

  const targetContentActivations = getActivationsForLayers(
    model, contentImg, contentLrs);

  const styleAuxModel = getAuxModel(
    model, getLayerOutputs(model, styleLrs));

  const contentAuxModel = getAuxModel(
    model, getLayerOutputs(model, contentLrs));

  const inner = (inputs) => {
    const inputStyleActivations = makeArray(styleAuxModel.apply(inputs));
    const inputContentActivations = makeArray(contentAuxModel.apply(inputs));

    const contentObj = activationDifference(
      inputContentActivations, targetContentActivations, gramStyle).mul(100);

    const styleObj = activationDifference(
      inputStyleActivations, targetStyleActivations, gramStyle);

    console.log("content loss:", contentObj.dataSync(),
  "style loss:", styleObj.dataSync())


    const objective = contentObj.add(styleObj);
    return objective;
  }

  return inner;
}

function activationDifference(
  imgActivations, targetActivations, transformF=null, activLossF=meanL1Loss){
  const losses = [];
  for(let i=0; i< imgActivations.length; i++) {
    let iA = imgActivations[i];
    let tA = targetActivations[i];
    if(transformF) {
      iA = transformF(iA);
      tA = transformF(tA);
    }
    const loss = activLossF(iA, tA);
    losses.push(loss);
  }
  return tf.addN(losses);
}

function getActivationsForLayers(model, image, layers) {
  const outputs = getLayerOutputs(model, layers);

  const auxModel = getAuxModel(model, outputs);
  let activations = auxModel.apply(image);

  activations = makeArray(activations);

  const activationList = [];
  activations.forEach((tensor) => {
    const shp = tensor.shape;
    const data = tensor.dataSync();
    tensor.dispose();
    const frozenTensor = tf.tensor(data, shp);
    activationList.push(frozenTensor);
  });

  return activationList;
}

function getAuxModel(model, outputs){
  const auxModel = tf.model(
    {inputs: model.inputs, outputs: outputs});
  return auxModel;
}

function getLayerOutputs(model, layers) {
  const outputs = [];
  layers.forEach((layerName) => {
    const outLayer = model.getLayer(layerName);
    outputs.push(outLayer.output);
  });
  return outputs;
}

function makeArray(tensorOrArray) {
  if(!Array.isArray(tensorOrArray)){
    tensorOrArray  = [tensorOrArray];
  }
  return tensorOrArray;
}

export function activationModification(model, originalImage,
  activationModDict, activationLossF=meanL2Loss){
  const layerOutputs = [];
  const layerNames = [];
  for(const [layerName, val] of Object.entries(activationModDict)){
    const outLayer = model.getLayer(layerName);
    layerOutputs.push(outLayer.output);
    layerNames.push(layerName);
  }
  if(!layerOutputs.length){
    return (inputs) => tf.mean(inputs.mul(0));
  }

  const auxModel = tf.model(
    {inputs: model.inputs, outputs: layerOutputs});

  let origImageActivations = auxModel.apply(originalImage);
  const origActivationList = getActivationsForLayers(model, originalImage, layerNames);

  const inner = (inputs) => {

    // we also set get the activations of the optimized image which will change during optimization
    let currentActivations = auxModel.apply(inputs);

    // we use the supplied loss function to compute the actual losses
    let losses = [];

    currentActivations = makeArray(currentActivations);

    for(let i=0; i<origActivationList.length; i++){
      const oA = origActivationList[i];
      let cA = currentActivations[i];
      const [b, h, w, ch] = cA.shape;
      const layerName = layerNames[i];
      const channelList = [];
      let shiftList = [];
      let scaleList = [];
      const noiseList = [];
      for(let j=0; j<ch; j++) {
        if(j in activationModDict[layerName]){
          const values = activationModDict[layerName][j];
          channelList.push(channel);
          shiftList.push(values['shift']);
          scaleList.push(values['scale']);
          noiseList.push(values['noise']);
        } else {
          shiftList.push(0);
          scaleList.push(1);
          noiseList.push(0);
        }
      }

      scaleList = [[[scaleList]]];
      const scaleT = tf.tensor(scaleList);
      cA = cA.div(scaleT);

      shiftList = [[[shiftList]]];
      const shiftT = tf.tensor(shiftList);
      cA = cA.sub(shiftT);

      const layerLoss = activationLossF(oA, cA);
      losses.push(layerLoss);
    }

    const loss = tf.addN(losses);
    console.log("act diff loss: ", loss.dataSync())
    return loss;
  }

  return inner;
}

function gramStyle(array){
  const sh = array.shape;
  const channels = sh[sh.length-1];
  const array_flat = tf.reshape(array, [-1, channels]);
  const length = array_flat.shape[0];
  const gram = tf.matMul(array_flat, array_flat, true, false);
  return gram.div(length);
}


function meanL1Loss(g1, g2) {
  return tf.mean(tf.abs(g1.sub(g2)));
}


function meanL2Loss(g1, g2) {
  return tf.mean(tf.pow(g1.sub(g2), 2));
}

export function asObjective(obj) {
  /** Convert obj into Objective class.
  *
  * Strings of the form "layer:n" become the Objective channel(layer, n).
  * Objectives are returned unchanged.
  *
  * Args:
  *   obj: string or Objective.

  * Returns:
  *   Objective
  */

  if(typeof obj === 'object') {
    return obj;
  } else if (typeof obj === 'string') {
    const tokens = obj.split(':');
    const layer = strip(tokens[0]);
    const n = parseInt(tokens[1]);
  } else {
    throw 'Objective type not implemented yet!';
  }
}

function strip(str) {
    return str.replace(/^\s+|\s+$/g, '');
}
