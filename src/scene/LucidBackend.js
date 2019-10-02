import {randImage, naiveFromImage, randLaplacianPyramid} from '../LucidJS/src/optvis/param/image.js';
import {compose, standardTransforms, fixedScale} from '../LucidJS/src/optvis/transform.js';
import {channel, deepdream, neuron, output} from '../LucidJS/src/optvis/objectives.js';
import {objectiveTypes, loadStates, LucidRenderer} from '../LucidJS/src/optvis/renderer.js';

import {fillCanvasPixelsWithRgbAndAlpha, fillCanvasPixelsWithGreyAndAlpha}
from '../DrawingHelper.js';
import * as tf from '@tensorflow/tfjs';

/**
 * Serves as intermediate layer between LucidJS library and React user interface code.
 */
export class LucidBackend{
  constructor(){
    this.loadStatus = loadStates.INITIAL;
    this.objectiveType = objectiveTypes.CHANNEL;

    this.lastInput = null;
    this.lastInputShape = null;

    this.lucidRenderer = new LucidRenderer();
    this.lucidRenderer.setObjectiveType(this.objectiveType);
  }

  /**
   * Loads model from client-side file
   * @param {*} topoFile 
   * @param {*} weightFiles 
   * @param {*} progressCb progress callback, can be used for status bar
   */
  async loadModelFromFile(topoFile, weightFiles, progressCb){
    await this.loadModel(tf.io.browserFiles(
      [topoFile, ...weightFiles]), progressCb);
  }

  /**
   * Loads model from server directory.
   * @param {*} modelPath 
   * @param {*} progressCb progress callback, can be used for status bar
   */
  async loadModel(modelPath, progressCb) {
    if(this.loadStatus === loadStates.LOADING) {
      console.log("Already loading!");
      return;
    }
    if(this.lucidRenderer) {
      this.lucidRenderer.stopOptimization();
      this.lucidRenderer.dispose();
    }
    this.loadStatus = loadStates.LOADING;

    const model = await tf.loadLayersModel(
      modelPath,
      {strict: true, onProgress: progressCb});
    console.log('Model loading complete.');
    this.loadStatus = loadStates.LOADED;
    this.lucidRenderer.setModel(model);
    this.lucidRenderer.compileInput();
    this.setContentImage();
    this.lucidRenderer.initObjectiveParamsForModel();
    const initialLayer = this.lucidRenderer.objectiveParams.layer;
    this.lucidRenderer.setLayer(initialLayer);
    this.setFeatureMapLayer(initialLayer);
  }

  /**
   * Get model from renderer.
   */
  getModel = () => {
    return this.lucidRenderer.model;
  }

  /**
   * Get model name from renderer.
   */
  getModelName = () => {
    return this.lucidRenderer.model.name;
  }

  /**
   * Get load status from renderer.
   */
  getLoadStatus = () => {
    return this.loadStatus;
  }

  /**
   * Check if renderer is ready to optimize.
   */
  canOptimize = () => {
    return this.lucidRenderer.canOptimize() && !this.lucidRenderer.isOptimizing;
  }

  /**
   * Check if renderer is optimizing.
   */
  isOptimizing = () => {
    return this.lucidRenderer.isOptimizing;
  }

  /**
   * Get input parameters from renderer.
   */
  getInputParams = () => {
    return this.lucidRenderer.inputParams;
  }

  /**
   * Resets input, can be called while optimizing.
   */
  resetInput = () => {
    this.lucidRenderer.compileInput();
    this.lucidRenderer.objectiveParams.activationModifications = {};
    this.setContentImage();
  }

  /**
   * Sets input parameters. Not possible while optimizing.
   */
  setInputParams = (inputParams) => {
    this.lucidRenderer.setInputParams(inputParams);
    this.setClassObjFrequencyLevelWeights(
      this.lucidRenderer.objectiveParams.pyrLayerWeights);
    this.setContentImage();
  }

  /**
   * Set optimization objective type, can be called while optimizing.
   */
  setObjectiveType = (type) => {
    this.objectiveType = type;
    if(this.lucidRenderer) {
      this.lucidRenderer.setObjectiveType(type);
    }
  }

  /**
   * Get current objective type.
   */
  getObjectiveType = () => {
    return this.objectiveType;
  }

  /**
   * Sets selected layer. Not possible while optimizing.
   */
  setLayer = (layer) => {
    if(! this.lucidRenderer.isOptimizing) {
      this.lucidRenderer.setLayer(layer);
      return true;
    } else {
      return false;
    }
  }

  /**
   * Gets currently selected layer.
   */
  getLayer = () => {
    return this.lucidRenderer.objectiveParams.layer;
  }

  /**
   * Sets layer to get feature map tensors for.
   */
  setFeatureMapLayer = (layer) => {
    this.lucidRenderer.setFeatureMapLayer(layer);
  }

  /**
   * Sets channel index for 'channel' optimization objective.
   */
  setChannel = (channel) => {
    this.storeCurrentInput();
    this.lucidRenderer.setChannel(channel);
  }

  /**
   * Returns currently selected channel for 'channel' optimization objective.
   */
  getChannel = () => {
    return this.lucidRenderer.objectiveParams.channel;
  }

  /**
   * Sets neuron position for 'neuron' optimization objective.
   */
  setNeuron = (x, y) => {
    this.storeCurrentInput();
    const [cb, w, h, c] = this.lucidRenderer.getActivationShape();
    x = Math.min(w-1, x);
    y = Math.min(h-1, y);
    this.lucidRenderer.setNeuron(x, y);
  }

  /**
   * Returns currently selected neuron for 'neuron' optimization objective.
   */
  getNeuron = () => {
    const x = this.lucidRenderer.objectiveParams.neuronX;
    const y = this.lucidRenderer.objectiveParams.neuronY;
    return [x, y];
  }

  /**
   * Sets weights for individual pyramid layers when optimizing for 'class' objective. Experimental.
   */
  setClassObjFrequencyLevelWeights = (level) => {
    const nLayers = this.lucidRenderer.inputParams.pyramidLayers;
    const rangePerLayer = 1 / nLayers;
    const remainder =level % rangePerLayer;
    const fullLayers = Math.floor(level / rangePerLayer);
    const weights = [];
    for(let l=0; l<nLayers; l++){
      if(l<fullLayers) {
        weights.push(1);
      } else if (l < fullLayers + 1) {
        weights.push(remainder * nLayers);
      } else {
        weights.push(0);
      }
    }
    this.lucidRenderer.objectiveParams.pyrLayerWeights = weights.reverse();
  }

  /**
   * Set style image for 'style' objective.
   */
  setStyleImage = (styleImg) => {
    this.lucidRenderer.setStyleImage(styleImg);
  }

  /**
   * Returns current style image.
   */
  getStyleImage = () => {
    if(this.lucidRenderer.objectiveParams.styleImage){
      return this.lucidRenderer.objectiveParams.styleImage.dataSync();
    } else {
      return null;
    }
  }

  /**
   * Set content image for 'style' objective.
   */
  setContentImage = (contentImg) => {
    if(!contentImg){
      let transformF = (input) => input;
      if(this.lucidRenderer.transformF) {
        transformF = this.lucidRenderer.transformF;
      }
      const currInp = transformF(this.lucidRenderer.paramF(
      this.lucidRenderer.trainable,
      this.lucidRenderer.inputParams.pyrLayerWeights));
      contentImg = this.getImageDataFromTensor(currInp);
    }
    this.lucidRenderer.setContentImage(contentImg);
  }

  /**
   * Returns current content image.
   */
  getContentImage = () => {
    if(this.lucidRenderer.objectiveParams.contentImage){
      return this.lucidRenderer.objectiveParams.contentImage.dataSync();
    } else {
      return null;
    }
  }

  /**
   * Set style layers for 'style' objective.
   */
  setStyleLayers = (checkedLayers, type) => {
    let dict = this.getStyleLayers();
    dict = dict ? dict : {};
    if(type){
      dict[type] = checkedLayers;
    } else {
      dict = checkedLayers;
    }
    this.lucidRenderer.setStyleLayers(dict);
  }

  /**
   * Return current style layers for 'style' objective.
   */
  getStyleLayers = () => {
    return this.lucidRenderer.objectiveParams.styleLayers;
  }

  /**
   * Returns shape for style image.
   */
  getStyleImageShape = () => {
    const w = this.lucidRenderer.inputParams.inputSize;
    const sh = [1, w, w, 3]
    return sh;
  }

  /**
   * Sets activation modification parameters. Experimental.
   */
  setActivationModifications = (mods) => {
    const currMods = this.getActivationModifications();
    for(const [layerName, layerDict] of Object.entries(mods)){
      if(!(layerName in currMods)){
        currMods[layerName] = {};
      }
      for(const [channel, channelDict] of Object.entries(layerDict)){
        if(!(channel in currMods[layerName])){
          currMods[layerName][channel] = {
            'shift': 0,
            'scale': 1.0,
            'noise': 0,
          };
        }
        for(const [modType, value] of Object.entries(channelDict)){
          currMods[layerName][channel][modType] = value;
        }
      }
    }
  }

  /**
   * Returns activation modification parameters. Experimental.
   */
  getActivationModifications = () => {
    return this.lucidRenderer.objectiveParams.activationModifications;
  }

  /**
   * Sets class for 'class' optimization objective.
   */
  setClass = (classInd) => {
    this.storeCurrentInput();
    this.lucidRenderer.setClass(classInd);
  }
  /**
   * Returns current class for 'class' optimization objective.
   */
  getClass = () => {
    return this.lucidRenderer.objectiveParams.classInd;
  }

  /**
   * Set negative toggle to invert loss function.
   */
  setNegative = (negative) => {
    this.storeCurrentInput();
    this.lucidRenderer.setNegative(negative);
  }

  /**
   * Get current negative toggle status.
   */
  getNegative = () => {
    return this.lucidRenderer.objectiveParams.negative;
  }

  /**
   * Set jitter amount in pixels.
   */
  setJitter = (jitter) => {
    this.storeCurrentInput();
    this.lucidRenderer.setJitter(jitter);
  }

  /**
   * Returns current jitter.
   */
  getJitter = () => {
    return this.lucidRenderer.objectiveParams.jitter;
  }

  /**
   * Sets learning rate for optimizer.
   */
  setLearningRate = (learningRate) => {
    this.lucidRenderer.setLearningRate(learningRate);
  }

  /**
   * Returns current learning rate.
   */
  getLearningRate = () => {
    return this.lucidRenderer.objectiveParams.learningRate;
  }

  /**
   * Starts optimization loop.
   */
  startOptimization = (iterations=1000, optimCallback) => {
    this.lucidRenderer.startOptimization(iterations, optimCallback);
    this.loadStatus = loadStates.OPTIMIZING;
  }

  /**
   * Validates optimization input.
   */
  validateOptimizationInput = () => {
    const type = this.lucidRenderer.objectiveParams.type;
    if(type === objectiveTypes.STYLE
     && !this.lucidRenderer.objectiveParams.styleImage) {
       return ["Can't start optimization!", "No style image supplied."];
     } else if(type === objectiveTypes.ACT_ADJUST
      && Object.entries(
        this.lucidRenderer.objectiveParams.activationModifications)
        .length === 0
    ) {
      return ["Can't start optimization!",
      "No activation modifications supplied."];
    }

     return null;
  }

  /**
   * Downloads image data from tensor synchronously.
   */
  getImageDataFromTensor = (imT) => {
    const [b, h, w, ch] = imT.shape;
    const data = imT.dataSync();
    const imData = {
      data: data,
      width: w,
      height: h};
    return imData;
  }

  /**
   * Stops optimization loop.
   */
  stopOptimization = (cb) => {
    this.storeCurrentInput();
    this.loadStatus = loadStates.LOADED;
    this.lucidRenderer.stopOptimization(cb);
  }

  /**
   * Checks if renderer has input set.
   */
  hasCurrentInput = () => {
    return this.lucidRenderer.paramF || false;
  }

  /**
   * Returns current input as image data.
   * @param {*} pyrLayer if set, returns specified pyramid layer only.
   */
  getCurrentInput = (pyrLayer=undefined) => {
    if(!this.lucidRenderer.paramF) {
      throw "can't get current input before compiling input!";
    }

    pyrLayer = pyrLayer ? pyrLayer-1 : undefined;

    const imT = this.getCurrentInputTensor(pyrLayer);
    return imT.dataSync();
  }

  /**
   * Returns current input as tensor.
   * @param {*} pyrLayer if set, returns specified pyramid layer only.
   */
  getCurrentInputTensor = (pyrLayer=undefined) => {
    let trainable = this.lucidRenderer.trainable;
    if(pyrLayer !== undefined) {
      trainable = [trainable[pyrLayer]];
    }
    if(!this.lucidRenderer.paramF) {
      throw "can't get current input before compiling input!";
    }
    let imgToUint8 = this.deprocessImage(
      this.lucidRenderer.paramF(
        trainable,
        this.lucidRenderer.inputParams.pyrLayerWeights));

    if(pyrLayer!==undefined) {
      const [b, h, w, c] = imgToUint8.shape;
      const resizeFact = Math.pow(2, pyrLayer);
      //imgToUint8 = tf.image.resizeBilinear
      //(imgToUint8, [h*resizeFact, w*resizeFact]);
    }

    return imgToUint8;
  }

  /**
   * Gets last stored input for comparison view.
   */
  getLastInput = () => {
    return this.lastInput;
  }

  /**
   * Returns shape of last stored input.
   */
  getLastInputShape = () => {
    return this.lastInputShape;
  }

  /**
   * Stores current input for comparison view.
   */
  storeCurrentInput = () => {
    if(this.lucidRenderer.paramF) {
      this.lastInput = this.getCurrentInput();
      this.lastInputShape = this.lucidRenderer.model.input.shape;
    }
  }

  /**
   * Returns activations of current layers' activations as image data.
   * @param {*} channel Channel to get activations for.
   */
  getCurrentActivations = (channel) => {
    let mapT = this.lucidRenderer.getActivationMaps();
    if(channel !== undefined && mapT){
      const sh = mapT.shape;
      channel = Math.min(sh[0]-1, channel);
      mapT = this.lucidRenderer.getActivationMaps().slice(
        [channel, 0, 0, 0], [1, sh[1], sh[2], sh[3]]);
    }
    return mapT ? mapT.dataSync() : null;
  }

  /**
   * Returns mean and variance for activations of specified channel.
   */
  getActivationStats = (channel) => {
    let mapT = this.lucidRenderer.getActivationMaps();
    if(channel !== undefined && mapT){
      const sh = mapT.shape;
      channel = Math.min(sh[0]-1, channel);
      mapT = this.lucidRenderer.getActivationMaps().slice(
        [channel, 0, 0, 0], [1, sh[1], sh[2], sh[3]]);
    }
    if(mapT){
      const {mean, variance} = tf.moments(mapT);
      const stack = tf.stack([mean, variance]);
      return stack.dataSync();
    } else {
      return null;
    }
  }

  /**
   * Returns number of channels of current layer.
   */
  getChannelNumber = () => {
    return this.lucidRenderer.getChannelNumber();
  }

  /**
   * Returns class prediction for current input.
   */
  getCurrentPrediction = () => {
    if(!this.lucidRenderer.paramF) {
      throw "can't get current input before compiling input!";
    }
    return this.lucidRenderer.getClassPrediction.dataSync();
  }

  /**
   * Returns shape of activation tensor of currently selected layer.
   */
  getActivationShape = () => {
    return this.lucidRenderer.getActivationShape();
  }

  /**
   * Returns output shape for specified layer.
   */
  getShapeForLayer = (layer) => {
    return this.lucidRenderer.model.getLayer(layer).output.shape;
  }

  /**
   * Returns input shape for current model.
   */
  getModelInputShape = () => {
    if(this.lucidRenderer.model){
      return this.lucidRenderer.model.input.shape;
    } else {
      return null;
    }
  }

  /**
   * Returns currently selected input size.
   */
  getInputSize = () => {
    return this.lucidRenderer.inputParams.inputSize;
  }

  /**
   * Check if model is loaded.
   */
  hasModel = () => {
    return this.loadStatus === loadStates.LOADED ||
            this.loadStatus === loadStates.OPTIMIZING;
  }

  /**
   * Get image data in 0-255 range from tensor.
   * @param {*} x image tensor
   */
  deprocessImage(x) {
    return tf.tidy(() => {
      const max = x.max();
      const min = x.min();
      const range = max.sub(min);
      x = x.sub(min).div(range);
      // Add a small positive number (EPSILON) to the denominator to prevent
      // division-by-zero.
      // Clip to [0, 1].
      //x = x.add(0.5);
      x = tf.clipByValue(x, 0, 1);
      x = x.mul(255);
      return tf.clipByValue(x, 0, 255).asType('float32');
    });
  }

  /**
   * Check if renderer is optimizing.
   */
  isOptimizing() {
    return this.lucidRenderer.isOptimizing;
  }
}
