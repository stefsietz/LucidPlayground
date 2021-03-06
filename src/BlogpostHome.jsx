import { Fab, LinearProgress, Modal, Tooltip, Typography, Switch
 } from "@material-ui/core";
import HelpIcon from '@material-ui/icons/Help';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import ArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import SchoolIcon from '@material-ui/icons/School';
import * as d3 from "d3";
import React, { Component } from 'react';
import "./blogpost.css";
import "./Home0.css";
import { loadStates } from './LucidJS/src/optvis/renderer.js';
import Graph from './scene/Graph.js';
import { LucidBackend } from './scene/LucidBackend.js';
import { ttHelp } from './strings';
import { buildTour } from './TourBuilder';
import alertDialog from './ui/AlertDialog';
import MnistClassDemo from './ui/blogpostComponents/MnistClassDemo';
import ObjectiveDemo from './ui/blogpostComponents/ObjectiveDemo';
import PyramidDemo from './ui/blogpostComponents/PyramidDemo';
import DetailView from './ui/DetailView0';
import GraphView from './ui/GraphView';
import LoadView from './ui/LoadView';
import ParamView from './ui/ParamView';
import { loadJSON, loadJSONFromLocalFile } from './util.js';
import { getImgDataFromFile } from './DrawingHelper'

export const scdryPrvMode = {
  COMPARE: 'compare',
  NEURON: 'neuron',
  PAINT: 'paint',
  ACT_ADJUST: 'act_adjust',
  STYLE: 'style'
}

export const objectiveTypes = {
  LAYER: 'layer',
  CHANNEL: 'channel',
  CLASS: 'class',
  NEURON: 'neuron',
  SPATIAL: 'spatial',
}

export const learningRates = [0.00005, 0.0001, 0.0005, 0.001,
  0.005, 0.01, 0.05, 0.1, 0.5, 1, 5];

/**
 * Represents main component containing blogpost and normal GUI at the top.
 */
export default class BlogpostHome extends Component {

  constructor(props) {
    super(props);

    this.modelList = require('./model/models.json');
    this.imnetClasses = require('./model/imnet_classes.json');
    this.mnistClasses = require('./model/mnist_classes.json');
    this.graph2Key = require('./model/graphName2Key.json');

    this.state = {
      graph: null,
      modelName: "",
      loadStatus: loadStates.INITIAL,

      inputSize: 128,
      pyramidLayers: 4,
      showPyrLayer: 0,
      decorrelate: true,
      baseImage: null,

      layer: 'mixed4a_pre_relu',
      learningRate: 6,
      classInd: 0,
      classList: [],
      pyrLayerWeight: 1,

      prvMode: scdryPrvMode.COMPARE,

      alertDialogMessage: null,

      showHelp: false,
      tour: null,

      showProgress: false,
      modelProgress: 0,

      scrollTriggers: true,
    };
    this.LB = new LucidBackend();
  }

  /**
   * Returns graph view JSX
   */
  graphview() {
    return (
      <GraphView
        loadStatus={this.state.loadStatus}
        modelName={this.state.modelName}
        graph={this.state.graph}
        clickedNode={(node) => {
          this.LB.setLayer(node.name);
          this.LB.setFeatureMapLayer(node.name);
          this.setState(this.state);
        }}
      />);
  }

  /**
   * Returns detail view JSX
   */
  detailview() {
    let currentInput = this.LB.hasCurrentInput() ?
      this.LB.getCurrentInput() :
      undefined;

    return (<DetailView
      showHelp={this.state.showHelp}
      inputSize={this.LB.getInputSize()}
      loadStatus={this.LB.getLoadStatus()}
      selectedLayer={this.LB.getLayer()}
      currentInput={currentInput}
      inputShape={this.LB.getModelInputShape()}
      lastInput={this.LB.getLastInput()}
      lastInputShape={this.LB.getLastInputShape()}
      activations={this.LB.getCurrentActivations()}
      activationShape={this.LB.getActivationShape()}
      detailActivations={this.LB.getCurrentActivations(this.LB.getChannel())}
      detailActivationStats={this.LB.getActivationStats(this.LB.getChannel())}
      channelNumber={this.LB.getChannelNumber()}
      selectedChannel={this.LB.getChannel()}
      channelChanged={(chInd) => {
        this.LB.setChannel(chInd);
        console.log(chInd);

        this.setState(this.state);
      }}
      selectedNeuron={this.LB.getNeuron()}
      neuronChanged={(x, y) => {
        this.LB.setNeuron(x, y);
        this.setState(this.state);
      }}
      activationMods={this.LB.getActivationModifications()}
      activationsModified={(mods) => {
        this.LB.setActivationModifications(mods);
      }}
      onReset={() => {
        this.LB.resetInput();
        this.setState(this.state);
      }}
      prvMode={this.state.prvMode}
      prvModeChanged={(mode) => {
        this.setState({ prvMode: mode });
      }}
      styleImage={this.LB.getStyleImage()}
      styleImageShape={this.LB.getStyleImageShape()}
      uploadedStyleImage={(styleImage) => {
        this.LB.setStyleImage(styleImage);
        this.setState(this.state);
      }}
      layerList={this.state.graph ?
        this.state.graph.getSortedLayerList() : []}
      styleLayers={this.LB.getStyleLayers()}
      styleLayerChanged={(layerName, type) => {
        const dict = this.LB.getStyleLayers();
        const list = dict[type];

        const currentIndex = list.indexOf(layerName);
        const newChecked = [...list];

        if (currentIndex === -1) {
          newChecked.push(layerName);
        } else {
          newChecked.splice(currentIndex, 1);
        }
        this.LB.setStyleLayers(newChecked, type);
        this.setState(this.state);
      }}
    />);
  }

  /**
   * Returns load title depending on load state.
   */
  loadTitle() {
    if (this.LB.getLoadStatus() === loadStates.INITIAL) {
      return "No graph loaded";
    } else if (this.LB.getLoadStatus() === loadStates.LOADING) {
      return "Loading " + this.state.modelName;
    } else {
      return this.state.modelName;
    }
  }

  /**
   * Callback for model loading progress.
   */
  progressCb = (progress) => {
    this.setState({ modelProgress: progress });
  }

  /**
   * Lads model from list of files (json and bin files all in one list)
   */
  loadModelFromFile = (files) => {
    let topoFile;
    const weightFiles = [];
    for (const file of files) {
      if (file.name.endsWith('.json')) {
        topoFile = file;
      } else {
        weightFiles.push(file);
      }
    }
    loadJSONFromLocalFile(topoFile, (modelJson) => {
      let modelName = modelJson.modelTopology.model_config.config.name;
      modelName = this.graph2Key[modelName];
      const model = this.modelList[modelName];

      this.setStartModelLoadingState(model, modelJson);
    });

    this.LB.loadModelFromFile(topoFile, weightFiles, this.progressCb).then(() => {
      this.setFinishModelLoadingState();
    });
  }

  /**
   * Loads model from URL
   */
  loadModel = (model, showModal = true, initialLayer = undefined, cb = undefined) => {
    const modelPath = process.env.PUBLIC_URL + '/' + model.path;
    loadJSON(modelPath, (modelJson) => {
      this.setStartModelLoadingState(model, modelJson, showModal);
    });

    this.LB.loadModel(modelPath, this.progressCb).then(() => {
      this.setFinishModelLoadingState();
      if (initialLayer) {
        this.LB.setLayer(initialLayer);
        this.LB.setFeatureMapLayer(initialLayer);
      }
      this.LB.setObjectiveType(objectiveTypes.LAYER);
      this.setState(this.state);
      if (cb) {
        cb();
      }
    });
  }

  /**
   * Callback called after loading model has finished.
   */
  setFinishModelLoadingState = () => {
    const ip = this.LB.getInputParams();
    this.setState({
      inputSize: ip.inputSize,
      pyramidLayers: ip.pyramidLayers,
      decorrelate: ip.decorrelate,
      baseImage: ip.baseImage,
      showProgress: false,
      loadStatus: loadStates.LOADED,
    });
    this.LB.setLearningRate(learningRates[this.state.learningRate]);
  }

  /**
   * Called before starting model loading, sets up progress bar.
   */
  setStartModelLoadingState = (model, modelJson, showModal) => {
    const classList = this.getClasslist(model.classlist);

    this.setState({
      modelName: model.name,
      classList: classList,
      showProgress: showModal,
      modelProgress: 0,
      loadStatus: loadStates.LOADING,
    });

    if ("defaultStyleLayers" in this.modelList[model.name]) {
      const defaultStyleLayers =
        this.modelList[model.name]["defaultStyleLayers"];
      this.LB.setStyleLayers(defaultStyleLayers);
    }
    const graph = new Graph(modelJson);
    const distDict = graph.getLayoutByInputDist();
    this.setState({ graph: graph });
  }

  /**
   * Sets up default parameters for inception model.
   */
  setupInceptionParams = () => {
    this.setState({
      inputSize: 128,
      pyramidLayers: 4,
      decorrelate: true,
      baseImage: null,
    }, () => {
      const inputParams = {
        inputSize: this.state.inputSize,
        pyramidLayers: this.state.pyramidLayers,
        decorrelate: this.state.decorrelate,
        baseImage: this.state.baseImage,
      }
      this.LB.setInputParams(inputParams);
      this.LB.setObjectiveType(objectiveTypes.CHANNEL);
      this.setState(this.state);
    });
  }

  /**
   * Sets up default parameters for Mnist model.
   */
  setupMnistParams = () => {
    this.setState({
      inputSize: 32,
      pyramidLayers: 4,
      showPyrLayer: 0,
      decorrelate: true,
      baseImage: null,
    }, () => {
      const inputParams = {
        inputSize: this.state.inputSize,
        pyramidLayers: this.state.pyramidLayers,
        decorrelate: this.state.decorrelate,
        baseImage: this.state.baseImage,
      }
      this.LB.setInputParams(inputParams);
      this.LB.setObjectiveType(objectiveTypes.CLASS);
      this.setState(this.state);
    });
  }
 
  componentDidMount() {
    document.body.onscroll = this.checkOnScrollEvents;
  }

  /**
   * Action for "apply" button in parameter view.
   */
  applyInputParams = () => {
    if (!this.LB.hasModel()) {
      this.setState({
        alertDialogMessage: [
          "Can't apply input params.", 'Please load model first!'
        ]
      })
      return;
    }
    const inputParams = {
      inputSize: this.state.inputSize,
      pyramidLayers: this.state.pyramidLayers,
      decorrelate: this.state.decorrelate,
      baseImage: this.state.baseImage,
    }
    this.LB.setInputParams(inputParams);
    this.setState(this.state);
  }

  /**
   * Renders this react component
   * @returns {*} the components contents
   */
  render() {
    return (<div style={{
      width: "100%", height: "90vh", position: "absolute",
      top: 0, left: 0
    }}>
      <div style={{
        width: "100%", height: "100%", display: 'flex',
        flexDirection: 'row', justifyContent: "center", alignItems: "center"
      }}
        className="noScroll" >
        <div style={{
          flex: '0 1 auto', width: "40%",
          height: "100%", borderRight: '1px solid darkgray',
          display: "flex", flexDirection: "column"
        }}>
          <div style={{
            flex: '0 1 120px', width: "100%"
          }}>
            <LoadView
              models={this.modelList}
              title={this.loadTitle()}
              canOptimize={this.LB.canOptimize()}
              isOptimizing={this.LB.isOptimizing()}
              onLoadModel={this.loadModel}
              onLoadModelFromFile={this.loadModelFromFile}
              onOptimize={() => {
                const validationMessage = this.LB.validateOptimizationInput();
                if (validationMessage) {
                  this.setState({ alertDialogMessage: validationMessage });
                } else {
                  this.LB.startOptimization(20000, (stopped) => {
                    if (!stopped) {
                      this.setState({
                        loadStatus: loadStates.OPTIMIZING,
                      });
                    } else {
                      this.setState({ loadStatus: loadStates.LOADED });
                    }
                  });
                }
              }}
              stopOptimization={() => {
                this.LB.stopOptimization();
                this.setState({ loadStatus: loadStates.LOADED });
              }}
              showHelp={this.state.showHelp}
            />
          </div>
          <div style={{
            flex: '1 1 auto', width: "100%", height: "50%"
          }}>
            {this.graphview()}
          </div>
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column',
          flex: '1 1 auto', width: "60%", height: '100%'
        }}>
          <div style={{
            flex: '0 1 auto', width: "100%", height: '190px',
            borderBottom: '1px solid darkgray'
          }}>
            <ParamView
              showHelp={this.state.showHelp}
              loadStatus={this.state.loadStatus}
              classList={this.state.classList}
              classInd={this.state.classInd}
              onApplyInputParams={this.applyInputParams}
              inputSize={this.state.inputSize}
              pyramidLayers={this.state.pyramidLayers}
              decorrelate={this.state.decorrelate}
              baseImage={this.state.baseImage}
              objectiveType={this.LB.getObjectiveType()}
              jitter={this.LB.getJitter()}
              negative={this.LB.getNegative()}
              learningRate={this.state.learningRate}
              learningRates={learningRates}
              pyrLayerWeight={this.state.pyrLayerWeight}
              handleInputChange={(stateChange) => {
                this.setState(stateChange);
              }
              }
              changedObjective={(newObjective) => {
                this.LB.setObjectiveType(newObjective);
                let prvMode;
                if (newObjective === objectiveTypes.NEURON) {
                  prvMode = scdryPrvMode.NEURON;
                } else if (newObjective === objectiveTypes.ACT_ADJUST) {
                  prvMode = scdryPrvMode.ACT_ADJUST;
                } else if (newObjective === objectiveTypes.STYLE) {
                  prvMode = scdryPrvMode.STYLE;
                }
                if (prvMode) {
                  this.setState({ prvMode: prvMode });
                } else {
                  this.setState(this.state);
                }
              }
              }
              changedClassInd={(newClassInd) => {
                this.LB.setClass(newClassInd);
                this.setState({
                  classInd: newClassInd,
                });
              }}
              changedJitter={(newJitter) => {
                this.LB.setJitter(newJitter);
                this.setState(this.state);
              }
              }
              changedNegative={(newNegative) => {
                this.LB.setNegative(newNegative);
                this.setState(this.state);
              }
              }
              changedLearningRate={(newLearningRate) => {
                this.LB.setLearningRate(learningRates[newLearningRate]);
                this.setState({ learningRate: newLearningRate });
              }}
              changedPyrLayerWeight={(newPyrLayerWeight) => {
                this.LB.setClassObjFrequencyLevelWeights(newPyrLayerWeight);
                this.setState({ pyrLayerWeight: newPyrLayerWeight });
              }}
            />
          </div>
          <div style={{ flex: '1 1 auto', width: "100%", height: "50%" }}>
            {this.detailview()}
          </div>
        </div>
        <Tooltip title={ttHelp}>
          <Fab
            color="primary"
            style={{
              position: "absolute",
              left: "10px",
              bottom: "10px",
              zIndex: 10
            }}
            onClick={() => {
              this.setState({ showHelp: !this.state.showHelp });
            }}>
            {this.state.showHelp ?
              (<HelpIcon />) : (<HelpOutlineIcon />)}
          </Fab>
        </Tooltip>
        <Tooltip title="Intro tour">
          <Fab
            color="primary"
            style={{
              position: "absolute",
              left: "10px",
              bottom: "80px",
              zIndex: 10
            }}
            onClick={this.startTour}>
            <SchoolIcon />
          </Fab>
        </Tooltip>
      </div>
      <div className="more">
        <Fab onClick={() => {
          let position = 800;
          d3.transition()
            .duration(1000)
            .tween("scroll", this.scrollTween(position));
        }}>
          <ArrowDownIcon />
        </Fab>
      </div>
      <article id="article-text">
        <div className="l--body">
          <div style={{position: "sticky", top: 0, padding: "10px",
        backgroundColor: "#F7F7F7", marginBottom: "35px"}}>
          <div className="splitParamGroup" style={{width: "250px"}}>
                <Typography className="wholeWidth">Enable scroll triggers</Typography>
                <Switch className="wholeWidth"
                checked={this.state.scrollTriggers}
                onChange={(e, v) => {
                    this.setState({scrollTriggers: v});
                  }
                }></Switch>
              </div>
          </div>

          <h2>Explorable feature visualization</h2>
          < p> Excellent explanations of feature visualization already exist in
            the form of interactive articles, e.g. 
            <a href="https://github.com/google/deepdream"> DeepDream</a>,
            <a href="https://distill.pub/2017/feature-visualization/"> Feature Visualization</a>, 
            <a href="https://distill.pub/2018/building-blocks/"> The Building Blocks of Interpretability</a>, 
            <a href="https://distill.pub/2019/activation-atlas/"> Activation Atlas</a>, 
            <a href="https://www.auduno.com/2015/07/29/visualizing-googlenet-classes/"> Visualizing GoogLeNet Classes</a>. 
            They mostly rely on curated prerendered visualizations,
            additionally providing colab notebooks or public repositories
            allowing the reader to reproduce those results. While precalculated
            visualizations have many advantages (directability, more processing
            budget), they are always discretized samples of a continuous
            parameter space.
            In the spirit of <a href="https://playground.tensorflow.org">
              Tensorflow Playground</a>, this project aims at
            providing a fully interactive interface to some basic functionality
            of the originally Python-based <a href="https://github.com/tensorflow/lucid">
              Lucid</a> library, roughly
            corresponding to the concepts presented in the “Feature
            Visualization" article. The user is invited to explore the effect of
            parameter changes in a playful way and without requiring any
            knowledge of programming, enabled by an implementation on top of
            <a href="https://www.tensorflow.org/js"> TensorFlow.js</a>. Live updates of the generated input image as well as
            feature map activations should give the user a visual intuition to
            the otherwise abstract optimization process. Further, this interface
            opens the domain of feature visualization to non-experts, as no
            scripting is required.
            </p>
          <h2>What is feature visualization good for?</h2>
          <p>
          Let’s recall the general structure of a typical deep classification CNN: We start with a relatively high resolution input (e.g. 224x224 px) and process the image with a bunch of learned convolution filters, that all respond to different features (local intensity patterns), as well as point-wise activation functions (ReLU and alike) and pooling layers that reduce spatial resolution, until we get our final feature layer that has typically a low resolution like 7x7 px and is fed into some kind of classification network.

          Simplistically this process can be described like so:
          The network first looks at low level features like edges in various
          directions, corners, etc.
          Then it looks for patterns that are formed by these edges and corners.
          Then it looks for larger patterns that are formed by the smaller
          patterns from the last layers.
          This is repeated several times.
          Then it looks where the various high level patterns from the last 2d
          layer are located and reasons about the class. (Sometimes the “where”
          is not included in the reasoning)
          </p>

          <div className="videoBox">
          <video width="730" controls>
            <source src="videos/layer_activations_retimed.mp4" type="video/mp4"/>
            Your browser does not support the video tag.
          </video>
          <p>
          In the video above, you can see the graph view juxtaposed to the activation
          view. We step through the network (Inception V1) from top to bottom,
          clicking on some of the layers to reveal their activations. Red pixels
          represent positive values and blue pixels represent negative values.
          These red and blue images are the feature maps derived from the input
          image. The video is sped up 5 times, but if you look carefully, you
          will see that pooling layers reduce the resolution and that ReLU layers cut
          off the negative parts, leaving only the red pixels. At the end we
          scroll out (shift + scroll wheel) to reveal many more of the activated
          feature maps of the layer right before the global average pooling. The
          scrolling almost mimics the pooling operation, reducing each feature
          map to just a single value. At this point, the convolutional part of
          the network is over and the pooled values are fed into a fully
          connected layer of the classification part.
          </p>
          </div>

          <p>
          What do these patterns look like? How do we visualize them? This is
          what feature visualization is about. We could simply look at the
          learned convolution kernels and try to figure out what they respond
          to. On the first layer, this <a href="https://www.researchgate.net/figure/filters-from-the-first-layer-left-AlexNet-Right-our-ConvNet_fig2_282211796">might actually work</a>,
          especially for networks where larger kernels (like 11x11 in AlexNet) are
          used.
          From the second layer onward, the detected patterns depend on
          the previous layers as well though, and looking at the kernels
          themselves doesn’t give us very useful information.
          So, to visualize what the later layers respond to, we have to work
          with more sophisticated techniques. It turns out that gradient ascent,
          which can be explained as deriving how each input pixel influences the
          activation of interest and then updating the pixels in a way that
          increases the activation the most, is a pretty good option.
          </p>
          <div className="videoBox">
          <img src="img/conv2d1.png" width="730" />
          <p>
          This image shows some examples of the type of features the first layer of
          AlexNet responds to: At this stage we see mostly lines of various directions and
          colours.
          </p>
          </div>
          <p>
          Instead of optimizing for channels in the network, that respond to
          increasingly rich patterns when traversing the network, we can also
          optimize for the class activations directly (before the softmax to be
          exact). In theory it would be reasonable to assume that this should
          give us images that look like their respective class: optimizing for
          outptut “cat” should give us an image for a cat, right? In practice,
          this is not the case at all, and to get an image that looks somewhere
          near what we would expect, a bunch of regularization “tricks” have to
          be used. From a different perspective, if a classification network
          would exclusively result in “real” looking images of the respective
          class when maximizing a certain output, we could reasonably assume
          that the model is robust and has a good understanding of how the
          object really looks like, having not just learned to collect evidence
          from various patterns that are present in the image. I wouldn't dare
          to assume that this is actually possible with how current CNN
          architectures are constructed, though.

          </p>
          <h2>A short explanation how feature visualization works</h2>
          <p>
          When training a classification neural network, we have fixed input
          (the training set) and variable network weights that are adjusted by
          the training procedure to produce a wanted output (the classes). For
          feature visualization of a pre-trained network the roles are swapped.
          The weights of the network remain fixed after training on the dataset
          (e.g. ImageNet), while the input pixels are the optimization
          parameters. There are multiple types of optimization objectives,
          defined by certain characteristics of the feature map activations one
          wants to achieve. This might be maximising the activation values of a
          single feature map (“channel”) of a specific layer, maximising the
          mean squared activations of all channels of a layer (this is what
          “DeepDream” does), maximising class probability etc...
          More of this later.

  
          </p>
          <p>
          Let’s look at some examples of exploring concepts presented in the
          feature visualization article. First, we always have to load a
          pre-trained model (we use “model” synonymously with “network” here).
          In the full interface you can select between multiple models, here we
          will stick to Inception V1. The models are quite memory consuming.
          Inception V1 for example has a size of 54mb. You can see the model
          loading progress here:
          </p>
          <div id="inlineLoadProgressBar"
            style={{ position: "static" }} className="inlineModelProgressBar">
            <h2>Loading model...</h2>
            <LinearProgress
              variant="determinate"
              value={this.state.modelProgress * 100} />
          </div>
          <h2>1. Preconditioning and Parametrization</h2>
          <p>
          If you are familiar with the “Feature Visualization” article, you
          might wonder why the penultimate section of the article is presented
          as the usage example. The reason is that setting up the right
          parametrization was probably the most important step to achieve
          results resembling the output of Python-based Lucid. Roughly speaking,
          a naive optimization of the image pixels leads to predominant
          generation of high frequency patterns. Refer to the article for
          details. Python-Lucid circumvents this by providing the option to
          parametrize the image in fourier space, giving equal weight to all
          frequencies. As TensorflowJS does not yet provide a fourier transform
          operation, we use an alternative inspired by DeepDream with tensorflow
          notebook: The gaussian pyramid (footnote: we use a simplification by
          using only bilinear resizing instead of gaussian blur + resizing). The
          concept of this parametrization can be explained quite simply: Instead
          of a single full resolution layer, the gaussian pyramid consists of
          the sum of multiple layers of increasing resolution. A 16x16 image for
          example might be parameterized by a 1x1 image plus 2x2, plus 4x4, plus
          8x8, plus 16x16. Each of those pyramid layers have their own
          variables, receiving their own optimization update, leading to a more
          equal distribution of the gradient over the frequency spectrum. The
          input parameter interface gives you the ability to experiment with the
          depth of the pyramid, 2 layers in our example would result in a 8x8 +
          16x16 image representation. </p>
          <div className="inlineGUIContainer">
            <PyramidDemo
              inputSize={this.LB.getInputSize()}
              currentInput={this.LB.hasCurrentInput() ?
                this.LB.getCurrentInput(this.state.showPyrLayer) :
                undefined}
              inputShape={this.LB.getModelInputShape()}
              loadStatus={this.state.loadStatus}
              onApplyInputParams={() => {
                if (!this.LB.hasModel()) {
                  this.setState({
                    alertDialogMessage: [
                      "Can't apply input params.", 'Please load model first!'
                    ]
                  })
                  return;
                }
                const inputParams = {
                  inputSize: this.state.inputSize,
                  pyramidLayers: this.state.pyramidLayers,
                  decorrelate: this.state.decorrelate,
                  baseImage: this.state.baseImage,
                }
                const showPyrLayer = Math.min(
                  this.state.pyramidLayers, this.state.showPyrLayer);
                this.setState({showPyrLayer: showPyrLayer}, () => {
                  this.LB.setInputParams(inputParams);
                  this.setState(this.state);
                });
              }}
              pyramidLayers={this.state.pyramidLayers}
              handleInputChange={(stateChange) => {
                this.setState(stateChange);
              }}
              appliedPyrLayers={this.LB.getInputParams().pyramidLayers}
              showPyrLayer={this.state.showPyrLayer}
              canOptimize={this.LB.canOptimize()}
              isOptimizing={this.LB.isOptimizing()}
              onOptimize={() => {
                const validationMessage = this.LB.validateOptimizationInput();
                if (validationMessage) {
                  this.setState({ alertDialogMessage: validationMessage });
                } else {
                  this.startOptimization();
                }
              }}
              onStep={() => {
                this.startOptimization(1);
              }}
              stopOptimization={() => {
                this.LB.stopOptimization();
                this.setState({ loadStatus: loadStates.LOADED });
              }}
              onReset={() => {
                this.LB.resetInput();
                this.setState(this.state);
              }}
            />

          </div>
          <p>
            Visualizing channel 0 of Layer "mixed4a". Try some different numbers
            of pyramid depth and see what it does to the optimization.
            Use the "Show layer" slider to inspect the pyramid layers. The figure
            below shows the expected results from 1 to 7 pyramid layers based
            on a random noise image (instead of a photo like above):
          </p>
          <img style={{width: "100%", marginBottom:"35px"}} src="img/pyr_series.jpg" />
          <h2>2. Interactive optimization objectives</h2>
          <p>
          This is the most fun part. The eager execution model of TensorflowJS
          allows us to change the loss function and therefore the optimization
          objective on the fly for each iteration. While changing the target
          layer requires recalculation of the gradients, changing the objective
          within the same layer can be done without additional computational
          cost. Before starting the next example, let’s look at some important
          interface components that let your inspect and steer the optimization.
          The activation view shows all of the feature map channels and their
          current activations. Red pixels represent positive values, blue means
          negative. You can select the individual channels to set them as the
          optimization target. Switching between channels while optimizing leads
          to interesting transitions in the live preview. You can also scroll in
          case some channels are out of view, zooming can be done by holding the
          shift key while scrolling. The neuron selection view shows a magnified
          version of the currently selected channel and allows you to select the
          neuron / spatial location when the respective objective types are
          active. You can play with the mixed4a layer by clicking around, or you
          can switch to some curated objectives by clicking the buttons below.
          Some of the gradual changes might by hard to notice, especially when
          not “resetting” the input image after changing the objective.
          Therefore, we added a comparison view to be able to inspect the
          previous (bottom) and current (top) state next to each other.
          </p>
          <div className="inlineGUIContainer">
            <ObjectiveDemo
              inputSize={this.LB.getInputSize()}
              currentInput={this.LB.hasCurrentInput() ?
                this.LB.getCurrentInput() :
                undefined}
              inputShape={this.LB.getModelInputShape()}
              lastInput={this.LB.getLastInput()}
              lastInputShape={this.LB.getLastInputShape()}
              loadStatus={this.state.loadStatus}
              onApplyInputParams={() => {
                if (!this.LB.hasModel()) {
                  this.setState({
                    alertDialogMessage: [
                      "Can't apply input params.", 'Please load model first!'
                    ]
                  })
                  return;
                }
                const inputParams = {
                  inputSize: this.state.inputSize,
                  pyramidLayers: this.state.pyramidLayers,
                  decorrelate: this.state.decorrelate,
                  baseImage: this.state.baseImage,
                }
                this.LB.setInputParams(inputParams);
                this.setState(this.state);
              }}
              handleInputChange={(stateChange) => {
                this.setState(stateChange);
              }}
              canOptimize={this.LB.canOptimize()}
              isOptimizing={this.LB.isOptimizing()}
              onOptimize={() => {
                const validationMessage = this.LB.validateOptimizationInput();
                if (validationMessage) {
                  this.setState({ alertDialogMessage: validationMessage });
                } else {
                  this.startOptimization();
                }
              }}
              onStep={() => {
                this.startOptimization(1);
              }}
              stopOptimization={() => {
                this.LB.stopOptimization();
                this.setState({ loadStatus: loadStates.LOADED });
              }}
              onReset={() => {
                this.LB.resetInput();
                this.setState(this.state);
              }}
              objectiveType={this.LB.getObjectiveType()}
              jitter={this.LB.getJitter()}
              negative={this.LB.getNegative()}
              learningRate={this.state.learningRate}
              learningRates={learningRates}
              pyrLayerWeight={this.state.pyrLayerWeight}
              handleInputChange={(stateChange) => {
                this.setState(stateChange);
              }
              }
              changedObjective={(newObjective) => {
                this.LB.setObjectiveType(newObjective);
                let prvMode;
                if (newObjective === objectiveTypes.NEURON) {
                  prvMode = scdryPrvMode.NEURON;
                } else if (newObjective === objectiveTypes.ACT_ADJUST) {
                  prvMode = scdryPrvMode.ACT_ADJUST;
                } else if (newObjective === objectiveTypes.STYLE) {
                  prvMode = scdryPrvMode.STYLE;
                }
                if (prvMode) {
                  this.setState({ prvMode: prvMode });
                } else {
                  this.setState(this.state);
                }
              }
              }
              changedJitter={(newJitter) => {
                this.LB.setJitter(newJitter);
                this.setState(this.state);
              }
              }
              changedNegative={(newNegative) => {
                this.LB.setNegative(newNegative);
                this.setState(this.state);
              }
              }
              changedLearningRate={(newLearningRate) => {
                this.LB.setLearningRate(learningRates[newLearningRate]);
                this.setState({ learningRate: newLearningRate });
              }}
              changedPyrLayerWeight={(newPyrLayerWeight) => {
                this.LB.setClassObjFrequencyLevelWeights(newPyrLayerWeight);
                this.setState({ pyrLayerWeight: newPyrLayerWeight });
              }}

              activations={this.LB.getCurrentActivations()}
              activationShape={this.LB.getActivationShape()}
              detailActivations={this.LB.getCurrentActivations(this.LB.getChannel())}
              detailActivationStats={this.LB.getActivationStats(this.LB.getChannel())}
              channelNumber={this.LB.getChannelNumber()}
              selectedChannel={this.LB.getChannel()}
              channelChanged={(chInd) => {
                this.LB.setChannel(chInd);
                console.log(chInd);
                this.setState(this.state);
              }}
              selectedNeuron={this.LB.getNeuron()}
              neuronChanged={(x, y) => {
                this.LB.setNeuron(x, y);
                this.setState(this.state);
              }}
              changedObjectiveToggle={(obj) => {
                const l = obj.layer;
                const ch = obj.channel;
                const t = obj.type;
                this.LB.setObjectiveType(t);
                this.LB.setChannel(ch);

                const layerChange = (start) => {
                  this.LB.setLayer(l);
                  this.LB.setFeatureMapLayer(l);
                  if (start) {
                    this.LB.resetInput();
                    this.startOptimization();
                  }
                  this.setState(this.state);
                }
                if (this.LB.isOptimizing()) {
                  this.LB.stopOptimization(() => {
                    layerChange(true);
                  });
                } else {
                  layerChange(false);
                }
              }}
              prvMode={this.state.prvMode}
              prvModeChanged={(mode) => {
                this.setState({ prvMode: mode });
              }}
            />

          </div>
          <p>
          When selecting a channel to optimize for, one can notice how the color
          changes to red. This is of course expected, as we want to maximise the
          mean of that channel. Some of the other channels might change their
          activations as well, while others (less correlated to the current
          target) might stay mostly the same.
          </p>

          <div className="videoBox">
          <video width="730" controls>
            <source src="videos/channel_demo_retimed.mp4" type="video/mp4"/>
            Your browser does not support the video tag.
          </video>
          <p>
          In this video you can see the sped up optimization of the input first
          to channel 15 of layer ‘mixed4a’, and then after a mouse click to
          channel 16 of the same layer. It is clearly visible, how the
          activation values change from a highly activated channel 15 to a
          highly activated channel 16, simultaneously revealing eyes in the
          image, because that is what channel 16 responds to.
          </p>
          </div>

          <div className="videoBox">
          <video width="730" controls>
            <source src="videos/dragon_eye_retimed.mp4" type="video/mp4"/>
            Your browser does not support the video tag.
          </video>
          <p>
          Here we see an image* of a reptile eye. We already know, that
          channel 16 of layer ‘mixed4a’ responds to patterns that look like
          reptile eyes. This is confirmed by the strong activation in the center
          of the selected feature map. Once the optimization starts, two things
          can be observed: the feature map gets red in the outer parts as well
          (strong activation) and in the input image there are eyes appearing
          everywhere. The original eye stays quite similar though and only gets
          adjusted slightly to better fit the “style” that the channel responds
          to.
          </p>

            <p>
          * <a href="https://www.flickr.com/photos/renemensen/7825808822/in/photolist-cVxjjj-9Li4sA-ku1aGj-Mtkkkd-aZEMiK-5fNvBj-6dGUvN-VCGrpw-cvRF65-oNvHki-eV3rWc-dDRy3K-TMJVR1-n7yYog-48ZQBS-VGMJ9N-ehgTEz-TQtRuK-n7ABXU-qSPu2K-Rz2fsX-T3XaKK-4A1LuN-77uoBZ-6cRyXu-5fNokj-pxki9q-pw83tC-q21mHo-9gvuMg-si3jZa-2eq1N3y-opkqDZ-bwsMfF-kviMeR-9kqXCq-TdrtiU-sYewiQ-n7r2Lz-TB7Xoo-59sf4v-kPbsTu-oKccvW-bzsJVR-GxZjgE-5CevrT-6cZqK8-donDZe-pcMaPP-cPSFP7">"Yellow Eye"</a>,
          licensed under CC from flickr user "Alias 0591".
          </p>
          </div>

          <p>
          The “layer” objective type is what is used in the famous “DeepDream”
          project. Here we do not optimize for individual channel activations,
          but all of the layer’s activations at once. Contrary to the channel
          objective, where the simple mean / sum is maximized, this objective
          type maximizes the squared mean of the activations. This means that
          activations that have a large absolute value will be pushed even more
          in their direction (positive or negative), while values near zero
          receive less of an update.
          </p>

          <h2>3. Class optimization</h2>
          <p>
          Visualizing what the network thinks classes should look like is an
          important aspect of explainability. Does the network really know how
          the 1000 imagenet classes look like, can we recognize realistic
          objects in the result?
          <a href="https://www.auduno.com/2015/07/29/visualizing-googlenet-classes/">A. Oygard</a> has achieved some great results in visualizing Inception v1
          classes by applying Gaussian blur to the image after each optimization
          step. Starting with a large radius and gradually decreasing it, he was
          able to first generate overall structure and then progressively finer
          details. Also he found that switching between main and auxiliary
          classifiers as optimization targets improved results.
          We haven’t yet been able to replicate this approach in our
          implementation but hope to work towards this goal in the near future.
          </p>
          <p>
          Instead of inception, let’s look at a much simpler model, trained on
          MNIST, where the small input resolution of just 32x32 pixels doesn’t
          require any tricks to get recognizable results. This tiny model
          consists of just a single 3x3 convolution layer with 128 channels,
          followed by 2x2 max pooling and a dense layer of size 128 before the
          10 dimensional output. Here, optimizing for one of the 10 classes can
          certainly produce an image roughly resembling a handwritten digit.
          </p>
          <div className="inlineGUIContainer">
            <MnistClassDemo
              inputSize={this.LB.getInputSize()}
              currentInput={this.LB.hasCurrentInput() ?
                this.LB.getCurrentInput() :
                undefined}
              inputShape={this.LB.getModelInputShape()}
              loadStatus={this.state.loadStatus}
              canOptimize={this.LB.canOptimize()}
              isOptimizing={this.LB.isOptimizing()}
              onOptimize={() => {
                const validationMessage = this.LB.validateOptimizationInput();
                if (validationMessage) {
                  this.setState({ alertDialogMessage: validationMessage });
                } else {
                  this.startOptimization();
                }
              }}
              onStep={() => {
                this.startOptimization(1);
              }}
              stopOptimization={() => {
                this.LB.stopOptimization();
                this.setState({ loadStatus: loadStates.LOADED });
              }}
              onReset={() => {
                this.LB.resetInput();
                this.setState(this.state);
              }}
              changedClassInd={(newClassInd) => {
                this.LB.setClass(newClassInd);
                this.setState({
                  classInd: newClassInd,
                });
              }}
              classInd={this.state.classInd}
              classList={this.state.classList}
            />
          </div>
          <p>
            You can try some of the digit classes yourself. Below are the expected results
            for 0 to 9 of course they may vary slightly because of the random initialization:
          </p>
          <img style={{width: "100%", marginBottom:"35px"}} src="img/mnist_series.jpg" />
          <h2>Wrapping up</h2>
          <p>
          Although we haven’t covered all parts of the full GUI in this post, we
          hope to have sparked some interest to explore the rest. In the
          “Graphview” for instance, you can see an overview of the network
          architecture, and select the layers you want to use for your
          optimization objective. Also there are a few parameter settings left
          to explore by yourself.
          </p>
          <p>
          Similarly, this project does not yet cover near the full functionality
          of original Lucid. We hope to make progress in the direction of style
          transfer soon, as well as implement some new ideas (for instance
          painting custom activations).
          </p>
          <h2>References and acknowledgements</h2>
          <p>
          <h4>Visualization engine ported from:</h4>
          <ul><li>
          <a href="https://github.com/tensorflow/lucid">Lucid</a>
          </li></ul>
          <h4>Obviously inpired by / using UI elements from:</h4>
            <ul><li>
            <a href="https://playground.tensorflow.org">Tensorflow Playground</a>
            </li></ul>
            <h4>Some code snippets used from:</h4>
            <ul>
            <li>"Summit" by Fred Hohman (not publicly released in our knowledge).</li>
            <li>
            <a href="https://github.com/tensorflow/tfjs-examples/tree/master/visualize-convnet">
              "visualize-convnet" TensorFlow.js example
            </a>
            </li>
            </ul>
            <h4>Some CSS classes used from:</h4>
            <ul><li>
            <a href="https://github.com/distillpub/template">Distill.pub template</a>
            </li></ul>
            Thanks to Chris Olah for his initial advice and for his efforts
            on the Distill Slack channel.
            <br/>
          </p>
          <h2>Code</h2>
          <p><a href="https://github.com/stefsietz/LucidPlayground">https://github.com/stefsietz/LucidPlayground</a></p>
        </div>

      </article>


      {alertDialog(this.state.alertDialogMessage,
        () => {
          this.setState({ alertDialogMessage: null });
        })}
      <Modal open={this.state.showProgress}>
        <div className="modelProgressBar">
          <h2>Loading model...</h2>
          <LinearProgress
            variant="determinate"
            value={this.state.modelProgress * 100} />
        </div>
      </Modal>
    </div>
    )

  }

  /**
   * On scroll callback.
   */
  checkOnScrollEvents = () => {
    if(!this.state.scrollTriggers){
      return;
    }
    const loadBar = document.getElementById("inlineLoadProgressBar");
    const loadBbox = loadBar.getBoundingClientRect();

    const mnistDemo = document.getElementById("inlineMnistDemo");
    const mnistBbox = mnistDemo.getBoundingClientRect();

    if (mnistBbox.top < (window.innerHeight ||
      document.documentElement.clientHeight)) {
      if (this.LB.getLoadStatus() !== loadStates.LOADING &&
        this.state.modelName !== "MnistNet") {
        console.log("loading mnist model from scroll trigger");
        this.loadModel(this.modelList["MnistNet"], false, "conv2d_1",
          () => {
            this.setupMnistParams();
          });
      }
    } else if (loadBbox.top < (window.innerHeight ||
      document.documentElement.clientHeight)) {

      if (this.LB.getLoadStatus() !== loadStates.LOADING &&
        this.state.modelName !== "Inception V1") {
        console.log("loading inception model from scroll trigger");
        this.loadModel(this.modelList["Inception V1"], false,
          "mixed4a_pool_reduce", () => {
            this.setupInceptionParams();
            this.getBlogPostBaseImageData(this.applyInputParams);
          });
      }
    }
  }

  /**
   * Button action that starts intro tour.
   */
  startTour = () => {
    let tour;
    if (this.state.tour && this.state.tour.isActive()) {
      this.state.tour.hide();
      this.setState({ tour: null });
    } else {
      tour = buildTour();
      this.setState({ tour: tour });
      tour.start();
    }
    console.log(tour);
  }

  /**
   * Return list off class labels depending on dataset (imagenet/mnist).
   * @param {*} classListName 
   */
  getClasslist(classListName) {
    if (classListName === 'imnet') {
      return this.imnetClasses;
    } else if (classListName === 'mnist') {
      return this.mnistClasses;
    }
  }

  /**
   * Button action for 'arrow' button below main GUI.
   */
  scrollTween = (offset) => {
    return function () {
      let i = d3.interpolateNumber(window.pageYOffset ||
        document.documentElement.scrollTop, offset);
      return function (t) { window.scrollTo(0, i(t)); };
    };
  }

  /**
   * Button action for starting optimization.
   */
  startOptimization = (iters) => {
    const it = iters ? iters : 1000000;
    this.LB.startOptimization(it, (stopped) => {
      if (!stopped) {
        this.setState({
          loadStatus: loadStates.OPTIMIZING,
        });
      } else {
        this.setState({ loadStatus: loadStates.LOADED });
      }
    });
  }

  /**
   * Sets blogpost base image and calls callback with ImageData when finished loading.
   */
  getBlogPostBaseImageData = (cb) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      context.drawImage(img, 0, 0);
      const imData = context.getImageData(0, 0, img.width, img.height);
      this.setState({ baseImage: imData }, cb);
    }
    img.src = "img/image.jpg";
  }
}
