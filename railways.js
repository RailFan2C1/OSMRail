/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var metersPerLevel = 3;
var roofOnlyTypes = ["roof", "carport", "grandstand"];
var ignoredTypes = ["entrance", "collapsed", "destroyed", "proposed", "no"];
var singleLevelTypes = ["grandstand", "houseboat", "bungalow", "static_caravan",
  "kiosk", "cabin", "chapel", "shrine", "bakehouse", "bridge", "bunker",
  "carport", "cowshed", "garage", "garages", "gabage_shed", "hut", "roof",
  "shed", "stable", "sty", "service", "shelter"];
var specialDefaults = {
  construction: {"railway:colour": "#202020"},
  house: {"railway:levels": 2},
  farm: {"railway:levels": 2},
  detached: {"railway:levels": 2},
  terrace: {"railway:levels": 2},
  transformer_tower: {"height": 10},
  water_tower: {"height": 20},
};
var itema;

function loadRailways(loadNext) {
  // we could think about including shelter=yes and maybe some amenity= types.
  //var rId=document.getElementById('routeId').value;
  var opQuery = "way("+loadNext+")->.bahn;(" +
	  			"way[railway](around.bahn:50););" +
                "out body;>;out skel qt;";
  /*
  var opQuery = "(way[railway]" + "(" + getBoundingBoxString() + ");" +
  				"node[railway]" + "(" + getBoundingBoxString() + ");" +
                "rel[railway]" + "(" + getBoundingBoxString() + "););" +
                "out body;>;out skel qt;";
  */
  return fetchFromOverpass(opQuery)
    .then((itemJSON) => {
      itema = document.createElement("a-entity");
      itema.setAttribute("id", "railway"+loadNext);
      var count = 0;
      for (feature of itemJSON.features) {
        if (feature.geometry.type == "Polygon") {
          addRailwayPolygon(feature);
          count++;
        }
        else if (feature.geometry.type == "Point") {
          addRailwayPoint(feature);
          count++;
        }
        else if (feature.geometry.type == "LineString") {
		  addRailwayLine(feature);
		  count++;
        }
        else {
          console.log("Couldn't draw railway with geometry type " +
                      feature.geometry.type + " (" + feature.id + ")");
        }
      }
      console.log("Loaded " + count + " railways.");
      items.appendChild(itema);
    })
    .catch((reason) => { console.log(reason); });
}

function addRailwayPolygon(jsonFeature) {
  return new Promise((resolve, reject) => {
    var itemPos = tileposFromLatlon(latlonFromJSON(jsonFeature.geometry.coordinates[0][0]));
    //console.log("poly: "+itemPos.x);
    var tags = jsonFeature.properties.tags ? jsonFeature.properties.tags : jsonFeature.properties;
    var btype = tags.railway;
    if (tags.shelter == "yes") { btype = "shelter"; }
    if (ignoredTypes.includes(btype)) { resolve(); return; }

    var height = tags.height ? tags.height : null;
    if (!height) {
      height = 1;
    }
    /*
    if (!height && tags["railway:levels"]) {
      height = tags["railway:levels"] * metersPerLevel;
    }
    else if (!height && btype in specialDefaults && specialDefaults[btype].height) {
      height = specialDefaults[btype].height;
    }
    else if (!height && btype in specialDefaults && specialDefaults[btype]["railway:levels"]) {
      height = specialDefaults[btype]["railway:levels"] * metersPerLevel;
    }
    else if (!height && singleLevelTypes.includes(btype)) {
      height = metersPerLevel; // assume one level only
    }
	*/
    var minHeight = tags.min_height ? tags.min_height : null;
    if (!minHeight && tags["railway:min_level"]) {
      minHeight = tags["railway:min_level"] * metersPerLevel;
    }
    else if (!minHeight && btype in specialDefaults && specialDefaults[btype]["railway:min_level"]) {
      minHeight = specialDefaults[btype]["railway:min_level"] * metersPerLevel;
    }
    else if (!minHeight && roofOnlyTypes.includes(btype)) {
      if (!height) { height = metersPerLevel; /* assume one level only */ }
      minHeight = height - 0.3;
    }

    var color = "#808080";
    if (tags["railway:colour"]) {
      color = tags["railway:colour"];
    }
    else if (btype in specialDefaults && specialDefaults[btype]["railway:colour"]) {
      color = specialDefaults[btype]["railway:colour"];
    }

    var item = document.createElement("a-entity");
    item.setAttribute("class", "railway");
    var outerPoints = [];
    var innerWays = [];
    for (let way of jsonFeature.geometry.coordinates) {
      let wayPoints = [];
      for (let point of way) {
        let tpos = tileposFromLatlon(latlonFromJSON(point));
        let ppos = getRelativePositionFromTilepos(tpos, itemPos);
        wayPoints.push("" + ppos.x + " " + ppos.z);
      }
      if (!outerPoints.length) {
        outerPoints = wayPoints;
      }
      else {
        innerWays.push(wayPoints);
      }
    }
    // Note that for now only one inner way (hole) is supported.
    item.setAttribute("geometry", "primitive: railway; outerPoints: " + outerPoints.join(", ") + "; " +
                                  (innerWays.length ? "innerPaths: " + innerWays.map(x => x.join(", ")).join(" / ") + "; " : "") +
                                  (height ? "height: " + height + "; " : "") +
                                  (minHeight ? "minHeight: " + minHeight + "; " : ""));
    item.setAttribute("material", "color: " + color + ";");
    item.setAttribute("position", getPositionStringFromTilepos(itemPos));
    item.setAttribute("data-gpspos", jsonFeature.geometry.coordinates[0][0][1] + "/" + jsonFeature.geometry.coordinates[0][0][0]);
    itema.appendChild(item);
    resolve();
    // reject("whatever the error");
  });
}

AFRAME.registerGeometry('railway', {
  schema: {
    outerPoints: { type: 'array', default: ['0 0', '1 0', '1 1', '0 1'], },
    innerPaths: {
      parse: function (value) {
        return value.length ? value.split('/').map(part => part.split(",").map(val => val.trim())) : [];
      },
      default: [],
    },
    height: { type: 'number', default: 0 },
    minHeight: { type: 'number', default: 0 },
  },

  init: function (data) {
    var opoints = data.outerPoints.map(function (point) {
        var coords = point.split(' ').map(x => parseFloat(x));
        return new THREE.Vector2(coords[0], coords[1]);
    });
    var ipaths = data.innerPaths.map(way => way.map(function (point) {
        var coords = point.split(' ').map(x => parseFloat(x));
        return new THREE.Vector2(coords[0], coords[1]);
    }));
    var shape = new THREE.Shape(opoints);
    var outerLength = shape.getLength();
    if (ipaths.length) {
      for (ipoints of ipaths) {
        var holePath = new THREE.Path(ipoints);
        shape.holes.push(holePath);
      }
    }
    // Extrude from a 2D shape into a 3D object with a height.
    var height = data.height - data.minHeight;
    if (!height) {
      height = Math.min(10, outerLength / 5);
    }
    var geometry = new THREE.ExtrudeGeometry(shape, {amount: height, bevelEnabled: false});
    // As Y is the coordinate going up, let's rotate by 90° to point Z up.
    geometry.rotateX(-Math.PI / 2);
    // Rotate around Y and Z as well to make it show up correctly.
    geometry.rotateY(Math.PI);
    geometry.rotateZ(Math.PI);
    // Now we would point under ground, move up the height, and any above-ground space as well.
    geometry.translate (0, height + data.minHeight, 0);
    geometry.center;
    this.geometry = geometry;
  }
});

function addRailwayPoint(jsonFeature) {
  return new Promise((resolve, reject) => {
    var itemPos = tileposFromLatlon(latlonFromJSON(jsonFeature.geometry.coordinates));
    var tags = jsonFeature.properties.tags ? jsonFeature.properties.tags : jsonFeature.properties;
    var item = document.createElement("a-entity");
    item.setAttribute("class", "tree");
    item.setAttribute("data-reltilex", Math.floor(itemPos.x));
    item.setAttribute("data-reltiley", Math.floor(itemPos.y));
    var trunk = document.createElement("a-entity");
    trunk.setAttribute("class", "trunk");
    var crown = document.createElement("a-entity");
    crown.setAttribute("class", "crown");
    var height = tags.height ? tags.height : 5;
    var trunkRadius = (tags.circumference ? tags.circumference : 1) / 2 / Math.PI;
    var crownRadius = (tags.diameter_crown ? tags.diameter_crown : 1.1) / 2;
    // leaf_type is broadleaved, needleleaved, mixed or rarely something else.
    if (tags["leaf_type"] == "needleleaved") { // special shape for needle-leaved trees
      var trunkHeight = height * 0.5;
      var crownHeight = height * 0.8;
      trunk.setAttribute("geometry", "primitive: cylinder; height: " + trunkHeight + "; radius: " + trunkRadius + ";");
      trunk.setAttribute("material", "color: #b27f36;");
      trunk.setAttribute("position", "0 " + (trunkHeight / 2) + " 0");
      crown.setAttribute("geometry", "primitive: cone; height: " + crownHeight + "; radiusBottom: " + crownRadius + "; radiusTop: 0;");
      crown.setAttribute("material", "color: #80ff80;");
      crown.setAttribute("position", "0 " + (height - crownHeight / 2) + " 0");
    }
    else { // use a simple typical broadleaved-type shape
      var trunkHeight = height - crownRadius;
      trunk.setAttribute("geometry", "primitive: cylinder; height: " + trunkHeight + "; radius: " + trunkRadius + ";");
      trunk.setAttribute("material", "color: #b27f36;");
      trunk.setAttribute("position", "0 " + (trunkHeight / 2) + " 0");
      crown.setAttribute("geometry", "primitive: sphere; radius: " + crownRadius + ";");
      crown.setAttribute("material", "color: #ff8080;");
      crown.setAttribute("position", "0 " + trunkHeight + " 0");
    }
    item.setAttribute("position", getPositionStringFromTilepos(itemPos));
    item.setAttribute("data-gpspos", jsonFeature.geometry.coordinates[1] + "/" + jsonFeature.geometry.coordinates[0]);
    item.appendChild(trunk);
    item.appendChild(crown);
    itema.appendChild(item);
    resolve();
    // reject("whatever the error");
  });
}

function addRailwayLine(jsonFeature) {
  return new Promise((resolve, reject) => {
    var itemPos = tileposFromLatlon(latlonFromJSON(jsonFeature.geometry.coordinates[0]));
    //console.log("line: "+itemPos.x);
    var tags = jsonFeature.properties.tags ? jsonFeature.properties.tags : jsonFeature.properties;
    var btype = tags.railway;
    if (tags.shelter == "yes") { btype = "shelter"; }
    if (ignoredTypes.includes(btype)) { resolve(); return; }

    var id = jsonFeature.id ? jsonFeature.id : 'track1';
    //console.log("id "+id);

    var height = tags.height ? tags.height : null;
    if (!height) {
      height = 1;
    }

    var minHeight = tags.min_height ? tags.min_height : null;
    if (!minHeight) {
      minHeight = 0;
    }

    var color = "#ff0000";
    if (tags["bridge"]) {
	  color = "#00ff00";
    }
    if (tags["tunnel"]) {
	  color = "#0000ff";
    }

	var item = document.createElement("a-entity");
    var curve = document.createElement("a-curve");
    curve.setAttribute("id", id);

    for (let point of jsonFeature.geometry.coordinates) {
      let tpos = tileposFromLatlon(latlonFromJSON(point));
      let ppos = getRelativePositionFromTilepos(tpos, itemPos);
      var CP = document.createElement('a-curve-point');
      //CP.setAttribute('geometry', {primitive: 'box', height: 0.5, width: 0.5, depth: 0.5,});
      //CP.setAttribute('material', 'color', 'green');
      CP.setAttribute('position', {x: ppos.x, y: 0.1, z: ppos.z});
      curve.appendChild(CP);
    }
	item.appendChild(curve);

	var entityE3 = document.createElement('a-draw-curve');
	entityE3.setAttribute('curveref','#'+id);
	entityE3.setAttribute('material', 'shader', 'line');
	entityE3.setAttribute('material', 'color', color);
    item.appendChild(entityE3);

	if (document.querySelector("#showTies").checked==true)
	{
      var entityE4 = document.createElement('a-entity');
	  entityE4.setAttribute('clone-along-curve', {curve: '#'+id, spacing: 0.5, rotation:{x:0, y:0, z:0},});
	  entityE4.setAttribute('geometry', {primitive: 'box', height:0.2, width:2.6, depth:0.3,});
	  entityE4.setAttribute('material', 'color', 'brown');
      item.appendChild(entityE4);
	}

    // Note that for now only one inner way (hole) is supported.
    //item.setAttribute("geometry", "primitive: sphere; radius: 1;");
    //item.setAttribute("material", "color: " + color + ";");
    item.setAttribute("position", getPositionStringFromTilepos(itemPos));
    item.setAttribute("data-gpspos", jsonFeature.geometry.coordinates[0][1] + "/" + jsonFeature.geometry.coordinates[0][0]);
    itema.appendChild(item);
    resolve();
    // reject("whatever the error");
  });
}
