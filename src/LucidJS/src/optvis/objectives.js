import * as tf from '@tensorflow/tfjs';

/**
 * Visualize a single channel.
 */
export function channel(model, options) {
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

/**
 * Maximize 'interestingness' at some layer.
 *
 *
 * See Mordvintsev et al., 2015.
 */
export function deepdream(model, options) {
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

/**
 * Maximize output / class activation.
 * @param {*} model 
 * @param {*} options 
 */
export function output(model, options) {
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
export function neuron(model, options) {
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

/**
 * Maximize single "pixel" location
 * @param {*} model 
 * @param {*} options 
 */
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

/**
 * Experimental style objective
 * @param {*} model 
 * @param {*} contentImg 
 * @param {*} styleImg 
 * @param {*} contentLrs 
 * @param {*} styleLrs 
 */
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

/**
 * Difference between activations of two input images.
 * @param {*} imgActivations 
 * @param {*} targetActivations 
 * @param {*} transformF 
 * @param {*} activLossF 
 */
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

/**
 * Returns list of activation tensors for each layer.
 * @param {*} model 
 * @param {*} image 
 * @param {*} layers 
 */
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

/**
 * Returns new model with specified outputs.
 * @param {*} model 
 * @param {*} outputs 
 */
function getAuxModel(model, outputs){
  const auxModel = tf.model(
    {inputs: model.inputs, outputs: outputs});
  return auxModel;
}

/**
 * Returns output layer tensors.
 * @param {*} model 
 * @param {*} layers 
 */
function getLayerOutputs(model, layers) {
  const outputs = [];
  layers.forEach((layerName) => {
    const outLayer = model.getLayer(layerName);
    outputs.push(outLayer.output);
  });
  return outputs;
}

/**
 * Returns array of tensors from tensor or array of tensors
 * @param {*} tensorOrArray 
 */
function makeArray(tensorOrArray) {
  if(!Array.isArray(tensorOrArray)){
    tensorOrArray  = [tensorOrArray];
  }
  return tensorOrArray;
}

/**
 * Optimize for specified activation modifications.
 * @param {*} model 
 * @param {*} originalImage 
 * @param {*} activationModDict 
 * @param {*} activationLossF 
 */
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

/**
 * Returns gram matrix of input tensor, normalized by length of flat length.
 * @param {*} array 
 */
function gramStyle(array){
  const sh = array.shape;
  const channels = sh[sh.length-1];
  const array_flat = tf.reshape(array, [-1, channels]);
  const length = array_flat.shape[0];
  const gram = tf.matMul(array_flat, array_flat, true, false);
  return gram.div(length);
}

/**
 * Returns mean of absolute differences.
 * @param {*} g1 
 * @param {*} g2 
 */
function meanL1Loss(g1, g2) {
  return tf.mean(tf.abs(g1.sub(g2)));
}

/**
 * Returns mean of squared differences.
 * @param {*} g1 
 * @param {*} g2 
 */
function meanL2Loss(g1, g2) {
  return tf.mean(tf.pow(g1.sub(g2), 2));
}