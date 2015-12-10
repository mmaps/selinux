SEViz
=====
A visualization tool for SELinux policy source files. Specifically, type enforcement (.te).

This tool is made of two parts: a parser and visualizer. The parser is a Python program using the SELinux polgen reference parser and reference model. The visualization component is based on [D3JS](http://d3js.org), and uses the model generated in the previous step.

This is still very much a work in progress. Only the "chord" and tree layouts are worth looking at right now.

Check out the [quick demo video](https://youtu.be/f4BzWfzk5uQ)

Dependencies
------------
* m4: Used in Python script
* D3JS: Used for visualization (this is bundled with the JavaScript)

Example
-------
1. Make sure you have m4 installed.
* ```# apt-get install m4 ```
2. Assuming we are in your home directory, make a working directory to put the project in:
```
$ mkdir selinux-example
$ cd selinux-example
```
3. Clone the [Android platform SELinux platform](https://android.googlesource.com/platform/external/sepolicy)
```
$ git clone https://android.googlesource.com/platform/external/sepolicy
```
4. Clone this repository
```
$ git clone https://github.com/mmaps/selinux
```
5. Jump to this program
```
$ cd selinux/policycoreutils/seviz
```
6. Run the parser to generate a JSON data file and layout. The target directory is the one cloned in step 1.
```
$ python seviz.py -l tree ~/selinux-example/sepolicy
```
7. Open your web browser to ```http://localhost:8000```


Usage
-----
Because seviz uses relative paths to insert the SELinux projects policy parser and model, you should run the program from within its own directory. This is an issue to be fixed.
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