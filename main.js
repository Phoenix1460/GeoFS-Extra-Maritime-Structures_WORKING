(function () {
  const TAG = "[GeoFS-CARRIER-FULL]";
  const viewer = window.geoViewer || (window.geofs && geofs.api && geofs.api.viewer);
  if (!viewer || !window.Cesium || !window.geofs) {
    console.log(TAG, "GeoFS not ready");
    return;
  }

  const BASE = "https://raw.githubusercontent.com/Phoenix1460/GeoFS-Extra-Maritime-Structures_WORKING/refs/heads/main/";

  let ships = {};
  let selected = null;

  // =========================
  // LOAD FILES
  // =========================
  async function load() {
    try {
      const buildings = await fetch(BASE + "BuildingsLOC.json").then(r => r.json());
      const collision = await fetch(BASE + "collisionsettings.json").then(r => r.json());

      console.log(TAG, "FILES LOADED");

      buildings.forEach(b => {
        if (!b.location || !b.name) return;

        ships[b.name] = {
          lat: b.location[0],
          lon: b.location[1],
          heading: b.location[3] || 0,
          spawnAlt: 25, // adjustable
          collAlt: collision[b.name]?.collAlt || 20
        };
      });

      spawnShips();
    } catch (e) {
      console.error(TAG, "LOAD ERROR:", e);
    }
  }

  // =========================
  // SPAWN MODELS
  // =========================
  function spawnShips() {
    Object.entries(ships).forEach(([name, s]) => {

      const pos = Cesium.Cartesian3.fromDegrees(s.lon, s.lat, 0);

      const ori = Cesium.Transforms.headingPitchRollQuaternion(
        pos,
        new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(s.heading), 0, 0)
      );

      viewer.entities.add({
        position: pos,
        orientation: ori,
        model: {
          uri: "https://cdn.jsdelivr.net/gh/Phoenix1460/GeoFS-Extra-Maritime-Structures_WORKING@main/modelfiles/nimitz.glb",
          scale: 3,
          minimumPixelSize: 128
        }
      });
    });

    console.log(TAG, "SHIPS SPAWNED");
  }

  // =========================
  // TELEPORT
  // =========================
  function teleport(name) {
    const s = ships[name];
    const ac = geofs.aircraft.instance;
    if (!ac) return;

    selected = name;

    const SAFE_OFFSET = 2;

    ac.llaLocation = [
      s.lat,
      s.lon,
      s.spawnAlt + SAFE_OFFSET
    ];

    ac.htr = s.heading;

    if (ac.velocity) ac.velocity = [0, 0, 0];

    console.log(TAG, "TP →", name, "ALT:", s.spawnAlt);
  }

  // =========================
  // HEIGHT CONTROL
  // =========================
  function adjustHeight(dz) {
    if (!selected) return;

    ships[selected].spawnAlt += dz;

    console.log(
      TAG,
      selected,
      "NEW HEIGHT:",
      ships[selected].spawnAlt.toFixed(2)
    );
  }

  // =========================
  // 🔥 COLLISION SYSTEM
  // =========================
  function collisionLoop() {
    const ac = geofs.aircraft.instance;
    if (!ac || !selected) return;

    const s = ships[selected];

    const deck = s.collAlt;
    const current = ac.llaLocation[2];

    // only apply near ship
    const latDiff = Math.abs(ac.llaLocation[0] - s.lat);
    const lonDiff = Math.abs(ac.llaLocation[1] - s.lon);

    if (latDiff < 0.02 && lonDiff < 0.02) {

      if (current < deck) {
        ac.llaLocation[2] = deck;

        if (ac.velocity) {
          ac.velocity[2] = 0;
        }
      }
    }
  }

  setInterval(collisionLoop, 50);

  // =========================
  // KEYBINDS
  // =========================
  window.addEventListener("keydown", (e) => {
    const k = e.key;

    console.log("KEY:", k);

    const names = Object.keys(ships);

    if (k === "1" && names[0]) teleport(names[0]);
    if (k === "2" && names[1]) teleport(names[1]);
    if (k === "3" && names[2]) teleport(names[2]);
    if (k === "4" && names[3]) teleport(names[3]);

    if (k === "+" || k === "=") adjustHeight(1);
    if (k === "-" || k === "_") adjustHeight(-1);
  });

  // =========================
  // START
  // =========================
  load();

  console.log(TAG, "READY");
})();
