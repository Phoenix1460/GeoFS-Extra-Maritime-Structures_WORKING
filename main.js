(async function () {
  const TAG = "[GeoFS-CNR-FINAL]";
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
      fly: [...obj.flyLocation], // clone so we can edit
      config: collisions[obj.name]
    });
  });

  console.log(TAG, "Ships spawned from BuildingsLOC");

  // =====================
  // TELEPORT
  // =====================
  function teleport(i) {
    const ship = ships[i];
    const ac = geofs.aircraft.instance;
    if (!ac || !ship) return;

    selected = i;

    const [lat, lon, alt, heading = ship.heading] = ship.fly;

    ac.llaLocation = [lat, lon, alt];
    ac.htr = heading;
    ac.velocity = [0,0,0];

    console.log(TAG, "TP →", ship.name, "| height:", alt);
  }

  // =====================
  // HEIGHT TUNING (PER SHIP)
  // =====================
  function adjustHeight(index, dz) {
    const s = ships[index];
    if (!s) return;

    s.fly[2] += dz;

    console.log(
      s.name,
      "spawnAlt:",
      s.fly[2].toFixed(2)
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
      if (!ship.config || !ship.config.elevatorSquares) return;

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
  // KEYBINDS (YOUR ORIGINAL SYSTEM)
  // =====================
  window.addEventListener("keydown", function(e) {
    const k = e.key;

    // TELEPORT
    if (k === "1") { teleport(0); return; }
    if (k === "2") { teleport(1); return; }
    if (k === "3") { teleport(2); return; }
    if (k === "4") { teleport(3); return; }

    if (selected === null) return;

    // SHIP 1
    if (selected === 0) {
      if (k === "+" || k === "=") adjustHeight(0, 1);
      else if (k === "-" || k === "_") adjustHeight(0, -1);
    }

    // SHIP 2
    else if (selected === 1) {
      if (k === "]") adjustHeight(1, 1);
      else if (k === "[") adjustHeight(1, -1);
    }

    // SHIP 3
    else if (selected === 2) {
      if (k === ";") adjustHeight(2, 1);
      else if (k === "'") adjustHeight(2, -1);
    }

    // SHIP 4
    else if (selected === 3) {
      if (k === ".") adjustHeight(3, 1);
      else if (k === ",") adjustHeight(3, -1);
    }

    // PRINT VALUE
    if (k.toLowerCase() === "p") print();
  });

  console.log(TAG, "READY");
})();
