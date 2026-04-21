(async function () {
  const TAG = "[GeoFS-REAL-CNR]";
  const viewer = window.geoViewer || (window.geofs && geofs.api && geofs.api.viewer);
  if (!viewer || !window.Cesium) return;

  const base = "https://cdn.jsdelivr.net/gh/Phoenix1460/GeoFS-Extra-Maritime-Structures_WORKING@main/";

  const locations = await fetch(base + "BuildingsLOC.json").then(r => r.json());
  const collisions = await fetch(base + "collisionsettings.json").then(r => r.json());

  const models = {
    "USS Nimitz (CVN-68)": base + "modelfiles/nimitz.glb",
    "USS Dwight D. Eisenhower (CVN-69)": base + "modelfiles/eisenhower.glb",
    "USS Carl Vinson (CVN-70)": base + "modelfiles/nimitz.glb",
    "USS Harry S. Truman (CVN-75)": base + "modelfiles/nimitz.glb",
    "Clemenceau (R98)": base + "modelfiles/nimitz.glb",
    "São Paulo (A12)": base + "modelfiles/nimitz.glb",
    "Oil rig (Gulf of Mexico)": base + "modelfiles/simplerig.glb"
  };

  const ships = [];
  let selected = null;

  // =====================
  // SPAWN FROM JSON
  // =====================
  locations.forEach(obj => {
    if (!obj.location || !models[obj.name]) return;

    const [lat, lon, alt, heading = 0] = obj.location;

    const pos = Cesium.Cartesian3.fromDegrees(lon, lat, alt - 20);

    const ori = Cesium.Transforms.headingPitchRollQuaternion(
      pos,
      new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(heading), 0, 0)
    );

    viewer.entities.add({
      position: pos,
      orientation: ori,
      model: {
        uri: models[obj.name],
        scale: 3
      }
    });

    ships.push({
      name: obj.name,
      lat,
      lon,
      heading,
      fly: obj.flyLocation,
      config: collisions[obj.name]
    });
  });

  console.log(TAG, "Spawned from BuildingsLOC");

  // =====================
  // TELEPORT (FIXED)
  // =====================
  function teleport(i) {
    const ship = ships[i];
    const ac = geofs.aircraft.instance;
    if (!ac || !ship) return;

    selected = i;

    // ✅ USE flyLocation (THIS FIXES FALLING)
    const [lat, lon, alt, heading = ship.heading] = ship.fly;

    ac.llaLocation = [lat, lon, alt];
    ac.htr = heading;
    ac.velocity = [0,0,0];

    console.log(TAG, "TP →", ship.name, "| height:", alt);
  }

  // =====================
  // HEIGHT TUNING
  // =====================
  function adjust(dz) {
    if (selected === null) return;

    ships[selected].fly[2] += dz;

    console.log(
      ships[selected].name,
      "spawnAlt:",
      ships[selected].fly[2].toFixed(2)
    );
  }

  function print() {
    if (selected === null) return;
    const s = ships[selected];

    console.log("=== COPY THIS ===");
    console.log(`${s.name}: flyLocation altitude = ${s.fly[2]}`);
  }

  // =====================
  // COLLISION (CNR STYLE)
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

  function pointInPoly(point, vs) {
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0], yi = vs[i][1];
      const xj = vs[j][0], yj = vs[j][1];

      const intersect =
        yi > point[1] !== yj > point[1] &&
        point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }
    return inside;
  }

  function collisionLoop() {
    const ac = geofs.aircraft.instance;
    if (!ac) return requestAnimationFrame(collisionLoop);

    ships.forEach(ship => {
      if (!ship.config) return;

      const local = worldToLocal(ac, ship);

      ship.config.elevatorSquares.forEach(square => {
        if (pointInPoly(local, square)) {
          if (ac.llaLocation[2] < ship.config.collAlt) {
            ac.llaLocation[2] = ship.config.collAlt;
            ac.velocity[2] = 0;
          }
        }
      });
    });

    requestAnimationFrame(collisionLoop);
  }

  collisionLoop();

  // =====================
  // KEYBINDS (YOUR OLD ONES)
  // =====================
  window.addEventListener("keydown", e => {
    const k = e.key;

    if (k === "1") teleport(0);
    if (k === "2") teleport(1);
    if (k === "3") teleport(2);
    if (k === "4") teleport(3);

    if (k === "+" || k === "=") adjust(1);
    if (k === "-" || k === "_") adjust(-1);

    if (k.toLowerCase() === "p") print();
  });

  console.log(TAG, "READY");
})();
