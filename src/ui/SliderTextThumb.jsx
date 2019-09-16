import React, { Component } from 'react';

/**
 * Slider thumb that can display text.
 */
export default class SecondaryPreview extends Component {

  render(props){
    return(<div
      style={{
        backgroundColor: "white",
        border: "solid 1px #3f51b5",
        borderRadius: "5px",
        position: 'absolute',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2px 5px',
      }}
      > {this.props.title}</div>);
  }
}
