/*global $ alert ACTUAL_ROOT model_player define: false, d3: false */
// ------------------------------------------------------------
//
//   SolarSystem View Renderer
//
// ------------------------------------------------------------
define(function (require) {
  // Dependencies.
  var console               = require('common/console'),
      wrapSVGText           = require('cs!common/layout/wrap-svg-text'),
      wrapSVGText           = require('cs!common/layout/wrap-svg-text'),
      gradients             = require('common/views/gradients');

  return function SolarSystemView(modelView, model) {
  // return function SolarSystemView(model, containers, m2px, m2pxInv, mSize2px) {
        // Public API object to be returned.
    var api = {},

        mainContainer,

        modelWidth,
        modelHeight,
        modelMinX2,
        modelMinY2,
        modelMaxX2,
        modelMaxY2,
        aspectRatio,

        // Basic scaling functions for position, it transforms model units to "pixels".
        // Use it for positions of objects rendered inside the view.
        model2px,

        // Inverted scaling function for position transforming model units to "pixels".
        // Use it for Y coordinates, as Y axis in model coordinate system increases
        // from bottom to top, while but SVG has increases from top to bottom
        model2pxInv,

        // Basic scaling function for size, it transforms model units to "pixels".
        // Use it for dimensions of objects rendered inside the view.
        modelSize2px,

        // The model function get_results() returns a 2 dimensional array
        // of particle indices and properties that is updated every model tick.
        // This array is not garbage-collected so the view can be assured that
        // the latest results will be in this array when the view is executing
        modelResults,

        // "Containers" - SVG g elements used to position layers of the final visualization.
        mainContainer,
        radialBondsContainer,
        VDWLinesContainer,
        imageContainerBelow,
        imageContainerTop,
        textContainerBelow,
        textContainerTop,

        // Array which defines a gradient assigned to a given tlanet.
        gradientNameForPlanet = [],

        tlanetTooltipOn,

        tlanet,
        label, labelEnter,
        tlanetDiv, tlanetDivPre,

        fontSizeInPixels,
        textBoxFontSizeInPixels,

        // for model clock
        showClock,
        timeLabel,
        modelTimeFormatter = d3.format("5.0f"),
        timePrefix = "",
        timeSuffix = "";

    function modelTimeLabel() {
      return timePrefix + modelTimeFormatter(model.get('time')/100) + timeSuffix;
    }

    /**
     * Setups set of gradient which can be changed by the user.
     * They should be recreated during each reset / repaint operation.
     * @private
     */
    function setupDynamicGradients() {
      var i, color, lightColor, medColor, darkColor;

      // "Marked" particle gradient.
      medColor   = model.get("markColor");
      // Mark color defined in JSON defines medium color of a gradient.
      color      = d3.rgb(medColor);
      lightColor = color.brighter(1).toString();
      darkColor  = color.darker(1).toString();
      gradients.createRadialGradient("mark-grad", lightColor, medColor, darkColor, mainContainer);
      gradients.createRadialGradient("neutral-grad", "#FFFFFF", "#f2f2f2", "#A4A4A4", mainContainer);
    }

    // Returns gradient appropriate for a given tlanet.
    // d - tlanet data.
    function getPlanetGradient(d) {
      if (d.marked) {
        return "url(#mark-grad)";
      } else {
        return "url(#neutral-grad)";
      }
    }

    function updatePlanetRadius() {
      mainContainer.selectAll("circle").data(modelResults).attr("r",  function(d) { return modelSize2px(d.radius); });
    }

    function setupColorsOfPlanets() {
      var i, len;

      gradientNameForPlanet.length = modelResults.length;
      for (i = 0, len = modelResults.length; i < len; i++)
        gradientNameForPlanet[i] = getPlanetGradient(modelResults[i]);
    }

    function setupPlanets() {

      mainContainer.selectAll("circle").remove();
      mainContainer.selectAll("g.label").remove();

      tlanet = mainContainer.selectAll("circle").data(modelResults);

      tlanetEnter();

      label = mainContainer.selectAll("g.label")
          .data(modelResults);

      labelEnter = label.enter().append("g")
          .attr("class", "label")
          .attr("transform", function(d) {
            return "translate(" + model2px(d.x) + "," + model2pxInv(d.y) + ")";
          });

      labelEnter.each(function (d) {
        var selection = d3.select(this),
            txtValue, txtSelection;
        // Append appropriate label. For now:
        // If 'tlanetNumbers' option is enabled, use indices.
        // If not and there is available 'label'/'symbol' property, use one of them
        if (model.get("tlanetNumbers")) {
          selection.append("text")
            .text(d.idx)
            .style("font-size", modelSize2px(1.4 * d.radius) + "px");
        }
        // Set common attributes for labels (+ shadows).
        txtSelection = selection.selectAll("text");
        // Check if node exists and if so, set appropriate attributes.
        if (txtSelection.node()) {
          txtSelection
            .attr("pointer-events", "none")
            .style({
              "font-weight": "bold",
              "opacity": 0.7
            });
          txtSelection
            .attr({
              // Center labels, use real width and height.
              // Note that this attrs should be set *after* all previous styling options.
              // .node() will return first node in selection. It's OK - both texts
              // (label and its shadow) have the same dimension.
              "x": -txtSelection.node().getComputedTextLength() / 2,
              "y": "0.31em"//bBox.height / 4
            });
        }
        // Set common attributes for shadows.
        selection.select("text.shadow")
          .style({
            "stroke": "#fff",
            "stroke-width": 0.15 * modelSize2px(d.radius),
            "stroke-opacity": 0.7
          });
      });
    }

    /**
      Call this wherever a d3 selection is being used to add circles for tlanets
    */

    function tlanetEnter() {
      tlanet.enter().append("circle")
          .attr({
            "r":  function(d) {
              return modelSize2px(d.radius); },
            "cx": function(d) {
              return model2px(d.x); },
            "cy": function(d) {
              return model2pxInv(d.y); }
          })
          .style({
            "fill-opacity": function(d) { return d.visible; },
            "fill": function (d, i) { return gradientNameForPlanet[i]; }
          })
          .on("mousedown", tlanetMouseDown)
          .on("mouseover", tlanetMouseOver)
          .on("mouseout", tlanetMouseOut);
    }

    function tlanetUpdate() {
      tlanet.attr({
        "r":  function(d) {
          return modelSize2px(d.radius); },
        "cx": function(d) {
          return model2px(d.x); },
        "cy": function(d) {
          return model2pxInv(d.y); }
      });

      if (tlanetTooltipOn === 0 || tlanetTooltipOn > 0) {
        renderPlanetTooltip(tlanetTooltipOn);
      }
    }

    function tlanetMouseOver(d, i) {
      if (model.get("enablePlanetTooltips")) {
        renderPlanetTooltip(i);
      }
    }

    function tlanetMouseDown(d, i) {
      containers.node.focus();
      if (model.get("enablePlanetTooltips")) {
        if (tlanetTooltipOn !== false) {
          tlanetDiv.style("opacity", 1e-6);
          tlanetDiv.style("display", "none");
          tlanetTooltipOn = false;
        } else {
          if (d3.event.shiftKey) {
            tlanetTooltipOn = i;
          } else {
            tlanetTooltipOn = false;
          }
          renderPlanetTooltip(i);
        }
      }
    }

    function renderPlanetTooltip(i) {
      tlanetDiv
            .style("opacity", 1.0)
            .style("display", "inline")
            .style("background", "rgba(100%, 100%, 100%, 0.7)")
            .style("left", model2px(modelResults[i].x) + 60 + "px")
            .style("top",  model2pxInv(modelResults[i].y) + 30 + "px")
            .style("zIndex", 100)
            .transition().duration(250);

      tlanetDivPre.text(
          "tlanet: " + i + "\n" +
          "time: " + modelTimeLabel() + "\n" +
          "speed: " + d3.format("+6.3e")(modelResults[i].speed) + "\n" +
          "vx:    " + d3.format("+6.3e")(modelResults[i].vx)    + "\n" +
          "vy:    " + d3.format("+6.3e")(modelResults[i].vy)    + "\n" +
          "ax:    " + d3.format("+6.3e")(modelResults[i].ax)    + "\n" +
          "ay:    " + d3.format("+6.3e")(modelResults[i].ay)    + "\n"
        );
    }

    function tlanetMouseOut() {
      if (!tlanetTooltipOn && tlanetTooltipOn !== 0) {
        tlanetDiv.style("opacity", 1e-6).style("zIndex" -1);
      }
    }

    function setupTooTips() {
      if ( tlanetDiv === undefined) {
        tlanetDiv = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 1e-6);
        tlanetDivPre = tlanetDiv.append("pre");
      }
    }

    function setupClock() {
      var clockColor = d3.lab(model.get("backgroundColor"));
      // This ensures that color will be visible on background.
      // Decide between white and black usingL value of background color in LAB space.
      clockColor.l = clockColor.l > 50 ? 0 : 100;
      clockColor.a = clockColor.b = 0;
      // Add model time display.
      mainContainer.selectAll('.modelTimeLabel').remove();
      // Update clock status.
      showClock = model.get("showClock");
      if (showClock) {
        timeLabel = mainContainer.append("text")
          .attr("class", "modelTimeLabel")
          .text(modelTimeLabel())
          // Set text position to (0nm, 0nm) (model domain) and add small, constant offset in px.
          .attr("x", model2px(modelMinX) + 3)
          .attr("y", model2pxInv(modelMinY) - 3)
          .attr("text-anchor", "start")
          .attr("fill", clockColor.rgb());
      }
    }

    //
    // *** Main Renderer functions ***
    //

    //
    // SolarSystem Renderer: init
    //
    // Called when Renderer is created.
    //
    function init() {
      // Assign shortcuts, as these variables / functions shouldn't
      // change.
      mainContainer        = modelView.containers.mainContainer,
      imageContainerBelow  = modelView.containers.imageContainerBelow,
      imageContainerTop    = modelView.containers.imageContainerTop,
      textContainerBelow   = modelView.containers.textContainerBelow,
      textContainerTop     = modelView.containers.textContainerTop,

      model2px = modelView.model2px;
      model2pxInv = modelView.model2pxInv;
      modelSize2px = modelView.modelSize2px;

      fontSizeInPixels = modelView.getFontSizeInPixels();
      textBoxFontSizeInPixels = fontSizeInPixels * 0.9;

      modelResults  = model.get_results();
      modelWidth    = model.get('width');
      modelHeight   = model.get('height');
      aspectRatio   = modelWidth / modelHeight;

      modelMinX = model.get('minX');
      modelMinY = model.get('minY');
      modelMaxX = model.get('maxX');
      modelMaxY = model.get('maxY');

      setupTooTips();

      function redrawClickableObjects (redrawOperation) {
        return function () {
          redrawOperation();
          // All objects where repainted (probably removed and added again), so
          // it's necessary to apply click handlers again.
          modelView.updateClickHandlers();
        };
      }

      // Redraw container each time when some visual-related property is changed.
      model.on('addPlanet', redrawClickableObjects(repaint));
      model.on('removePlanet', redrawClickableObjects(repaint));
    }

    //
    // SolarSystem Renderer: reset
    //
    // Call when model is reset or reloaded.
    //
    function reset(newModel) {
      model = newModel;
      init();
    }

    //
    // SolarSystem Renderer: repaint
    //
    // Call when container being rendered into changes size, in that case
    // pass in new D3 scales for model2px transformations.
    //
    // Also call when the number of objects changes such that the container
    // must be setup again.
    //
    function repaint(m2px, m2pxInv, mSize2px) {
      if (arguments.length) {
        model2px = m2px;
        model2pxInv = m2pxInv;
        modelSize2px = mSize2px;
      }
      fontSizeInPixels = modelView.getFontSizeInPixels();
      textBoxFontSizeInPixels = fontSizeInPixels * 0.9;

      setupDynamicGradients();
      setupClock();
      setupColorsOfPlanets();
      setupPlanets();
    }

    //
    // SolarSystem Renderer: update
    //
    // Call to update visualization when model result state changes.
    // Normally called on every model tick.
    //
    function update() {
      console.time('view update');

      // update model time display
      if (showClock) {
        timeLabel.text(modelTimeLabel());
      }

      tlanetUpdate();

      console.timeEnd('view update');
    }


    //
    // Public API to instantiated Renderer
    //
    api = {
      // Expose private methods.
      update: update,
      repaint: repaint,
      reset: reset,
      model2px: modelView.model2px,
      model2pxInv: modelView.model2pxInv,
      modelSize2px: modelView.modelSize2px
    };

    // Initialization.
    init();

    return api;
  };
});