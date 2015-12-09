var TreeChart = function() {
  var data,
      tree;

  var i = 0,
      duration = 500;

  function chart(chartData) {
    data = chartData;
    initTree(data);
    data.children.forEach(collapseNode);
    redraw(data);
  }

  var diagonal = d3.svg.diagonal()
      .projection(function(d) { return [d.y, d.x]; });

  var clickHandler = function(node) {
    if (d3.event.shiftKey) {
      handleClickAll(node);
    } else {
      handleClick(node);
    }
  };

  function handleClick(node) {
    if (node.collapsed) {
      expandNode(node);
    } else if (node.children) {
      collapseNode(node);
    }
    redraw(node);
  }

  function handleClickAll(node) {
    if (node.collapsed) {
      expandAll(node);
    } else if (node.children) {
      collapseNode(node);
    }
    redraw(node);
  }

  function initTree(data) {
    data.x0 = height / 2;
    data.y0 = 10;
    tree = d3.layout.tree()
      .size([height, width]);
  }



  function redraw(currentRoot) {
    tree.size([height, width]);

    var nodes = tree.nodes(data);
    var links = tree.links(nodes);

    nodes.forEach(function(d) { d.y = d.depth * 150; });

    var node = svg.selectAll("g.node").data(nodes, function(d) {return d.id || (d.id = ++i);});
    var link = svg.selectAll("path.link").data(links, function(d) {return d.target.id;});

    enterLinks(currentRoot, link);
    updateLinks(currentRoot, link);
    exitLinks(currentRoot, link);

    enterNodes(currentRoot, node);
    updateNodes(currentRoot, node);
    exitNodes(currentRoot, node);

    saveNodePositions(nodes);
  }

  function enterLinks(root, l) {
    l.enter().insert("path", "g")
      .attr("class", "link")
      .attr("d", function(d) {
        var o = {
          x: root.x0,
          y: root.y0
        };
        return diagonal({
          source: o,
          target: o
        });
      });
  }

  function updateLinks(root, l) {
    l.transition()
      .duration(duration)
      .attr("d", diagonal);
  }

  function exitLinks(root, l) {
    l.exit().transition()
      .duration(duration)
      .attr("d", function(d) {
        var o = {
          x: root.x,
          y: root.y
        };
        return diagonal({
          source: o,
          target: o
        });
      })
      .remove();
  }

  function enterNodes(root, n) {
    var nEnter = n.enter().append("g")
      .attr("class", "node")
      .attr("transform", function(d) { return "translate(" + root.y + "," + root.x + ")" ;})
      .style("fill", getNodeColor)
      .on("click", clickHandler);

    nEnter.append("circle")
      .attr("r", 5);

    nEnter.append("text")
      .attr("class", "label")
      .text(function(d) {
        return d.name;
      })
      .attr("dx", "0.75em")
      .attr("dy", "0.35em")
      .attr("transform", function(d) {
        return "rotate(45)";
      });
  }

  function updateNodes(root, n) {
    var nUpdate = n.transition()
    .duration(duration)
      .attr("transform", function(d) {
        return "translate(" + d.y + "," + d.x + ")";
      });

    nUpdate.select("circle")
      .attr("r", 5)
      .style("fill", getNodeColor);

    nUpdate.select("text")
      .style("fill-opacity", 1);
  }

  function exitNodes(root, n) {
    var nExit = n.exit().transition()
      .duration(duration)
      .attr("transform", function(d) {
        return "translate(" + root.y + "," + root.x + ")";
      })
      .remove();

    nExit.select("circle")
      .attr("r", 1e-6);

    nExit.select("text")
      .style("fill-opacity", 1e-6);
  }

  function saveNodePositions(nodes) {
    nodes.forEach(function(d) {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  function collapseNode(n) {
    if (n.children) {
      n.collapsed = n.children;
      n.collapsed.forEach(collapseNode);
      n.children = null;
    }
  }

  function expandNode(n) {
    if (n.collapsed) {
      n.children = n.collapsed;
      n.collapsed = null;
    }
  }

  function expandAll(n) {
    if (n.collapsed) {
      expandNode(n);
      n.children.forEach(expandAll);
    }
  }

  function getNodeColor(n) {
    switch(n.nodeType) {
      case "class":
            return googleR;
      case "type":
          if(n.optional) {
            return googleG;
          }
            return googleB;
      case "permission":
            return googleY;
      default:
            console.log("Unknown node type: " + n.nodeType);
            return "black";
    }
  }

  return chart;
};

function treeFromClass(className) {
  d3.json("data/sepol.json", function (error, data) {
    if (error) throw error;

    var treeData = null;
    var treeChart = TreeChart();

    for (var i = 0; i < data.children.length; i++) {
      if (data.children[i].name === className) {
        treeData = data.children[i];
        break;
      }
    }

    treeChart(treeData);
  });
}

if(layoutMap) {
  console.log("Registering tree layout");
  layoutMap["tree"] = TreeChart();
  console.log("Updating to tree layout");
  updateLayout();
} else {
  console.log("Tree is not registered");
}

//treeFromClass("process");