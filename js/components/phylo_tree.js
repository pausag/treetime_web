var EventEmitter = require('events').EventEmitter;
var d3 = require('d3');

var Globals = require('./globals.js')
var colors = Globals.colors;
var ANIMATION_DURATION = Globals.ANIMATION_DURATION;

var PhyloTree = {};

PhyloTree.state = {};

PhyloTree.padding_bottom = 80;
PhyloTree.padding_text = 20;
PhyloTree.padding_top = 10;
PhyloTree.padding_right = 25;
PhyloTree.padding_left = 20;

PhyloTree.create = function(el, props, state){

  console.log("CREATING tree");
  var w  = el.offsetWidth;
  var h = el.offsetHeight;
  var svg = d3.select(el).append('svg')
    .attr('class', 'd3-phylotree')
    .attr('width', w)
    .attr('height', h);
  console.log(w, h)
  
  svg.append('g')
      .attr('class', 'd3-tree_axis')
  svg.append('g')
      .attr('class', 'd3-links');
  svg.append('g')
      .attr('class', 'd3-tips');
  var dispatcher = new EventEmitter();
  this._create_data(props);
  
//  this._update_node_colors(state);
//  this.update(el, state, dispatcher);
  return dispatcher;

};

PhyloTree._create_data = function(props){
    
    //console.log(props.root)
    this.root = props.root;
    this.layout = d3.layout.tree();
    this.all_nodes = this.layout.nodes(this.root);
    this.all_links = this.layout.links(this.all_nodes);
    this.all_links.push({"source":this.root, "target":this.root});
    this.all_tips = this.gatherTips(this.root, []);
    this.all_tips.map(function(d){d.selected=false;});

};

PhyloTree.save_svg = function(el){

  var html = d3.select(el).select(".d3-phylotree")
        .attr("title", "test2")
        .attr("version", 1.1)
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .node().parentNode.innerHTML;

  return html;

}

PhyloTree.gatherTips = function (node, tips) {
    
    if (typeof node.children != "undefined") {
        for (var i=0, c=node.children.length; i<c; i++) {
            this.gatherTips(node.children[i], tips);
        }
    }
    else {
        tips.push(node);
    }
    return tips;

};

PhyloTree.update = function(el, state, dispatcher) {
  
  console.log("UPDATING tree");

  if (this.state.cscale != state.cscale){
    console.log("TreeTime updateing tips colors...")
    this._update_node_colors(state);
  }

  if (this.state.selected_tip != state.selected_tip){
      this._update_selected(el, state);
  }  
  
  console.log(state)
  if (this.state.xUnit != state.xUnit){
    this._update_scales(el, state, dispatcher);
  }

  // update the tree state
  this.state = state;

};


PhyloTree._update_selected = function(el,state){
    
    this.all_tips.map(function(d){
          if (state.selected_tip && d.strain == state.selected_tip){
              d.selected = true;
          }else{
              d.selected = false;
          }
    });

    var g = d3.select(el).selectAll('.d3-tips');
    var tip = g.selectAll('.d3-tip')
    tip.attr("r", this._tipRadius)

};

PhyloTree._update_scales = function(el, state, dispatcher){

    var scales = this._scales(el, state);
    this._update_axis (el, state, scales, dispatcher);
    this._set_node_coordinates(scales, state);
    this._drawLinks(el, scales, dispatcher);
    this._drawTips(el, scales, dispatcher); 

};

PhyloTree._scales = function(el, state) {

  var width = el.offsetWidth;
  var height = el.offsetHeight;
  
  var xUnit = state.xUnit  
  var xValues = this.all_nodes.map(function(d) {return +d[xUnit];});
  var yValues = this.all_nodes.map(function(d) {return +d.yvalue;});

  var x = d3.scale.linear()
      .domain([d3.min(xValues), d3.max(xValues)])
      .range([this.padding_left, width-this.padding_right]);
  
  var y = d3.scale.linear()
      .domain([d3.min(yValues), d3.max(yValues)])
      .range([this.padding_top,height-this.padding_bottom])

  return {x: x, y: y};

};

PhyloTree._update_node_colors = function(state){
    
    this.all_nodes.forEach(function (d) {
        d.color = state.cscale.get_color(d[state.cscale.cUnit]);
    });

};

PhyloTree.get_color_scale = function(){

};

PhyloTree._tipFillColor = function(d) {
    
    var c =  d3.rgb(d.color).brighter([0.65]);
    return c;
}

PhyloTree._tipStrokeColor = function(d)  {return d.color;}

PhyloTree._branchStrokeColor = function (d) {return "#BBBBBB";}

PhyloTree._tipVisibility = function (d) { return d.current?"visible":"hidden";}

PhyloTree._branchStrokeWidth = function(d) {return 3;}

PhyloTree._set_node_coordinates = function(scales, state){

    var xUnit = state.xUnit
    this.all_nodes.forEach(function (d) {
            d.old_x = d.x; // need this to make smooth transitions 
            d.old_y = d.y;
            
            d.x = scales.x(d[xUnit]);
            d.y = scales.y(d.yvalue);
    });

};

PhyloTree._tipRadius = function(d) {return d.selected ? 16.0 : 10.0;}

PhyloTree._drawTips = function(el, scales, dispatcher) {
    
    var g = d3.select(el).selectAll('.d3-tips');

    var tip = g.selectAll('.d3-tip')
        .data(this.all_tips);

    tip.enter()
      .append("circle")
      .attr("class", "d3-tip")
      .attr("id", function(d) { return (d.strain).replace(/\//g, ""); })
      .attr("cx", function(d) { 
            if (d.old_x){
                return d.old_x;    
            }
            return d.x; 
        })

    tip
      .attr("r", this._tipRadius)
      .attr("cy", function(d) {return d.y;})
      .style("fill", this._tipFillColor)
      .style("stroke", this._tipStrokeColor)
      .on('mouseover', function(d) {
          //console.log("Mouseover" + d.y);
          dispatcher.emit('point:tip_mouseover', d);
      })
      .on('mouseout', function(d) {
          dispatcher.emit('point:tip_mouseout', d);
      })
      .transition()
      .duration(ANIMATION_DURATION)
      .attr('cx', function(d) { return d.x; })
      .attr('cy', function(d){return d.y; });

      //.style("stroke", this._tipStrokeColor);

};

PhyloTree._drawLinks = function(el, scales, dispatcher){
        
        var g = d3.select(el).selectAll('.d3-links');

        var link = g.selectAll('.d3-link')
            .data(this.all_links);

        link.enter()
            .append("polyline")
            .attr("class", "d3-link")
            .attr("points", this._branchPoints_old)
            .style("stroke-width", 3)
            .style("stroke", "gray")
            .style("stroke-linejoin", "round")
            .style("cursor", "pointer");
            
        link.transition()
                .attr("points", this._branchPoints)
                .duration(ANIMATION_DURATION)
            
};

PhyloTree._branchPoints = function(d) {
    var tmp =   d.source.x.toString() + "," + d.target.y.toString() + " "
              + d.target.x.toString() + "," + d.target.y.toString();
    if (typeof d.target.children != "undefined"){
        var child_ys = d.target.children.map(function (x){return x.y;});
        tmp+= " "+ d.target.x.toString()+","+d3.min(child_ys).toString() + " "
                 + d.target.x.toString()+","+d3.max(child_ys).toString();
    }
    return tmp;
},

PhyloTree._branchPoints_old = function(d) {
    var tmp =   d.source.old_x.toString() + "," + d.target.old_y.toString() + " "
              + d.target.old_x.toString() + "," + d.target.old_y.toString();
    if (typeof d.target.children != "undefined"){
        var child_ys = d.target.children.map(function (x){return x.old_y;});
        tmp+= " "+ d.target.old_x.toString()+","+d3.min(child_ys).toString() + " "
                 + d.target.old_x.toString()+","+d3.max(child_ys).toString();
    }
    return tmp;
},


PhyloTree._update_axis = function(el, state, scales, dispatcher){

    console.log("TreeTime state: " + state.xUnit)
    if (state.xUnit == "numdate"){
        this._draw_axis(el, state, scales, dispatcher);
    }else{
        this._hide_axis(el, state, scales, dispatcher);
    }

};

PhyloTree._draw_axis = function(el, state, scales, dispatcher){
    
    console.log("Drawing treeTime axis...")
    var width = el.offsetWidth;
    var height = el.offsetHeight;

    var xAxis = d3.svg.axis()
        .scale(scales.x)
        .orient("bottom")
        .ticks(10)
    
    // function for the y grid lines
    function make_x_axis() {
    return d3.svg.axis()
      .scale(scales.x)
      .orient("bottom")
      .ticks(10)
    }

    var svg = d3.select(el).select('.d3-tree_axis')
    console.log(svg)
    
    svg.append("g")
        .attr("class", "d3_tree_x_axis")
        .attr("transform", "translate(0," + (height -  this.padding_bottom) + ")")
        .call(xAxis)

    svg.append("text")      // text label for the x axis
        .attr("x", width / 2 )
        .attr("y", height - this.padding_text )
        .style("text-anchor", "middle")
        .text("Date");


   svg.append("g")
        .attr("class", "d3_tree_x_grid")
        .attr("transform", "translate(0," +  ( + 0) + ")")
        .call(make_x_axis()
            .tickSize(height-this.padding_bottom, 0, 0)
            .tickFormat("")
            )



    // var bnd = scales.x.domain()
    // var yticks_xs = d3.range(bnd[0], bnd[1], 1);
    // var y_bnds = scales.y.range()
    // var glines = yticks_xs.map(function(d){return ({x1:d, y1:y_bnds[0], x2:d, y2:y_bnds[1]});})

    // //console.log(glines)
    // var gridLine = g.selectAll('.d3-tree-axis-line')
    //     .data(glines);

    // gridLine.enter()
    //     .append('line')
    //     .attr("class","d3-tree-axis-line")
    //     .attr("x1", function(d){return scales.x(d.x1);})
    //     .attr("x2", function(d){return scales.x(d.x2);})
    //     .attr("y1", function(d){return d.y1;})
    //     .attr("y2", function(d){return d.y2;})
    //     .style("stroke-width", 1)
    //     .style("stroke", "#DDDDDD");

};

PhyloTree._hide_axis = function (el, state, scales, dispatcher){
    
    console.log("Hiding treeTime axis...")
    var g = d3.select(el).select('.d3-tree_axis').selectAll("*");
    g.remove();

};

PhyloTree.destroy = function(el) {

};

export default PhyloTree;