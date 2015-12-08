/*
    Src: http://james.padolsey.com/javascript/get-document-height-cross-browser/
    From JQuery implmentation:
    https://github.com/jquery/jquery/blob/29370190605ed5ddf5d0371c6ad886a4a4b5e0f9/src/dimensions.js
 */
function windowWidth() {
    return Math.max(
        document.documentElement["clientWidth"], document.body["scrollWidth"],
        document.documentElement["scrollWidth"], document.body["offsetWidth"],
        document.documentElement["offsetWidth"], document.body["scrollWidth"]);
}

function windowHeight() {
    return Math.max(
        document.documentElement["clientHeight"], document.body["scrollHeight"],
        document.documentElement["scrollHeight"], document.body["offsetHeight"],
        document.documentElement["offsetHeight"], document.body["scrollHeight"]);
}