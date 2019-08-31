export const ttHelp = "Toggle tooltips";

export const ttLoadView = "Start here by selecting and loading a model.";

export const ttFromDisk =
"Select all files of the converted model (.json + .bin files). \
Download models at lucidplayground.stefansietzen.at/models.zip";

export const ttInputParams = "Changing input parameters requires reparametrization\
of the image and can not be done while optimizing. \
Click apply to commit changes.";

export const ttObjectiveParams = "Objective parameters (except type) can be changed\
 while optimzing.";

export const ttActivationView = "Displays activations of the currently\
selected layer. Red is positive, blue is negative. Values are normalized\
 by mean and variance for better viewing.";

export const ttScdryCompare = "Shows image state before stopping optimization \
for comparison.";

export const ttScdryNeuron = "Lets you select the x/y neuron location to optimize for.";

export const ttScdryPaint = "Not yet implemented.";

export const ttScdryAdjust = "[EXPERIMENTAL] Lets you adjust brightness and contrast \
of activations as objective (select 'act. adjust. as\
objective type').";

export const ttScdryStyle = "[EXPERIMENTAL] Lets you upload style image for \
style transfer objective.";

export const ttScdryView = "This area can show various visualizations depending \
on the selected button above."

export const tourSteps = [
    ["#modelSelector", "bottom", "Start here by selecting a model to work with.\
    The model files are quite large, you can download them \
    <a href='http://lucidplayground.stefansietzen.at/models.zip'>here</a> \
    and select the 'From disk'\
     option to avoid repeated downloads. Just navigate to the containing\
      folder and select all contained files (.json & .bin)."],
    ["#loadModelButton", "bottom", "Then load the model by clicking this button."],
    ["#graphView", "bottom", "The graph will be displayed here and you can\
    select the layer you want to visualize."],
    ["#optimizeButton", "bottom", "Start the optimization process with this\
    Button. You can also stop the optimization (and pick it up again).\
    <b>Always stop the optimization for selecting a different layer!</b>"],
    ["#livePreview", "left", "Here you can watch the input image being\
    optimized to the chosen objective."],
    ["#optimParams", "bottom", "Set your optimization objective here. You\
    can change the parameters while optimizing, except for the objective type."],
    ["#inputParams", "bottom", "Here you can change the input parametrization. \
    Press 'apply' to reset the input with the new settings."],
    ["#activationView", "left", "In this area you can see the activations \
    of the current layer. Click on a square to select the respective channel\
    for optimization. Press SHIFT while scrolling to zoom."],
    ["#scrdyPreview", "left", "For this view you can choose one of various\
    modes:<br/>- Compare a frozen input image to the current state of the input\
    <br/>- Choose neuron location for 'neuron' optimization objective<br/>\
    - [Experimental] Paint over current activations and optimize to match \
    modified activations (not yet implemented)<br/>- [Experimental] \
    Adjust activations and optimize to match modified activations\
    <br/> - Upload style image for style transfer optimization objective"],
]
