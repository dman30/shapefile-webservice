// all the interaction stuff is copied almost verbatim from
// http://www.openlayers.org/dev/examples/dynamic-text-layer.html

window.onload = function(){
  shapeFile.init();
  polygonControl.init();
  measureControl.init();
};

var map;

var shapeFile = {
  init: function () {
    map = new OpenLayers.Map('map', {sphericalMercator: true});

    var shpLayer = new OpenLayers.Layer.Vector('vector',{
      isBaseLayer: true
    });
    map.addLayers([shpLayer]);
    var proj = new OpenLayers.Projection('EPSG:4326');
    var point = new OpenLayers.LonLat(10.546875,51.200);
    point.transform(proj, map.getProjectionObject());
    map.setCenter(point,7);

    // Interaction; not needed for initial display.
    selectControl = new OpenLayers.Control.SelectFeature(shpLayer, {multiple: true});
    map.addControl(selectControl);
    selectControl.activate();
    shpLayer.events.on({
        'featureselected': this.onFeatureSelect,
    });

    // load the shapefile
    var theUrl = 'openlayers/plz/post_pl';
    getOpenLayersFeatures(theUrl, function (fs) {
      // reproject features
      // this is ordinarily done by the format object, but since we're adding features manually we have to do it.
      var fsLen = fs.length;
      var inProj = new OpenLayers.Projection('EPSG:4326');
      var outProj = new OpenLayers.Projection('EPSG:3857');
      // only needed if shapefile needs to be rendered over a Layer with
      // spherical mercator
      // for (var i = 0; i < 1000; i++) {
      //     fs[i].geometry = fs[i].geometry.transform(inProj, outProj);
      // }
      shpLayer.addFeatures(fs);
      $('all-spinner').style.visibility ='hidden';
    });
  },

  onFeatureSelect: function(evt) {
      feature = evt.feature;
      var plzout = '';
      plzout += '<li>' + feature.attributes.values['PLZ99'] + '  ' + feature.attributes.values['PLZORT99'] + '</li>';
      document.getElementById('plz').innerHTML += plzout;
  },
};

// polygoncontrol
var polygonControl = {

  init: function(){

    var wmsLayer = new OpenLayers.Layer.WMS( "OpenLayers WMS",
        "http://vmap0.tiles.osgeo.org/wms/vmap0?", {layers: 'basic'});

    var polygonLayer = new OpenLayers.Layer.Vector("Polygon Layer");

    map.addLayers([wmsLayer, polygonLayer]);
    map.addControl(new OpenLayers.Control.LayerSwitcher());
    map.addControl(new OpenLayers.Control.MousePosition());

    polyOptions = {sides: 40};
    polygonControl = new OpenLayers.Control.DrawFeature(polygonLayer,
                                    OpenLayers.Handler.RegularPolygon,
                                    {handlerOptions: polyOptions});

    map.addControl(polygonControl);
  },

  setOptions: function(options) {
      polygonControl.handler.setOptions(options);
  }
};

var measureControl = {

  init: function(){

      var wmsLayer = new OpenLayers.Layer.WMS( "OpenLayers WMS",
          "http://vmap0.tiles.osgeo.org/wms/vmap0?", {layers: 'basic'});

      map.addLayers([wmsLayer]);
      map.addControl(new OpenLayers.Control.LayerSwitcher());
      map.addControl(new OpenLayers.Control.MousePosition());

      // style the sketch fancy
      var sketchSymbolizers = {
          "Point": {
              pointRadius: 4,
              graphicName: "square",
              fillColor: "white",
              fillOpacity: 1,
              strokeWidth: 1,
              strokeOpacity: 1,
              strokeColor: "#333333"
          },
          "Line": {
              strokeWidth: 3,
              strokeOpacity: 1,
              strokeColor: "#666666",
              strokeDashstyle: "dash"
          },
          "Polygon": {
              strokeWidth: 2,
              strokeOpacity: 1,
              strokeColor: "#666666",
              fillColor: "white",
              fillOpacity: 0.3
          }
      };
      var style = new OpenLayers.Style();
      style.addRules([
          new OpenLayers.Rule({symbolizer: sketchSymbolizers})
      ]);
      var styleMap = new OpenLayers.StyleMap({"default": style});

      // allow testing of specific renderers via "?renderer=Canvas", etc
      var renderer = OpenLayers.Util.getParameters(window.location.href).renderer;
      renderer = (renderer) ? [renderer] : OpenLayers.Layer.Vector.prototype.renderers;

      measureControls = {
          line: new OpenLayers.Control.Measure(
              OpenLayers.Handler.Path, {
                  geodesic: true,
                  persist: true,
                  handlerOptions: {
                      layerOptions: {
                          renderers: renderer,
                          styleMap: styleMap
                      }
                  }
              }
          )
      };

      var control;
      for(var key in measureControls) {
          control = measureControls[key];
          control.events.on({
              "measure": this.handleMeasurements,
              "measurepartial": this.handleMeasurements
          });
          map.addControl(control);
      }

      document.getElementById('noneToggle').checked = true;
  },

  handleMeasurements: function(event) {
      var geometry = event.geometry;
      var units = event.units;
      var order = event.order;
      var measure = event.measure;
      var element = document.getElementById('output');
      var out = "";
      if(order == 1) {
          out += "measure: " + measure.toFixed(3) + " " + units;
      } else {
          out += "measure: " + measure.toFixed(3) + " " + units + "<sup>2</" + "sup>";
      }
      element.innerHTML = out;
  },

  toggleControl: function(element) {
      for(key in measureControls) {
          var control = measureControls[key];
          if(element.value == key && element.checked) {
              control.activate();
          } else {
              control.deactivate();
          }
      }
  },

  toggleGeodesic: function(element) {
      for(key in measureControls) {
          var control = measureControls[key];
          control.geodesic = element.checked;
      }
  },

  toggleImmediate: function(element) {
      for(key in measureControls) {
          var control = measureControls[key];
          control.setImmediate(element.checked);
      }
  }
}
