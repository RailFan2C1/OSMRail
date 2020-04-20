/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var tileZoom = 19;
var presetsFile = "presets.json";
var centerPos;
var routeId, showTrees, showBuildings, startRevert
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
  let params = (new URL(document.location)).searchParams;
  routeId = parseInt(params.get("routeId")); 
  startRevert = params.get("startRevert"); 
  showTrees = params.get("showTrees"); 
  showBuildings = params.get("showBuildings"); 
  //alert(routeId+"r"+startRevert+"t"+showTrees+"b"+showBuildings);
   
  centerPos = { latitude: 0,
                longitude: 0 };
  centerPos.latitude = 48.7643004;
  centerPos.longitude = 9.1686351;

  loadScene();

  // Keyboard press
  document.querySelector("body").addEventListener("keydown", event => {
    if (event.key == "c") { toggleCamera(event); }
  });

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
  if (showTrees=="on") { loadTrees() };
  if (showBuildings=="on") { loadBuildings() };
  loadRailways();
  loadRoutes();
  //var loadNxt=document.getElementById('routeId').value;
  //if (document.querySelector("#showTrees").checked==true) { loadTrees(loadNxt) };
  //if (document.querySelector("#showBuildings").checked==true) { loadBuildings(loadNxt) };
  //loadRailways(loadNxt);

  var mover = document.querySelector("#mover");
  //mover.setAttribute('alongpath', { curve: '#path1' });
  mover.setAttribute('alongpath', { curve: '#path1' , loop:false, dur:30000, triggerRadius:0.1, rotate:false});
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
    var unloadRrv = "";var remoR="";var remoB="";var remoT="";
    loadRailways(loadNxt);
    if (showTrees=="on") { loadTrees(loadNxt) };
    if (showBuildings=="on") { loadBuildings(loadNxt) };

    mover.addEventListener("movingended", function(){
      //move train to next track
      ntr = fnextTrack();
      AFRAME.utils.entity.setComponentProperty(this, "alongpath.curve", ntr.ntNum);
      AFRAME.utils.entity.setComponentProperty(this, "alongpath.dur", ntr.dur);
      AFRAME.utils.entity.setComponentProperty(this, "alongpath.delay", "0");
      AFRAME.utils.entity.setComponentProperty(this, "alongpath.loop", "true");
      AFRAME.utils.entity.setComponentProperty(this, "alongpath.rotate", "true");
      //load next elements
      if (ntr.nt<rcount-1){
        loadNxt = nextTrack[ntr.nt+1].substring(5, 30);
        loadRailways(loadNxt);
        if (showTrees=="on") { loadTrees(loadNxt) };
        if (showBuildings=="on") { loadBuildings(loadNxt) };	
      }
      //unload previous elements
      if (ntr.nt>1){
        unloadRrv = nextTrack[ntr.nt-2].substring(5, 30);
        remoR = document.querySelector("#railway"+unloadRrv);
        remoR.parentNode.removeChild(remoR);
        remoB = document.querySelector("#building"+unloadRrv);
        remoB.parentNode.removeChild(remoB);
        remoT = document.querySelector("#tree"+unloadRrv);
        remoT.parentNode.removeChild(remoT);
      }
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
      {}//alert('end of route, please reload!');} //nt=0;}
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
    //fetch(overpassURL + "?data=" + encodeURIComponent(opQuery))
    fetch(overpassURL, {
      method: 'POST',
      body: opQuery
    })
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
