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

export default class PyramidDemo extends Component {

    constructor(props) {
        super(props);


        this.imageCanvas = React.createRef();
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
        });

        const prevWidth = 200;

        return (
            <div id="inlineMnistDemo"
            className="paramContainer" style={{
                height: "100%"
            }}>
                <div style={{
                    width: "60%", padding: "5px",
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
                        <FormControl>
                            <InputLabel>Select class</InputLabel>
                            <Select
                                value={this.props.classInd}
                                error={false}
                                onChange={(event) => {
                                    this.props.changedClassInd(event.target.value);
                                }}>
                                {this.props.classList.map((className, index) => {
                                    return <MenuItem value={index}>
                                        {index + ": " + className}
                                    </MenuItem>
                                })}
                            </Select>
                        </FormControl>
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

}
