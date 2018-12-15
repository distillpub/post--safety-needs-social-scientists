const assert = require('assert')
const fs = require('fs')
const path = require("path")
const webpack = require("webpack")
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlStringReplace = require('html-string-replace-webpack-plugin')

function format_debate(base_indent, name) {
  // Slurp in file and split into lines
  const lines = fs.readFileSync('src/' + name + '.txt', 'utf8').trim().split('\n')

  // Parse into tree based on indentation
  const tree = []
  for (const line of lines) {
    if (line.trim().length == 0) continue
    const most = line.trimLeft()
    const indent = line.length - most.length 
    assert(indent % 2 == 0)
    let kids = tree
    for (var i = 0; i < indent; i += 2) {
      assert(kids.length)
      kids = kids[kids.length - 1][1]
    }
    kids.push([most, []])
  }

  // Dump tree to check consistency
  function dump_tree(indent, list) {
    for (const node of list) {
      console.log(indent + node[0])
      dump_tree(indent + '  ', node[1])
    }
  }
  if (0)
    dump_tree('', tree)

  // Output as html
  const output = []

  // Format a single line
  function show_line(who, line) {
    const m = line.match(/^([A-Z][a-z ]+(?:'s [a-z ]+)?):(.*)$/)
    if (m) {
      who = m[1].startsWith('Red') ? 'red' : m[1].startsWith('Blue') ? 'blue' : null
      line = '<strong>' + m[1] + ':</strong>' + m[2]
    }
    if (who)
      line = '<span class="' + who + '">' + line + '</span>'
    return [who, line]
  }

  // Recursively display a node
  function show_node(indent, old_who, node) {
    const [who, line] = show_line(old_who, node[0])
    output.push(indent + line)
    if (node[1].length) {
      output.push(indent + '<ul>')
      for (const kid of node[1]) {
        output.push(indent + '  <li>')
        show_node(indent + '    ', who, kid)
        output.push(indent + '  </li>')
      }
      output.push(indent + '</ul>')
    }
  }

  // The top level of the tree is formatted as paragraphs
  for (const node of tree) {
    output.push(base_indent + '<p>')
    show_node(base_indent + '  ', null, node)
    output.push(base_indent + '</p>')
  }
  return output.join('\n')
}

module.exports = {
  entry: {
    "index": "./src/index.js",
  },
  resolve: {
    extensions: [ ".js", ".html", ".npy", ".json" ]
  },
  output: {
    path: __dirname + "/public",
    filename: "[name].bundle.js",
    chunkFilename: "[name].[id].js"
  },
  module: {
    rules: [
      {
        test: /\.(html|js)$/,
        exclude: /node_modules/,
        loader: "babel-loader",
        options: {
          presets: ["es2015"]
        }
      },
      {
        test: /\.(html|svelte)$/,
        exclude: /node_modules/,
        loader: "svelte-loader"
      },
      {
        test: /\.(npy|npc)$/,
        exclude: /node_modules/,
        loader: 'numpy-loader',
        options: {
          outputPath: 'data/'
        }
      },
      {
        test: /\.(json)$/,
        exclude: /node_modules/,
        loader: 'json-loader',
        options: {
          outputPath: 'data/'
        }
      },
      {
        test: /\.svg$/,
        exclude: /node_modules/,
        loader: 'svg-inline-loader',
        options: {
          removeSVGTagAttrs: true,
          removingTagAttrs: ["font-family"]
        }
      },
      {
        test: /\.(png|jpg|jpeg)$/,
        exclude: /node_modules/,
        loader: 'file',
        options: {
          outputPath: 'images/'
        }
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.ejs", 
      filename: "index.html", 
      chunks: ["index"]
    }),
    new CopyWebpackPlugin([ { from: 'static/' } ]),
    new HtmlStringReplace({
      enable: true,
      patterns: [{
        match: /<d-cite\s+key="([^"]*)"\s*\/>/g,
        replacement: (_, key) => '<d-cite key="' + key + '"></d-cite>'
      }, {
        match: /<(\/?)todo>/g,
        replacement: (_, slash) => slash ? '</span>' : '<span class="todo">'
      }, {
        match: /<(\/?)dtodo>/g,
        replacement: (_, slash) => slash ? '</div>' : '<div class="todo">'
      }, {
        match: /<(red|blue|judge)\/>/gi,
        replacement: (_, name) => '<span class="' + name.toLowerCase() + '" style="font-weight: bold">' + name + '</span>'
      }, {
        match: /( *)<debate name="([^"]+)"\/>/g,
        replacement: (_, indent, name) => format_debate(indent, name)
      }]
    })
  ],
  devServer: {
    historyApiFallback: true,
    overlay: true,
    stats: "minimal",
    contentBase:  __dirname + "/public"
  },
  devtool: "inline-source-map"
}
