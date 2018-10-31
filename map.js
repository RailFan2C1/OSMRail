/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var tileZoom = 19;
var presetsFile = "presets.json";
var centerPos;
var map, tiles, items;
var baseTileID, baseTileSize, centerOffset;
var tilesFromCenter = 1;
var rcount = 0;
var cam = 0;
var nextTrack = new Array;
var nextTrackR = new Array;
var nextTrackLen = new Array;
var nt = 0;
var helper = new Array;
var speed = 80;
var xmin=100000, xmax=-100000, zmin=100000, zmax=-100000, ymax=100;

// Mapnik is the default world-wide OpenStreetMap style.
var tileServer = "https://tilecache.kairo.at/mapnik/";
// Basemap offers hires tiles for Austria.
//var tileServer = "https://tilecache.kairo.at/basemaphires/";
// Standard Overpass API Server
//var overpassURL = "https://overpass-api.de/api/interpreter";
var overpassURL = "https://lz4.overpass-api.de/api/interpreter";

window.onload = function() {
  // Close intro dialog on clicking its button.
  document.querySelector("#introDialogCloseButton").onclick = event => {
    event.target.parentElement.parentElement.classList.add("hidden");
  };
  /* Close intro dialog when entering VR mode.
  document.querySelector('a-scene').addEventListener('enter-vr', event => {
    document.querySelector("#introDialogCloseButton").click();
  });*/

  // Load location presets and subdialog.
  fetch(presetsFile)
  .then((response) => {
    if (response.ok) {
      return response.json();
    }
    else {
      throw "HTTP Error " + response.status;
    }
  })
  .then((locationPresets) => {
    let presetSel = document.querySelector("#locationPresets");
    let menu = document.querySelector("#menu");
    let locLatInput = document.querySelector("#locLatitude");
    let locLonInput = document.querySelector("#locLongitude");
    let routeInput = document.querySelector("#routeId");
    presetSel.onchange = function(event) {
      if (event.target.selectedIndex >= 0 && event.target.value >= 0) {
        let preset = locationPresets[event.target.value];
        locLatInput.value = preset.latitude;
        locLonInput.value = preset.longitude;
        routeInput.value = preset.routeId;
      }
      else {
        locLatInput.value = "";
        locLonInput.value = "";
        routeInput.value = "";
        if (event.target.value == -2) {
          navigator.geolocation.getCurrentPosition(pos => {
            locLatInput.value = pos.coords.latitude;
            locLonInput.value = pos.coords.longitude;
          });
        }
      }
    };
    let mItemHeight = 0.1;
    let normalBgColor = "#404040";
    let normalTextColor = "#CCCCCC";
    let hoverBgColor = "#606060";
    let hoverTextColor = "yellow";
    let menuHeight = mItemHeight * locationPresets.length;
    menu.setAttribute("height", menuHeight);
    menu.setAttribute("position", {x: 0, y: 1.6 - menuHeight / 6, z: -1});
    for (let i = -2; i < locationPresets.length; i++) {
      var opt = document.createElement("option");
      opt.value = i;
      if (i == -2) { opt.text = "Get Your Location"; }
      else if (i == -1) { opt.text = "Set Custom Location"; }
      else { opt.text = locationPresets[i].title; }
      presetSel.add(opt, null);
      if (i >= 0) {
        // menu entity
        var menuitem = document.createElement("a-box");
        menuitem.setAttribute("position", {x: 0, y: menuHeight / 2 - (i + 0.5) * mItemHeight, z: 0});
        menuitem.setAttribute("height", mItemHeight);
        menuitem.setAttribute("depth", 0.001);
        menuitem.setAttribute("text", {value: opt.text, color: normalTextColor, xOffset: 0.03});
        menuitem.setAttribute("color", normalBgColor);
        menuitem.setAttribute("data-index", i);
        menuitem.addEventListener("mouseenter", event => {
          event.target.setAttribute("text", {color: hoverTextColor});
          event.target.setAttribute("color", hoverBgColor);
        });
        menuitem.addEventListener("mouseleave", event => {
          event.target.setAttribute("text", {color: normalTextColor});
          event.target.setAttribute("color", normalBgColor);
        });
        menuitem.addEventListener("click", event => {
          let preset = locationPresets[event.target.dataset.index];
          centerPos.latitude = preset.latitude;
          centerPos.longitude = preset.longitude;
          loadScene();
        });
        menu.appendChild(menuitem);
      }
    }
    centerPos = { latitude: locationPresets[0].latitude,
                  longitude: locationPresets[0].longitude };
    presetSel.value = 0;
    locLatInput.value = centerPos.latitude;
    locLonInput.value = centerPos.longitude;
    routeInput.value = locationPresets[0].routeId;//"935322"
    document.querySelector("#locationLoadButton").onclick = event => {
      centerPos.latitude = locLatInput.valueAsNumber;
      centerPos.longitude = locLonInput.valueAsNumber;
      loadScene();
    };
    // Load objects into scene.
    //loadScene();
  })
  .catch((reason) => { console.log(reason); });

  // Hook up menu button iside the VR.
  let leftHand = document.querySelector("#left-hand");
  let rightHand = document.querySelector("#right-hand");
  // Vive controllers, Windows Motion controllers
  leftHand.addEventListener("menudown", toggleMenu, false);
  rightHand.addEventListener("menudown", toggleMenu, false);
  // Oculus controllers (guessing on the button)
  leftHand.addEventListener("surfacedown", toggleMenu, false);
  rightHand.addEventListener("surfacedown", toggleMenu, false);
  // Daydream and GearVR controllers - we need to filter as Vive and Windows Motion have the same event.
  var toggleMenuOnStandalone = function(event) {
    if (event.target.components["daydream-controls"].controllerPresent ||
        event.target.components["gearvr-controls"].controllerPresent) {
      toggleMenu(event);
    }
  }
  leftHand.addEventListener("trackpaddown", toggleMenuOnStandalone, false);
  rightHand.addEventListener("trackpaddown", toggleMenuOnStandalone, false);
  // Keyboard press
  document.querySelector("body").addEventListener("keydown", event => {
    if (event.key == "m") { toggleMenu(event); }
    else if (event.key == "c") { toggleCamera(event); }
  });

}

function toggleMenu(event) {
  console.log("menu pressed!");
  let menu = document.querySelector("#menu");
  if (menu.getAttribute("visible") == false) {
    menu.setAttribute("visible", true);
    document.querySelector("#left-hand").setAttribute("mixin", "handcursor");
    document.querySelector("#right-hand").setAttribute("mixin", "handcursor");
  }
  else {
    menu.setAttribute("visible", false);
    document.querySelector("#left-hand").setAttribute("mixin", "teleport");
    document.querySelector("#right-hand").setAttribute("mixin", "teleport");
  }
}

function toggleCamera(event) {
  var cHead = document.querySelector("#head");
  var cDriver = document.querySelector("#driver");
  var cOver = document.querySelector("#cover");
  if (cam == 0) {
    cHead.setAttribute('camera', { active: "true" });
    cDriver.setAttribute('camera', { active: "false" });
    cOver.setAttribute('camera', { active: "false" });
    cam=1;
  }
  else if (cam == 1){
    cHead.setAttribute('camera', { active: "false" });
    cDriver.setAttribute('camera', { active: "false" });
    cOver.setAttribute('camera', { active: "true" });
    cam=2;
  }
  else {
    cHead.setAttribute('camera', { active: "false" });
    cDriver.setAttribute('camera', { active: "true" });
    cOver.setAttribute('camera', { active: "false" });
    cam=0;
  }
}

function loadScene() {
  
  // Set variables for base objects.
  map = document.querySelector("#map");
  tiles = document.querySelector("#tiles");
  items = document.querySelector("#items");

  rcount=0;baseTileID=0; baseTileSize=0;centerOffset=0;nt=0;
  while (tiles.firstChild) { tiles.removeChild(tiles.firstChild); }
  while (items.firstChild) { items.removeChild(items.firstChild); }
  document.querySelector("#cameraRig").object3D.position.set(0, 0, 0);
  loadGroundTiles();
  if (document.querySelector("#showTrees").checked==true) { loadTrees() };
  if (document.querySelector("#showBuildings").checked==true) { loadBuildings() };
  loadRailways();
  loadRoutes();
  //var loadNxt=document.getElementById('routeId').value;
  //if (document.querySelector("#showTrees").checked==true) { loadTrees(loadNxt) };
  //if (document.querySelector("#showBuildings").checked==true) { loadBuildings(loadNxt) };
  //loadRailways(loadNxt);

  var mover = document.querySelector("#mover");
  mover.setAttribute('alongpath', { curve: '#path1' });
  //trackId: track30015494 fx:48.7577244 fz:9.1700061 lx:48.7633819 lz:9.1693283  anz:55 pos:111.53951894268577 0 746.7761660840429
  setTimeout(function(){
	var cOver = document.querySelector("#over");
  	console.log("xmin: "+xmin+" xmax: "+xmax+" zmin: "+zmin+" zmax: "+zmax);
    var cx = xmax-((xmax-xmin)/2);
    var cz = zmax-((zmax-zmin)/2);
    var cy = 10000;
    if (xmax-xmin>zmax-zmin) {cy=xmax-xmin;}
    else {cy=zmax-zmin;}
    if (cy>10000) {cy=10000;}
    console.log("cx: "+cx+" cy: "+cy+" cz: "+cz);
    cOver.setAttribute('position', { x: cx, y: cy, z: cz});
    
    var loadNxt = nextTrack[0].substring(5, 30);
    loadRailways(loadNxt);
    if (document.querySelector("#showTrees").checked==true) { loadTrees(loadNxt) };
    if (document.querySelector("#showBuildings").checked==true) { loadBuildings(loadNxt) };

    mover.addEventListener("movingended", function(){
      ntr = fnextTrack();
      loadNxt = nextTrack[ntr.nt].substring(5, 30);
      loadRailways(loadNxt);
      if (document.querySelector("#showTrees").checked==true) { loadTrees(loadNxt) };
      if (document.querySelector("#showBuildings").checked==true)	    
      AFRAME.utils.entity.setComponentProperty(this, "alongpath.curve", ntr.ntNum);
      AFRAME.utils.entity.setComponentProperty(this, "alongpath.dur", ntr.dur);
      AFRAME.utils.entity.setComponentProperty(this, "alongpath.delay", "0");
      AFRAME.utils.entity.setComponentProperty(this, "alongpath.loop", "true");
    });
  }, 20000);
/**/
}


function fnextTrack() {
	var ntNum = nextTrack[nt]+""+nextTrackR[nt];
	var ntLen = nextTrackLen[nt];
	var dur = (ntLen/(speed/3.6))*1000;
    console.log("nt"+nt+" "+ntNum+" dur: "+dur);
	if(nt<rcount-1)
      {nt++;}
   	else
      {nt=0;}
    return {nt: nt,ntNum: "#"+ntNum,dur: dur};//"#"+ntNum;//
}

function getTagsForXMLFeature(xmlFeature) {
  var tags = {};
  for (tag of xmlFeature.children) {
    if (tag.nodeName == "tag") {
      tags[tag.attributes['k'].value] = tag.attributes['v'].value;
    }
  }
  return tags;
}

function getBoundingBoxString() {
  var startPos = latlonFromTileID({x: baseTileID.x - tilesFromCenter,
                                   y: baseTileID.y + tilesFromCenter + 1});
  var endPos = latlonFromTileID({x: baseTileID.x + tilesFromCenter + 1,
                                 y: baseTileID.y - tilesFromCenter});
  return startPos.latitude + "," + startPos.longitude + "," +
         endPos.latitude + "," + endPos.longitude;
}

function fetchFromOverpass(opQuery) {
  return new Promise((resolve, reject) => {
    fetch(overpassURL + "?data=" + encodeURIComponent(opQuery))
    .then((response) => {
      if (response.ok) {
        return response.text();
      }
      else {
        throw "HTTP Error " + response.status;
      }
    })
    .then((response) => {
      var parser = new DOMParser();
      var itemData = parser.parseFromString(response, "application/xml");
      var itemJSON = osmtogeojson(itemData);
      resolve(itemJSON);
    })
    .catch((reason) => { reject(reason); });
  });
}
