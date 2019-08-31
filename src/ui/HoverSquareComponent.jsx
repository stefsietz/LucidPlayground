import React, { Component } from 'react';

export default class HoverSquareComponent extends Component {

  constructor(props) {
    super(props);

    this.mouseEntered = false;
    this.hoveredSquare = -1;
  }

  registerEventListeners(scene, canvas){
    this.canvas.addEventListener('mouseenter', this.onMouseEnter);
    this.canvas.addEventListener('mouseleave', this.onMouseLeave);
  }

  componentWillUnmount() {
    this.canvas.removeEventListener('mouseenter', this.onMouseEnter);
    this.canvas.removeEventListener('mouseleave', this.onMouseLeave);
  }

  onMouseEnter = (evt) => {
    this.mouseEntered = true;
    this.updateAndRender();
  }

  onMouseLeave = (evt) => {
    this.mouseEntered = false;
    this.hoveredSquare = -1;
    this.updateAndRender();
  }
}
