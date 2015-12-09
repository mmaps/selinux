var ClusterBundleChart = function () {
    var chartData,
        cluster,
        bundle,
        diameter = Math.max(document.documentElement.clientWidth,
            document.documentElement.clientHeight),
        radius = diameter / 2,
        innerRadius = radius - 120,
        line,
        tension = .75,
        nodes,
        svgNodes,
        links,
        svgLinks,
        nodeMap = {};

    function chart(data) {
        initCluster();
        draw(data);
    }

    function initCluster() {
        svg.selectAll(".link").remove();
        svg.selectAll(".node").remove();
        chartData = {};
        nodeMap = {};
        nodes = links = svgLinks = svgNodes = null;

        cluster = d3.layout.cluster()
            .size([360, innerRadius])
            .sort(null)
            .value(function (d) {
                return d.size;
            });

        bundle = d3.layout.bundle();

        line = d3.svg.line.radial()
            .interpolate("bundle")
            .tension(tension)
            .radius(function (d) {
                return d.y;
            })
            .angle(function (d) {
                return d.x / 180 * Math.PI;
            });

        svg.attr("transform", "translate(" + radius + "," + radius + ")");
    }

    function draw(currentRoot) {
        chartData = currentRoot;
        var data = mungeData(currentRoot);
        nodes = cluster.nodes(data);
        nodeMap = mapD3Nodes(nodes);
        links = enumerateEdges();

        svgLinks = svg.selectAll(".link")
            .data(bundle(links))
            .enter()
            .append("path")
            .attr("class", "link")
            .attr("d", line);

        svgNodes = svg.selectAll(".node")
            .data(nodes)
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", function (d) {
                return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")";
            })
            .append("text")
            .attr("class", "label")
            .attr("dx", function (d) {
                return d.x < 180 ? 8 : -8;
            })
            .attr("dy", ".31em")
            .attr("text-anchor", function (d) {
                return d.x < 180 ? "start" : "end";
            })
            .attr("transform", function (d) {
                return d.x < 180 ? null : "rotate(180)";
            })
            .text(function (d) {
                return d.name;
            });

        svg.selectAll(".node")
            .on("mouseover", handleMouseOver)
            .on("mouseout", handleMouseOut);
    }

    function mungeData(rootNode) {
        if (rootNode.nodeType) {
            console.log("Munging type: " + rootNode.nodeType);
            if (rootNode.nodeType === "class") {
                return mungeClass(rootNode);
            } else if (rootNode.nodeType === "type") {
                return mungeType(rootNode);
            }
        } else {
            console.log("Unknown type for " + rootNode.name);
        }
    }

    function mungeType(rootNode) {
        var data = {
                name: rootNode.name,
                clusterType: "root",
                nodeType: "type",
                children: [],
                parent: "null"
            },
            permissions = [],
            targets = [],
            seen = {};

        rootNode.children.forEach(function (permission) {
            var p = {
                name: permission.name,
                nodeType: permission.nodeType,
                children: [],
                parent: data.name
            };
            permissions.push(p);

            permission.children.forEach(function (target) {
                if (!seen[target.name]) {
                    targets.push(target);
                    seen[target.name] = true;
                }
            });
        });

        data.children.push({
            name: "targets",
            children: targets,
            parent: rootNode.name
        });

        data.children.push({
            name: "permissions",
            children: permissions,
            parent: rootNode.name
        });

        return data;
    }

    function mungeClass(rootNode) {
        var data = {"name": rootNode.name, "parent": "null", "children": []},
            seen = {};

        // Enum all the class nodes first
        rootNode.children.forEach(function (c) {
            c.clusterType = "class";
            seen[c.name] = true;
            data.children.push(c);
        });

        // Enum the rest of the nodes, setting target type
        rootNode.children.forEach(function (source) {
            source.children.forEach(function (permission) {
                permission.children.forEach(function (target) {
                    if (!seen[target.name]) {
                        var tgt = {
                            name: target.name,
                            parent: rootNode.name,
                            children: [],
                            cluserType: "target"
                        };
                        seen[target.name] = true;
                        data.children.push(tgt);
                    }
                });
            });
        });

        return data;
    }

    function mapD3Nodes(nodes) {
        var nMap = {};

        nodes.forEach(function (n) {
            if (!nMap[n.name]) {
                nMap[n.name] = n;
            }
        });

        return nMap;
    }

    function enumerateEdges() {
        if (chartData.nodeType === "class") {
            return enumerateClassEdges();
        } else if (chartData.nodeType === "type") {
            return enumerateTypeEdges();
        }
    }

    function enumerateTypeEdges() {
        var edges = [],
            source = chartData;

        source.children.forEach(function (permission) {
            permission.children.forEach(function (target) {
                edges.push({
                    source: nodeMap[permission.name],
                    target: nodeMap[target.name]
                });
            });
        });

        return edges;
    }

    function enumerateClassEdges() {

    }

    function handleMouseOver(node) {
        var highlight = {};
        var source, target;

        svgLinks.classed("highlightLink", function (l) {
            source = l[0].name;
            target = l[l.length - 1].name;
            if (source === node.name || target === node.name) {
                highlight[source] = true;
                highlight[target] = true;
                return true;
            }
            return false;
        });

        svgNodes.classed("highlightNode", function (n) {
            return !!highlight[n.name];
        });
    }

    function handleMouseOut(node) {
        svgLinks.classed("highlightLink", false);
        svgNodes.classed("highlightNode", false);
    }

    return chart;
};

if (layoutMap) {
    console.log("Registering cluster layout");
    layoutMap["clusterbundle"] = ClusterBundleChart();
    console.log("Updating layout");
    updateLayout();
} else {
    console.log("Cluster is not registered");
}
