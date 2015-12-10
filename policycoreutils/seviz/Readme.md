SEViz
=====
A visualization tool for SELinux policy source files. Specifically, type enforcement (.te).

This tool is made of two parts: a parser and visualizer. The parser is a Python program using the SELinux polgen reference parser and reference model. The visualization component is based on [D3JS](http://d3js.org), and uses the model generated in the previous step.

This is still very much a work in progress. Only the "chord" and tree layouts are worth looking at right now.

Check out the [quick demo video](https://youtu.be/f4BzWfzk5uQ)

Dependencies
------------
* m4: Used in python script - apt-get install m4
* D3JS: Used by JavaScript

Usage
-----
```
usage: seviz.py [-h] [-d] [-b BOARD_DIR] [-c SECLASS] [-l LAYOUT]
                [-o OUTPUT] [-p PORT] [-w]
                policy_dir

positional arguments:
  policy_dir            Directory containing policy source files

optional arguments:
  -h, --help            show this help message and exit
  -d, --debug           Debugging output
  -b BOARD_DIR, --board_dir BOARD_DIR
                        Parse additional board files in given dir
  -c SECLASS, --seclass SECLASS
                        The class of types to display in layout
  -l LAYOUT, --layout LAYOUT
                        Specify the layout for the visualization
  -o OUTPUT, --output OUTPUT
                        Output file name for sepolicy data. Default =
                        'sepol.json'
  -p PORT, --port PORT  Port number for local web server
  -w, --web             Disable the webserver to serve viz
```

References
----------
### SELinux
* [SELinux Project Wiki: Types](http://selinuxproject.org/page/TypeStatements)
* [SELinux Project Wiki: AVCRules](http://selinuxproject.org/page/AVCRules)

### D3
* [Mike Bostock's Reingold-Tilford Tree Example](http://bl.ocks.org/robschmuecker/7880033)
* [Mike Bostock's Hierarchical Edge Bundling](http://bl.ocks.org/mbostock/7607999)
* Castillo, Pablo Navarro. Mastering D3. js. Packt Publishing Ltd, 2014.
