import React, { Component } from 'react';
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import './BabylonScene.css'

export default class BabylonScene extends Component {

  constructor(props){
    super(props);
    this.state = {
      width: 0,
      height: 0,
    }
  }

  onResizeWindow = (ev) => {
    if(this.engine) {
      this.engine.resize();
    }

    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.setState({
      width: width,
      height:height,
    }, () => {
      const width = this.state.width;
      const height = this.state.height;
      this.props.onResize(width, height);
    });
  }

  componentDidMount() {
    this.engine = new Engine(
      this.canvas,
      true,
      this.props.engineOptions
    );

    this.scene = new Scene(this.engine);

    if(this.props.onSceneMount) {
      this.props.onSceneMount({
          scene: this.scene,
          engine: this.engine,
          canvas: this.canvas
      });
    } else{
      console.error('onSceneMount function not available');
    }

    window.addEventListener('resize', this.onResizeWindow);
    window.addEventListener('resizeActivationView', this.onResizeWindow);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.onResizeWindow);
    window.removeEventListener('resizeActivationView', this.onResizeWindow);
  }

  onCanvasLoaded = (c) => {
    if(c !== null) {
      this.canvas = c;
    }
  }

  render() {
    let {width, height, ...rest} = this.props;

    let opts = {};

    if(width !== undefined && height !== undefined) {
      opts.width = width;
      opts.height = height;
    }

    return (
      <canvas
        {...opts}
        id={this.props.canvasId}
        ref={this.onCanvasLoaded}
        />
    )
  }
}
