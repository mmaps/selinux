var ClusterBundleChart = function () {
    var chartData,
        cluster,
        bundle,
        diameter = 0.85 * min([height, width]),
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
        var data = [],
            seen = {};

        // Enum all the class nodes first
        rootNode.children.forEach(function (c) {
            c.clusterType = "class";
            seen[c.name] = true;
            data.push(c);
        });

        // Enum the rest of the nodes, setting target type
        rootNode.children.forEach(function (c) {
            c.children.forEach(function (permission) {
                p.children.forEach(function (target) {
                    if (!seen[target.name]) {
                        var tgt = {
                            name: target.name,
                            children: [],
                            cluserType: "target"
                        };
                        seen[target.name] = true;
                        data.push(tgt);
                    }
                });
            });
        });

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
            n.children.forEach(function (c) {
                var edge = {};
                edge.source = nodeMap[n.name];
                edge.target = nodeMap[c.name];
                edges.push(e);
            });
        });

        return edges;
    }

    return chart;
};

if (layoutMap) {
    console.log("Registering cluster layout");
    layoutMap["clusterbundle"] = ClusterBundleChart();
} else {
    console.log("Cluster is not registered");
}

var bundle = d3.layout.bundle();

var line = d3.svg.line.radial()
    .interpolate("bundle")
    .tension(.85)
    .radius(function (d) {
        return d.y;
    })
    .angle(function (d) {
        return d.x / 180 * Math.PI;
    });

var svg = d3.select("#data-viz").append("svg")
    .attr("width", diameter)
    .attr("height", diameter)
    .append("g")
    .attr("transform", "translate(" + radius + "," + radius + ")");

var link = svg.append("g").selectAll(".link"),
    node = svg.append("g").selectAll(".node");

d3.json("data/chord.json", function (error, chordData) {
    if (error) throw error;

    var nodes = cluster.nodes(chordData["nodes"]),
        links = typeRules(nodes, chordData["links"]);

    link = link
        .data(bundle(links))
        .enter().append("path")
        .each(function (d) {
            d.source = d[0], d.target = d[d.length - 1];
        })
        .attr("class", "link")
        .attr("d", line);

    node = node
        .data(nodes.filter(function (n) {
            return !n.children;
        }))
        .enter().append("text")
        .attr("class", "node")
        .attr("dy", ".31em")
        .attr("transform", function (d) {
            return "rotate(" + (d.x - 90) + ")translate(" + (d.y + 8) + ",0)" + (d.x < 180 ? "" : "rotate(180)");
        })
        .style("text-anchor", function (d) {
            return d.x < 180 ? "start" : "end";
        })
        .text(function (d) {
            return d.name;
        })
        .on("mouseover", mouseovered)
        .on("mouseout", mouseouted);
});

function mouseovered(d) {
    node
        .each(function (n) {
            n.target = n.source = false;
        });

    link
        .classed("link--target", function (l) {
            if (l.target === d) return l.source.source = true;
        })
        .classed("link--source", function (l) {
            if (l.source === d) return l.target.target = true;
        })
        .filter(function (l) {
            return l.target === d || l.source === d;
        })
        .each(function () {
            this.parentNode.appendChild(this);
        });

    node
        .classed("node--target", function (n) {
            return n.target;
        })
        .classed("node--source", function (n) {
            return n.source;
        });
}

function mouseouted(d) {
    link
        .classed("link--target", false)
        .classed("link--source", false);

    node
        .classed("node--target", false)
        .classed("node--source", false);
}

d3.select(self.frameElement).style("height", diameter + "px");

function typeRules(nodes, edges) {
    var map = {},
        imports = [];

    // Compute a map from name to node.
    nodes.forEach(function (d) {
        map[d.name] = d;
    });

    // For each import, construct a link from the source to target node.
    edges.forEach(function (e) {
        src = map[e.source];
        tgt = map[e.target];
        if (src && tgt) {
            imports.push({source: map[e.source], target: map[e.target]});
        }
    });

    return imports;
}
