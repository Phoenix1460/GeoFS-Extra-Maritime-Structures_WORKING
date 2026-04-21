(async function() {
  const TAG = "[GeoFS-REAL-COLLISION]";
  const viewer = window.geoViewer || (window.geofs && geofs.api && geofs.api.viewer);
  if (!viewer || !window.Cesium) return console.log(TAG, "Viewer not found");

  // LOAD YOUR FILES
  const base = "https://raw.githubusercontent.com/Phoenix1460/GeoFS-Extra-Maritime-Structures_WORKING/main/";
  const [locData, collData] = await Promise.all([
    fetch(base + "buildingsLOC.json").then(r => r.json()),
    fetch(base + "collisionsettings.json").then(r => r.json())
  ]);

  console.log(TAG, "Files loaded");

  const models = {
    "USS Nimitz (CVN-68)": "https://cdn.jsdelivr.net/gh/Phoenix1460/GeoFS-Extra-Maritime-Structures_WORKING@main/modelfiles/nimitz.glb"
  };

  const ships = {};
  let selected = null;

  // BUILD SHIPS FROM JSON
  locData.forEach(obj => {
    if (!obj.location || !models[obj.name]) return;

    ships[obj.name] = {
      name: obj.name,
      lat: obj.location[0],
      lon: obj.location[1],
      alt: obj.location[2],
      heading: obj.location[3] || 0,
      spawnAlt: 25
    };
  });

  function spawnShips() {
    Object.values(ships).forEach(s => {
      const pos = Cesium.Cartesian3.fromDegrees(s.lon, s.lat, s.alt);

      viewer.entities.add({
        position: pos,
        orientation: Cesium.Transforms.headingPitchRollQuaternion(
          pos,
          new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(s.heading), 0, 0)
        ),
        model: {
          uri: models[s.name],
          scale: 3,
          minimumPixelSize: 128
        }
      });
    });

    console.log(TAG, "Ships spawned");
  }

  function teleport(name) {
    const s = ships[name];
    const ac = geofs.aircraft.instance;
    if (!s || !ac) return;

    selected = name;

    // IMPORTANT: SPAWN ABOVE COLLISION ALT
    const coll = collData[name];
    let safeAlt = s.spawnAlt;

    if (coll && coll.collAlt) {
      safeAlt = coll.collAlt + 5 + (s.spawnAlt - 25);
    }

    ac.llaLocation = [s.lat, s.lon, safeAlt];
    ac.htr = s.heading;
    ac.velocity = [0,0,0];

    console.log(TAG, "TP:", name, "ALT:", safeAlt);
  }

  function adjustHeight(dz) {
    if (!selected) return;

    ships[selected].spawnAlt += dz;

    console.log(TAG, selected, "spawnAlt =", ships[selected].spawnAlt);
  }

  // KEYBINDS (EXACTLY YOURS)
  window.addEventListener("keydown", e => {
    const k = e.key;

    console.log("KEY:", k);

    // TELEPORT
    if (k === "1") teleport("USS Nimitz (CVN-68)");

    // HEIGHT CONTROL (NIMITZ)
    if (k === "+" || k === "=") adjustHeight(1);
    if (k === "-" || k === "_") adjustHeight(-1);
  });

  spawnShips();

  console.log(TAG, "READY");
})();
