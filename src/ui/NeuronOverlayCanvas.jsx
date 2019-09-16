import React, { Component } from 'react';
import {fillCanvasPixelsWithRgbAndAlpha, fillCanvasPixelsWithGreyAndAlpha,
getImageData, getRgbFromCanvasRgba, getGrayFromCanvasRgba}
from '../DrawingHelper.js';

export default class NeuronOverlayCanvas extends Component {

  constructor(props) {
    super(props);

    this.canvas = React.createRef();
  }

  componentDidMount() {
    this.width = this.props.width;
    this.height = this.props.height;
  }

  render() {
    return (<canvas
      style={this.props.style}
      className={this.props.className}
       ref={this.canvas}
       />);
  }

  /**
   * Fills canvas with pixel data.
   * @param {*} pixelData Raw pixel array
   * @param {*} canvas Canvas to draw on to
   * @param {*} w width of pixel data
   * @param {*} h height of pixel data
   * @param {boolean} rgb rgb or greyscale status of pixel data
   * @param {*} channel channel to take from pixel data in case multiple channels are contained
   */
  drawCanvas(pixelData, canvas, w, h, rgb, channel=0){
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


}
