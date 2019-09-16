import React, { Component } from 'react';
import { IconButton, Fab } from "@material-ui/core";
import "../ParamView.css";
import { objectiveTypes, loadStates } from '../../LucidJS/src/optvis/renderer.js';

import PlayIcon from '@material-ui/icons/PlayArrow';
import PauseIcon from '@material-ui/icons/Pause';
import ResetIcon from '@material-ui/icons/Replay';
import SkipIcon from '@material-ui/icons/SkipNext';

/**
 * Component that contains play/stop-, reset- and single step buttons
 */
export default class PlayButtonGroup extends Component {

    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div className="timeline-controls">
                <IconButton className="ui-resetButton" id="reset-button"
                    title="Reset the network"
                    onClick={this.props.onReset}>
                    <ResetIcon />
                </IconButton>
                <Fab color="primary" className="ui-playButton"
                    id="play-pause-button" title="Run/Pause"
                    disabled={this.props.canOptimize || this.props.isOptimizing ? false : true}
                    onClick={() => {
                      if (this.props.isOptimizing) {
                        this.props.stopOptimization();
                      } else {
                        this.props.onOptimize();
                      }
                    }}
                    >
                    {this.props.isOptimizing ? <PauseIcon /> : <PlayIcon />}
                </Fab>
                <IconButton className="ui-stepButton" id="next-step-button"
                    title="Step"
                    disabled={this.props.isOptimizing}
                    onClick={this.props.onStep}
                    >
                    <SkipIcon />
                </IconButton>
            </div>
        );
    }
}
