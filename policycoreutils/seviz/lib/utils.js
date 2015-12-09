function loadScript(s) {
    var script = document.createElement("script");
    script.setAttribute("type", "text/javascript");
    script.setAttribute("src", "layout/" + s + ".js");
    document.getElementById("scripts").appendChild(script);
}


function loadStyle(s) {
    var script = document.createElement("link");
    script.setAttribute("rel", "stylesheet");
    script.setAttribute("type", "text/css");
    script.setAttribute("href", "css/" + s + ".css");
    document.getElementById("styles").appendChild(script);
}
