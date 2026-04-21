(async function () {
  const TAG = "[GeoFS-REAL]";
  const viewer = window.geoViewer || (window.geofs && geofs.api && geofs.api.viewer);
  if (!viewer || !window.Cesium) return console.log(TAG, "Viewer missing");

  const BASE = "https://cdn.jsdelivr.net/gh/Phoenix1460/GeoFS-Extra-Maritime-Structures_WORKING@main/";

  // LOAD YOUR FILES
  const locations = await fetch(BASE + "BuildingsLOC.json").then(r => r.json());
  const collisions = await fetch(BASE + "collisionsettings.json").then(r => r.json());

  const ships = [];
  let selected = null;

  // =====================
  // SPAWN MODELS
  // =====================
  locations.forEach(obj => {
    if (!obj.location || !obj.flyLocation) return;
    if (obj.name.startsWith("-")) return;

    const modelPath = BASE + "modelfiles/" +
      obj.name.toLowerCase().replace(/[^a-z0-9]/g, "") + ".glb";

    const [lat, lon, alt, heading = 0] = obj.location;

    const pos = Cesium.Cartesian3.fromDegrees(lon, lat, alt);

    const ori = Cesium.Transforms.headingPitchRollQuaternion(
      pos,
      new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(heading), 0, 0)
    );

    viewer.entities.add({
      position: pos,
      orientation: ori,
      model: {
        uri: modelPath,
        scale: 3
      }
    });

    ships.push({
      name: obj.name,
      lat,
      lon,
      heading,
      fly: [...obj.flyLocation],
      coll: collisions[obj.name]
    });
  });

  console.log(TAG, "Ships loaded");
  ships.forEach((s,i)=>console.log(i, s.name));

  // =====================
  // TELEPORT
  // =====================
  function teleport(i) {
    const s = ships[i];
    const ac = geofs.aircraft.instance;
    if (!ac || !s) return;

    selected = i;

    ac.llaLocation = [s.fly[0], s.fly[1], s.fly[2]];
    ac.htr = s.heading;
    ac.velocity = [0,0,0];

    console.log("TP:", s.name);
  }

  // =====================
  // HEIGHT ADJUST
  // =====================
  function adjustHeight(dz) {
    if (selected === null) return;
    ships[selected].fly[2] += dz;

    console.log("Height:", ships[selected].fly[2]);
  }

  // =====================
  // REAL COLLISION (FROM YOUR JSON)
  // =====================
  function worldToLocal(ac, ship) {
    const dx = (ac.llaLocation[1] - ship.lon) * 111320;
    const dy = (ac.llaLocation[0] - ship.lat) * 111320;
    const rad = -ship.heading * Math.PI / 180;

    return [
      dx * Math.cos(rad) - dy * Math.sin(rad),
      dx * Math.sin(rad) + dy * Math.cos(rad)
    ];
  }

  function pointInPoly(p, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1];
      const xj = poly[j][0], yj = poly[j][1];

      const intersect =
        yi > p[1] !== yj > p[1] &&
        p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }
    return inside;
  }

  function collisionLoop() {
    const ac = geofs.aircraft.instance;
    if (!ac) return requestAnimationFrame(collisionLoop);

    ships.forEach(ship => {
      if (!ship.coll || !ship.coll.elevatorSquares) return;

      const local = worldToLocal(ac, ship);

      ship.coll.elevatorSquares.forEach(square => {
        if (pointInPoly(local, square)) {
          if (ac.llaLocation[2] < ship.coll.collAlt) {
            ac.llaLocation[2] = ship.coll.collAlt;
            ac.velocity[2] = 0;
          }
        }
      });
    });

    requestAnimationFrame(collisionLoop);
  }

  collisionLoop();

  // =====================
  // KEY SYSTEM (WORKING)
  // =====================
  const keys = {};
  window.addEventListener("keydown", e => keys[e.key] = true);
  window.addEventListener("keyup", e => keys[e.key] = false);

  setInterval(() => {
    if (keys["1"]) { teleport(0); keys["1"]=false; }
    if (keys["2"]) { teleport(1); keys["2"]=false; }
    if (keys["3"]) { teleport(2); keys["3"]=false; }
    if (keys["4"]) { teleport(3); keys["4"]=false; }

    if (keys["w"] || keys["W"]) adjustHeight(0.5);
    if (keys["s"] || keys["S"]) adjustHeight(-0.5);

  }, 50);

})();
