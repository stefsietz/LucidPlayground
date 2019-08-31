import React, { Component } from 'react';
import {
    Typography, FormControl, Select, MenuItem,
    InputLabel, Button, Switch, Tooltip
} from "@material-ui/core";
import { Slider } from '@material-ui/lab';
import "../ParamView.css";
import { objectiveTypes, loadStates } from '../../LucidJS/src/optvis/renderer.js';
import PlayButtonGroup from "./PlayButtonGroup"
import { fillCanvasPixelsWithRgbAndAlpha, fillCanvasPixelsWithGreyAndAlpha }
    from '../../DrawingHelper.js';
import ActivationView from "../ActivationView";
import NeuronSelectorView from "../NeuronSelectorView";
import SecondaryPreview from "../SecondaryPreview";
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import { scdryPrvMode } from '../../BlogpostHome';

const objectives = Object.entries(
    objectiveTypes).map((keyAndValue) => keyAndValue[1]);

const selectableParameters = [
    {type: "channel", layer: "conv2d1", channel: 58},
    {type: "channel", layer: "mixed3a_3x3", channel: 4},
    {type: "channel", layer: "mixed3a_3x3", channel: 85},
    {type: "channel", layer: "mixed4a_pool_reduce", channel: 16},
    {type: "channel", layer: "mixed4a_pool_reduce", channel: 32},
    {type: "channel", layer: "mixed4a_pool_reduce", channel: 48},
    {type: "channel", layer: "mixed5a_1x1", channel: 9},
]

export default class PyramidDemo extends Component {

    constructor(props) {
        super(props);

        this.state = {
            selectedToggleButton: -1,
        }


        this.imageCanvas = React.createRef();
        this.imageCanvasSecondary = React.createRef();
    }

    render() {
        let w = this.props.inputSize;
        let h = this.props.inputSize;

        let canvases = null;

        window.requestAnimationFrame(() => {
            if (this.imageCanvas.current && this.props.currentInput) {
                const [b, inW, inH, ch] = this.props.inputShape;
                this.drawPixelsToCanvas(this.props.currentInput,
                    this.imageCanvas.current, w, h, ch === 3 ? true : false);
            }

            if(this.imageCanvasSecondary.current && this.props.lastInput) {
                const width = this.props.inputSize;
                const height = this.props.inputSize;
                const [b, inW, inH, ch] = this.props.lastInputShape;
                this.imageCanvasSecondary.current.getContext("2d").putImageData(
                  this.getImageDataFromPixelData(
                    this.props.lastInput, width, height, ch===3 ? true : false), 0, 0
                )
              }
        });

        const prevWidth = 200;

        const ch = this.state.selectedChannel;
        const toggleButtonTitle = (ind) => {
            const params = selectableParameters[ind];
            const l = params.layer.split('_')[0];
            const ch = params.channel;
            const t = params.type;
            if(t === 'channel') {
                return l+ ": " + ch;
            } else {
                return l;
            }
        }

        return (
            <div style={{
                display: "flex", flexDirection: "column",
                height: "100%", width: "100%",
            }}>
                <ToggleButtonGroup style={{
                    width: "100%"
                }}
                size="large" value={this.state.selectedToggleButton} exclusive
                    onChange={(e, v) => {
                        this.setState({selectedToggleButton: v})
                        const newObj = selectableParameters[v];
                        this.props.changedObjectiveToggle(newObj);
                    }}>
                    {
                        selectableParameters.map((el, i) => {
                            return (
                            <ToggleButton value={i}>
                                {toggleButtonTitle(i)}
                            </ToggleButton>)
                        })
                    }
                </ToggleButtonGroup>
                <div style={{
                    display: "flex", flexDirection: "column",
                    height: "100%", width: "100%",
                }}>
                    <div className="paramContainer" style={{
                        height: "50%"
                    }}>
                        <div style={{
                            width: "60%", height: "100%", padding: "5px",
                            display: "flex", flexDirection: "row",
                            justifyContent: "space-evenly"
                        }}>
                            <div className="inlineParamSettingsColumn">
                                <div className="inlineParamGroup" style={
                                    {
                                        display: "flex", flexDirection: "row",
                                        justifyContent: "center"
                                    }
                                }>
                                    <PlayButtonGroup
                                        canOptimize={this.props.canOptimize}
                                        isOptimizing={this.props.isOptimizing}
                                        onOptimize={this.props.onOptimize}
                                        onStep={this.props.onStep}
                                        stopOptimization={this.props.stopOptimization}
                                        onReset={this.props.onReset} />
                                </div>
                            </div>
                            <div className="inlineParamSettingsColumn">
                                <FormControl className="menu" style={{
                                    flexGrow: "0"
                                }}>
                                    <InputLabel>Objective type</InputLabel>
                                    <Select
                                        value={this.props.objectiveType}
                                        error={false}
                                        onChange={(event) => {
                                            this.props.changedObjective(event.target.value);
                                        }}>
                                        {objectives.map((objective, index) => {
                                            return <MenuItem value={objective}>{objective}</MenuItem>
                                        })}
                                    </Select>
                                </FormControl>
                                <   div className="splitParamGroup">
                                    <Typography className="wholeWidth">Negative</Typography>
                                    <Switch className="wholeWidth"
                                        checked={this.props.negative}
                                        onChange={(e, v) =>
                                            this.props.changedNegative(v)}></Switch>
                                </div>
                                <div className="paramGroup">
                                    <Typography
                                        className="sliderLabel">Jitter: {
                                            this.props.jitter}</Typography>
                                    <Slider
                                        className="slider"
                                        min={0}
                                        max={12}
                                        step={1}
                                        value={this.props.jitter}
                                        aria-labelledby="label"
                                        onChange={(e, v) =>
                                            this.props.changedJitter(v)}
                                    />
                                </div>
                                <div className="paramGroup">
                                    <Typography
                                        className="sliderLabel">Learning Rate: {
                                            this.props.learningRates[
                                            this.props.learningRate]}</Typography>
                                    <Slider
                                        className="slider"
                                        min={0}
                                        max={10}
                                        step={1}
                                        value={this.props.learningRate}
                                        aria-labelledby="label"
                                        onChange={(e, v) =>
                                            this.props.changedLearningRate(v)
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                        <div style={{ width: "40%", height: "100%", padding: "5px" }}>
                            <div className="optimPreviewCanvasContainer"
                                style={{ height: '100%' }}>
                                <div>
                                    <div style={{
                                        display: 'flex', justifyContent: 'center',
                                        alignItems: 'center'
                                    }}>
                                        <canvas className="optimPreviewCanvas"
                                            ref={this.imageCanvas}
                                            width={this.props.inputSize}
                                            height={this.props.inputSize}
                                            style={{ width: prevWidth, height: prevWidth }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="paramContainer" style={{
                        height: "50%"
                    }}>
                        <div style={{
                            width: "60%",  padding: "5px"
                        }}>
                            <ActivationView
                                activationShape={this.props.activationShape}
                                channelNumber={this.props.channelNumber}
                                selectedChannel={this.props.selectedChannel}
                                activations={this.props.activations}
                                onClickFeatureMap={(selectedInd) => {
                                    this.props.channelChanged(selectedInd);
                                }}
                            />
                        </div>
                        <div style={{
                            width: "40%", height: "100%", padding: "5px"
                        }}>
                            <div className="optimPreviewCanvasContainer"
                                style={{ height: '100%' }}>
                                <div>
                                    <div style={{
                                        display: 'flex', justifyContent: 'center',
                                        alignItems: 'center'
                                    }}></div>
                                    <SecondaryPreview
                                        enabledModes={[
                                            scdryPrvMode.COMPARE,
                                            scdryPrvMode.NEURON
                                        ]}
                                        prvMode={this.props.prvMode}
                                        prvModeChanged={this.props.prvModeChanged}
                                        inputSize={this.props.inputSize}
                                        prevWidth={prevWidth}
                                        imageCanvasSecondary={this.imageCanvasSecondary}
                                        className={"secondaryPreviewLayer"}
                                        selectedLayer={this.props.selectedLayer}
                                        selectedChannel={this.props.selectedChannel}
                                        activations={this.props.detailActivations}
                                        activationShape={this.props.activationShape}
                                        selectedNeuron={this.props.selectedNeuron}
                                        neuronChanged={this.props.neuronChanged}
                                        style={{
                                            width: prevWidth,
                                            height: prevWidth
                                        }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>);
    }

    drawPixelsToCanvas(pixelData, canvas, w, h, rgb, channel = 0) {
        let canvCtx = canvas.getContext("2d");
        const cw = canvas.width;
        const ch = canvas.height;
        const wratio = cw / w;
        const hratio = ch / h;

        if (w !== cw || h !== ch) {
            let tempCanvas = document.createElement("canvas");
            tempCanvas.width = w;
            tempCanvas.height = h;
            let tempCtx = tempCanvas.getContext('2d');
            let imData = tempCtx.createImageData(w, h);

            if (rgb) {
                fillCanvasPixelsWithRgbAndAlpha(imData.data, pixelData, w, h, channel);
            } else {
                fillCanvasPixelsWithGreyAndAlpha(imData.data, pixelData, w, h, channel);
            }
            tempCtx.putImageData(imData, 0, 0);
            canvCtx.scale(wratio, hratio);
            canvCtx.drawImage(tempCanvas, 0, 0);
            canvCtx.scale(1 / wratio, 1 / hratio);
        } else {
            let imData = canvCtx.createImageData(w, h);
            if (rgb) {
                fillCanvasPixelsWithRgbAndAlpha(imData.data, pixelData, w, h, channel);
            } else {
                fillCanvasPixelsWithGreyAndAlpha(imData.data, pixelData, w, h, channel);
            }
            canvCtx.putImageData(imData, 0, 0);
        }
    }

    getImageDataFromPixelData(pixelData, w, h, rgb, mult=1, channel=0){
        let tempCanvas = document.createElement("canvas");
        tempCanvas.width = w;
        tempCanvas.height = h;
        let tempCtx = tempCanvas.getContext('2d');
        let imData = tempCtx.createImageData(w, h);
        channel = 0;
  
        if(rgb){
          fillCanvasPixelsWithRgbAndAlpha(
            imData.data, pixelData, w, h, channel, mult);
        } else {
          fillCanvasPixelsWithGreyAndAlpha(
            imData.data, pixelData, w, h, channel, mult);
        }
  
        return imData
    }

}
