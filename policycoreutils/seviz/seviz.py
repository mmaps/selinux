import SimpleHTTPServer
import SocketServer
import argparse
import glob
import json
import logging
import os
import socket
import subprocess
import sys

sys.path.insert(0, "../../sepolgen/src/")
import sepolgen.refparser
import sepolgen.refpolicy


"""
From  sepolicy/Android.mk in Android's SEPolicy git repo:
https://android.googlesource.com/platform/external/sepolicy

These files are handled in this order to support preprocessing
like m4 and attribute definitions.

Currently, only *_macros files are handled by the m4 program,
which are then used to parse the type enforcement files (*.te).

"""
SEPOLICY_BUILD_FILES = ["security_classes",
                        "initial_sids",
                        "access_vectors",
                        "global_macros",
                        "neverallow_macros",
                        "mls_macros",
                        "mls",
                        "policy_capabilities",
                        "te_macros",
                        "attributes",
                        "ioctl_macros",
                        "*.te",
                        "roels",
                        "users",
                        "initial_sid_contexts",
                        "fs_use",
                        "genfs_contexts",
                        "port_contexts"]

M4_MACRO_FILES = [f for f in SEPOLICY_BUILD_FILES if f.endswith("_macros")]

aliases = {}
attrs = {}
types = {}
classes = {}
attr_map = {}


def parse_cli_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("policy_dir", help="Directory containing policy source files")
    parser.add_argument("-d", "--debug", action="store_true", help="Debugging output")
    parser.add_argument("-b", "--board_dir", help="Parse additional board files in given dir", default="")
    parser.add_argument("-c", "--seclass", help="The class of types to display in layout", default="process")
    parser.add_argument("-l", "--layout", help="Specify the layout for the visualization", default="graph")
    parser.add_argument("-o", "--output", help="Output file name for sepolicy data. Default = 'sepol.json'", default="sepol.json")
    parser.add_argument("-p", "--port", help="Port number for local web server", default=8000, type=int)
    parser.add_argument("-w", "--web", help="Disable the webserver to serve viz", default=True, action="store_false")
    return parser.parse_args()


def read_attributes(dir_):
    try:
        with open(os.path.join(dir_, "attributes"), "r") as fin:
            return fin.read()
    except (OSError, IOError):
        logging.debug("Directory does not have attributes macros")
        return ''


def order_files(default_dir, board_dir):
    if not default_dir or not os.path.isdir(default_dir):
        logging.error("Invalid directory: %s" % repr(default_dir))
        return []

    def_fnames = os.listdir(default_dir)
    if board_dir:
        board_fnames = os.listdir(board_dir)
    else:
        board_fnames = []

    file_seq = []
    for mf in M4_MACRO_FILES:
        if mf in def_fnames:
            file_seq.append(os.path.join(default_dir, mf))
        if mf in board_fnames:
            file_seq.append(os.path.join(board_dir, mf))
    for f in def_fnames:
        if f.endswith(".te"):
            file_seq.append(os.path.join(default_dir, f))
    for f in board_fnames:
        if f.endswith(".te"):
            file_seq.append(os.path.join(board_dir, f))
    return file_seq


def expand_macros(files):
    cmd = ["/usr/bin/m4", "-s"]
    cmd.extend(files)
    try:
        child = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        out, err = child.communicate()
    except OSError as e:
        logging.error("Error running m4 cmd: %s\nIt may not be installed: %s" % (cmd, e))
        sys.exit(1)
    except ValueError as e:
        logging.error("Error while running m4 cmd: %s\nParameters may be invalid: %s" % (cmd, e))
        sys.exit(1)
    else:
        if err:
            logging.error("Error from m4: %s" % err)
            sys.exit(1)
        return out


def preprocess(default_dir, board_dir):
    file_seq = []
    rv = ""
    rv += read_attributes(default_dir)
    rv += read_attributes(board_dir)
    file_seq.extend(order_files(default_dir, board_dir))
    logging.debug("Preprocess file sequence:\n\t%s" % "\n\t".join(file_seq))
    rv += expand_macros(file_seq)
    return rv


def find_m4_syncline(lines, idx):
    crunch = ""
    line_num = -1
    fname = ""
    while idx >= 0 and not fname:
        if lines[idx].startswith("#line"):
            try:
                crunch, _, fname = lines[idx].split()
            except ValueError:
                crunch, _, line_num = lines[idx].partition(" ")
            else:
                break
        idx -= 1
    return "%s %s %s" % (crunch, line_num, fname)


def sanitize_expansions(m4_text):
    lines = m4_text.split("\n")
    clean = []
    for i, line in enumerate(lines):
        if line.startswith(";"):
            syncline = find_m4_syncline(lines, i)
            logging.debug("Invalid line in m4 expansion, line number %s. Run with --debug to output expansion file.\n"
                         "Problem likely originates in file: %s\n"
                         "Possibly due to trailing semicolon in te file macro.\n"
                         "Line: %s" % (i, syncline, repr(line)))
        else:
            clean.append(line)
    return "\n".join(clean)


def policy_from_source(text, policy_mod=None):
    try:
        if policy_mod:
            policy = sepolgen.refparser.parse(text, policy_mod)
        else:
            policy = sepolgen.refparser.parse(text)
    except ValueError as e:
        logging.error("Parse error: %s" % e)
    else:
        return policy


def add_alias(alias):
    if alias not in aliases:
        aliases[alias] = {"types": []}


def add_attr(attr):
    if attr not in attrs:
        attrs[attr] = {"types": []}


def add_class(class_):
    if class_ not in classes:
        classes[class_] = {"types": []}


def add_type(type_):
    if type_ not in types:
        types[type_] = {"aliases": [], "attributes": [], "classes": [], "permissions": {}, "src_cnt": 0, "tgt_cnt": 0}


def add_type_src(type_):
    add_type(type_)
    types[type_]["src_cnt"] += 1


def add_type_tgt(type_):
    add_type(type_)
    types[type_]["tgt_cnt"] += 1


def add_permission(src, tgt, perm):
    if tgt.startswith("-"):
        return
    add_type(src)
    add_type(tgt)
    try:
        types[src]["permissions"][perm].append(tgt)
    except KeyError:
        types[src]["permissions"][perm] = [tgt]


def map_type_class(class_, type_):
    try:
        if type_ not in classes[class_]["types"]:
            classes[class_]["types"].append(type_)
    except KeyError:
        add_class(class_)
        classes[class_]["types"].append(type_)
    try:
        if class_ not in types[type_]["classes"]:
            types[type_]["classes"].append(class_)
    except KeyError:
        add_type(type_)
        types[type_]["classes"].append(class_)


def map_type_alias(type_, alias):
    try:
        if type_ not in aliases[alias]["types"]:
            aliases[alias]["types"].append(type_)
    except KeyError:
        add_alias(alias)
        aliases[alias]["types"].append(type_)
    try:
        if alias not in types[type_]["aliases"]:
            types[type_]["aliases"].append(alias)
    except KeyError:
        add_type(type_)
        types[type_]["aliases"].append(alias)


def map_type_attribute(type_, attr):
    try:
        if type_ not in attrs[attr]["types"]:
            attrs[attr]["types"].append(type_)
    except KeyError:
        add_attr(attr)
        attrs[attr]["types"].append(type_)
    try:
        if attr not in types[type_]["attributes"]:
            types[type_]["attributes"].append(attr)
    except KeyError:
        add_type(type_)
        types[type_]["attributes"].append(attr)


def update_datafile(obj, fname):
    json_dump(obj, fname)
    files = [os.path.basename(f) for f in glob.glob("data/*.json")]
    json_dump(files, "dataFiles.txt")


def json_dump(obj, fname):
    fout = open("data/%s" % fname, "w")
    json.dump(obj, fout, indent=4)
    fout.close()


def find_nodes_edges(pol):
    """
    type pol: sepolgen.repolicy.Node
    """
    nodes = []
    node_map = {}
    edges = []
    for item in pol:
        item = item[0]
        if isinstance(item, sepolgen.refpolicy.AVRule):
            if item.rule_type != sepolgen.refpolicy.AVRule.ALLOW:
                continue
            for src in item.src_types:
                if src.startswith("-"):
                    continue
                if src not in node_map:
                    nodes.append({"type": src, "name": src, "group": 0})
                    node_map[src] = len(nodes) - 1
                for tgt in item.tgt_types:
                    target = tgt
                    if target.startswith("-"):
                        continue
                    if target == "self":
                        target = src
                    if target not in node_map:
                        nodes.append({"type": target, "name": target, "group": 0})
                        node_map[target] = len(nodes) - 1
                    for perm in item.perms:
                        edges.append({"source": node_map[src], "src_name": src,
                                      "target": node_map[target], "tgt_name": target, "type": perm})
        elif isinstance(item, sepolgen.refpolicy.TypeAttribute):
            logging.debug("TypeAttribute: %s" % item)
        elif isinstance(item, sepolgen.refpolicy.Type):
            logging.debug("Type: %s" % item)
        elif isinstance(item, sepolgen.refpolicy.TypeRule):
            logging.debug("TypeRule: %s" % item)
        elif isinstance(item, sepolgen.refpolicy.TypeAlias):
            logging.debug("TypeAlias: %s" % item)
        elif isinstance(item, sepolgen.refpolicy.Attribute):
            logging.debug("Attribute: %s" % item)
        else:
            logging.warn("Unhandled type: %s\n\t%s" % (type(item), item))
    return nodes, edges


def create_maps(policy):
    """Iterate the policy rules parsed, and build the models from them that will be used
    as data for the visualizations.
    """
    for p in policy:
        p = p[0]
        if isinstance(p, sepolgen.refpolicy.Attribute):
            add_attr(p.name)
        elif isinstance(p, sepolgen.refpolicy.TypeAlias):
            for a in p.aliases:
                map_type_alias(p.type, a)
        elif isinstance(p, sepolgen.refpolicy.TypeAttribute):
            for a in p.attributes:
                map_type_attribute(p.type, a)
        elif isinstance(p, sepolgen.refpolicy.Type):
            for a in p.aliases:
                map_type_alias(p.name, a)
            for a in p.attributes:
                map_type_attribute(p.name, a)
        elif isinstance(p, sepolgen.refpolicy.AVRule):
            for src in p.src_types:
                if src.startswith("-"):
                    continue
                add_type_src(src)
                for tgt in p.tgt_types:
                    if tgt == "self":
                        tgt = src
                    for permission in p.perms:
                        add_permission(src, tgt, permission)
                    if tgt.startswith("-") or tgt == "*":
                        continue
                    add_type_tgt(tgt)
                    for cls in p.obj_classes:
                        map_type_class(cls, tgt)


def build_graph(policy):
    nodes = set()
    edges = []
    smax = 0
    smax_t = None
    tmax = 0
    tmax_t = None
    for t in types:
        if types[t]["src_cnt"] > smax:
            smax_t = t
            smax = types[t]["src_cnt"]
        if types[t]["src_cnt"] > tmax:
            tmax_t = t
            tmax = types[t]["src_cnt"]
    logging.debug("Largest source: %s" % smax_t)
    logging.debug("Largest target: %s" % tmax_t)
    for p in policy:
        p = p[0]
        if isinstance(p, sepolgen.refpolicy.AVRule):
            for src in p.src_types:
                if src.startswith("-"):
                    continue
                for tgt in p.tgt_types:
                    if src != smax_t and tgt != smax_t:
                        continue
                    if tgt == "self":
                        tgt = src
                    nodes.add(src)
                    nodes.add(tgt)
                    if (src, tgt) not in edges:
                        edges.append((src, tgt))
    nodes = list(nodes)
    for i, e in enumerate(edges):
        sidx = nodes.index(e[0])
        tidx = nodes.index(e[1])
        edges[i] = {"source": sidx, "target": tidx}
    nodes = [{"name": n, "type": n} for n in nodes]
    logging.debug("Nodes: %s Edges: %s" % (len(nodes), len(edges)))
    update_datafile({"nodes": nodes, "links": edges}, "graph.json")


def build_supergraph(policy):
    nodes = []
    edges = []

    for a in attrs:
        nodes.append(a)

    for p in policy:
        p = p[0]
        if isinstance(p, sepolgen.refpolicy.AVRule):
            for src in p.src_types:
                if src.startswith("-"):
                    continue
                sattr = attr_map.get(src)
                for tgt in p.tgt_types:
                    if tgt == "self":
                        tgt = src
                    tattr = attr_map.get(tgt)
                    for source in sattr:
                        for target in tattr:
                            if (source, target) not in edges:
                                edges.append((source, target))

    for i, e in enumerate(edges):
        sidx = nodes.index(e[0])
        tidx = nodes.index(e[1])
        edges[i] = {"source": sidx, "target": tidx}

    nodes = [{"name": n, "type": n} for n in nodes]

    logging.debug("Nodes: %s Edges: %s" % (len(nodes), len(edges)))
    update_datafile({"nodes": nodes, "links": edges}, "superGraph.json")


def build_hive(policy):
    n = {}
    nodes, edges = find_nodes_edges(policy)
    for node in nodes:
        n[node["name"]] = {"name": node["name"], "imports": []}
    for e in edges:
        if e["tgt_name"] not in n[e["src_name"]]["imports"]:
            n[e["src_name"]]["imports"].append(e["tgt_name"])

    groups = []
    for node in nodes:
        if node["name"] in types:
            group = ",".join(sorted(types[node["name"]]["attributes"]))
            if group not in groups:
                groups.append(group)
            node["group"] = groups.index(group)
    for edge in edges:
        edge["imports"] = edge["target"]

    update_datafile([n[k] for k in n.keys()], "hive.json")


def build_chord(policy):
    arch = {"name": "root", "children": []}
    for attr in attrs:
        arch["children"].append({"name": attr, "children": []})
        for t in attrs[attr]["types"]:
            child = {"name": t, "parent": attr}
            arch["children"][-1]["children"].append(child)
    edges = []
    for p in policy:
        p = p[0]
        if isinstance(p, sepolgen.refpolicy.AVRule):
            if p.rule_type != sepolgen.refpolicy.AVRule.ALLOW:
                continue
            for src in p.src_types:
                for tgt in p.tgt_types:
                    target = tgt
                    if target == "self":
                        target = src
                    edges.append({"source": src, "target": target})
    fout = open("data/chord.json", "w")
    json.dump({"nodes": arch, "links": edges}, fout, indent=2)
    fout.close()


def TreeNode(name, parent, node_type):
    return {"name": name, "parent": parent, "children": [], "nodeType": node_type}


def build_tree(args):
    root = TreeNode("SELinux", parent="null", node_type="root")
    for class_ in classes:
        class_node = TreeNode(class_, root["name"], "class")
        root["children"].append(class_node)

        for type_ in classes[class_]["types"]:
            type_node = TreeNode(type_, class_node["name"], "type")
            class_node["children"].append(type_node)

            for perm in types[type_]["permissions"]:
                perm_node = TreeNode(perm, type_, "permission")
                type_node["children"].append(perm_node)

                for target in types[type_]["permissions"][perm]:
                    tgt_node = TreeNode(target, perm, "type")
                    perm_node["children"].append(tgt_node)
    update_datafile(root, args.output)


def create_visual(policy, args):
    layout = args.layout
    if layout == "graph":
        build_graph(policy)
    elif layout == "supergraph":
        build_supergraph(policy)
    elif layout == "hive":
        build_hive(policy)
    elif layout == "chord":
        build_chord(policy)
    elif layout == "tree":
        build_tree(args)
    else:
        logging.error("Unknown layout: %s\nOptions are graph, supergraph, hive, chord")
        sys.exit(1)


def index_from_template(layout):
    with open("templates/index.html", "r") as fin, open("index.html", "w") as fout:
        text = fin.read()
        fout.write(text)


def start_web_server(port):
    SocketServer.TCPServer.allow_reuse_address = True
    httpd = None
    try:
        httpd = SocketServer.TCPServer(("", port), SimpleHTTPServer.SimpleHTTPRequestHandler)
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    except socket.error as se:
        if se.errno == 13:
            logging.error("Permission denied on socket %s. Try a higher port." % port)
        else:
            logging.error(se)
    finally:
        if httpd:
            httpd.shutdown()
            httpd.socket.close()


def types_metadata():
    sources = []
    targets = []
    mix = []
    for t in types:
        if types[t]["src_cnt"] == 0 and types[t]["tgt_cnt"] != 0:
            targets.append(t)
        elif types[t]["src_cnt"] != 0 and types[t]["tgt_cnt"] == 0:
            sources.append(t)
        elif types[t]["src_cnt"] != 0 and types[t]["tgt_cnt"] != 0:
            mix.append(t)
        else:
            logging.debug("Unused type: %s" % t)
    types["metadata"] = {}
    types["metadata"]["sources"] = sources
    types["metadata"]["src_cnt"] = len(sources)
    types["metadata"]["targets"] = targets
    types["metadata"]["tgt_cnt"] = len(targets)
    types["metadata"]["mix"] = mix
    types["metadata"]["mix_cnt"] = len(mix)


def dump_maps():
    types_metadata()
    try:
        with open("types.json", "w") as fout_types,\
                open("aliases.json", "w") as fout_aliases,\
                open("attrs.json", "w") as fout_attrs,\
                open("classes.json", "w") as fout_classes:
            json.dump(aliases, fout_aliases, indent=4, sort_keys=True)
            json.dump(attrs, fout_attrs, indent=4, sort_keys=True)
            json.dump(classes, fout_classes, indent=4, sort_keys=True)
            json.dump(types, fout_types, indent=4, sort_keys=True)
    except (IOError, OSError) as e:
        logging.warn("Could not write debug file: %s" % e)


def main(args):
    """
    Start by ordering the files in the policy and board directories.
    Then expand the macros with m4.
    """
    expanded = preprocess(args.policy_dir, args.board_dir)
    if args.debug:
        try:
            with open("seviz-expansions.te", "w") as fout:
                fout.write(expanded)
        except (IOError, OSError) as e:
            logging.warn("Could not write debug file: %s" % e)
    """
    Clean up trailing semi-colons
    """
    expanded = sanitize_expansions(expanded)

    """
    Parse the macro expanded data
    """
    policy = policy_from_source(expanded)
    if not policy:
        logging.error("Parsing returned empty result")
        sys.exit(1)

    """
    Create data sources from policy model
    """
    create_maps(policy)
    if args.debug:
        dump_maps()

    """
    Create visual transforms model data into the correct json output for a particular layout
    """
    create_visual(policy, args)

    """
    Create the root index.html in the working directory for a particular layout
    """
    index_from_template(args.layout)
    if args.web:
        print "Starting local web server: http://localhost:%s" % args.port
        start_web_server(args.port)


if __name__ == "__main__":
    cli_args = parse_cli_args()
    if cli_args.debug:
        logging.basicConfig(level=logging.DEBUG)
    main(cli_args)
