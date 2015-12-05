var margin = {top: 20, right: 120, bottom: 20, left: 120},
	width = 960 - margin.right - margin.left,
	height = 500 - margin.top - margin.bottom;

var i = 0;

var tree = d3.layout.tree()
    .size([height, width]);

var diagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.y, d.x]; });

var svg = d3.select("body").append("svg")
	.attr("width", width + margin.right + margin.left)
	.attr("height", height + margin.top + margin.bottom)
  .append("tree")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");


d3.json("data/sepol.json", function(error, data) {
    if(error) throw error;

    var root = create_treedata(data);
      // Compute the new tree layout.

  var nodes = tree.nodes(root).reverse(),
	  links = tree.links(nodes);

  // Normalize for fixed-depth.
  nodes.forEach(function(d) { d.y = d.depth * 180; });

  // Declare the nodes…
  var node = svg.selectAll("tree.node")
	  .data(nodes, function(d) { return d.id || (d.id = ++i); });

  // Enter the nodes.
  var nodeEnter = node.enter().append("tree")
	  .attr("class", "node")
	  .attr("transform", function(d) {
		  return "translate(" + d.y + "," + d.x + ")"; });

  nodeEnter.append("circle")
	  .attr("r", 10)
	  .style("fill", "#fff");

  nodeEnter.append("text")
	  .attr("x", function(d) {
		  return d.children || d._children ? -13 : 13; })
	  .attr("dy", ".35em")
	  .attr("text-anchor", function(d) {
		  return d.children || d._children ? "end" : "start"; })
	  .text(function(d) { return d.name; })
	  .style("fill-opacity", 1);

  // Declare the links…
  var link = svg.selectAll("path.link")
	  .data(links, function(d) { return d.target.id; });

  // Enter the links.
  link.enter().insert("path", "tree")
	  .attr("class", "link")
	  .attr("d", diagonal);
});

function create_treedata(data) {
    var treeData = {"name": "Classes", "parent": null, "children": []};
    var classes = data.classes;

    for (var key in classes) {
        if(classes.hasOwnProperty(key)){
            var seClass = classes[key];
            console.log(key);
            console.log(seClass);
            var classNode = {"name": seClass, "parent": "Classes", "children": []};

            treeData.children.push(classNode);

            seClass.types.forEach(function (seClassType) {
                console.log(seClassType);
                classNode.children.push({"name": seClassType.toString(), "parent": seClass, "children": []});
            });
        }
    }

    console.log(treeData);

    return treeData;
}

