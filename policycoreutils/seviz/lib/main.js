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
    currentLayout = choice;
    if (loaded.indexOf(choice) < 0) {
        loadScript(choice);
        loadStyle(choice);
        loaded.push(choice);
    }
}

function updateLayout() {
    layout = layoutMap[currentLayout];
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
