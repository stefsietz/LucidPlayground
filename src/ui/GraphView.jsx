import React, { Component } from 'react';
import * as d3 from "d3";
import {
    Typography, FormControl, Select, MenuItem, Link,
    InputLabel, TextField, Fab, FormControlLabel, Checkbox
} from "@material-ui/core";

import "./GraphView.css";
import "../Home0.css";
import Graph from '../scene/Graph.js'

const fieldToLabel = {
  name: 'Name',
  class_name: 'Op',

  kernel_size: 'Kernel size',
  pool_size: 'Pool size',
  filters: 'Filters',
  strides: 'Strides',
  activation: 'Activation',
  units: 'Units',
  axis: 'Axis',
  batch_input_shape: 'Input shape',
  dtype: 'Dtype',
}

const classNameToConfigFields = {
  Conv2D: ['kernel_size', 'strides', 'filters'],
  Dense: ['activation', 'units'],
  Concatenate: ['axis'],
  MaxPooling2D: ['pool_size', 'strides'],
  Input: ['batch_input_shape', 'dtype'],
  Softmax: ['axis'],
  ReLU: []
}

const getTooltipHTML = (layer) => {
  const cN = layer.class_name;
  const config = layer.config;
  let configFields = [];
  if(cN in classNameToConfigFields) {
    configFields = classNameToConfigFields[cN];
  }
  let html =
  '<div style="padding: 2px 5px; display: flex; flex-direction: row;">'
  +'<div style="padding: 2px 5px;" >'
  +'Name: <br/>Type: <br/>';
  for(const cF of configFields) {
    html += fieldToLabel[cF] + ':<br/>';
  }
  html += '</div>'
  +'<div style="padding: 2px 5px;" >';
  html += layer.name + '<br/>'+cN+'<br/>';
  for(const cF of configFields) {
    const value =  config[cF];
    html += value + '<br/>';
  }
  html += '</div>'
  html += '</div>';
  return html;
}

const draw = (props) => {
  d3.select("#graphContainer > *").remove();

  const graph = props.graph;
  const distList = graph.getLayoutByInputDist();
  let layerList = graph.getSortedLayerList();

  const graphMargin = ({ top: 40, right: 40, bottom: 40, left: 40 });
  const graphWidth = 1000 - graphMargin.left - graphMargin.right
  const graphHeight = 1500 - graphMargin.top - graphMargin.bottom
  let zoomScale = 1;
  const filterTransitionSpeed = 1000;

  let zoom = d3.zoom()
    .scaleExtent([.1, 3.5])
    .extent([[0, 0], [graphWidth, graphHeight]])
    .on("zoom", zoomed);

  function zoomed() {
      d3.select('#graphG').attr("transform", d3.event.transform);
      // console.log(d3.event.transform)
  }

  let graphSVG = d3.select("#graphContainer")
    .append("svg")
    .attr('viewBox', '0 0 ' + (graphWidth + graphMargin.left + graphMargin.right) + ' ' + (graphHeight + graphMargin.top + graphMargin.bottom))
    .attr('width', '100%')
    .style('border-bottom', '1px solid rgba(0, 0, 0, 0.1)')
    .attr('id', 'graphSVG');

  let filter = graphSVG.append('filter').attr('id', 'dilate');
  let feMorphology = filter.append('feMorphology')
  .attr('operator', 'dilate')
  .attr('radius', 10);

  let ttDiv = d3.select("body").append("div")
    .attr("class", "graphViewToolTip")
    .style("opacity", 0);

  let zoomRect = graphSVG.append("rect")
    .attr("width", graphWidth + graphMargin.left + graphMargin.right)
    .attr("height", graphHeight + graphMargin.top + graphMargin.bottom)
    .style("fill", "none")
    .style("pointer-events", "all")
    .call(zoom);

  let graphG = graphSVG
            .append("g")
            .attr("transform", "translate(" + graphMargin.left + "," + graphMargin.top + ")")
            .attr('id', 'graphG')

  function drawOrigin() {
            graphG.append('circle')
                .attr('r', 10)
                .attr('cx', 0)
                .attr('cy', 0)
        }

  drawOrigin()

  function centerDag() {
      zoomRect.transition().duration(750).call(zoom.transform, d3.zoomIdentity.translate(graphWidth / 2, 50).scale(0.2));
  }
  centerDag()
  d3.select('#graph-home').on('click', () => {
      centerDag()
  })

  const fvWidth = 120;
  const fvHeight = fvWidth/4;

  const deWidth = 49;
  const deHeight = deWidth;

  const attrFvWidth = 60;
  const attrFvHeight = attrFvWidth;

  let layerVerticalSpace = 150;
  let fvHorizontalSpace = 50;

  const computeNodeCoordinates = (distList) => {
    distList.forEach((el, distInd) => {
      const {distance: dist, layers:layers} = el;
      layers.forEach((layer, i) => {
        if(layer.inboundNodes.length === 1 &&
          layer.inboundNodes[0].outboundNodes.length === 1) {
          layer.x = layer.inboundNodes[0].x;
        } else {
          layer.x =
          (
            (
              (fvWidth + fvHorizontalSpace) * i
            ) -
            (
              (layers.length * fvWidth + (layers.length - 1)
                * fvHorizontalSpace
              ) / 2
            )
          );
        }
        layer.y = dist * layerVerticalSpace;
        layer.midX = layer.x + fvWidth / 2;
        layer.inY = layer.y;
        layer.outY = layer.y + fvHeight;
      });
    });
  }

  const nodeTextX = function (d) {
    const bb = this.getBBox();
    return d.x + fvWidth / 2 - bb.width / 2;
  };

  const nodeTextY = function (d) {
    const bb = this.getBBox();
    return d.y + fvHeight / 2 + bb.height / 2 - 3;
  };

  const nodeNameY = function (d) {
    const bb = this.getBBox();
    return d.y + fvHeight + bb.height + 5;
  };

  function nodeColor(d){
    const colors = {
      'Conv2D': 'lightcoral',
      'MaxPool2D': 'honeydew',
      'AvgPool2D': 'honeydew',
      'MaxPooling2D': 'honeydew',
      'AveragePooling2D': 'honeydew',
      'GlobalAveragePooling2D': 'honeydew',
      'ReLU': 'lightblue',
      'Concat': 'lightgray',
      'Concatenate': 'lightgray',
      'InputLayer': 'white',
      'Flatten': 'lightgray',
      'Reshape': 'lightgray',
      'Softmax': 'lightblue',
      'Dense': 'lightyellow',
    };
    let col = colors[d.class_name];
    if(!col){
      col = 'lightgray';
    }
    if(d3.select(this).classed('selected')){
      col = 'greenyellow';
    }
    return col;
  }

  computeNodeCoordinates(distList);

  const layerNodes = graphG
  .selectAll("g")
  .data(layerList)
  .enter()
  .append("g")
  .attr('id', (d,i) => 'layerNode-'+d.name)
  .attr('class', 'layerNode')

  const drawInputConnections = function(dThis, i) {
    d3.select(this).selectAll('path')
    .data(dThis.inboundNodes)
    .enter()
    .append('path')
    .attr('d', dIn => {
      let inX = dIn.midX;
      let inY = dIn.outY;
      let outX = dThis.midX;
      let outY = dThis.inY;

      return "M" + inX + "," + inY
          + "C" + inX + " " + (outY - layerVerticalSpace/2) + ","
          + outX + " " + (outY - layerVerticalSpace/2) + ","
          + outX + "," + outY;
    })
    .style('stroke-width', 2)
    .style('stroke', 'darkgray')
    .style('fill', 'transparent');
  }

  layerNodes.each(drawInputConnections);

  const layerNodeRects = layerNodes.append('rect')
  .attr("x",(d)=>d.x)
  .attr("y",(d)=>d.y)
  .attr("width", fvWidth)
  .attr("height", fvHeight)
  .style('fill', nodeColor)
  .style('stroke', 'darkgray')
  .style('stroke-width', 1)
  .attr('rx', 10)
  .attr('id', (d,i) => 'layerNodeRect-'+d.name)
  .attr('class', 'layerNodeRect')
  .classed('selected', false)
  .on('mouseover', function(d, i) {
    d3.select(this.parentNode).select('.layerNodeName')
    .style('visibility', 'visible');

    ttDiv.transition()
        .duration(200)
        .style("opacity", .9);
    ttDiv.html(() => getTooltipHTML(d))
        .style("left", (d3.event.pageX + 20) + "px")
        .style("top", (d3.event.pageY - 28) + "px");

    const currEl = d3.select(this);
    currEl
    .style('stroke-width', currEl.classed("selected") ? 5 : 2);
  })
  .on('mouseout', function(d, i) {
    d3.select(this.parentNode).select('.layerNodeName')
    .style('visibility', 'hidden');

    ttDiv.transition()
        .duration(500)
        .style("opacity", 0);

    const currEl = d3.select(this);
    currEl
    .style('stroke-width', currEl.classed("selected") ? 5 : 1);
  })
  .on('click', function(d, i) {
    props.clickedNode(d);
    layerNodeRects
    .style('stroke-width', 1)
    .style('stroke', 'darkgray')
    .classed('selected', false)
    .style('fill', nodeColor);

    d3.select(this)
    .style('stroke-width', 5)
    .style('stroke', 'black')
    .classed('selected', true)
    .style('fill', nodeColor);
  });


  const layerNodeOpText = layerNodes.append('text')
  .text(d => d.class_name)
  .style('font-size', fvHeight/2)
  .attr('class', 'layerNodeText')
  .attr('x', nodeTextX)
  .attr('y', nodeTextY)
  .style('fill', 'black')
  .attr("pointer-events", "none");

  const layerNodeNameText = layerNodes.append('text')
  .text(d => d.name)
  .style('font-size', fvHeight/2)
  .attr('class', 'layerNodeText layerNodeName')
  .attr('x', nodeTextX)
  .attr('y', nodeNameY)
  .style('visibility', 'hidden')
  .style('fill', 'black')
  .attr("pointer-events", "none");

}

export default class GraphView extends Component {

  componentDidMount(){
    if(this.props.graph){
      draw(this.props);
    }
  }

  componentDidUpdate(oldProps){
    if(this.props.graph && oldProps.graph !== this.props.graph){
      draw(this.props);
    }
  }

  x(data, index){
    console.log(data, index);
  }

  render(){
    return (
    <div  style={{width: "100%", minHeight:"300px",
    height: "100%", overflow: "hidden"}} id="graphView">
      <div style={{width:"100%", height:"100%"}}
      id="graphContainer"></div>
    </div>);
  }

}
