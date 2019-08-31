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

export default class ActivationView extends Component {

  constructor(props) {
    super(props);

    this.w = 0;
    this.h = 0;

    this.defatultActivations = Float32Array.from([1000000]);
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

    this.createBaseSquare(scene);

    this.onResize(canvas.width, canvas.height);

    this.scene.executeWhenReady( () => {
      this.updateAndRender();
    })
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
    this.shaderMaterial.setFloat('shift', this.props.shift);
    this.shaderMaterial.setFloat('scale', this.props.scale);
    this.shaderMaterial.setFloat('noise', this.props.noise);

    this.shaderMaterial.setFloat('mean', this.props.mean);
    this.shaderMaterial.setFloat('variance', this.props.variance);
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
            canvasId={'activationAdjustCanvas'}/>
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
      "shader", scene, "./activationAdjustmentShader",
    {
        attributes: ["position", "uv"],
        uniforms: ["worldView", "viewProjection", "worldViewProjection",
        "textureSampler", "shift", "scale", "noise"]
    });

    this.baseSquare = MeshBuilder.CreatePlane('baseSquare',
    {sideOrientation: Mesh.DOUBLESIDE}, scene);
    this.baseSquare.material = this.shaderMaterial;
    this.shaderMaterial.backFaceCulling = false;
  }
}
