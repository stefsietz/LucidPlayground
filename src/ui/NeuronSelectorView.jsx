import React, { Component } from 'react';
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3, Plane } from "@babylonjs/core/Maths/math";
import { Camera, FreeCamera } from "@babylonjs/core/Cameras";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import BabylonScene from './BabylonScene'
import { PointerEventTypes,KeyboardEventTypes, ShaderMaterial,
   StandardMaterial, Color3, Texture, RawTexture, MeshBuilder
 } from '@babylonjs/core';
import "@babylonjs/core/Meshes/meshBuilder";
import "babylonjs-inspector/babylon.inspector.bundle.js"
import "./DetailView.css";

import HoverSquareComponent from './HoverSquareComponent'

export default class ActivationView extends HoverSquareComponent {

  constructor(props) {
    super(props);

    this.w = 0;
    this.h = 0;

    this.defatultActivations = Float32Array.from([1000000]);
    this.widthRes = -1;
    this.heightRes = -1;

    this.hoveredSquare = -1;
  }

  onSceneMount = (e) => {
    const {scene, engine, canvas} = e;
    this.scene = scene;
    this.engine = engine;
    this.canvas = canvas;
    canvas.classList.add("noOutline");

    scene.clearColor = new Color3(1, 1, 1);

    this.camera = new FreeCamera(
      'camera1', new Vector3(0, 0, -1), scene);
    this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA;

    this.camera.orthoBottom = -1/2;
    this.camera.orthoLeft = -1/2;
    this.camera.orthoTop = 1/2;
    this.camera.orthoRight = 1/2;

    this.registerEventListeners(scene, canvas);

    this.createBaseSquare(scene);

    this.onResize(canvas.width, canvas.height);

    this.scene.executeWhenReady( () => {
      this.updateAndRender();
    })
  }

  registerEventListeners(scene, canvas){
    scene.onPointerObservable.add((pointer) => {
        var evt = pointer.event;

        if(evt.type === 'pointermove'){
          const hov = this.getHoveredNeuron(evt.offsetX, evt.offsetY);
          this.hoveredSquare = hov;
        }
        this.updateAndRender();
    }, PointerEventTypes.POINTERMOVE, false);

    scene.onPointerObservable.add((pointer) => {
      let ind = -1;
      const evt = pointer.event;
      let [x, y] = this.getHoveredNeuronXY(evt.offsetX, evt.offsetY);
      if(x !== -1 && y !== -1){
        this.props.neuronChanged(x, y);
      }
    }, PointerEventTypes.POINTERTAP, false);

    super.registerEventListeners(scene, canvas);
  }

  updateAndRender(){
    if (this.scene) {
      this.updateTexture();
      this.updateUniforms();
      this.scene.render();
    }
  }

  updateTexture() {
    let width = 1;
    let height = 1;
    let depth = 1;
    if(this.props.activations){
      this.activations = this.props.activations
      const [b, w, h, c] = this.props.activationShape;

      const dataLength = w*h*c;
      const sqrtW = Math.ceil(Math.sqrt(dataLength));
      width = w;//sqrtW;
      height = h;//sqrtW;
      depth = c;
      this.widthRes = w;
      this.heightRes = h;
    } else{
      this.activations = this.defatultActivations;
    }

    //this.activationTexture = new RawTexture(this.activations, width, height,
    //  Engine.TEXTUREFORMAT_RED, this.scene, false, false,
    //  Texture.BILINEAR_SAMPLINGMODE, Engine.TEXTURETYPE_FLOAT);

    let sz;
    let sizeMatches = false;
    if(this.activationTexture) {
      sz = this.activationTexture.getSize();
      sizeMatches = (sz.width === width && sz.height === height);
    }
    if(!this.activationTexture || !sizeMatches) {
      if(this.activationTexture){
        this.activationTexture.dispose();
      }
      this.activationTexture = new RawTexture(this.activations, width, height,
        Engine.TEXTUREFORMAT_RED, this.scene, false, false,
        Texture.NEAREST_SAMPLINGMODE, Engine.TEXTURETYPE_FLOAT);
    } else {
      this.activationTexture.update(this.activations);
    }

    this.shaderMaterial.setTexture('textureSampler', this.activationTexture);
  }

  updateUniforms() {
    let wRes = 1;
    let hRes = 1;
    if(this.widthRes !== -1){
      wRes = this.widthRes;
    }
    if(this.heightRes !== -1){
      hRes = this.heightRes;
    }

    let [x, y] = this.props.selectedNeuron;
    const selectedSquare = this.getLinearNeuronInd(x, y);

    this.shaderMaterial.setFloat('widthRes', wRes);
    this.shaderMaterial.setFloat('heightRes', hRes);
    this.shaderMaterial.setInt('hoverIndex', this.hoveredSquare);
    this.shaderMaterial.setInt('selectedIndex', selectedSquare);
  }

  render() {
    this.updateAndRender();
    return (
        <div
        className={this.props.className}
        style={this.props.style}>
            <BabylonScene
            onSceneMount={this.onSceneMount}
            onResize={this.onResize}
            canvasId={'neuronSelectionCanvas'}/>
        </div>
    )
  }

  onResize = (w, h) => {
    this.w = w;
    this.h = h;

    this.updateAndRender();
  }

  createBaseSquare(scene) {
    this.shaderMaterial = new ShaderMaterial(
      "shader", scene, "./selectNeuronShader",
    {
        attributes: ["position", "uv"],
        uniforms: ["worldView", "viewProjection", "worldViewProjection",
        "textureSampler", "widthRes", "heightRes",
        "hoverIndex", "selectedIndex"]
    });

    this.baseSquare = MeshBuilder.CreatePlane('baseSquare',
    {sideOrientation: Mesh.DOUBLESIDE}, scene);
    this.baseSquare.material = this.shaderMaterial;
    this.shaderMaterial.backFaceCulling = false;
  }

  getHoveredNeuron = (x, y) => {
      if(!this.mouseEntered) {
        return -1;
      }

      const viewWidth = this.w;
      const viewHeight = this.h;

      if(x < 0 || y < 0 || x > this.w || y > this.h){
        return -1;
      }

      const [xIdxFloor, yIdxFloor] = this.getHoveredNeuronXY(x, y);

      const idx = this.widthRes * yIdxFloor + xIdxFloor;
      return idx;
    }

  getHoveredNeuronXY = (x, y) => {
    const viewWidth = this.w;
    const viewHeight = this.h;

    if(x < 0 || y < 0 || x > this.w || y > this.h){
      return [-1, -1];
    }

    const squareWidth = viewWidth / this.widthRes;
    const squareHeight = viewHeight / this.heightRes;

    const xIdx = x / squareWidth;
    const xIdxFloor = Math.floor(xIdx);

    const yIdx = y / squareHeight;
    const yIdxFloor = Math.floor(yIdx);

    return [xIdxFloor, yIdxFloor];
  }

  getLinearNeuronInd = (x, y) => {
    if(this.widthRes === -1) {
      return -1;
    }
    return y * this.widthRes + x;
  }
}
