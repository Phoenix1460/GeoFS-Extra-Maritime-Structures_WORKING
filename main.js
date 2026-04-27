(function () {
  const TAG = "[GeoFS-REALISH]";
  const viewer = geofs.api.viewer;
  const Cesium = window.Cesium;

  const BASE = "https://raw.githubusercontent.com/Phoenix1460/GeoFS-Extra-Maritime-Structures_WORKING/refs/heads/main/";

  let buildings = [];
  let collision = {};

  let selected = null;
  let spawnAlt = 25;

  // =====================
  // LOAD FILES
  // =====================
  async function load() {
    buildings = await fetch(BASE + "BuildingsLOC.json").then(r => r.json());
    collision = await fetch(BASE + "collisionSettings.json").then(r => r.json());

    spawn();
    console.log(TAG, "Loaded files");
  }

  // =====================
  // SPAWN MODEL
  // =====================
  function spawn() {
    const s = buildings[0];

    const pos = Cesium.Cartesian3.fromDegrees(s.location[1], s.location[0], 0);

    const ori = Cesium.Transforms.headingPitchRollQuaternion(
      pos,
      new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(s.location[3]), 0, 0)
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
  }

  // =====================
  // TELEPORT
  // =====================
  function tp() {
    const ac = geofs.aircraft.instance;
    if (!ac) return;

    const s = buildings[0];

    selected = true;

    ac.llaLocation = [s.location[0], s.location[1], spawnAlt];
    ac.htr = s.location[3];
    ac.velocity = [0,0,0];

    console.log(TAG, "TP ALT:", spawnAlt);
  }

  // =====================
  // ADJUST HEIGHT
  // =====================
  function adjust(dz) {
    spawnAlt += dz;
    console.log(TAG, "NEW ALT:", spawnAlt);
  }

  // =====================
  // 🔥 POLYGON COLLISION (BEST POSSIBLE)
  // =====================
  function collisionLoop() {
    const ac = geofs.aircraft.instance;
    if (!ac) return;

    const s = buildings[0];
    const col = collision[s.name];

    if (!col) return;

    const dx = (ac.llaLocation[1] - s.location[1]) * 111000;
    const dy = (ac.llaLocation[0] - s.location[0]) * 111000;

    const [minX, minY, maxX, maxY] = col.square;

    // inside deck rectangle
    if (dx > minX && dx < maxX && dy > minY && dy < maxY) {

      if (ac.llaLocation[2] < col.deckAlt + 1) {
        ac.llaLocation[2] = col.deckAlt + 1;

        if (ac.velocity) {
          ac.velocity[2] = 0;
        }
      }
    }
  }

  setInterval(collisionLoop, 15);

  // =====================
  // KEYBINDS (YOUR ORIGINAL LOGIC)
  // =====================
  window.addEventListener("keydown", e => {
    const k = e.key;

    console.log("KEY:", k);

    if (k === "1") tp();

    if (k === "+" || k === "=") adjust(1);
    if (k === "-" || k === "_") adjust(-1);
  });

  load();

  console.log(TAG, "READY");
})();
