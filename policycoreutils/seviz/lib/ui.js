var svg,
    width = .75 * document.documentElement.clientWidth,
    height = .75 * document.documentElement.clientHeight,
    layout,
    layouts = ["clusterbundle", "graph", "hive", "supergraph", "tree"],
    layoutMap = {};

layouts.forEach(function(l) {
    layoutMap[l] = null;
});

/*
 Google colors: https://sites.google.com/site/uwugc2012/event-resources-and-calendar/event-planning-print-materials
 */
var googleR = "#D40F25",
    googleG = "#009925",
    googleB = "#3369E8",
    googleY = "#EEB211",
    googleGray = "#666666";


function initFileMenu() {
    var option,
        menu = document.getElementById("fileDropDown");

    menu.style.visibility = "";

    d3.json("data/dataFiles.txt", function(error, data) {
        if(error) throw error;

        data.forEach(function(dataFile) {
            option = document.createElement("option");
            option.text = option.value = dataFile;
            menu.appendChild(option);
        });
    });
}


function initLayoutMenu() {
    var option;
    var menu = document.getElementById("layoutDropDown");
    menu.style.visibility = "";

    if(menu.options.length <= 1) {
        layouts.forEach(function (layout) {
            option = document.createElement("option");
            option.text = option.value = layout;
            menu.appendChild(option);
        });
    }
}


function initClassMenu() {
    var option;
    var menu = document.getElementById("classDropDown");
    menu.style.visibility = "";

    classes.forEach(function(d) {
        option = document.createElement("option");
        option.text = option.value = d;
        menu.appendChild(option);
    });
}

function clearClassMenu() {
    var menu = document.getElementById("classDropDown");

    for(var i=menu.options.length-1; i>0; i--) {
        menu.remove(i);
    }
}

function initTypeMenu() {
    var option;
    var menu = document.getElementById("typeDropDown");
    menu.style.visibility = "";

    types.forEach(function(d) {
        option = document.createElement("option");
        option.text = option.value = d;
        menu.appendChild(option);
    });
}

function clearTypeMenu() {
    var menu = document.getElementById("typeDropDown");

    for(var i=menu.options.length-1; i>0; i--) {
        menu.remove(i);
    }
}

var zoomHandler = d3.behavior.zoom()
    .on("zoom", function() {
        d3.select("g")
            .attr("transform",
                "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    });

function initSVG() {
    d3.select("#data-viz").selectAll("*").remove();

    d3.select("#data-viz").append("svg")
        .attr("width", width)
        .attr("height", height);

    svg = d3.select("svg")
        .append("g")
        .attr("transform", "translate(20, 20)");

    d3.select("svg").call(zoomHandler);
}

function init_ui() {
    initFileMenu();
    initSVG();
}
