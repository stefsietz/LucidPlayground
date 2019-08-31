import React, { Component } from 'react';

import BrushIcon from '@material-ui/icons/Brush';
import GridOnIcon from '@material-ui/icons/GridOn';
import BrightnessIcon from '@material-ui/icons/Brightness6';
import CompareIcon from '@material-ui/icons/Compare';
import StyleIcon from '@material-ui/icons/Style';
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import {Tooltip, Button, Popover} from '@material-ui/core';
import {Slider} from '@material-ui/lab';
import "./DetailView.css";
import {fillCanvasPixelsWithRgbAndAlpha, fillCanvasPixelsWithGreyAndAlpha,
getImageData, getRgbFromCanvasRgba, getGrayFromCanvasRgba}
from '../DrawingHelper.js';
import NeuronSelectorView from './NeuronSelectorView'
import ActivationAdjustmentView from './ActivationAdjustmentView'
import LayerChecklist from './LayerChecklist'
import SliderTextThumb from './SliderTextThumb'
import {objectiveTypes, loadStates} from '../LucidJS/src/optvis/renderer.js';
import { saveAs } from 'file-saver';
import { scdryPrvMode } from '../Home0'
import {getImgDataFromFile} from '../DrawingHelper.js';
import alertDialog from './AlertDialog'
import {ttScdryCompare, ttScdryNeuron, ttScdryPaint, ttScdryAdjust,
ttScdryStyle, ttScdryView} from '../strings';


export const paintSliders = {
  VALUE: 'Value',
  SIZE: 'Size',
  OPAC: 'Opcty',
}

export const styleSliders = {
  SHIFT: 'Shift',
  SCALE: 'Scale',
  NOISE: 'Noise',
}

export default class SecondaryPreview extends Component {
  constructor(props){
    super(props);

    this.sliderDefaults = {
      shift: 0,
      scale: 1,
      noise: 0,

      paintValue: 1,
      paintSize: 20,
      paintOpacity: 0.5,
    }

    this.state = {
      paintValue: 1,
      paintSize: 20,
      paintOpacity: 0.5,

      poAnchor: null,
      mouseOverStyleImage: false,

      alertDialogMessage: null,
    }
  }

  render() {
    const slidersVisibility =
    this.props.prvMode === scdryPrvMode.ACT_ADJUST ||
    this.props.prvMode === scdryPrvMode.PAINT ?
    'visible' : 'hidden';

    const styleButtonVisibility =
    this.props.prvMode === scdryPrvMode.STYLE ?
    'visible' : 'hidden';

    const showStyle = this.props.prvMode === scdryPrvMode.ACT_ADJUST;
    let val1, val2, val3;
    if(showStyle) {
      val1 = this.sliderDefaults.shift;
      val2 = this.sliderDefaults.scale;
      val3 = this.sliderDefaults.noise;
      if(this.props.selectedLayer) {
        const sl = this.props.selectedLayer;
        const am = this.props.activationMods;
        if(sl in am) {
          if(this.props.selectedChannel in am[sl]) {
            val1 = am[sl][this.props.selectedChannel]['shift'];
            val2 = am[sl][this.props.selectedChannel]['scale'];
            val3 = am[sl][this.props.selectedChannel]['noise'];
          }
        }
      }
    } else {
      val1 = this.state.paintValue;
      val2 = this.state.paintSize;
      val3 = this.state.paintOpacity;
    }

    let title1, title2, title3;
    if(showStyle) {
      title1 = styleSliders.SHIFT;
      title2 = styleSliders.SCALE;
      title3 = styleSliders.NOISE;
    } else {
      title1 = paintSliders.VALUE;
      title2 = paintSliders.SIZE;
      title3 = paintSliders.OPAC;
    }

    const setMod = (modType, value) => {
      if(this.props.selectedLayer){
        const mods = {};
        mods[this.props.selectedLayer] = {};
        mods[this.props.selectedLayer][this.props.selectedChannel] = {};
        mods[this.props.selectedLayer]
        [this.props.selectedChannel][modType] = value;
        this.props.activationsModified(mods);
      }
      this.setState(this.state);
    }

    let mean = 0;
    let variance = 1.0;
    if(this.props.detailActivationStats) {
      mean = this.props.detailActivationStats[0];
      variance = this.props.detailActivationStats[1];
    }

    const uploadButton = (<span>Upload Style Image<input
      type="file"
      accept="image/*"
      style={{ display: "none" }}
      onChange={(e) => {
        const files = e.target.files;
        const imgFile = files[0];
        getImgDataFromFile(imgFile, (imgData) => {
          this.props.uploadedStyleImage(imgData);
        });
      }}
    /></span>);
    let uploadButtonVisibility =
    this.state.mouseOverStyleImage || !this.props.styleImage ?
    'inherit' : 'hidden';

    const styleLayerMode = this.state.poAnchor ? this.state.poAnchor.id : null;

    return(
      <div style={{marginBottom: 25}}>
        <div style={{display:'flex', justifyContent:'center',
        alignItems:'center'}}>
          <ToggleButtonGroup size="small" value={this.props.prvMode} exclusive
          onChange={(e, v) => {
            if(v){
              this.props.prvModeChanged(v);
            }
          }}>{(this.props.enabledModes.includes(scdryPrvMode.COMPARE)) &&
            <ToggleButton id="scrdyPreview" value={scdryPrvMode.COMPARE}>
              <Tooltip title={this.props.showHelp ? ttScdryCompare : ''}>
                <CompareIcon />
              </Tooltip>
            </ToggleButton>
          }
          {(this.props.enabledModes.includes(scdryPrvMode.NEURON)) &&
            <ToggleButton value={scdryPrvMode.NEURON}>
              <Tooltip title={this.props.showHelp ? ttScdryNeuron : ''}>
                <GridOnIcon />
              </Tooltip>
            </ToggleButton>}
          {(this.props.enabledModes.includes(scdryPrvMode.PAINT)) &&  
            <ToggleButton value={scdryPrvMode.PAINT}>
              <Tooltip title={this.props.showHelp ? ttScdryPaint : ''}>
                <BrushIcon />
              </Tooltip>
            </ToggleButton>}
          {(this.props.enabledModes.includes(scdryPrvMode.ACT_ADJUST)) &&
            <ToggleButton value={scdryPrvMode.ACT_ADJUST}>
              <Tooltip title={this.props.showHelp ? ttScdryAdjust : ''}>
                <BrightnessIcon />
              </Tooltip>
            </ToggleButton>}
          {(this.props.enabledModes.includes(scdryPrvMode.STYLE)) &&
            <ToggleButton value={scdryPrvMode.STYLE}>
              <Tooltip title={this.props.showHelp ? ttScdryStyle : ''}>
                <StyleIcon />
              </Tooltip>
            </ToggleButton>}
          </ToggleButtonGroup>
        </div>
        <div style={{display:'flex', justifyContent:'center',
        alignItems:'center'}}>
          <div
          className="optimPreviewCanvas"
          style={{width:this.props.prevWidth, height:this.props.prevWidth,
          position: 'relative'}}>
            {(this.props.enabledModes.includes(scdryPrvMode.COMPARE)) &&
            <Tooltip title={this.props.showHelp ? ttScdryView : ''}>
              <canvas
              className="secondaryPreviewLayer"
              ref={this.props.imageCanvasSecondary}
              width={this.props.inputSize}
              height={this.props.inputSize}
              style={{width:this.props.prevWidth, height:this.props.prevWidth,
              visibility: this.props.prvMode === scdryPrvMode.COMPARE ?
              'visible' : 'hidden'}}
              />
            </Tooltip>}
            {(this.props.enabledModes.includes(scdryPrvMode.NEURON)) &&
            <NeuronSelectorView
              className={"secondaryPreviewLayer"}
              activations={this.props.activations}
              activationShape={this.props.activationShape}
              selectedNeuron={this.props.selectedNeuron}
              neuronChanged={this.props.neuronChanged}
              style={{width:this.props.prevWidth, height:this.props.prevWidth,
              visibility: this.props.prvMode === scdryPrvMode.NEURON ?
              'visible' : 'hidden'}}
            />}
            {(this.props.enabledModes.includes(scdryPrvMode.ACT_ADJUST)) &&
            <ActivationAdjustmentView
              className={"secondaryPreviewLayer"}
              activations={this.props.activations}
              activationShape={this.props.activationShape}
              mean={mean}
              variance={variance}
              shift={val1}
              scale={val2}
              noise={val3}
              style={{width:this.props.prevWidth, height:this.props.prevWidth,
              visibility: this.props.prvMode === scdryPrvMode.ACT_ADJUST ?
              'visible' : 'hidden'}}
            />}
            {(this.props.enabledModes.includes(scdryPrvMode.STYLE)) &&
            <div
            className="secondaryPreviewLayer"
            style={{display: 'grid',
              width:this.props.prevWidth, height:this.props.prevWidth,
              visibility: this.props.prvMode === scdryPrvMode.STYLE ?
              'visible' : 'hidden'}}
            onMouseEnter={() => {
              this.setState({mouseOverStyleImage: true});
            }}
            onMouseLeave={() => {
              this.setState({mouseOverStyleImage: false});
            }}>
              <canvas
                className="secondaryPreviewLayer"
                ref={this.props.imageCanvasStyle}
                width={this.props.inputSize}
                height={this.props.inputSize}
                style={{width:'100%', height:'100%',}}
              />
              <div className="secondaryPreviewLayer"
              style={{display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'}}>
                <Button
                  style={{textAlign: 'center',
                  visibility: uploadButtonVisibility}}
                  variant='contained'
                  component={this.props.styleImage ? 'button' : 'label'}
                  onClick={(e) => {
                    if(this.props.styleImage) {
                      this.props.uploadedStyleImage(null);
                    }
                  }}>{this.props.styleImage ? 'Remove' : uploadButton }
                </Button>
              </div>
            </div>}
          </div>
        </div>
        {(this.props.enabledModes.includes(scdryPrvMode.STYLE) ||
        this.props.enabledModes.includes(scdryPrvMode.ACT_ADJUST) ||
        this.props.enabledModes.includes(scdryPrvMode.PAINT)) &&
        <div style={{display: 'grid'}}>
          <div
          className="secondaryPreviewCtrlLayer"
          style={{visibility: slidersVisibility}}>
            <Slider
              className="slider"
              min={-10}
              max={10}
              value={val1}
              thumb={<SliderTextThumb title={title1} />}
              onChange={(e, v) => {
                if(showStyle){
                  v = Math.abs(v) < 0.1 ? 0 : v;
                  setMod("shift", v);
                } else {
                  this.setState({paintValue: v});
                }
              }}
            />
            <Slider
              className="slider"
              min={0}
              max={3}
              value={val2}
              thumb={<SliderTextThumb title={title2} />}
              onChange={(e, v) => {
                if(showStyle){
                  v = Math.abs(1-v) < 0.1 ? 1 : v;
                  setMod("scale", v);
                } else {
                  this.setState({paintSize: v});
                }
              }}
            />
            <Slider
              className="slider"
              min={0}
              max={0.5}
              value={val3}
              thumb={<SliderTextThumb title={title3} />}
              onChange={(e, v) => {
                if(showStyle){
                  setMod("noise", v);
                } else {
                  this.setState({paintOpacity: v});
                }
              }}
            />
          </div>
          <div
          className="secondaryPreviewCtrlLayer"
          style={{visibility: styleButtonVisibility}}>
            <div className="splitParamGroup">
              {alertDialog(this.state.alertDialogMessage,
               () => {
                this.setState({alertDialogMessage: null});
              })}
              <Button
              id="content"
              variant='contained'
                className="wholeWidth"
                onClick={(evt) => {
                  if(this.props.layerList.length){
                    this.setState({poAnchor: evt.currentTarget});
                  } else {
                    this.setState({alertDialogMessage: [
                      'No layer list available.', 'Please load model first!'
                    ]});
                  }
                }}
              >Cont. Lr.</Button>
              <Button
              id="style"
              className="wholeWidth"
                variant='contained'
                onClick={(evt) => {
                  if(this.props.layerList.length){
                    this.setState({poAnchor: evt.currentTarget});
                  } else {
                    this.setState({alertDialogMessage: [
                      'No layer list available.', 'Please load model first!'
                    ]});
                  }
                }}>Style Lr.</Button>
              <Popover
                open={Boolean(this.state.poAnchor)}
                anchorEl={this.state.poAnchor}
                onClose={() => {
                  this.setState({poAnchor: null});
                }}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'center',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'center',
                }}
              >
                <LayerChecklist
                  layerList={this.props.layerList}
                  styleLayers={this.props.styleLayers}
                  layerMode={styleLayerMode}
                  styleLayerChanged={(layerName) => {
                    this.props.styleLayerChanged(
                      layerName, styleLayerMode);
                  }}
                />
              </Popover>
            </div>
          </div>
        </div>}
      </div>
    );
  }
}
