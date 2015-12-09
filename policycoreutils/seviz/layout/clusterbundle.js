var ClusterBundleChart = function () {
    var chartData,
        cluster,
        bundle,
    //diameter = 0.85 * Math.min(height, width),
        diameter = Math.max(document.documentElement.clientWidth,
            document.documentElement.clientHeight),
        radius = diameter / 2,
        innerRadius = radius - 120,
        line,
        tension = 0.75,
        nodes,
        links,
        nodeMap = {};

    function chart(data) {
        chartData = data;
        initCluster(data);
        draw(data);
    }

    function initCluster(data) {
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
        chartData = mungeData(currentRoot);
        nodes = cluster.nodes(chartData);
        nodeMap = mapD3Nodes(nodes);
        links = enumerateEdges(nodes);

        svg.selectAll(".link")
            .data(bundle(links))
            .enter()
            .append("path")
            .attr("class", "link")
            .attr("d", line);

        svg.selectAll(".node")
            .data(nodes)
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", function (d) {
                return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")";
            })
            .append("text")
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
    }

    function mungeData(rootNode) {
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
                        console.log("\t\t" + target.name);
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

        n = [];
        rootNode.children.forEach(function (c) {
            n.push(c.name);
        });
        console.log(n.join());

        return data;
    }

    function mapD3Nodes(nodes) {
        var nMap = {};

        nodes.forEach(function (n) {
            nMap[n.name] = n;
        });

        return nMap;
    }

    function enumerateEdges(nodes) {
        var edges = [];

        nodes.forEach(function (n) {
            if (n.children) {
                n.children.forEach(function (c) {
                    var edge = {};
                    edge.source = nodeMap[n.name];
                    edge.target = nodeMap[c.name];
                    edges.push(edge);
                });
            }
        });

        return edges;
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
