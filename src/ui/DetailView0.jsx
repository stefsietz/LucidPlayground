import React, { Component } from 'react';
import {
    Typography, FormControl, Select, MenuItem, Link,
    InputLabel, TextField, Fab, FormControlLabel, Checkbox,
    Button, Switch, Tooltip
} from "@material-ui/core";
import {Slider} from '@material-ui/lab';
import "./DetailView.css";
import "./ParamView.css";
import {fillCanvasPixelsWithRgbAndAlpha, fillCanvasPixelsWithGreyAndAlpha,
getImageData, getRgbFromCanvasRgba, getGrayFromCanvasRgba}
from '../DrawingHelper.js';
import * as d3 from 'd3';
import ActivationView from './ActivationView'
import NeuronOverlayCanvas from './NeuronOverlayCanvas'
import SecondaryPreview from './SecondaryPreview'
import {objectiveTypes, loadStates} from '../LucidJS/src/optvis/renderer.js';
import { saveAs } from 'file-saver';
import {ttActivationView} from '../strings'
import { scdryPrvMode } from '../Home0';

export default class DetailView extends Component {

  constructor(props){
    super(props);

    this.imageCanvas = React.createRef();
    this.imageCanvasSecondary = React.createRef();
    this.imageCanvasStyle = React.createRef();

    this.state = {
      prevWidth: undefined,
    }

    this.scdryEnabledModes = [
      scdryPrvMode.COMPARE,
      scdryPrvMode.NEURON,
      //scdryPrvMode.PAINT,
      //scdryPrvMode.ACT_ADJUST,
      //scdryPrvMode.STYLE,
    ]
  }

  dispatchResizeEvent = () => {
    let ev = new Event('resizeActivationView');

    window.dispatchEvent(ev);
  }

  calcPrevWidth = () => {
    let wW = window.innerWidth;
    let wH = window.innerHeight;

    const wR = wW / 1680;
    const hR = wH / 1050;

    let prevWidth = 224;
    if(wR > hR) {
      prevWidth = wH / 4.5;
    } else {
      prevWidth = wW / 7.5;
    }
    return prevWidth;
  }

  reRender = () => {
    this.setState({prevWidth: this.calcPrevWidth()});
  }

  componentDidMount(props){
    d3.select('.canvasContainer').select('.layout-pane-primary')
    .style('overflow', 'hidden');

    window.addEventListener("resize", this.reRender);
    this.dispatchResizeEvent();
  }

  componentWillUnmount(props){
    window.removeEventListener("resize", this.reRender);
  }

  detail(){
    let w = this.props.inputSize;
    let h = this.props.inputSize;

    let canvases = null;

    window.requestAnimationFrame(() => {
      if(this.imageCanvas.current && this.props.currentInput){
        const [b, inW, inH, ch] = this.props.inputShape;
        this.drawPixelsToCanvas(this.props.currentInput,
          this.imageCanvas.current, w, h, ch===3 ? true : false);
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

      if(this.imageCanvasStyle.current) {
        const width = this.props.inputSize;
        const height = this.props.inputSize;
        console.log(width, height);
        if(this.props.styleImage) {
          const [b, inW, inH, ch] = this.props.styleImageShape;
          this.imageCanvasStyle.current.getContext("2d").putImageData(
            this.getImageDataFromPixelData(
              this.props.styleImage, width, height, ch===3 ? true : false, 255),
               0, 0
          )
        } else {
          this.imageCanvasStyle.current.getContext("2d")
          .clearRect(0, 0, width, height);
        }
      }
    });

    const prevWidth = this.state.prevWidth ?
    this.state.prevWidth : this.calcPrevWidth();

    const activationTitle = this.props.selectedLayer ?
    'Activations for layer "'+this.props.selectedLayer+'"' :
    'Activations';

    return(
      <div style={{width: "100%", height: "100%",
      display: 'flex', flexDirection: 'row', overflow: 'hidden'}}>
        <div style={{width: "35%", height: "100%",
        flex:"0 1 auto", borderRight:"1px solid darkgray", display: "flex",
        flexDirection: "column", justifyContent: "space-evenly"}}
        className="inputPreviewContainer">
          <div style={{padding: "15px"}}>
            <div className="optimPreviewCanvasContainer"
            style={{height: '100%'}}>
              <div id="livePreview" >
                <div style={{display:'flex', justifyContent:'center',
                alignItems:'center'}}>
                  <canvas className="optimPreviewCanvas"
                  ref={this.imageCanvas}
                  width={this.props.inputSize}
                  height={this.props.inputSize}
                  style={{width:prevWidth, height:prevWidth}}/>
                </div>
                <div className="splitParamGroup">
                  <Button variant='contained'
                  className="wholeWidth"
                  onClick={() => {
                    if(this.imageCanvas.current) {
                      this.imageCanvas.current.toBlob(function(blob) {
                          saveAs(blob, "lucidImage.png");
                      });
                    }
                  }}
                  >Save</Button>
                  <Button className="wholeWidth"
                  variant='contained'
                  onClick={(e,v) => {
                    this.props.onReset();
                  }}>Reset</Button>
                </div>
              </div>
            </div>
          </div>
          <div  style={{padding: "15px"}}>
            <div  style={{height: '100%'}}
            className="optimPreviewCanvasContainer">
              <SecondaryPreview
                showHelp={this.props.showHelp}
                selectedLayer={this.props.selectedLayer}
                selectedChannel={this.props.selectedChannel}
                imageCanvasSecondary={this.imageCanvasSecondary}
                imageCanvasStyle={this.imageCanvasStyle}
                inputSize={this.props.inputSize}
                activations={this.props.detailActivations}
                activationShape={this.props.activationShape}
                detailActivationStats={this.props.detailActivationStats}
                prevWidth={prevWidth}
                selectedNeuron={this.props.selectedNeuron}
                neuronChanged={this.props.neuronChanged}
                activationMods={this.props.activationMods}
                activationsModified={this.props.activationsModified}
                prvMode={this.props.prvMode}
                prvModeChanged={this.props.prvModeChanged}
                styleImage={this.props.styleImage}
                uploadedStyleImage={this.props.uploadedStyleImage}
                layerList={this.props.layerList}
                styleLayers={this.props.styleLayers}
                styleLayerChanged={this.props.styleLayerChanged}
                enabledModes={this.scdryEnabledModes}
              />
            </div>
          </div>
        </div>
        <div style={{height: '100%', width: '65%', flex:"0 1 auto",
        display: 'flex', flexFlow: 'column'}}>
          <Tooltip title={this.props.showHelp ? ttActivationView : ''}>
            <div
            style={{flex: "0 1 auto"}}
            className="titleContainer">
              <h4 className="titleText">{activationTitle}</h4>
            </div>
          </Tooltip>
          <div style={{height: '50%', flex: "1 1 auto"}}
          className="activationCanvasContainer">
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
        </div>
      </div>);
  }

  render(){
    return this.detail();
  }

  drawPixelsToCanvas(pixelData, canvas, w, h, rgb, channel=0){
    let canvCtx = canvas.getContext("2d");
    const cw = canvas.width;
    const ch = canvas.height;
    const wratio = cw / w;
    const hratio = ch / h;

    if(w !== cw || h !== ch) {
      let tempCanvas = document.createElement("canvas");
      tempCanvas.width = w;
      tempCanvas.height = h;
      let tempCtx = tempCanvas.getContext('2d');
      let imData = tempCtx.createImageData(w, h);

      if(rgb){
        fillCanvasPixelsWithRgbAndAlpha(imData.data, pixelData, w, h, channel);
      } else {
        fillCanvasPixelsWithGreyAndAlpha(imData.data, pixelData, w, h, channel);
      }
      tempCtx.putImageData(imData, 0, 0);
      canvCtx.scale(wratio, hratio);
      canvCtx.drawImage(tempCanvas, 0, 0);
      canvCtx.scale(1/wratio, 1/hratio);
    } else {
      let imData = canvCtx.createImageData(w, h);
      if(rgb){
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
