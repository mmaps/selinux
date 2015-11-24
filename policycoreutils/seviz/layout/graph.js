/*
 * Adapted from simple force layout graph D3 example
 *
 */
var width = 1024,
    height = 768;

var color = d3.scale.category20();

var force = d3.layout.force()
    .charge(-2000)
    .linkDistance(50)
    .chargeDistance(10)
    .gravity(.2)
    .size([width, height]);

var svg = d3.select("#data-viz").append("svg")
    .attr("viewBox", "0 0 " + width + " " + height)
    .attr("preserveAspectRatio", "xMidYMid meet");

d3.json("data/graph.json", function(error, graph) {
  if (error) {
      console.log("Error parsing JSON");
      console.log(error);
      return;
  }

  force.nodes(graph.nodes)
      .links(graph.links)
      .start();

  var link = svg.selectAll(".link")
      .data(graph.links)
      .enter()
      .append("line")
      .attr("class", "link")
      .style("stroke-width", function(d) { return Math.sqrt(d.value); });

  var node = svg.selectAll(".node")
      .data(graph.nodes)
      .enter()
      .append("circle")
      .attr("class", "node")
      .attr("r", 5)
      .style("fill", function(d) { return color(d.group); })
      .call(force.drag);

  var nodeLabels = svg.selectAll(".nodeLabel")
        .data(graph.nodes)
        .enter()
        .append("text")
        .attr({"x":function(d){return d.x;},
              "y":function(d){return d.y;},
              "class":"nodeLabel",
              "stroke":"black"})
        .text(function(d){return d.type;});

  force.on("tick", function() {
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });
    node.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
      nodeLabels.attr("x", function (d) { return d.x; })
          .attr("y", function(d) {return d.y;});
  });
});