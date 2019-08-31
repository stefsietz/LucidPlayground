import React, { Component } from 'react';
import PropTypes from "prop-types";
import { withStyles } from '@material-ui/core/styles';
import {
    Typography, FormControl, Select, MenuItem, Link,
    InputLabel, TextField, Fab, FormControlLabel, Checkbox,
    Button, Switch, Tooltip
} from "@material-ui/core";
import {Slider} from '@material-ui/lab';
import "./ParamView.css";
import {objectiveTypes, loadStates} from '../LucidJS/src/optvis/renderer.js';
import {getImgDataFromFile} from '../DrawingHelper.js';
import {ttInputParams, ttObjectiveParams} from '../strings'


const objectives = Object.entries(
  objectiveTypes).map((keyAndValue) => keyAndValue[1]);

export default class ParamView extends Component {

  constructor(props){
    super(props);
  }

  render(){
    const uploadButton = (<span>Upload<input
      type="file"
      accept="image/*"
      style={{ display: "none" }}
      onChange={(e) => {
        const files = e.target.files;
        const imgFile = files[0];
        getImgDataFromFile(imgFile, (imgData) => {
          this.props.handleInputChange({baseImage: imgData});
          console.log(imgData);
        });
      }}
    /></span>);

    return (
    <div>
      <div className="paramContainer">
        <div className="paramColumn">
          <Tooltip title={this.props.showHelp ? ttInputParams : ''}>
            <div className="titleContainer">
              <h4 className="titleText">Input parameters</h4>
              <Button style={{"paddingTop": "2px",
              "paddingBottom": "2px",
            "marginRight": "5px"}}
              variant='contained'
              color="primary"
              disabled={this.props.loadStatus === loadStates.OPTIMIZING}
              onClick={() => {
                this.props.onApplyInputParams();
              }}
              >Apply</Button>
            </div>
          </Tooltip>
          <div id="inputParams" className="paramSettingsContainer">
            <div className="paramSettingsColumn">
              <div className="paramGroup">
                <Typography className="sliderLabel">Input size: {
                  this.props.inputSize}</Typography>
                <Slider
                  className="slider"
                  min={16}
                  max={512}
                  step={16}
                  value={this.props.inputSize}
                  aria-labelledby="label"
                  onChange={(e, v) => {
                      this.props.handleInputChange({inputSize: v});
                    }
                  }
                />
              </div>
              <div className="splitParamGroup">
                <Typography className="wholeWidth">Decorrelate</Typography>
                <Switch className="wholeWidth"
                checked={this.props.decorrelate}
                onChange={(e, v) => {
                    this.props.handleInputChange({decorrelate: v});
                  }
                }></Switch>
              </div>
            </div>
            <div className="paramSettingsColumn">
              <div className="paramGroup">
                <Typography
                className="sliderLabel">Lapl. pyramid layers: {
                  this.props.pyramidLayers}</Typography>
                <Slider
                  className="slider"
                  min={1}
                  max={9}
                  step={1}
                  value={this.props.pyramidLayers}
                  aria-labelledby="label"
                  onChange={(e, v) => {
                    this.props.handleInputChange({pyramidLayers: v});
                  }}
                />
              </div>
              <div className="splitParamGroup">
                <Typography className="wholeWidth">Base Image</Typography>
                <Button className="wholeWidth"
                variant='contained'
                component={this.props.baseImage ? 'button' : 'label'}
                onClick={(e) => {
                  if(this.props.baseImage) {
                    this.props.handleInputChange({baseImage: null});
                  }
                }}>{this.props.baseImage ? 'Remove' : uploadButton }
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="paramColumn">
          <Tooltip title={this.props.showHelp ? ttObjectiveParams : ''}>
            <div className="titleContainer">
              <h4 className="titleText">Optimization parameters</h4>
            </div>
          </Tooltip>
          <div id="optimParams" className="paramSettingsContainer">
            <div className="paramSettingsColumn">
              <FormControl className="menu">
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
              <div className="splitParamGroup">
                <Typography className="wholeWidth">Negative</Typography>
                <Switch className="wholeWidth"
                checked={this.props.negative}
                onChange={(e,v) =>
                  this.props.changedNegative(v)}></Switch>
              </div>
              <FormControl className="menu">
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
            <div className="paramSettingsColumn">
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
              <div  style={{visibility: 'hidden'}}
              className="paramGroup">
                <Typography
                className="sliderLabel">Pyr. Layer Weight: {
                  this.props.pyrLayerWeight}</Typography>
                <Slider
                  className="slider"
                  min={0}
                  max={1}
                  value={this.props.pyrLayerWeight}
                  aria-labelledby="label"
                  onChange={(e, v) =>
                    this.props.changedPyrLayerWeight(v)
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>);
  }

}
