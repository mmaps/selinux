var TreeChart = function () {
    var data,
        tree,
        orientRoot,
        orient = "v";

    var i = 0,
        duration = 500;

    function chart(chartData) {
        data = chartData;
        initTree(data);
        if (!data.children) {
            expandNode(data);
        }
        data.children.forEach(collapseNode);
        redraw(data);
    }

    var diagonal = d3.svg.diagonal()
        .projection(diagonalTranslate);

    var clickHandler = function (node) {
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
        redraw(orientRoot);
    }

    function reorient() {
        switch (orient) {
            case "v":
                orient = "h";
                svg.attr("transform", "translate(" + 50 + "," + height / 2 + ")");
                break;
            case "h":
                orient = "v";
                svg.attr("transform", "translate(" + width / 2 + "," + 50 + ")");
                break;
        }
    }

    function initTree(data) {
        data.x0 = height / 2;
        data.y0 = 10;

        if (!document.getElementById("treeOrient")) {
            var ui = document.getElementById("ui-control");
            var button = document.createElement("input");
            button.setAttribute("id", "treeOrient");
            button.type = "button";
            button.id = "treeOrient";
            button.value = "Orientation";
            button.onclick = reorient;
            ui.appendChild(button);
        }

        svg.attr("transform", "translate(" + 50 + "," + height / 2 + ")");

        tree = d3.layout.tree()
            .nodeSize([10, 10])
            .separation(function (a, b) {
                return 2;
            });
    }

    function redraw(currentRoot) {

        var nodes = tree.nodes(data);
        var links = tree.links(nodes);

        nodes.forEach(function (d) {
            d.y = d.depth * 150;
        });

        var node = svg.selectAll("g.node").data(nodes, function (d) {
            return d.id || (d.id = ++i);
        });
        var link = svg.selectAll("path.link").data(links, function (d) {
            return d.target.id;
        });

        orientRoot = currentRoot;

        enterLinks(currentRoot, link);
        updateLinks(currentRoot, link);
        exitLinks(currentRoot, link);

        enterNodes(currentRoot, node);
        updateNodes(currentRoot, node);
        exitNodes(currentRoot, node);

        saveNodePositions(nodes);
    }

    function rootTranslate(node) {
        switch (orient) {
            case "v":
                return "translate(" + orientRoot.y + "," + orientRoot.x + ")";
            case "h":
                return "translate(" + orientRoot.x + "," + orientRoot.y + ")";
        }
    }

    function nodeTranslate(node) {
        switch (orient) {
            case "v":
                return "translate(" + node.y + "," + node.x + ")";
            case "h":
                return "translate(" + node.x + "," + node.y + ")";
        }
    }

    function diagonalTranslate(node) {
        switch (orient) {
            case "v":
                return [node.y, node.x];
            case "h":
                return [node.x, node.y];
        }
    }

    function enterLinks(root, l) {
        l.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", function (d) {
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
            .attr("d", function (d) {
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
            .attr("transform", rootTranslate)
            .style("fill", getNodeColor)
            .on("click", clickHandler);

        nEnter.append("circle")
            .attr("r", 5);

        nEnter.append("text")
            .attr("class", "label")
            .text(function (d) {
                return d.name;
            })
            .attr("dx", "0.75em")
            .attr("dy", "0.35em")
            .attr("transform", function (d) {
                return "rotate(45)";
            });
    }

    function updateNodes(root, n) {
        var nUpdate = n.transition()
            .duration(duration)
            .attr("transform", nodeTranslate);

        nUpdate.select("circle")
            .attr("r", 5)
            .style("fill", getNodeColor);

        nUpdate.select("text")
            .style("fill-opacity", 1);
    }

    function exitNodes(root, n) {
        var nExit = n.exit().transition()
            .duration(duration)
            .attr("transform", rootTranslate)
            .remove();

        nExit.select("circle")
            .attr("r", 1e-6);

        nExit.select("text")
            .style("fill-opacity", 1e-6);
    }

    function saveNodePositions(nodes) {
        nodes.forEach(function (d) {
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
        switch (n.nodeType) {
            case "class":
                return googleR;
            case "type":
                if (n.optional) {
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

if (layoutMap) {
    console.log("Registering tree layout");
    layoutMap["tree"] = TreeChart();
    console.log("Updating to tree layout");
    updateLayout("tree");
} else {
    console.log("Tree is not registered");
}
