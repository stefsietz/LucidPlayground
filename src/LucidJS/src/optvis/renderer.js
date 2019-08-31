import {jitter, fixedScale, compose, standardTransforms} from './transform.js';
import {naiveFromImage, imgLaplacianPyramid,
  randLaplacianPyramid} from './param/image.js';
import {channel, deepdream, neuron, spatial, output,
activationModification, style} from './objectives.js';
import {inverseDecorrelate} from './param/color.js';

import * as tf from '@tensorflow/tfjs';

export const objectiveTypes = {
  LAYER: 'layer',
  CHANNEL: 'channel',
  CLASS: 'class',
  NEURON: 'neuron',
  SPATIAL: 'spatial',
  ACT_ADJUST: 'act. adjust',
  STYLE: 'style',
}

export const loadStates = {
  INITIAL: 'initial',
  LOADING: 'loading',
  LOADED: 'loaded',
  OPTIMIZING: 'optimizing',
}


export class LucidRenderer {
  constructor(){
    this.inputParams = {
      inputSize: 128,
      decorrelate: true,
      pyramidLayers: 4,
      baseImage: null,
    };

    this.objectiveParams = {
      type: objectiveTypes.LAYER,
      layer: '',
      featureMapLayer: '',
      channel: 0,
      neuronX: 0,
      neuronY: 0,
      classInd: 0,
      negative: false,

      pyrLayerWeights: [1, 1, 1, 1],

      jitter: 5,
      learningRate: 0.05,

      activationOverpaint: null,
      activationModifications: {},

      styleImage: null,
      styleLayers: {
        content: [],
        style: [],
      },
      contentImage: null,
    };

    this.featureMapAuxModel = null;
    this.layerOutput = null;
    this.featureMapLayerOutput = null;
    this.isOptimizing = false;

    this.activationShape = null;

    this.iterations = 0;
    this.optimizer = tf.train.adam(this.objectiveParams.learningRate);
    this.ctr = 0;
    this.optimCallback = () => {};
    this.stopOptimCb = () => {};

    tf.setBackend('webgl', true);
  }

  setModel = (model) => {
    this.model = model;
  }

  dispose = () => {
    this.featureMapAuxModel = null;
    this.layerOutput = null;
    this.featureMapLayerOutput = null;
    this.isOptimizing = false;

    this.activationShape = null;

    this.iterations = 0;
    this.optimizer = tf.train.adam(this.objectiveParams.learningRate);
    this.ctr = 0;
    this.optimCallback = () => {};
  }

  /**
   * initObjectiveParamsForModel - Initializes parameters according to model to provide
   * some fitting default parameters for convenience:
   * - layer: last Conv layer
   * - neuron: central neuron for initial layer
   *
   * @return {type}  description
   */
  initObjectiveParamsForModel = () => {
    let firstConvLayer = null;
    for (let layer of this.model.layers) {
      if('kernelSize' in layer) {
        firstConvLayer = layer;
        break;
      }
    }
    if(!firstConvLayer) {
      console.log("Didn't initialize target layer because no Conv2D layer \
      has been found!");
    } else {
      const [x, y] = this.getCentralNeuronCoords(firstConvLayer);
      this.objectiveParams.neuronX = x;
      this.objectiveParams.neuronY = y;

      this.objectiveParams.layer = firstConvLayer.name;
      this.objectiveParams.featureMapLayer = firstConvLayer.name;
    }
  }

  /**
   * setInputParams - Sets input params and causes re-compilation of model,
   * not possible during running optimization.
   *
   * @param  {type} inputParams inputParams object containing all necessary
   * properties
   * @return {type}
   */
  setInputParams = (inputParams) => {
    if(this.isOptimizing){
      throw "Can't change input params during optimization!";
    }
    for (const [key, value] of Object.entries(this.inputParams)) {
      if (!(key in inputParams)) {
        throw "Invalid input params, " + key + "is missing!\n" + inputParams;
      }
    }

    this.inputParams = inputParams;

    this.resizeStyleImage();

    this.compileInput();
  }

  compileInput = () => {
    const w = this.inputParams.inputSize;
    const h = this.inputParams.inputSize;
    const ch = this.model.input.shape[3];
    const pyrL = this.inputParams.pyramidLayers;
    const decorrelate = this.inputParams.decorrelate;

    if(this.inputParams.baseImage){
      //throw "not implemented in renderer yet! needs pyramid parametrisation.";
      const [imgF, trainable] = imgLaplacianPyramid(
        this.inputParams.baseImage, w, h, ch, undefined, decorrelate, pyrL);
        this.paramF = imgF;
        this.trainable = trainable;
    } else {
      const [pyramidF, trainable] = randLaplacianPyramid(w, h,
        ch, 1, 0.01, decorrelate, pyrL);
      this.paramF = pyramidF;
      this.trainable = trainable;
    }

    this.initTransformF();
  }

  startOptimization = (iterations=1000, optimCallback=() => {}) => {
    this.iterations=iterations;
    this.optimizer = tf.train.adam(this.objectiveParams.learningRate);
    this.ctr = 0;
    this.optimCallback = optimCallback;

    this.compileObjective();
    this.optimize();
  }

  stopOptimization = (cb) => {
    this.iterations = 0;
    this.ctr = 0;
    if(cb) {
      this.stopOptimCb = () => {
        cb();
        this.stopOptimCb = () => {};
      }
    }
  }

  canOptimize = () => {
    return this.layer !== ''
  }

  optimize = () => {
    this.isOptimizing = true;

    tf.tidy( () =>{

      const negLoss = this.optimizer.minimize(this.lossF, true, this.trainable);

      if (this.ctr++ < this.iterations) {
        this.optimCallback(false);
        requestAnimationFrame(()=>{
          this.optimize()});
      } else {
        this.isOptimizing = false;
        this.stopOptimization();
        this.optimCallback(true);
        this.stopOptimCb();
      }
    });
  }

  getClassPrediction = () => {
    const weights = this.objectiveParams.pyrLayerWeights;
    return tf.tidy(() => {
      const prediction = this.model.apply(
        this.fixedSizeTransformF(
          this.paramF(this.trainable, weights)), {training: true});

      let classProbs;
      if (Array.isArray(prediction)){
        classProbs = prediction[0].reshape([-1]);
      } else {
        classProbs = prediction.reshape([-1]);
      }

      const topClass = tf.argMax(classProbs);
      return topClass;
    });
  }

  getChannelNumber = () => {
    if(this.layerOutput) {
      const [b, w, h, ch] = this.layerOutput.shape;
      return ch;
    } else {
      return 0;
    }
  }

  getActivationMaps = () => {
    if(this.featureMapAuxModel) {
      return tf.tidy( () =>{
        const featureMaps = this.featureMapAuxModel.apply(
          this.paramF(this.trainable, this.objectiveParams.pyrLayerWeights), {training: false});
        this.activationShape = featureMaps.shape;

        let s = featureMaps.shape;
        let featureMapUint8 = featureMaps.transpose([3, 1, 2, 0])
        .reshape([s[3], s[1], s[2], 1]);

        featureMapUint8 = this.deprocessFeatureMap(featureMapUint8);

        return featureMapUint8;
      });
    } else {
      return null;
    }
  }

  getActivationShape = () => {
    if(this.featureMapAuxModel) {
      if(!this.activationShape){
        this.getActivationMaps();
      }
      return this.activationShape;
    } else {
      return null;
    }
  }

  deprocessFeatureMap(featureMap) {
    return tf.tidy(() => {
      const {mean, variance} = tf.moments(featureMap);
      let imgToUint8_fm = featureMap.sub(0);
      imgToUint8_fm = imgToUint8_fm.div(tf.sqrt(variance).add(.00001).mul(2));
      return imgToUint8_fm;
    });
  }

  setObjectiveType = (type) => {
    this.objectiveParams.type = type;
  }

  compileObjective = () => {
    this.compileLossF();

    this.setLayer(this.objectiveParams.layer);
    this.setFeatureMapLayer(this.objectiveParams.featureMapLayer);
  }

  compileLossF = () => {
    let transformF = this.transformF;
    if(this.objectiveParams.type === objectiveTypes.CLASS){
      transformF = this.fixedSizeTransformF;
    }
    this.lossF = () => {
      return tf.tidy(() => {
        const objF = this.getObjectiveF(this.objectiveParams.type);
        const ret = objF(transformF(this.paramF(
          this.trainable, this.objectiveParams.pyrLayerWeights)));
        return ret;
      });
    };
  }

  getObjectiveF = (type) => {
    const options = {
      layer: this.objectiveParams.layer,
      channel: this.objectiveParams.channel,
      neuron: [
        this.objectiveParams.neuronX,
        this.objectiveParams.neuronY
      ],
      out: this.objectiveParams.classInd,
      neg: this.objectiveParams.negative,
    }
    if(type === objectiveTypes.LAYER){
      return deepdream(this.model, options);
    } else if (type === objectiveTypes.CHANNEL){
      return channel(this.model, options);
    } else if (type === objectiveTypes.NEURON){
      return neuron(this.model, options);
    }  else if (type === objectiveTypes.SPATIAL){
      return spatial(this.model, options);
    } else if (type === objectiveTypes.CLASS){
      return output(this.model, options);
    } else if(type === objectiveTypes.ACT_ADJUST) {
      return activationModification(
        this.model, this.objectiveParams.contentImage,
        this.objectiveParams.activationModifications);
    } else if(type === objectiveTypes.STYLE) {
      const cLrs = this.objectiveParams.styleLayers.content;
      const sLrs = this.objectiveParams.styleLayers.style;
      return style(
        this.model, this.objectiveParams.contentImage,
        this.objectiveParams.styleImage, cLrs, sLrs);
    }
  }



  /**
   * setLayer - Sets layer for optimization objective. Can't change during
   * optimization. Resets target neuron to central neuron.
   *
   * @param  {type} layer layer to optimize for
   * @return {type}
   */
  setLayer = (layer) => {
    if(this.isOptimizing){
      throw "Can't change target layer during optimization!";
    }
    const changed = this.objectiveParams.layer !== layer;
    const outLayer = this.model.getLayer(layer);
    if(outLayer.outputShape.length !== 4) {
      throw "Can only select layers with 2D ouput!";
      return;
    }
    this.objectiveParams.layer = layer;
    this.layerOutput = outLayer.output;

    const [b, w, h, ch] = this.model.getLayer(layer).outputShape;

    //only layers with 2D output
    if(w && h && changed) {
      const [x, y] = this.getCentralNeuronCoords(outLayer);
      this.objectiveParams.neuronX = x;
      this.objectiveParams.neuronY = y;
    }
  }

  /**
   * setFeatureMapLayer - Sets layer to output featuremaps for.
   *
   * @param  {type} layer layer to output featuremaps for.
   * @return {type}
   */
  setFeatureMapLayer = (layer) => {
    this.objectiveParams.featureMapLayer = layer;
    const outLayer = this.model.getLayer(layer);
    this.featureMapLayerOutput = outLayer.output;

    this.featureMapAuxModel = tf.model(
      {inputs: this.model.inputs, outputs: this.featureMapLayerOutput});
  }

  /**
   * setChannel - Sets target channel. Can be changed interactively during
   * optimization.
   *
   * @param  {type} channel target channel
   * @return {type}
   */
  setChannel = (channel) => {
    if(channel < 0){
      throw "Channel index must be zero or positive!";
    }
    this.objectiveParams.channel = channel;
    this.compileLossF();
  }

  /**
   * setNeuron - Sets target neuron. Can be changed interactively during
   * optimization.
   *
   * @param  {type} x x coordinate of neuron in featuremap
   * @param  {type} y y coordinate of neuron in featuremap
   * @return {type}
   */
  setNeuron = (x, y) => {
    if(x < 0 || y < 0) {
      throw "Neuron indices must be zero or positive!";
    }
    this.objectiveParams.neuronX = x;
    this.objectiveParams.neuronY = y;
    this.compileLossF();
  }


  /**
   * getCentralNeuronCoords - Get the 2D coordinates of the central neuron for
   * a specific layer.
   *
   * @param  {type} layer layer to get neuron coordinates for.
   * @return {array}       [x, y]
   */
  getCentralNeuronCoords = (layer) => {
    if(!('kernelSize' in layer)){
      throw "Can't get central neuron coordinates for non-Conv2D layer!";
    }
    const [b, w, h, ch] = this.model.getLayer(layer.name).outputShape;
    const [bI, wI, hI, chI] = this.model.input.shape;
    const poolRatio = wI / w;
    const pooledW = this.inputParams.inputSize / poolRatio;
    return [Math.floor(pooledW/2), Math.floor(pooledW/2)];
  }

  setStyleImage = (styleImg) => {
    if(this.objectiveParams.styleImage) {
      this.objectiveParams.styleImage.dispose();
    }
    if(styleImg){
      const w = this.inputParams.inputSize;
      const [f, trainable] = naiveFromImage(
        styleImg, w, w, 3, 1, true);
      const frozenData = f(trainable).dataSync();
      const frozenT = tf.tensor(frozenData, [1, w, w, 3]);

      this.objectiveParams.styleImage = frozenT;
    } else {
      this.objectiveParams.styleImage = null;
    }
    this.compileLossF();
  }

  setContentImage = (contentImg) => {
    if(this.objectiveParams.contentImage) {
      this.objectiveParams.contentImage.dispose();
    }
    if(contentImg){
      const data = contentImg.data;
      const ch = data.length / (contentImg.width * contentImg.height);
      const imgShape = [1, contentImg.height, contentImg.width, ch];
      const contentImageT = tf.tensor(contentImg.data,
       imgShape, 'float32');

      this.objectiveParams.contentImage = contentImageT;
    } else {
      this.objectiveParams.contentImage = null;
    }
    this.compileLossF();
  }

  getResizedImage = (imData, w, h, ch=4) => {
    const resizedImage = tf.tidy(() => {
      const imgShape = [1, imData.height, imData.width, ch];

      let refImg = tf.tensor(Uint8Array.from(imData.data),
       imgShape, 'float32');
      refImg = tf.image.resizeBilinear(refImg, [w, h]);
      refImg = refImg.slice([0, 0, 0, 0], [1, h, w, 3]);

      const imageData = refImg.dataSync();
      const imT = tf.tensor(imageData,
       [1, h, w, 3], 'float32');
      return imT;
    });
    return resizedImage;
  }

  resizeStyleImage = () => {
    if(this.objectiveParams.styleImage) {
      const styleImageT = tf.tidy(() => {
        const w = this.inputParams.inputSize;
        const h = this.inputParams.inputSize;

        let refImg = tf.image.resizeBilinear(
          this.objectiveParams.styleImage, [w, h]);
        refImg = refImg.slice([0, 0, 0, 0], [1, h, w, 3]);

        const styleImageData = refImg.dataSync();
        const styleImT = tf.tensor(styleImageData,
         [1, h, w, 3], 'float32');
        return styleImT;
      })

      this.objectiveParams.styleImage.dispose();
      this.objectiveParams.styleImage = styleImageT;
    }
  }

  setStyleLayers = (styleLayers) => {
    this.objectiveParams.styleLayers = styleLayers;
    this.compileLossF();
  }

  /**
   * setClass - Sets target class. Can be changed interactively during
   * optimization.
   *
   * @param  {type} classInd target class index
   * @return {type}
   */
  setClass = (classInd) => {
    if(classInd < 0){
      throw "Class index must be zero or positive!";
    }
    this.objectiveParams.classInd = classInd;
    this.compileLossF();
  }


  /**
   * setNegative - Set negative optimization objective status
   *
   * @param  {type} negative negative optimization enabled
   * @return {type}
   */
  setNegative = (negative) => {
    this.objectiveParams.negative = negative;
    this.compileLossF();
  }


  /**
   * initTransformF - Builds input transform chain
   *
   * @return {type}  description
   */
  initTransformF = () => {
    let transforms = [jitter(this.objectiveParams.jitter)];
    let fixedSizeTransforms = [jitter(this.objectiveParams.jitter)];

    const [b, w, h, ch] = this.model.input.shape;
    fixedSizeTransforms.push(fixedScale([w, h]));

    this.fixedSizeTransformF = compose(fixedSizeTransforms);

    if(this.objectiveParams.type === objectiveTypes.CLASS) {
      this.transformF = compose(fixedSizeTransforms);
    } else {
      this.transformF = compose(transforms);
    }
  }


  /**
   * setJitter - Set input jitter
   *
   * @param  {type} jitter amount of jitter (defaults to 5)
   * @return {type}        description
   */
  setJitter = (jitter) => {
    this.objectiveParams.jitter = jitter;
    this.initTransformF();
    this.compileLossF();
  }

  /**
   * setJitter - Set input jitter
   *
   * @param  {type} jitter amount of jitter (defaults to 5)
   * @return {type}        description
   */
  setLearningRate = (learningRate) => {
    this.objectiveParams.learningRate = learningRate;
    if(this.optimizer){
      this.optimizer.learningRate = learningRate;
    }
  }
}
