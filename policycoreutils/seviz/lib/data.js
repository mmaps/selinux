var sepolData = null,
    optData = null,
    classes = [],
    types = [],
    seenClass = {},
    seenType = {};


function findSepolClass(className) {
    for(var i=0; i<sepolData.children.length; i++) {
        if(sepolData.children[i].name === className) {
            return sepolData.children[i];
        }
    }
    return null;
}

function findSepolType(typeName) {
    var seclass,
        setype;
    for(var i=0; i<sepolData.children.length; i++) {
        seclass  = sepolData.children[i];
        for(var j=0; j<seclass.children.length; j++) {
            setype = seclass.children[j];
            if(setype.name === typeName) {
                return setype;
            }
        }
    }
}

function walkClassesTypes(data, tag) {
    if(tag) {
        data[tag] = true;
    }
    if(data.nodeType === "class") {
        if(!seenClass[data.name]) {
            classes.push(data.name);
            seenClass[data.name] = true;
        }
    }else if(data.nodeType === "type") {
        if(!seenType[data.name]) {
            types.push(data.name);
            seenType[data.name] = true;
        }
    }

    for (var i = 0; i < data.children.length; i++) {
        walkClassesTypes(data.children[i]);
    }
}


function resetData() {
    sepolData = null;
    optData = null;
    classes = [];
    types = [];
    seenClass = {};
    seenType = {};
    clearClassMenu();
    clearTypeMenu();
}


function init_data(dataFile){
    d3.json("data/" + dataFile, function(error, data) {
        if(error) throw error;


        if(sepolData == null) {
            console.log("Setting new SEPolicy data");
            walkClassesTypes(data);
            sepolData = data;
        }else{
            console.log("Setting optional SEPolicy data");
            walkClassesTypes(data, "optional");
            optData = data;
        }

        seenClass = {};
        seenType = {};
        classes.sort();
        types.sort();
        initClassMenu();
        initTypeMenu();
        initLayoutMenu();

        alert("Loaded:\n" + classes.length + " classes\n" + types.length + " types.");
    });
}