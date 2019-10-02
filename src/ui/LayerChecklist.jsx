import React, {Component} from 'react'
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import Checkbox from '@material-ui/core/Checkbox';
import IconButton from '@material-ui/core/IconButton';
import CommentIcon from '@material-ui/icons/Comment';

/**
 * Component that lets the user select / unselect layers.
 * Used for selecting style and content layers.
 */
export default class LayerChecklist extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const handleToggle = value => () => {
      this.props.styleLayerChanged(value);
    };

    const dict = this.props.styleLayers;
    let list = dict[this.props.layerMode];

    if(!list) {
      return(<div></div>);
    }

    return(
    <List style={{
      width: '100%',
      maxWidth: 360,
      backgroundColor: 'white'
      }}>
      {this.props.layerList.map(layer => {
        const labelId = `checkbox-list-label-${layer.name}`;

        return (
          <ListItem key={layer.name} role={undefined}
          dense button onClick={handleToggle(layer.name)}>
            <ListItemIcon>
              <Checkbox
                edge="start"
                checked={list.indexOf(layer.name) !== -1}
                tabIndex={-1}
                disableRipple
                inputProps={{ 'aria-labelledby': labelId }}
              />
            </ListItemIcon>
            <ListItemText id={labelId} primary={layer.name} />
          </ListItem>
        );
      })}
    </List>);
  }
}
