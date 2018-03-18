import React, { Component, Fragment } from 'react';
import { findDOMNode } from 'react-dom';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import TouchBackend from 'react-dnd-touch-backend';
import MultiBackend, { TouchTransition, Preview } from 'react-dnd-multi-backend';
import withScrolling from 'react-dnd-scrollzone';
import { SortableTreeWithoutDndContext as SortableTree, changeNodeAtPath, removeNodeAtPath, addNodeUnderParent } from 'react-sortable-tree';
import { MuiThemeProvider, createMuiTheme, withStyles } from 'material-ui/styles';
import CssBaseline from 'material-ui/CssBaseline';
import AppBar from 'material-ui/AppBar';
import Toolbar from 'material-ui/Toolbar';
import ButtonBase from 'material-ui/ButtonBase';
import Typography from 'material-ui/Typography';
import IconButton from 'material-ui/IconButton';
import UndoIcon from 'material-ui-icons/Undo';
import RedoIcon from 'material-ui-icons/Redo';
import List, { ListItem, ListItemText } from 'material-ui/List';
import Chip from 'material-ui/Chip';
import Menu, { MenuItem } from 'material-ui/Menu';
import Popover from 'material-ui/Popover';
import { FormControl } from 'material-ui/Form';
import Input, { InputLabel } from 'material-ui/Input';
import { BrowserRouter as Router, Route, Link } from 'react-router-dom';

const chipHeight = 32;
const minTouchTargetSize = 48;

const theme = createMuiTheme({
    palette: {
        type: 'dark'
    }
});

const styles = {
    layoutContainer: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        userSelect: 'none'
    },
    appBarToolbar: {
        justifyContent: 'space-between'
    },
    name: {
        padding: '8px 16px'
    },
    renamer: {
        padding: 8
    },
    primitiveFunctionDescription: {
        padding: 24
    },
    scrollingComponent: {
        flex: 1,
        padding: '8px 0',
        overflow: 'auto'
    },
    nodeContent: {
        height: '100%',
        display: 'flex',
        alignItems: 'center'
    },
    dragSource: {
        padding: 8,
        margin: -8
    },
    chip: {
        minWidth: minTouchTargetSize
    },
    lineChildren: {
        position: 'absolute',
        width: 1,
        left: minTouchTargetSize / 2,
        bottom: 0,
        height: (minTouchTargetSize - chipHeight) / 2
    },
    pickedUp: {
        boxShadow: theme.shadows[8]
    },
    bottomBar: {
        backgroundColor: theme.palette.grey[900]
    },
    popover: {
        padding: '8px 0'
    },
    editInput: {
        margin: '8px 16px'
    }
};

const primitiveFunctions = {
    '+': {
        description: 'Primitive function that returns the sum of numbers',
        apply: nodes => nodes.map(evalNode).reduce((a, b) => a + b, 0)
    },
    '*': {
        description: 'Primitive function that returns the product of numbers',
        apply: nodes => nodes.map(evalNode).reduce((a, b) => a * b, 1)
    }
};

const evalNode = node => {
    let title = node.title;
    let children = node.children || [];
    let isNumber = !isNaN(title);
    if (isNumber) {
        return +title;
    } if (primitiveFunctions[title]) {
        return primitiveFunctions[title].apply(children);
    } else {
        return NaN;
    }
};

const initialTreeData = [{ title: '' }];

const modes = { default: 'default', menu: 'menu', edit: 'edit', add: 'add' };

const ScrollingComponent = withScrolling('div');

class App extends Component {
    state = {
        name: "",
        treeDataHistory: {
            past: [],
            present: initialTreeData,
            future: []
        },
        renamer: { open: false },
        mode: modes.default,
        menu: {},
        editValue: ''
    };

    undo = () => {
        this.setState(state => {
            let { past, present, future } = state.treeDataHistory;
            return {
                treeDataHistory: {
                    past: past.slice(0, past.length - 1),
                    present: past[past.length - 1],
                    future: [present, ...future]
                }
            };
        });
    };

    redo = () => {
        this.setState(state => {
            let { past, present, future } = state.treeDataHistory;
            return {
                treeDataHistory: {
                    past: [...past, present],
                    present: future[0],
                    future: future.slice(1)
                }
            };
        });
    };

    addToHistory = treeData => {
        let { past, present } = this.state.treeDataHistory;
        return {
            past: [...past, present],
            present: treeData,
            future: []
        };
    };

    render = () => (
        <Router>
            <MuiThemeProvider theme={theme}>
                <CssBaseline />
                <Route exact path="/" render={this.renderHomeScreen} />
                <Route exact path="/primitives/:name" render={this.renderPrimitiveFunction} />
                <Route exact path="/expressions/:name" render={this.renderEvaluator} />
                {this.renderPreview()}
                {this.renderRenamer()}
                {this.renderMenu()}
                {this.renderEditMenu()}
            </MuiThemeProvider>
        </Router>
    );

    renderHomeScreen = () => (
        <div className={this.props.classes.layoutContainer}>
            {this.renderAppBar(<Typography variant="title">Expressions</Typography>)}
            {this.renderExpressions()}
        </div>
    );

    renderExpressions = () => (
        <List>
            <ListItem button component={Link} to="/expressions/unnamed">
                <ListItemText primary="unnamed" />
            </ListItem>
        </List>
    );

    renderPrimitiveFunction = ({ match }) => {
        let name = match.params.name;
        return (
            <div className={this.props.classes.layoutContainer}>
                {this.renderAppBar(<Typography variant="title">{name}</Typography>)}
                {this.renderPrimitiveFunctionDescription(primitiveFunctions[name].description)}
            </div>
        );
    };

    renderAppBar = content => (
        <AppBar position="static" elevation={0} color="default">
            <Toolbar className={this.props.classes.appBarToolbar}>{content}</Toolbar>
        </AppBar>
    );

    renderPrimitiveFunctionDescription = description => (
        <Typography className={this.props.classes.primitiveFunctionDescription}>{description}</Typography>
    );

    renderEvaluator = () => (
        <div className={this.props.classes.layoutContainer}>
            {this.renderAppBarForEvaluator()}
            {this.renderScrollingContent()}
            {this.renderBottomBar()}
        </div>
    );

    renderAppBarForEvaluator = () => this.renderAppBar(
        <Fragment>
            {this.renderName()}
            {this.renderIconButtons()}
        </Fragment>
    );

    renderName = () => (
        <ButtonBase className={this.props.classes.name} title="Rename" onClick={this.openRenamer}>
            <Typography variant="title">{this.state.name || "unnamed"}</Typography>
        </ButtonBase>
    );

    openRenamer = event => {
        this.setState({
            renamer: { open: true, anchorEl: event.currentTarget, value: this.state.name }
        });
    };

    renderIconButtons = () => (
        <div>
            {this.renderUndoButton()}
            {this.renderRedoButton()}
        </div>
    );

    renderUndoButton = () => (
        <IconButton disabled={this.state.treeDataHistory.past.length === 0} onClick={this.undo}>
            <UndoIcon />
        </IconButton>
    );

    renderRedoButton = () => (
        <IconButton disabled={this.state.treeDataHistory.future.length === 0} onClick={this.redo}>
            <RedoIcon />
        </IconButton>
    );

    renderScrollingContent = () => (
        <ScrollingComponent className={this.props.classes.scrollingComponent}>
            {this.renderSortableTree()}
        </ScrollingComponent>
    );

    renderSortableTree = () => (
        <SortableTree
            treeData={this.state.treeDataHistory.present}
            onChange={treeData => this.setState({ treeDataHistory: this.addToHistory(treeData) })}
            rowHeight={minTouchTargetSize}
            scaffoldBlockPxWidth={minTouchTargetSize}
            nodeContentRenderer={this.renderNodeContent}
            isVirtualized={false
                /* disable virtualization because it can remove an input element
                   (and the associated on-screen keyboard) */
            }
        />
    );

    renderNodeContent = nodeRendererProps => (
        <div className={this.props.classes.nodeContent}>
            {nodeRendererProps.isDragging ? null : this.renderChip(nodeRendererProps)}
            {this.hasChildren(nodeRendererProps.node) ? this.renderLineChildren() : null}
        </div>
    );

    renderChip = ({ node, path, treeIndex, connectDragSource }) => {
        let classes = {
            root: this.props.classes.chip
        };
        let handleClick = event => this.openMenu(node, path, treeIndex, event.currentTarget);
        let chip = <Chip classes={classes} label={node.title} onClick={handleClick} />;
        // the drag source is an anchor tag since it seems to cause a vibration on long press
        return connectDragSource(
            <a className={this.props.classes.dragSource} onContextMenu={e => e.preventDefault()}>{chip}</a>
        );
    };

    openMenu = (node, path, treeIndex, anchorEl) => {
        this.setState({
            mode: modes.menu,
            menu: { node, path, treeIndex, anchorEl }
        });
    };

    hasChildren = node => node.children && node.children.length;

    renderLineChildren = () => <div className={'custom-line-color ' + this.props.classes.lineChildren} />;

    renderPreview = () => <Preview generator={this.generatePreview} />;

    generatePreview = (type, item, style) => {
        let classes = {
            root: this.props.classes.chip + ' ' + this.props.classes.pickedUp
        };
        return <div style={style}><Chip classes={classes} label={item.node.title} /></div>;
    };

    renderRenamer = () => (
        <Popover
            classes={{ paper: this.props.classes.renamer }}
            anchorEl={this.state.renamer.anchorEl}
            open={this.state.renamer.open}
            onClose={this.saveRenameResult}
            marginThreshold={0}>
            {this.renderRenamerTextField()}
        </Popover>
    );

    saveRenameResult = () => {
        this.setState(state => ({
            name: state.renamer.value,
            renamer: { ...state.renamer, open: false }
        }));
    };

    renderRenamerTextField = () => (
        <FormControl>
            <InputLabel htmlFor="renamer-input">Rename</InputLabel>
            <AutoSelectInput
                id="renamer-input"
                value={this.state.renamer.value}
                onChange={this.handleRenamerInputChange}
                onKeyDown={this.handleRenamerInputKeyDown}
                inputProps={{ autoCapitalize: "off" }} />
        </FormControl>
    );

    handleRenamerInputChange = event => {
        let value = event.target.value;
        this.setState(state => ({
            renamer: { ...state.renamer, value }
        }));
    };

    handleRenamerInputKeyDown = event => {
        if (event.key === 'Enter') {
            this.saveRenameResult();
        }
    };

    renderMenu = () => (
        <Menu anchorEl={this.state.menu.anchorEl}
              open={this.state.mode === modes.menu}
              onClose={this.closeMenu}
              disableRestoreFocus>
            {this.canGoToDefinition() && this.renderGo()}
            <MenuItem onClick={this.initiateEdit}>Edit</MenuItem>
            <MenuItem onClick={this.removeNode}>Delete</MenuItem>
            <MenuItem onClick={this.initiateAdd}>Add child</MenuItem>
        </Menu>
    );

    canGoToDefinition = () => this.state.menu.node && primitiveFunctions[this.state.menu.node.title];

    renderGo = () => (
        <MenuItem component={Link} to={"/primitives/" + this.state.menu.node.title} onClick={this.closeMenu}>
            Go
        </MenuItem>
    );

    initiateEdit = () => {
        this.setState(state => ({
            mode: modes.edit,
            editValue: state.menu.node.title
        }));
    }

    removeNode = () => {
        this.setState(state => {
            let resultTreeData = removeNodeAtPath({
                treeData: state.treeDataHistory.present,
                path: state.menu.path,
                getNodeKey: ({ treeIndex }) => treeIndex
            });
            return resultTreeData.length === 0 ? {
                treeDataHistory: this.addToHistory(initialTreeData)
            } : {
                treeDataHistory: this.addToHistory(resultTreeData)
            };
        });
        this.closeMenu();
    };

    initiateAdd = () => {
        this.setState({
            mode: modes.add,
            editValue: ''
        });
    };

    renderEditMenu = () => (
        <Popover
            classes={{ paper: this.props.classes.popover }}
            anchorEl={this.state.menu.anchorEl}
            getContentAnchorEl={() => findDOMNode(this.editInput)}
            open={this.state.mode === modes.edit || this.state.mode === modes.add}
            onClose={() => this.saveEditMenuResult()}>
            {this.renderEditInput()}
            {Object.entries(primitiveFunctions).map(([name, info]) => this.renderFunctionMenuItem(name))}
        </Popover>
    );

    saveEditMenuResult = value => {
        this.setState(state => {
            let { treeDataHistory, mode, menu, editValue } = state;
            value = value || editValue;
            if (mode === 'edit') {
                let valueChanged = value !== menu.node.title;
                return valueChanged ? {
                    treeDataHistory: this.addToHistory(changeNodeAtPath({
                        treeData: treeDataHistory.present,
                        path: menu.path,
                        newNode: { ...menu.node, title: value },
                        getNodeKey: ({ treeIndex }) => treeIndex
                    }))
                } : {}
            } else {
                return value ? {
                    treeDataHistory: this.addToHistory(addNodeUnderParent({
                        treeData: treeDataHistory.present,
                        parentKey: menu.treeIndex,
                        expandParent: true,
                        newNode: { title: value },
                        getNodeKey: ({ treeIndex }) => treeIndex
                    }).treeData)
                } : {};
            }
        });
        this.closeMenu();
    };

    renderEditInput = () => (
        <AutoSelectInput
            className={this.props.classes.editInput}
            placeholder="Enter value"
            value={this.state.editValue}
            onChange={this.handleEditInputChange}
            onKeyDown={this.handleEditInputKeyDown}
            inputProps={{ autoCapitalize: "off" }}
            ref={node => {
                this.editInput = node;
            }} />
    );

    handleEditInputChange = event => {
        this.setState({ editValue: event.target.value });
    };

    handleEditInputKeyDown = event => {
        if (event.key === 'Enter') {
            this.saveEditMenuResult();
        }
    };

    renderFunctionMenuItem = name => (
        <MenuItem key={name} onClick={this.saveEditMenuResult.bind(this, name)}>{name}</MenuItem>
    );

    closeMenu = () => {
        this.setState({ mode: modes.default });
    };

    renderBottomBar = () => (
        <Toolbar className={this.props.classes.bottomBar}>
            <Typography variant="subheading">
                {evalNode(this.state.treeDataHistory.present[0]).toString()}
            </Typography>
        </Toolbar>
    );
}

class AutoSelectInput extends React.Component {
    componentDidMount() {
        let element = findDOMNode(this.node);
        element.focus();
        element.select();
    }

    render = () => (
        <Input
            {...this.props}
            inputRef={node => {
                this.node = node;
            }} />
    );
}

const multiBackend = MultiBackend({
    backends: [{
        backend: HTML5Backend
    }, {
        backend: TouchBackend({
            delayTouchStart: 500
        }),
        preview: true,
        transition: TouchTransition
    }]
});

export default DragDropContext(multiBackend)(withStyles(styles)(App));
