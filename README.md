# OSMRail
a test to use OpenSteetMap-Data for a railsimulator.

It uses overpass-api to gather objects around a (rail-)route
and Mozilla's A-Frame library to display it.

# How to use
-select a preset or insert own values (see below).

-chose the details you want to display (Warning! ties will slow down massivly)

-press "load" button

-loading will take a long time

-press "start" to close selection (you may do while loading)

-after about one minute the train shoud start moving

-use WASD to move around, C to toggle camera

# adding your own route
-go to https://wiki.openstreetmap.org/wiki/Category:Public_transport_by_country and click through to your country and city/region

-from the list of lines pick your prefered one. Do NOT use a route_master, only type=route will work!
 (routes having a route_master as parent are often made more accurate)

-note the number of thr relation, enter it as route id

-click the number to open a map (i.e. https://www.openstreetmap.org/relation/34810)

-check if it is asingle line, NO BRANCHES, NO LOOPS, NO EYES.

-scroll down the list of members and click the first way NOT marker as stop or platform
 (i.e. https://www.openstreetmap.org/way/60578926)

-click the first node of the way. Is it the first of the route? If not chose the last instead!
 (https://www.openstreetmap.org/node/26028180 uses last, not first node)

-note the coordinates (above attribues) and enter latitude and longitude in OSMRail



