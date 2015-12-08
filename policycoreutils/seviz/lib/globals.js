function Stack(){
    this.stack = new Array();
    this.pop = function () {
            return this.stack.pop();
        }
    this.push = function(item){
            this.stack.push(item);
        }
}

var nodeStack = new Stack();

var currentRoot; //initialize to root in document.ready(function(){});

function NodeIndex() {
    var idx = [];

    function getNodes() {
        return idx;
    }

    function getNode(id) {
        return idx[id];
    }

    function addNode(n) {
        idx.push(n);
        n.id = idx.length - 1;
        return n.id;
    }
}

var nodeIndex = new NodeIndex();


/*
Google colors: https://sites.google.com/site/uwugc2012/event-resources-and-calendar/event-planning-print-materials
 */
googleR = "#D40F25";
googleG = "#009925";
googleB = "#3369E8";
googleY = "#EEB211";
googleGray = "#666666";
