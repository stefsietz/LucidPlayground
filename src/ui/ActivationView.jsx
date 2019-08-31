import React, { Component } from 'react';
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3, Plane } from "@babylonjs/core/Maths/math";
import { Camera, FreeCamera } from "@babylonjs/core/Cameras";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import BabylonScene from './BabylonScene'
import { PointerEventTypes,KeyboardEventTypes, ShaderMaterial,
   StandardMaterial, Color3, Texture, RawTexture, RawTexture3D } from '@babylonjs/core';
import "@babylonjs/core/Meshes/meshBuilder";
import "babylonjs-inspector/babylon.inspector.bundle.js"

import HoverSquareComponent from './HoverSquareComponent'

const MAX_SQR_W = 256;
const MIN_SQR_W = 3;

export default class ActivationView extends HoverSquareComponent {

  constructor(props) {
    super(props);

    this.scrollPos = 0;
    this.squareWidth = 32;
    this.squareCount = 1000;
    this.margin = 5;
    this.requiredHeight = 0;
    this.w = 0;
    this.h = 0;

    this.shiftIsDown = false;

    this.defatultActivations = Float32Array.from([1000000]);

    this.hoveredSquare = -1;

    this.lastDepth = -1;
  }

  getShiftIsDown() {
    return this.shiftIsDown;
  }

  onSceneMount = (e) => {
    const {scene, engine, canvas} = e;
    this.scene = scene;
    this.engine = engine;
    this.canvas = canvas;
    this.squareProps = [];
    this.squares = [];

    const bg = 247/255;
    scene.clearColor = new Color3(bg, bg, bg);

    this.camera = new FreeCamera(
      'camera1', new Vector3(0, 0, -1), scene);
    this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA;

    this.camera.orthoBottom = 0;
    this.camera.orthoLeft = 0;

    scene.onPointerObservable.add((pointer) => {
        this.canvas.focus();
        var evt = pointer.event;

        if(evt.type === 'wheel'){
          if(!this.shiftIsDown){
            if (evt.wheelDelta < 0) {
                this.scrollPos -= evt.wheelDelta/this.requiredHeight;
            }
            if (evt.wheelDelta > 0) {
                this.scrollPos -= evt.wheelDelta/this.requiredHeight;
            }
            this.scrollPos = Math.max(0, Math.min(1, this.scrollPos));
          } else {
            if (evt.wheelDelta < 0) {
                this.squareWidth *= 1-0.001*evt.wheelDelta;
            }
            if (evt.wheelDelta > 0) {
                this.squareWidth *= 1-0.001*evt.wheelDelta;
            }
            this.squareWidth = Math.max(
              MIN_SQR_W, Math.min(MAX_SQR_W, this.squareWidth));
          }
          evt.preventDefault();

        } else if(evt.type === 'pointermove'){
          const hov = this.getHoveredSquare(evt.offsetX, evt.offsetY);
          this.hoveredSquare = hov;
        }
        this.updateAndRender();
    }, PointerEventTypes.POINTERWHEEL | PointerEventTypes.POINTERMOVE, false);

    scene.onPointerObservable.add((pointer) => {
      let ind = -1;
      if(pointer.pickInfo.pickedMesh){
        const evt = pointer.event;
        const pick = this.getHoveredSquare(evt.offsetX, evt.offsetY);
        ind = pick;
      }
      this.props.onClickFeatureMap(ind);
    }, PointerEventTypes.POINTERTAP, false)

    scene.onKeyboardObservable.add((kbInfo) => {
      switch (kbInfo.type) {
          case KeyboardEventTypes.KEYDOWN:
              if(kbInfo.event.keyCode === 16) {
                this.shiftIsDown = true;
              }
              break;
          case KeyboardEventTypes.KEYUP:
              if(kbInfo.event.keyCode === 16) {
                this.shiftIsDown = false;
              }
              break;
      }
      this.updateAndRender();
    });

    this.createBaseSquare(scene);

    this.updateAndRender();

    super.registerEventListeners(scene, canvas);

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    this.onResize(width, height);
  }

  updateAndRender(){
    if (this.scene) {
      this.calculateSquareLayout();
      this.updateSquares();
      this.updateYPos();
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
      sizeMatches = (sz.width === width && sz.height === height
      && this.lastDepth === depth);
    }
    if(!this.activationTexture || !sizeMatches) {
      if(this.activationTexture){
        this.activationTexture.dispose();
      }
      this.activationTexture = new RawTexture3D(this.activations, width, height,
        depth, Engine.TEXTUREFORMAT_RED, this.scene, false, false,
        Texture.NEAREST_SAMPLINGMODE, Engine.TEXTURETYPE_FLOAT);
    } else {
      this.activationTexture.update(this.activations);
    }

    this.shaderMaterial.setTexture('textureSampler', this.activationTexture);
    this.lastDepth = depth;
  }

  updateUniforms() {
    if(this.w){
      this.shaderMaterial.setFloat('viewWidth', this.w);
      this.shaderMaterial.setFloat('viewHeight', this.h);
      this.shaderMaterial.setFloat('squareWidth', this.squareWidth);
      this.shaderMaterial.setFloat('borderWidth', 2.0);
      this.shaderMaterial.setFloat('margin', this.margin);
      this.shaderMaterial.setInt('hoverIndex', this.hoveredSquare);
      this.shaderMaterial.setInt('selectedIndex', this.props.selectedChannel);
    }
    this.shaderMaterial.setFloat('channels', this.props.channelNumber);
  }

  render() {
    this.updateAndRender();
    return (
        <div id="activationView"
        style={{height: '100%'}}>
            <BabylonScene
            onSceneMount={this.onSceneMount}
            onResize={this.onResize}
            canvasId={'multiActivationCanvas'}/>
        </div>
    )
  }

  onResize = (w, h) => {
    this.w = w;
    this.h = h;
    this.camera.orthoBottom = -h/2;
    this.camera.orthoLeft = -w/2;
    this.camera.orthoTop = h/2;
    this.camera.orthoRight = w/2;
    this.camera.position.x = w/2;
    this.updateAndRender();
  }

  updateYPos() {
    const minY = -this.h/2;
    const y = this.yOffset() + minY;

    this.camera.position.y = y;
  }

  yOffset() {
    const minY = -this.h/2;
    let maxY = -this.requiredHeight + this.h/2;
    if(this.requiredHeight <= this.h) {
      maxY = minY;
    }

    return this.scrollPos * (maxY - minY);
  }

  createBaseSquare(scene) {
    this.shaderMaterial = new ShaderMaterial(
      "shader", scene, "./activationSquareShader",
    {
        attributes: ["position", "normal", "uv", "world0","world1","world2","world3"],
        uniforms: ["viewProjection", "worldViewProjection", "textureSampler"]
    });

    this.baseSquare = Mesh.CreatePlane('baseSquare', null, scene);
    this.baseSquare.isVisible = true;
    this.baseSquare.material = this.shaderMaterial;
  }

  updateSquares() {
    if(this.squareProps.length !== this.squares.length) {
      const diff = this.squareProps.length - this.squares.length;
      if(diff > 0) {
        for (let i = 0; i < diff; i++) {
           let newSquareInstance = this.baseSquare.createInstance("" + i);
           this.squares.push(newSquareInstance);
        }
      } else {
        while(this.squares.length > this.squareProps.length) {
          const inst = this.squares[this.squares.length - 1];
          inst.dispose();
          this.squares.pop();
        }
      }
    }
    for (let i = 0; i < this.squareProps.length; i++) {
      const props = this.squareProps[i];
      const square = this.squares[i];
      square.position.x = props.x;
      square.position.y = -props.y;
      square.scaling.x = props.w;
      square.scaling.y = props.h;
    }

    this.scene.executeWhenReady(() => {
      this.scene.render();
    })
  }

  calculateSquareLayout() {
    const viewWidth = this.w;
    const viewHeight = this.h;
    const squareWidth = this.squareWidth;
    const squareCount = this.props.channelNumber;
    const margin = this.margin;

    this.squareProps = [];
    const xCount = Math.floor((viewWidth - margin) / (squareWidth + margin));
    for(let i=0; i<squareCount; i++) {
      const halfWidth = squareWidth/2;
      const xIdx = (i%xCount);
      const yIdx = (i - xIdx) / xCount;
      const x = margin + xIdx*(margin + squareWidth) + halfWidth;
      const y = margin + yIdx*(margin + squareWidth) + halfWidth;
      const left = x - halfWidth;
      const right = x + halfWidth;
      const top = y + halfWidth;
      const bottom = y - halfWidth;
      this.squareProps.push({
        x: x,
        y: y,
        w: squareWidth,
        h: squareWidth,
        l: left,
        r: right,
        t: top,
        b: bottom,
      });

      this.requiredHeight = top + margin;
    }
  }

  getHoveredSquare(x, y) {
      y -= this.yOffset();
      const viewWidth = this.w;
      const viewHeight = this.h;
      const squareWidth = this.squareWidth;
      const squareCount = this.squareCount;
      const margin = this.margin;

      const xCount = Math.floor((viewWidth - margin) / (squareWidth + margin));
      const widthRatio = squareWidth / (squareWidth+margin);

      const xIdx = (x-margin) / (squareWidth + margin);
      const xIdxFloor = Math.floor(xIdx);
      const xFrac = xIdx - xIdxFloor;
      if(xFrac > widthRatio) {
        return -1; // between squares
      }

      const yIdx = (y-margin) / (squareWidth + margin);
      const yIdxFloor = Math.floor(yIdx);
      const yFrac = yIdx - yIdxFloor;
      if(yFrac > widthRatio) {
        return -1; // between squares
      }
      else {
        const idx = xCount * yIdxFloor + Math.floor(xIdx);
        return idx < squareCount ? idx : -1;
      }
    }
}
