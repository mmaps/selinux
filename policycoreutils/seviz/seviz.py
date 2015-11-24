import argparse
import SimpleHTTPServer
import json
import logging
import os
import SocketServer
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

attrs = {}
types = {}


def parse_cli_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("policy_dir", help="Directory containing policy source files")
    parser.add_argument("-d", "--debug", action="store_true", help="Debugging output")
    parser.add_argument("-b", "--board_dir", help="Parse additional board files in given dir", default="")
    parser.add_argument("-l", "--layout", help="Specify the layout for the visualization", default="graph")
    parser.add_argument("-w", "--web", help="Disable the webserver to serve viz", default=True, action="store_false")
    return parser.parse_args()


def read_attributes(dir_):
    with open(os.path.join(dir_, "attributes"), "r") as fin:
        return fin.read()


def order_files(dir_):
    if not dir_ or not os.path.isdir(dir_):
        logging.error("Invalid directory: %s" % repr(dir_))
        return []
    fnames = os.listdir(dir_)
    file_seq = [os.path.join(dir_, mf) for mf in M4_MACRO_FILES if mf in fnames]
    file_seq.extend([os.path.join(dir_, f) for f in fnames if f.endswith(".te")])
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


def preprocess(dir_list):
    file_seq = []
    rv = ""
    for dir_ in dir_list:
        if dir_:
            rv += read_attributes(dir_)
            file_seq.extend(order_files(dir_))
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


def sanitize(m4_text):
    lines = m4_text.split("\n")
    clean = []
    for i, line in enumerate(lines):
        if line.startswith(";"):
            syncline = find_m4_syncline(lines, i)
            logging.warn("Invalid line in m4 expansion, line number %s. Run with --debug to output expansion file.\n"
                         "Problem likely originates in file: %s\n"
                         "Possibly due to trailing semicolon in te file macro.\n"
                         "Line: %s" % (i, syncline, repr(line)))
        else:
            clean.append(line)
    return "\n".join(clean)


def generate_policy(text, policy_mod=None):
    try:
        if policy_mod:
            policy = sepolgen.refparser.parse(text, policy_mod)
        else:
            policy = sepolgen.refparser.parse(text)
    except ValueError as e:
        logging.error("Parse error: %s" % e)
    else:
        return policy


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
    for p in policy:
        p = p[0]
        if isinstance(p, sepolgen.refpolicy.Attribute):
            if not attrs.get(p.name):
                attrs[p.name] = {"types": []}
        elif isinstance(p, sepolgen.refpolicy.TypeAlias):
            for a in p.aliases:
                if not types.get(p.type):
                    types[p.type] = {"aliases": [a], "attributes": []}
                else:
                    types[p.type]["aliases"].append(a)
        elif isinstance(p, sepolgen.refpolicy.TypeAttribute):
            for a in p.attributes:
                if not attrs.get(a):
                    attrs[a] = {"types": [p.type]}
                else:
                    attrs[a]["types"].append(p.type)
        elif isinstance(p, sepolgen.refpolicy.Type):
            for a in p.aliases:
                if not types.get(p.name):
                    types[p.name] = {"aliases": [a], "attributes": []}
                else:
                    types[p.name]["aliases"].append(a)
            for a in p.attributes:
                if not attrs.get(a):
                    attrs[a] = {"types": [p.name]}
                else:
                    attrs[a]["types"].append(p.name)
                if not types.get(p.name):
                    types[p.name] = {"aliases": [], "attributes": [a]}
                else:
                    types[p.name]["attributes"].append(a)


def build_graph(policy):
    nodes, edges = find_nodes_edges(policy)
    fout = open("data/graph.json", "w")
    json.dump({"nodes": nodes, "links": edges}, fout, indent=4)
    fout.close()


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

    fout = open("data/hive.json", "w")
    #json.dump({"nodes": nodes, "links": edges}, fout, indent=4)
    json.dump([n[k] for k in n.keys()], fout, indent=4)
    fout.close()


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


def index_from_template(layout):
    with open("templates/index.html", "r") as fin, open("index.html", "w") as fout:
        text = fin.read()
        text = text % (layout, layout)
        fout.write(text)


def create_visual(policy, layout):
    if layout == "graph":
        build_graph(policy)
    elif layout == "hive":
        build_hive(policy)
    elif layout == "chord":
        build_chord(policy)
    else:
        logging.error("Unknown layout: %s\nOptions are graph, hive, chord")
        sys.exit(1)


def start_web_server():
    SocketServer.TCPServer.allow_reuse_address = True
    httpd = SocketServer.TCPServer(("", 8000), SimpleHTTPServer.SimpleHTTPRequestHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.shutdown()
        httpd.socket.close()


def main(args):
    expanded = preprocess([args.policy_dir, args.board_dir])
    if args.debug:
        try:
            with open("seviz-expansions.te", "w") as fout:
                fout.write(expanded)
        except (IOError, OSError) as e:
            logging.warn("Could not write debug file: %s" % e)
    """
    Clean up trailing semi-colons
    """
    expanded = sanitize(expanded)

    policy = generate_policy(expanded)
    if not policy:
        logging.error("Parsing returned empty result")
        sys.exit(1)

    create_maps(policy)
    if args.debug:
        try:
            with open("types.json", "w") as fout_types, open("attrs.json", "w") as fout_attrs:
                json.dump(types, fout_types, indent=4, sort_keys=True)
                json.dump(attrs, fout_attrs, indent=4, sort_keys=True)
        except (IOError, OSError) as e:
            logging.warn("Could not write debug file: %s" % e)

    create_visual(policy, args.layout)

    index_from_template(args.layout)

    if args.web:
        print 'start'
        start_web_server()


if __name__ == "__main__":
    cli_args = parse_cli_args()
    if cli_args.debug:
        logging.basicConfig(level=logging.DEBUG)
    main(cli_args)
