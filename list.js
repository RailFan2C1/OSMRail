/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Standard Overpass API Server
//var overpassURL = "https://overpass-api.de/api/interpreter";
var overpassURL = "https://lz4.overpass-api.de/api/interpreter";

window.onload = function () {
  document.querySelector("#listLoadButton").addEventListener('click', loadList);
}

function loadList() {
  var rId=document.getElementById('iArea').value;   //rId=34809;
  var rtype=document.getElementById('sType').value;
  var opQuery = "[out:csv(::id,route,name)];area[name="+rId+"];nwr(area)[route="+rtype+"];out;";
  //alert(opQuery);

  return fetchFromOverpass(opQuery)
    .then((ergebnis) => {
    //alert(ergebnis);

    var lines = ergebnis.split("\n");
    //alert(lines.length+lines[0]);
    
    for(i=1;i<lines.length-1;i++){
    var option = document.createElement("option");
      var line = lines[i].split("\t");
      option.value     = line[0];
      option.innerHTML = line[2];
      var select = document.getElementById("sList");
      select.appendChild(option);
    }
  
    })
    .catch((reason) => { console.log(reason); });
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
      resolve(response);
    })
    .catch((reason) => { reject(reason); });
  });
}
