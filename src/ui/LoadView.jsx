import React, { Component } from 'react';
import PropTypes from "prop-types";
import { withStyles } from '@material-ui/core/styles';
import {
  Typography, Select, MenuItem, Button, FormControl,
  Switch, InputLabel, FormHelperText, Tooltip
} from "@material-ui/core";
import "./LoadView.css";
import { ttLoadView, ttFromDisk } from '../strings'

const styles = theme => ({
  container: {
    display: 'flex',
    flexWrap: 'wrap',
    flexDirection: 'row',
    padding: '5px',
    background: '#FEFEFE',
    borderBottom: '1px solid #AAA',
  },
  paramContainer: {
    margin: '0px 10px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textField: {
    marginLeft: theme.spacing.unit,
    marginRight: theme.spacing.unit,
    width: '100%',
  },
  menu: {
    flex: "1 1 auto",
    width: '120px',
    margin: '5px'
  },
  button: {
    flex: "1 1 auto",
    width: "180px",
    margin: '5px',
  },
});

/**
 * Component containing controls for loading the model and starting / stopping / resetting optimization.
 */
class LoadView extends Component {

  constructor(props) {
    super(props);
    this.state = {
      model: null,
      selected: '',
      error: false
    }
  }

  render() {
    const { classes } = this.props;
    let models = [];
    for (const [name, model] of Object.entries(this.props.models)) {
      models.push(model);
    }
    const selectItems = models.map((model, index) => {
      return <MenuItem value={index}>{model.name} [{model.size}]</MenuItem>
    });

    const itLen = selectItems.length;

    const helperText = this.state.error ?
      (<FormHelperText>Error: Select model first!</FormHelperText>) : ('');
    return (<div>
      <Tooltip title={this.props.showHelp ? ttLoadView : ''}>
        <div className="titleContainer">
          <h4 className="titleText">{this.props.title}</h4>
        </div>
      </Tooltip>
      <div className={classes.container}>
        <div className={classes.paramContainer}>
          <input id="file-input" type="file" name="name" multiple
                  style={{display: "none"}} onChange={() => {
                    const input = document.getElementById("file-input");
                    this.setState({
                      model: input.files,
                      selected: itLen,
                    })
                  }}/>
          <FormControl  id="modelSelector" className={classes.menu}>
            <InputLabel>Select model</InputLabel>
            <Select
              value={this.state.selected}
              error={this.state.error}
              onChange={(event) => {
                if(event.target.value === itLen) {
                  document.getElementById('file-input').click();
                }
                this.setState({
                  model: models[event.target.value],
                  selected: event.target.value,
                });
              }}>
              {selectItems}
              <MenuItem value={itLen}>
                <Tooltip title={ttFromDisk} interactive>
                  <div>From disk...</div>
                </Tooltip>
              </MenuItem>
            </Select>
            {helperText}
          </FormControl>
        </div>
        <div className={classes.paramContainer}>
          <Button id="loadModelButton"
          className={classes.button}
            variant='contained'
            onClick={() => {
              if (!this.state.model) {
                this.setState({
                  error: true
                });
              } else {
                this.setState({
                  error: false
                });
                if(this.state.model instanceof FileList){
                  this.props.onLoadModelFromFile(this.state.model);
                } else {
                  this.props.onLoadModel(this.state.model);
                }
              }
            }}
          >Load Model</Button>
          <div  id="optimizeButton">
            <Button
            className={classes.button}
              variant='contained'
              disabled={this.props.canOptimize || this.props.isOptimizing ? false : true}
              onClick={() => {
                if (this.props.isOptimizing) {
                  this.props.stopOptimization();
                } else {
                  this.props.onOptimize();
                }
              }}
            >{this.props.isOptimizing ? 'Stop optimization' : 'Optimize'}</Button>
          </div>
        </div>
      </div>
    </div>);
  }

}

LoadView.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(LoadView);
