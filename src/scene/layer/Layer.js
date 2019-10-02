/**
 * Stores layer information and provides methods to calculate distances to in/output nodes.
 */
export default class Layer{
  constructor(name, class_name, config){
    this.name = name;
    this.class_name = class_name;
    this.config = config;
    this.inboundNodes = [];
    this.outboundNodes = [];
    this.inputDistance = -1;
    this.outputDistance = -1;
    this.mesh = undefined;
  }

  /**
   * Calculates distance to input layer/node.
   */
  calcInputDist(){
    if (this.inboundNodes.length === 0) {
      this.inputDistance = 0;
      return 0;
    } else if (this.inputDistance < 0) {
      let dist = 1;
      for(let i=0; i<this.inboundNodes.length; i++){
        const inboundNode = this.inboundNodes[i];
        const inboundDist = inboundNode.calcInputDist();
        if (1 + inboundDist > dist) {
          dist = 1 + inboundDist;
        }
      }
      this.inputDistance = dist;
    }
    return this.inputDistance;
  }

  /**
   * Calculates distance to output layer/node.
   */
  calcOutputDist(){
    if (this.outboundNodes.length === 0) {
      this.outputDistance = 0;
      return 0;
    } else if (this.outputDistance < 0) {
      let dist = 1;
      for(let i=0; i<this.outboundNodes.length; i++){
        const outboundNode = this.outboundNodes[i];
        const outboundDist = outboundNode.calcOutputDist();
        if (1 + outboundDist > dist) {
          dist = 1 + outboundDist;
        }
      }
      this.outputDistance = dist;
    }
    return this.outputDistance;
  }

  addInboundNode(inboundNode) {
    if(this.inboundNodes.indexOf(inboundNode) < 0){
      this.inboundNodes.push(inboundNode);
      inboundNode.addOutboundNode(this);
    }
  }

  addOutboundNode(outboundNode) {
    if(this.outboundNodes.indexOf(outboundNode) < 0){
      this.outboundNodes.push(outboundNode);
    }
  }

  removeInboundNode(inboundNode) {
    this.inboundNodes.splice( this.inboundNodes.indexOf(inboundNode), 1 );
  }

  removeOutboundNode(outboundNode) {
    this.outboundNodes.splice( this.outboundNodes.indexOf(outboundNode), 1 );
  }
}
