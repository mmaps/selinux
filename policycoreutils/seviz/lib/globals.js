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
var tree;
var forwardNode = null;
var currentNode; //initialize to root in document.ready(function(){});
