import React from 'react';
import {fillCanvasPixelsWithGreyAndAlpha} from '../DrawingHelper.js';

export default class DetailView extends React.Component{
  constructor(){
    super();
    this.state = {
      weightTensor: undefined,
    };
  }

  showFeaturemaps(tfjsLayer){

  }

  renderFeatureMap(pixelData){
    return (<div>{this.canvasesFromTensor(pixelData)}</div>);
  }

  canvasesFromTensor(pixelData){
    if(!pixelData){
      return (<div>testDiv</div>);
    }
    let shape = pixelData.shape;
    let w, h, d;
    if(shape.length === 4){
      pixelData = pixelData[0];
      shape = [shape[1], shape[2], shape[3]]
    }
    w = shape[0];
    h = shape[1];
    d = shape[2];
    let canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    let ctx = canvas.getContext('2d');

    let canvasImageData = ctx.createImageData(w, h);
    fillCanvasPixelsWithGreyAndAlpha(canvasImageData, pixelData[0], w, h);

    return canvas;
  }

  showOptimization(param, transform, objective){

  }

  render(){
    return this.renderFeatureMap(this.state.weightTensor);
  }
}
