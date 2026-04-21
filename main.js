(async function () {
  const TAG = "[WORKING-NIMITZ]";
  const BASE = "https://cdn.jsdelivr.net/gh/Phoenix1460/GeoFS-Extra-Maritime-Structures_WORKING@main/";

  const viewer = window.geoViewer || (window.geofs && geofs.api && geofs.api.viewer);
  if (!viewer || !window.Cesium) return console.log("viewer missing");

  const buildings = await fetch(BASE + "buildingsLOC.json").then(r => r.json());
  const coll = await fetch(BASE + "collisionsettings.json").then(r => r.json());

  const ships = {};
  let selected = null;

  // =====================
  // SPAWN
  // =====================
  buildings.forEach(b => {
    if (!b.location || !b.flyLocation) return;
    if (b.name.startsWith("-")) return;

    const [lat, lon, alt, heading = 0] = b.location;

    const pos = Cesium.Cartesian3.fromDegrees(lon, lat, alt);

    const ori = Cesium.Transforms.headingPitchRollQuaternion(
      pos,
      new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(heading), 0, 0)
    );

    const modelName = b.name.includes("Nimitz") ? "nimitz.glb"
      : b.name.includes("Eisenhower") ? "eisenhower.glb"
      : b.name.includes("Vinson") ? "nimitz.glb"
      : b.name.includes("Truman") ? "nimitz.glb"
      : b.name.includes("rig") ? "simplerig.glb"
      : "nimitz.glb";

    viewer.entities.add({
      position: pos,
      orientation: ori,
      model: {
        uri: BASE + "modelfiles/" + modelName,
        scale: 3
      }
    });

    ships[b.name] = {
      lat,
      lon,
      heading,
      fly: [...b.flyLocation],
      coll: coll[b.name]
    };
  });

  console.log(TAG, "spawned");

  const keysMap = [
    "USS Nimitz (CVN-68)",
    "USS Dwight D. Eisenhower (CVN-69)",
    "USS Carl Vinson (CVN-70)",
    "Oil rig (Gulf of Mexico)"
  ];

  // =====================
  // TELEPORT
  // =====================
  function teleport(i) {
    const name = keysMap[i];
    const s = ships[name];
    const ac = geofs.aircraft.instance;
    if (!ac || !s) return;

    selected = name;

    ac.llaLocation = [s.fly[0], s.fly[1], s.fly[2]];
    ac.htr = s.heading;
    ac.velocity = [0,0,0];

    console.log("TP:", name, "ALT:", s.fly[2]);
  }

  // =====================
  // HEIGHT (FIXED)
  // =====================
  function adjustHeight(dz) {
    if (!selected) return;

    const s = ships[selected];
    s.fly[2] += dz;

    // 🔥 THIS MAKES IT WORK
    const ac = geofs.aircraft.instance;
    ac.llaLocation[2] = s.fly[2];

    console.log("HEIGHT:", s.fly[2]);
  }

  // =====================
  // NIMITZ COLLISION ONLY
  // =====================
  function collisionLoop() {
    const ac = geofs.aircraft.instance;
    if (!ac) return requestAnimationFrame(collisionLoop);

    const s = ships["USS Nimitz (CVN-68)"];
    if (!s || !s.coll) return requestAnimationFrame(collisionLoop);

    if (selected === "USS Nimitz (CVN-68)") {
      if (ac.llaLocation[2] < s.coll.collAlt) {
        ac.llaLocation[2] = s.coll.collAlt;
        ac.velocity[2] = 0;
      }
    }

    requestAnimationFrame(collisionLoop);
  }

  collisionLoop();

  // =====================
  // KEYBINDS (YOUR EXACT ONES)
  // =====================
  window.addEventListener("keydown", e => {
    const k = e.key;

    // TELEPORT
    if (k === "1") teleport(0);
    if (k === "2") teleport(1);
    if (k === "3") teleport(2);
    if (k === "4") teleport(3);

    if (!selected) return;

    // NIMITZ (+/-)
    if (selected.includes("Nimitz")) {
      if (k === "+" || k === "=") adjustHeight(1);
      if (k === "-" || k === "_") adjustHeight(-1);
    }

    // FORD ([ ])
    if (selected.includes("Ford")) {
      if (k === "]") adjustHeight(1);
      if (k === "[") adjustHeight(-1);
    }

    // EISENHOWER (; ')
    if (selected.includes("Eisenhower")) {
      if (k === ";") adjustHeight(1);
      if (k === "'") adjustHeight(-1);
    }

    // RIG (, .)
    if (selected.includes("rig") || selected.includes("Oil")) {
      if (k === ".") adjustHeight(1);
      if (k === ",") adjustHeight(-1);
    }
  });

  console.log(TAG, "READY");
})();
