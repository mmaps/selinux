var GraphChart = function (){
    function chart(data) {

    }
    return chart;
};


var width = 1024,
    height = 768;

var color = d3.scale.category20();

var force = d3.layout.force()
    .charge(-2000)
    .linkDistance(100)
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

    graph.nodes.forEach( function(n) {
        n["x"] = 0;
        n["y"] = 0;
    });

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
var padding = 1, // separation between circles
    radius=8;

function collide(alpha) {
  var quadtree = d3.geom.quadtree(graph.nodes);
  return function(d) {
    var rb = 2*radius + padding,
        nx1 = d.x - rb,
        nx2 = d.x + rb,
        ny1 = d.y - rb,
        ny2 = d.y + rb;
    quadtree.visit(function(quad, x1, y1, x2, y2) {
      if (quad.point && (quad.point !== d)) {
        var x = d.x - quad.point.x,
            y = d.y - quad.point.y,
            l = Math.sqrt(x * x + y * y);
          if (l < rb) {
          l = (l - rb) / l * alpha;
          d.x -= x *= l;
          d.y -= y *= l;
          quad.point.x += x;
          quad.point.y += y;
        }
      }
      return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
    });
  };
}

  force.on("tick", function() {
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });
    node.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
      nodeLabels.attr("x", function (d) { return d.x; })
          .attr("y", function(d) {return d.y;});
      node.each(collide(0.5));
  });
});