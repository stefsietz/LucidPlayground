import Layer from './layer/Layer.js'

/**
 * Reads model.json to store structure of the graph, provides some methods to calculate the layout.
 */
export default class Graph {
  constructor(modelJson){
    this.name = "";
    this.layers = {};
    this.inputLayers = [];
    this.outputLayers = [];
    this.layerSequence = [];
    this.initFromModelJson(modelJson);
  }

  /**
   * Initialize data structures from json object.
   * @param {*} modelJson json object from  model.json file
   */
  initFromModelJson(modelJson){
    this.name = modelJson['modelTopology']['model_config']['config']['name'];
    this.type = modelJson['modelTopology']['model_config']['class_name'];
    let layerList = modelJson['modelTopology']['model_config']['config']['layers'];
    this.initLayers(layerList);
    this.connectLayers(layerList);
    this.setInputOutputLayers(layerList);
  }

  /**
   * Creates layer dictonary from layer list
   * @param {*} layerList list of layers from model.json
   */
  initLayers (layerList){
    for (let i=0; i<layerList.length; i++) {
      let layer = layerList[i];
      layer.name = layer.config.name;
      this.layers[layer['name']] = new Layer(
        layer['name'], layer['class_name'], layer['config']
      );
    }
  }

  /**
   * Assignes inbound and outbound nodes to layers.
   * @param {*} layerList list of layers from model.json
   */
  connectLayers (layerList) {
    for (let i=0; i<layerList.length; i++) {
      let layer = layerList[i];
      if(this.type === 'Sequential'){
        if(i > 0) {
          const inboundLayer = layerList[i-1];
          this.layers[layer['name']].addInboundNode(
            this.layers[inboundLayer.name]);
        }
      } else {
        if(layer['inbound_nodes'].length > 0){
          for (let j=0; j< layer['inbound_nodes'][0].length; j++){
            let inputName = layer['inbound_nodes'][0][j][0];    // inputs are nested in sub array of length 1
            this.layers[layer['name']].addInboundNode(this.layers[inputName]);
          }
        }
      }
    }
  }

  /**
   * Assigns input and output layers.
   * @param {*} layerList list of layers from model.json
   */
  setInputOutputLayers(layerList) {
    for (let i=0; i<layerList.length; i++) {
      let layer = this.layers[layerList[i]['name']];
      if (layer.inboundNodes.length === 0){
        this.inputLayers.push(layer);
      }
      if (layer.outboundNodes.length === 0) {
        this.outputLayers.push(layer);
      }
    }
  }

  /**
   * Returns list of layers sorted by distance from input node.
   */
  getSortedLayerList(){
    const distList = this.getLayoutByInputDist();
    let layerList = [];
    distList.forEach((el, distInd) => {
      const {distance: dist, layers:layers} = el;
      layers.forEach((l) => {
        layerList.push(l);
      });
    });
    return layerList;
  }

  /**
   * Returns dictonary of lists of layers, with distance to input as key.
   */
  getLayoutByInputDist(){
    let distDict = {}
    for(const [name, layer] of Object.entries(this.layers)){
      const dist = layer.calcInputDist();
      if(!(dist in distDict)){
        distDict[dist] = [];
      }
      distDict[dist].push(layer)
    }
    let outList = [];
    Object.entries(distDict).forEach(([key, value]) => {
      outList.push({
        distance: parseInt(key),
        layers: value
      });
    });
    return outList;
  }

  /**
   * Returns dictonary of lists of layers, with distance to outpu as key.
   */
  getLayoutByOutputDist(){
    let distDict = {}
    for(const [name, layer] of Object.entries(this.layers)){
      const dist = layer.calcOutputDist();
      if(!(dist in distDict)){
        distDict[dist] = [];
      }
      distDict[dist].push(layer)
    }
    let outList = [];
    Object.entries(distDict).forEach(([key, value]) => {
      outList.push({
        distance: parseInt(key),
        layers: value
      });
    });
    return outList;
  }

  /**
   * Calculates distance to input node for each layer (gets cached in layer object).
   */
  calcInputDists() {
    for (const [name, layer] of Object.entries(this.layers)) {
      const dist = layer.calcInputDist();
    }
  }
  /**
   * Calculates distance to output node for each layer (gets cached in layer object).
   */
  calcOutputDists() {
    for (const [name, layer] of Object.entries(this.layers)) {
      const dist = layer.calcOutputDist();
    }
  }
}
