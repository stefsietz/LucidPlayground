import React, { Component } from 'react';
import "./Home0.css";
import GraphView from './ui/GraphView'
import DetailView from './ui/DetailView0'
import ParamView from './ui/ParamView'
import LoadView from './ui/LoadView'
import alertDialog from './ui/AlertDialog'
import { LucidBackend } from './scene/LucidBackend.js'
import Graph from './scene/Graph.js'
import { loadJSON, loadJSONFromLocalFile } from './util.js'
import { objectiveTypes, loadStates } from './LucidJS/src/optvis/renderer.js';
import { ttHelp } from './strings'
import { buildTour } from './TourBuilder'

import HelpIcon from '@material-ui/icons/Help';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import SchoolIcon from '@material-ui/icons/School';
import {
  IconButton, Fab, Tooltip,
  Modal, LinearProgress
} from "@material-ui/core";

export const scdryPrvMode = {
  COMPARE: 'compare',
  NEURON: 'neuron',
  PAINT: 'paint',
  ACT_ADJUST: 'act_adjust',
  STYLE: 'style'
}

export const learningRates = [0.00005, 0.0001, 0.0005, 0.001,
  0.005, 0.01, 0.05, 0.1, 0.5, 1, 5];


export default class Home extends Component {

  constructor(props) {
    super(props);

    this.modelList = require('./model/models.json');
    this.imnetClasses = require('./model/imnet_classes.json');
    this.mnistClasses = require('./model/mnist_classes.json');
    this.graph2Key = require('./model/graphName2Key.json');

    this.state = {
      graph: null,
      modelName: "",

      inputSize: 128,
      pyramidLayers: 4,
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
    };
    this.LB = new LucidBackend();
  }

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

  loadTitle() {
    if (this.LB.getLoadStatus() === loadStates.INITIAL) {
      return "No graph loaded";
    } else if (this.LB.getLoadStatus() === loadStates.LOADING) {
      return "Loading " + this.state.modelName;
    } else {
      return this.state.modelName;
    }
  }

  progressCb = (progress) => {
    this.setState({ modelProgress: progress });
  }

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

  loadModel = (model) => {
    const modelPath = process.env.PUBLIC_URL + '/' + model.path;
    loadJSON(modelPath, (modelJson) => {
      this.setStartModelLoadingState(model, modelJson);
    });

    this.LB.loadModel(modelPath, this.progressCb).then(() => {
      this.setFinishModelLoadingState();
    });
  }

  setFinishModelLoadingState = () => {
    const ip = this.LB.getInputParams();
    this.setState({
      inputSize: ip.inputSize,
      pyramidLayers: ip.pyramidLayers,
      decorrelate: ip.decorrelate,
      baseImage: ip.baseImage,
      showProgress: false,
    });
    this.LB.setLearningRate(learningRates[this.state.learningRate]);
  }

  setStartModelLoadingState = (model, modelJson) => {
    const classList = this.getClasslist(model.classlist);

    this.setState({
      modelName: model.name,
      classList: classList,
      showProgress: true,
      modelProgress: 0,
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
   * Renders this react component
   * @returns {*} the components contents
   */
  render() {
    return (<div style={{ width: "100%", height: "100%", top: 0, left: 0 }}>
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
                this.setState({pyrLayerWeight: newPyrLayerWeight});
              }}
            />
          </div>
          <div style={{ flex: '1 1 auto', width: "100%", height: "50%" }}>
            {this.detailview()}
          </div>
        </div>
      </div>
      {alertDialog(this.state.alertDialogMessage,
        () => {
          this.setState({ alertDialogMessage: null });
        })}
      <Tooltip title={ttHelp}>
        <Fab
          color="primary"
          style={{
            position: "fixed",
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

  getClasslist(classListName) {
    if (classListName === 'imnet') {
      return this.imnetClasses;
    } else if (classListName === 'mnist') {
      return this.mnistClasses;
    }
  }
}
