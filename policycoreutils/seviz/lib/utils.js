function loadScript(s) {
    var script = document.createElement("script");
    script.setAttribute("type", "text/javascript");
    script.setAttribute("src", "layout/" + s + ".js");
    document.getElementById("scripts").appendChild(script);
}

function enableStyle(style) {
    var link = document.getElementById(style + "Style");
    if (link) {
        link.setAttribute("disabled", "false");
    }
}

function disableStyle(style) {
    var link = document.getElementById(style + "Style");
    if (link) {
        link.setAttribute("disabled", "true");
    }
}

function disableStyles() {
    d3.select("#styles").selectAll("link").attr("disabled", "true");
}

function loadStyle(s) {
    var script = document.createElement("link");
    script.setAttribute("rel", "stylesheet");
    script.setAttribute("type", "text/css");
    script.setAttribute("href", "css/" + s + ".css");
    script.setAttribute("id", s + "Style");
    document.getElementById("styles").appendChild(script);
}
