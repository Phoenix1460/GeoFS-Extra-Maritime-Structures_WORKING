(async function () {
  const TAG = "[REAL-DECK]";
  const viewer = geofs.api.viewer;
  const Cesium = window.Cesium;

  const base = "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/";

  const locs = await fetch(base + "buildingsLOC.json").then(r => r.json());
  const coll = await fetch(base + "collisionSettings.json").then(r => r.json());

  const modelURL = "https://cdn.jsdelivr.net/gh/Phoenix1460/GeoFS-Extra-Maritime-Structures_WORKING@main/modelfiles/nimitz.glb";

  let spawnAlt = 23;

  // SPAWN MODEL
  locs.forEach(s => {
    const pos = Cesium.Cartesian3.fromDegrees(s.location[1], s.location[0], s.location[2]);

    viewer.entities.add({
      position: pos,
      model: {
        uri: modelURL,
        scale: 3
      }
    });
  });

  console.log(TAG, "Spawned");

  // TELEPORT
  function tp() {
    const ac = geofs.aircraft.instance;
    ac.llaLocation = [36.9598107, -75.7194932, spawnAlt];
    ac.htr = 87;
    ac.velocity = [0,0,0];
    console.log(TAG, "TP ALT:", spawnAlt);
  }

  // COLLISION LOOP (THIS IS THE IMPORTANT PART)
  setInterval(() => {
    const ac = geofs.aircraft.instance;
    if (!ac) return;

    const d = coll["USS Nimitz (CVN-68)"].deck;

    const latDiff = Math.abs(ac.llaLocation[0] - d.lat);
    const lonDiff = Math.abs(ac.llaLocation[1] - d.lon);

    // inside deck zone
    if (latDiff < d.radius && lonDiff < d.radius) {
      if (ac.llaLocation[2] < d.height) {
        ac.llaLocation[2] = d.height;
        ac.velocity[2] = 0;
      }
    }
  }, 50);

  // KEYBINDS
  window.addEventListener("keydown", e => {
    const k = e.key;

    if (k === "1") tp();

    if (k === "+" || k === "=") {
      spawnAlt += 1;
      console.log("ALT:", spawnAlt);
    }

    if (k === "-" || k === "_") {
      spawnAlt -= 1;
      console.log("ALT:", spawnAlt);
    }
  });

})();
