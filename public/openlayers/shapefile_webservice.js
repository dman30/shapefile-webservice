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
    var osm = new OpenLayers.Layer.OSM({sphericalMercator: true});

    var shpLayer = new OpenLayers.Layer.Vector({projection: new OpenLayers.Projection('EPSG:4326')});
    map.addLayers([osm, shpLayer]);
    map.setCenter(new OpenLayers.LonLat(10.546875,50.625),3);

    // Interaction; not needed for initial display.
    selectControl = new OpenLayers.Control.SelectFeature(shpLayer);
    map.addControl(selectControl);
    selectControl.activate();
    shpLayer.events.on({
        'featureselected': this.onFeatureSelect,
        'featureunselected': this.onFeatureUnselect
    });

    // load the shapefile
    var theUrl = 'openlayers/plz/post_pl';
    getOpenLayersFeatures(theUrl, function (fs) {
	// reproject features
	// this is ordinarily done by the format object, but since we're adding features manually we have to do it.
	var fsLen = fs.length;
	var inProj = new OpenLayers.Projection('EPSG:4326');
	var outProj = new OpenLayers.Projection('EPSG:3857');
	for (var i = 0; i < fsLen; i++) {
	    fs[i].geometry = fs[i].geometry.transform(inProj, outProj);
	}
	shpLayer.addFeatures(fs);
    });
},

// Needed only for interaction, not for the display.
onPopupClose: function(evt) {
    // 'this' is the popup.
    var feature = this.feature;
    if (feature.layer) { // The feature is not destroyed
	selectControl.unselect(feature);
    } else { // After "moveend" or "refresh" events on POIs layer all
	//     features have been destroyed by the Strategy.BBOX
	this.destroy();
    }
},

onFeatureSelect: function(evt) {
    feature = evt.feature;
    var table = '<table>';
    for (var attr in feature.attributes.values) {
	table += '<tr><td>' + attr + '</td><td>' + feature.attributes.values[attr] + '</td></tr>';
    }
    table += '</table>';
    popup = new OpenLayers.Popup.FramedCloud("featurePopup",
					     feature.geometry.getBounds().getCenterLonLat(),
					     new OpenLayers.Size(100,100), table, null, true);//, this.onPopupClose);
    feature.popup = popup;
    popup.feature = feature;
    map.addPopup(popup, true);
},
onFeatureUnSelect: function(evt) {
    feature = evt.feature;
    if (feature.popup) {
	popup.feature = null;
	map.removePopup(feature.popup);
	feature.popup.destroy();
	feature.popup = null;
    }
}};

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
                  persist: true,
                  handlerOptions: {
                      layerOptions: {
                          renderers: renderer,
                          styleMap: styleMap
                      }
                  }
              }
          ),
          polygon: new OpenLayers.Control.Measure(
              OpenLayers.Handler.Polygon, {
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

      // map.setCenter(new OpenLayers.LonLat(0, 0), 3);

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
