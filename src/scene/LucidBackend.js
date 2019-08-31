import {randImage, naiveFromImage, randLaplacianPyramid} from '../LucidJS/src/optvis/param/image.js';
import {compose, standardTransforms, fixedScale} from '../LucidJS/src/optvis/transform.js';
import {channel, deepdream, neuron, output} from '../LucidJS/src/optvis/objectives.js';
import {objectiveTypes, loadStates, LucidRenderer} from '../LucidJS/src/optvis/renderer.js';

import {fillCanvasPixelsWithRgbAndAlpha, fillCanvasPixelsWithGreyAndAlpha}
from '../DrawingHelper.js';
import * as tf from '@tensorflow/tfjs';

export class LucidBackend{
  constructor(){
    this.loadStatus = loadStates.INITIAL;
    this.objectiveType = objectiveTypes.CHANNEL;

    this.lastInput = null;
    this.lastInputShape = null;

    this.lucidRenderer = new LucidRenderer();
    this.lucidRenderer.setObjectiveType(this.objectiveType);
  }

  async loadModelFromFile(topoFile, weightFiles, progressCb){
    await this.loadModel(tf.io.browserFiles(
      [topoFile, ...weightFiles]), progressCb);
  }

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

  getModel = () => {
    return this.lucidRenderer.model;
  }

  getModelName = () => {
    return this.lucidRenderer.model.name;
  }

  getLoadStatus = () => {
    return this.loadStatus;
  }

  canOptimize = () => {
    return this.lucidRenderer.canOptimize() && !this.lucidRenderer.isOptimizing;
  }

  isOptimizing = () => {
    return this.lucidRenderer.isOptimizing;
  }

  getInputParams = () => {
    return this.lucidRenderer.inputParams;
  }

  resetInput = () => {
    this.lucidRenderer.compileInput();
    this.lucidRenderer.objectiveParams.activationModifications = {};
    this.setContentImage();
  }

  setInputParams = (inputParams) => {
    this.lucidRenderer.setInputParams(inputParams);
    this.setClassObjFrequencyLevelWeights(
      this.lucidRenderer.objectiveParams.pyrLayerWeights);
    this.setContentImage();
  }

  setObjectiveType = (type) => {
    this.objectiveType = type;
    if(this.lucidRenderer) {
      this.lucidRenderer.setObjectiveType(type);
    }
  }

  getObjectiveType = () => {
    return this.objectiveType;
  }

  setLayer = (layer) => {
    if(! this.lucidRenderer.isOptimizing) {
      this.lucidRenderer.setLayer(layer);
      return true;
    } else {
      return false;
    }
  }

  getLayer = () => {
    return this.lucidRenderer.objectiveParams.layer;
  }

  setFeatureMapLayer = (layer) => {
    this.lucidRenderer.setFeatureMapLayer(layer);
  }

  setChannel = (channel) => {
    this.storeCurrentInput();
    this.lucidRenderer.setChannel(channel);
  }

  getChannel = () => {
    return this.lucidRenderer.objectiveParams.channel;
  }

  setNeuron = (x, y) => {
    this.storeCurrentInput();
    const [cb, w, h, c] = this.lucidRenderer.getActivationShape();
    x = Math.min(w-1, x);
    y = Math.min(h-1, y);
    this.lucidRenderer.setNeuron(x, y);
  }

  getNeuron = () => {
    const x = this.lucidRenderer.objectiveParams.neuronX;
    const y = this.lucidRenderer.objectiveParams.neuronY;
    return [x, y];
  }

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

  setStyleImage = (styleImg) => {
    this.lucidRenderer.setStyleImage(styleImg);
  }

  getStyleImage = () => {
    if(this.lucidRenderer.objectiveParams.styleImage){
      return this.lucidRenderer.objectiveParams.styleImage.dataSync();
    } else {
      return null;
    }
  }

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

  getContentImage = () => {
    if(this.lucidRenderer.objectiveParams.contentImage){
      return this.lucidRenderer.objectiveParams.contentImage.dataSync();
    } else {
      return null;
    }
  }

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

  getStyleLayers = () => {
    return this.lucidRenderer.objectiveParams.styleLayers;
  }

  getStyleImageShape = () => {
    const w = this.lucidRenderer.inputParams.inputSize;
    const sh = [1, w, w, 3]
    return sh;
  }

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

  getActivationModifications = () => {
    return this.lucidRenderer.objectiveParams.activationModifications;
  }

  setClass = (classInd) => {
    this.storeCurrentInput();
    this.lucidRenderer.setClass(classInd);
  }

  getClass = () => {
    return this.lucidRenderer.objectiveParams.classInd;
  }

  setNegative = (negative) => {
    this.storeCurrentInput();
    this.lucidRenderer.setNegative(negative);
  }

  getNegative = () => {
    return this.lucidRenderer.objectiveParams.negative;
  }

  setJitter = (jitter) => {
    this.storeCurrentInput();
    this.lucidRenderer.setJitter(jitter);
  }

  getJitter = () => {
    return this.lucidRenderer.objectiveParams.jitter;
  }

  setLearningRate = (learningRate) => {
    this.lucidRenderer.setLearningRate(learningRate);
  }

  getLearningRate = () => {
    return this.lucidRenderer.objectiveParams.learningRate;
  }

  startOptimization = (iterations=1000, optimCallback) => {
    this.lucidRenderer.startOptimization(iterations, optimCallback);
    this.loadStatus = loadStates.OPTIMIZING;
  }

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

  getImageDataFromTensor = (imT) => {
    const [b, h, w, ch] = imT.shape;
    const data = imT.dataSync();
    const imData = {
      data: data,
      width: w,
      height: h};
    return imData;
  }

  stopOptimization = (cb) => {
    this.storeCurrentInput();
    this.loadStatus = loadStates.LOADED;
    this.lucidRenderer.stopOptimization(cb);
  }

  hasCurrentInput = () => {
    return this.lucidRenderer.paramF || false;
  }

  getCurrentInput = (pyrLayer=undefined) => {
    if(!this.lucidRenderer.paramF) {
      throw "can't get current input before compiling input!";
    }

    pyrLayer = pyrLayer ? pyrLayer-1 : undefined;

    const imT = this.getCurrentInputTensor(pyrLayer);
    return imT.dataSync();
  }

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

  getLastInput = () => {
    return this.lastInput;
  }

  getLastInputShape = () => {
    return this.lastInputShape;
  }

  storeCurrentInput = () => {
    if(this.lucidRenderer.paramF) {
      this.lastInput = this.getCurrentInput();
      this.lastInputShape = this.lucidRenderer.model.input.shape;
    }
  }

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

  getChannelNumber = () => {
    return this.lucidRenderer.getChannelNumber();
  }

  getCurrentPrediction = () => {
    if(!this.lucidRenderer.paramF) {
      throw "can't get current input before compiling input!";
    }
    return this.lucidRenderer.getClassPrediction.dataSync();
  }

  getActivationShape = () => {
    return this.lucidRenderer.getActivationShape();
  }

  getShapeForLayer = (layer) => {
    return this.lucidRenderer.model.getLayer(layer).output.shape;
  }

  getModelInputShape = () => {
    if(this.lucidRenderer.model){
      return this.lucidRenderer.model.input.shape;
    } else {
      return null;
    }
  }

  getInputSize = () => {
    return this.lucidRenderer.inputParams.inputSize;
  }

  hasModel = () => {
    return this.loadStatus === loadStates.LOADED ||
            this.loadStatus === loadStates.OPTIMIZING;
  }

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

  isOptimizing() {
    return this.lucidRenderer.isOptimizing;
  }
}
