import Layer from './layer/Layer.js'

export default class Graph {
  constructor(modelJson){
    this.name = "";
    this.layers = {};
    this.inputLayers = [];
    this.outputLayers = [];
    this.layerSequence = [];
    this.initFromModelJson(modelJson);
  }

  initFromModelJson(modelJson){
    this.name = modelJson['modelTopology']['model_config']['config']['name'];
    this.type = modelJson['modelTopology']['model_config']['class_name'];
    let layerList = modelJson['modelTopology']['model_config']['config']['layers'];
    this.initLayers(layerList);
    this.connectLayers(layerList);
    this.setInputOutputLayers(layerList);
  }

  initLayers (layerList){
    for (let i=0; i<layerList.length; i++) {
      let layer = layerList[i];
      layer.name = layer.config.name;
      this.layers[layer['name']] = new Layer(
        layer['name'], layer['class_name'], layer['config']
      );
    }
  }

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

  calcInputDists() {
    for (const [name, layer] of Object.entries(this.layers)) {
      const dist = layer.calcInputDist();
    }
  }

  calcOutputDists() {
    for (const [name, layer] of Object.entries(this.layers)) {
      const dist = layer.calcOutputDist();
    }
  }
}
