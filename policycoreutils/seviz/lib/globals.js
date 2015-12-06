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
