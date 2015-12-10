var loaded = [];
var currentLayout = null;

function handleFileChoice(choice) {
    resetData();
    init_data(choice);
}

function handleOptionalChoice(choice) {
    init_data(choice);
}

function handleLayoutChoice(choice) {
    if (loaded.indexOf(choice) < 0) {
        loadScript(choice);
        disableStyles();
        loadStyle(choice);
        loaded.push(choice);
    } else {
        disableStyles();
        enableStyle(choice);
        currentLayout = choice;
        updateLayout(choice);
    }
}

function updateLayout(l) {
    console.log("Updating current layout: " + l);
    layout = layoutMap[l];
    initSVG();
}

function handleClassChoice(choice) {
    var chartData = findSepolClass(choice);
    if(!chartData) {
        console.log("Could not find class: " + choice);
        return;
    }

    if(layout) {
        console.log("Creating layout...");
        layout(chartData);
    } else {
        console.log("Need a layout first");
    }
}

function handleTypeChoice(choice) {
    var node = findSepolType(choice);
    if(!node) {
        console.log("Could not find node: " + node);
        return;
    }

    if(layout) {
        console.log("Creating layout...");
        layout(node);
    } else {
        console.log("Need a layout first");
    }
}

init_ui();
