/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var ignoredTypes = ["entrance", "collapsed", "destroyed", "proposed", "no"];
var routeArray = new Array;

function loadRoutes() {
  /*
  var opQuery = "(rel[route=train][ref=S2][to=Filderstadt]" + "(" + getBoundingBoxString() + "););" +
                "out body;>;out meta qt;";
  */
  var rId=routeId;   //rId=34809;
  var rlat=centerPos.latitude;
  var rlon=centerPos.longitude;

  var opQuery = "(rel("+rId+"););" +
                "out body;>;out meta qt;";
  routeArray = [];

  return fetchFromOverpass(opQuery)
    .then((itemJSON) => {
      //var rcount = 0;
      for (feature of itemJSON.features) {

		if (feature.geometry.type == "LineString") {
		  addRouteLine(feature);
		  //rcount++;
        }
        else {
          console.log("Couldn't draw railway with geometry type " +
                      feature.geometry.type);
        }
      }
      console.log("Loaded " + rcount + " relevant tracks.");

	  //sort tracks
	  for(j=0;j<rcount;j++) {
		  helper[j]=0;
	  }

      for(i=0;i<rcount;i++) {
		var fu1="", fu2="";
		nextTrack[i] = "";
		nextTrackR[i] = "";
		nextTrackLen[i] = "";
  	    for(j=0;j<rcount;j++) {

		  //console.log(i+""+j);
  	  	  if(nextTrackR[i]== "" && routeArray[j].fx==rlat && routeArray[j].fz==rlon && fu1=="" && helper[j]==0) {
			nextTrack[i] = routeArray[j].trackId;
		    nextTrackR[i] = "F";
		    nextTrackLen[i] = routeArray[j].len;
		    rlat = routeArray[j].lx;
		    rlon = routeArray[j].lz;
			fu1="F";
			helper[j]=1;
		  }

		  if(nextTrackR[i]== "" && routeArray[j].lx==rlat && routeArray[j].lz==rlon && fu2=="" && helper[j]==0) {
		    nextTrack[i] = routeArray[j].trackId;
		    nextTrackR[i] = "R";
		    nextTrackLen[i] = routeArray[j].len;
		    rlat = routeArray[j].fx;
		    rlon = routeArray[j].fz;
		    fu2="R";
		    helper[j]=1;
		  }
		}
  		console.log("track"+i+": "+nextTrack[i]+nextTrackR[i]+" lat: "+rlat+" lon: "+rlon);
  	  }

    })
    .catch((reason) => { console.log(reason); });
}


function addRouteLine(jsonFeature) {
  return new Promise((resolve, reject) => {
    var itemPos = tileposFromLatlon(latlonFromJSON(jsonFeature.geometry.coordinates[0]));
    var tags = jsonFeature.properties.tags ? jsonFeature.properties.tags : jsonFeature.properties;
    var btype = tags.railway;
    //if (tags.shelter == "yes") { btype = "shelter"; }
    //if (ignoredTypes.includes(btype)) { resolve(); return; }

    var id = jsonFeature.id ? jsonFeature.id : 'track1';
    var trackId = "track"+id.substring(4, 30);
    var trackIdF = trackId+"F";
    var trackIdR = trackId+"R";
	//console.log("trackId "+trackId);

    var public_transport = tags.public_transport ? tags.public_transport : null;
    if (public_transport=="platform") {
      console.log("platform: "+tags.name);
    }
	else {
		rcount++;
		var color = "#80ff80";
    	var fi = 0;
    	var fx = 0;
    	var fz = 0;
    	var lx = 0;
    	var lz = 0;
    	var ax1 = 0,px1 =0;
    	var az1 = 0,pz1 =0;
    	var ax2 = 0;
    	var az2 = 0;
    	var len = 0;
    	var trackArray = new Array;

		var item = document.createElement("a-entity");
    	var curve = document.createElement("a-curve");
    	curve.setAttribute("id", trackIdF);
		curve.setAttribute("class", "track");

    	for (let point of jsonFeature.geometry.coordinates) {
    	  let tpos = tileposFromLatlon(latlonFromJSON(point));
    	  let ppos = getRelativePositionFromTilepos(tpos, itemPos);
    	  let apos = getPositionFromTilepos(tpos, itemPos)
    	  var CP = document.createElement('a-curve-point');
    	  //CP.setAttribute('geometry', {primitive: 'box', height: 0.5, width: 0.5, depth: 0.5,});
          //CP.setAttribute('material', 'color', 'green');

    	  //alongpath not working correct
    	  //CP.setAttribute('position', {x: ppos.x, y: 1, z: ppos.z});

    	  curve.appendChild(CP);


    	  if(fi==0)
    	  {
			 fx=point[1];
    	     fz=point[0];
			 //alongpath workaround
			 centerOffset = tileposFromLatlon(centerPos);
    	     ax1=(apos.x*0.5)-(centerOffset.x*(baseTileSize*0.5));
    	     az1=(apos.z*0.5)-(centerOffset.y*(baseTileSize*0.5));
    	     px1=ax1;
    	     pz1=az1;
		  }
		  lx=point[1];
    	  lz=point[0];
    	  px1=ax2;
    	  pz1=az2;
    	  ax2=ppos.x+ax1;
    	  az2=ppos.z+az1;

    	  if(fi==0){len=0;}
    	  else { len = len+(Math.sqrt(Math.pow((px1-ax2),2)+Math.pow((pz1-az2),2)));}

		  if(ax2<xmin) {xmin=ax2;}
		  if(ax2>xmax) {xmax=ax2;}
		  if(az2<zmin) {zmin=az2;}
		  if(az2>zmax) {zmax=az2;}
    	  //alongpath workaround
    	  CP.setAttribute('position', {x: ax2, y: 1, z: az2});
		  //console.log("trackId: "+trackId+" fx:"+fx+" fz:"+fz+" lx:"+lx+" lz:"+lz+"  anz:"+fi+" ppos.x:"+ ppos.x+" ppos.z:"+ ppos.z+" apos.x:"+ apos.x+" apos.z:"+ apos.z+" tpos.x:"+ tpos.x+" tpos.y:"+ tpos.y+" centerOffset.x:"+centerOffset.x+" centerOffset.y:"+centerOffset.y);
		  //console.log("t "+trackId+" px: "+px1+" pz: "+pz1+" ax: "+ax2+" az: "+az2+" len:"+len);
		  var cpObj = {trackIdR: trackIdR,ax1: ax1,az1: az1,px: ax2,pz: az2,fi: fi,len: len};
		  trackArray.push(cpObj);

    	  fi++;
    	}
		items.appendChild(curve);
/*
		var entityE4 = document.createElement('a-draw-curve');
		entityE4.setAttribute('curveref','#'+trackId);
		entityE4.setAttribute('material', 'shader', 'line');
		entityE4.setAttribute('material', 'color', 'green');
    	item.appendChild(entityE4);
*/
    	//alongpath not working correct
    	//item.setAttribute("position", getPositionStringFromTilepos(itemPos));
    	//item.setAttribute("geometry", "primitive: sphere; radius: 1;");
        //item.setAttribute("material", "color: " + color + ";");
    	item.setAttribute("data-gpspos", jsonFeature.geometry.coordinates[0][1] + "/" + jsonFeature.geometry.coordinates[0][0]);
    	items.appendChild(item);
    	//console.log("trackId: "+trackId+" fx:"+fx+" fz:"+fz+" lx:"+lx+" lz:"+lz+"  anz:"+fi);


    	var curveR = document.createElement("a-curve");
    	curveR.setAttribute("id", trackIdR);
		curveR.setAttribute("class", "track");
		var CPR = document.createElement('a-curve-point');
		for(i=fi-1;i>=0;i--) {
		  var f = trackArray[i];
          //console.log("trackIdR: "+f.trackIdR+" fi: "+f.fi+" ax1:"+f.ax1+" az1:"+f.az1+" px:"+f.px+" pz:"+f.pz);
    	  var CPR = document.createElement('a-curve-point');
    	  //CPR.setAttribute('geometry', {primitive: 'box', height: 0.5, width: 0.5, depth: 0.5,});
          //CPR.setAttribute('material', 'color', 'green');
		  CPR.setAttribute('position', {x: f.px, y: 1, z: f.pz});
    	  curveR.appendChild(CPR);

		};
		items.appendChild(curveR);
/*
		var entityE5 = document.createElement('a-draw-curve');
		entityE5.setAttribute('curveref','#'+trackIdR);
		entityE5.setAttribute('material', 'shader', 'line');
		entityE5.setAttribute('material', 'color', 'blue');
    	item.appendChild(entityE5);
*/
        var trObj = {trackId: trackId, fx: fx, fz: fz, lx: lx, lz: lz, len: len};
		console.log("trackId: "+trObj.trackId+" fx: "+trObj.fx+" fz: "+trObj.fz+" lx: "+trObj.lx+" lz: "+trObj.lz+" len: "+trObj.len);
		routeArray.push(trObj);
      }
      resolve();
      // reject("whatever the error");

  });
}