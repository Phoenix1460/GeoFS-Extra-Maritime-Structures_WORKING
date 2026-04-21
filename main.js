(async function () {
  const TAG = "[GeoFS-REAL-COLLISION]";

  const BASE = "https://cdn.jsdelivr.net/gh/Phoenix1460/GeoFS-Extra-Maritime-Structures_WORKING@main/";

  const viewer = window.geoViewer || (window.geofs && geofs.api && geofs.api.viewer);
  if (!viewer || !window.Cesium) {
    console.log(TAG, "Viewer not ready");
    return;
  }

  // LOAD JSON FILES
  const buildings = await fetch(BASE + "buildingsLOC.json").then(r => r.json());
  const collSettings = await fetch(BASE + "collisionsettings.json").then(r => r.json());

  console.log(TAG, "JSON LOADED");

  let spawned = [];
  let selectedShip = null;

  // SPAWN MODELS
  function spawnAll() {
    buildings.forEach(b => {
      if (!b.location || !b.flyLocation) return;

      const [lat, lon, alt, heading] = b.location;

      const pos = Cesium.Cartesian3.fromDegrees(lon, lat, alt);

      const ori = Cesium.Transforms.headingPitchRollQuaternion(
        pos,
        new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(heading || 0), 0, 0)
      );

      const entity = viewer.entities.add({
        position: pos,
        orientation: ori,
        model: {
          uri: BASE + "modelfiles/" + b.name.split(" ")[1]?.toLowerCase() + ".glb",
          scale: 3,
          minimumPixelSize: 128
        }
      });

      spawned.push({
        name: b.name,
        entity,
        flyLocation: b.flyLocation
      });
    });

    console.log(TAG, "Spawned all ships");
  }

  // TELEPORT
  function teleport(index) {
    const ship = spawned[index];
    if (!ship) return;

    const ac = geofs.aircraft.instance;
    if (!ac) return;

    selectedShip = ship;

    const [lat, lon, alt, heading] = ship.flyLocation;

    ac.llaLocation = [lat, lon, alt];
    ac.htr = heading || 0;
    ac.velocity = [0, 0, 0];

    console.log(TAG, "Teleported to", ship.name);
  }

  // HEIGHT ADJUST
  function adjustHeight(delta) {
    if (!selectedShip) return;

    selectedShip.flyLocation[2] += delta;

    console.log(TAG,
      selectedShip.name,
      "spawnAlt:",
      selectedShip.flyLocation[2].toFixed(2)
    );
  }

  // KEYBINDS (YOUR ORIGINAL ONES)
  window.addEventListener("keydown", (e) => {
    const k = e.key;

    console.log("KEY:", k);

    // TELEPORT KEYS
    if (k === "1") teleport(1);
    if (k === "2") teleport(2);
    if (k === "3") teleport(3);
    if (k === "4") teleport(4);

    if (!selectedShip) return;

    const name = selectedShip.name;

    // NIMITZ
    if (name.includes("Nimitz")) {
      if (k === "+" || k === "=") adjustHeight(1);
      if (k === "-" || k === "_") adjustHeight(-1);
    }

    // FORD
    if (name.includes("Ford")) {
      if (k === "]") adjustHeight(1);
      if (k === "[") adjustHeight(-1);
    }

    // EISENHOWER
    if (name.includes("Eisenhower")) {
      if (k === ";") adjustHeight(1);
      if (k === "'") adjustHeight(-1);
    }

    // RIG
    if (name.includes("Oil") || name.includes("rig")) {
      if (k === ".") adjustHeight(1);
      if (k === ",") adjustHeight(-1);
    }

  });

  // SIMPLE COLLISION FIX (USES YOUR ALT DATA)
  function applyCollisionFix() {
    setInterval(() => {
      const ac = geofs.aircraft.instance;
      if (!ac || !selectedShip) return;

      const shipName = selectedShip.name;

      const coll = collSettings[shipName];
      if (!coll) return;

      const minAlt = coll.collAlt || 20;

      if (ac.llaLocation[2] < minAlt) {
        ac.llaLocation[2] = minAlt;
      }
    }, 50);
  }

  spawnAll();
  applyCollisionFix();

  console.log(TAG, "READY");
})();
