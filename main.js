(function () {
  const TAG = "[GeoFS-FIXED]";
  const viewer = geofs.api.viewer;
  const Cesium = window.Cesium;

  const ships = {
    "1": {
      name: "Nimitz",
      lat: 36.9598107,
      lon: -75.7194932,
      heading: 87,
      deckAlt: 20,
      spawnAlt: 25,
      size: 0.03,
      model: "https://cdn.jsdelivr.net/gh/Phoenix1460/GeoFS-Extra-Maritime-Structures_WORKING@main/modelfiles/nimitz.glb",
      scale: 3
    },
    "2": {
      name: "Eisenhower",
      lat: 36.8,
      lon: -75.8,
      heading: 90,
      deckAlt: 20,
      spawnAlt: 25,
      size: 0.03,
      model: "https://cdn.jsdelivr.net/gh/Phoenix1460/GeoFS-Extra-Maritime-Structures_WORKING@main/modelfiles/eisenhower.glb",
      scale: 3
    }
  };

  let selected = null;

  // =====================
  // SPAWN
  // =====================
  function spawn() {
    Object.values(ships).forEach(s => {
      const pos = Cesium.Cartesian3.fromDegrees(s.lon, s.lat, 0);

      const ori = Cesium.Transforms.headingPitchRollQuaternion(
        pos,
        new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(s.heading), 0, 0)
      );

      viewer.entities.add({
        position: pos,
        orientation: ori,
        model: {
          uri: s.model,
          scale: s.scale,
          minimumPixelSize: 128
        }
      });
    });

    console.log(TAG, "Spawned");
  }

  // =====================
  // TELEPORT
  // =====================
  function tp(key) {
    const s = ships[key];
    const ac = geofs.aircraft.instance;
    if (!ac) return;

    selected = key;

    ac.llaLocation = [s.lat, s.lon, s.spawnAlt];
    ac.htr = s.heading;
    ac.velocity = [0,0,0];

    console.log(TAG, "TP:", s.name, "ALT:", s.spawnAlt);
  }

  // =====================
  // HEIGHT ADJUST
  // =====================
  function adjust(dz) {
    if (!selected) return;

    ships[selected].spawnAlt += dz;

    console.log(TAG, "HEIGHT:", ships[selected].spawnAlt);
  }

  // =====================
  // 🔥 STRONG COLLISION
  // =====================
  function collision() {
    const ac = geofs.aircraft.instance;
    if (!ac) return;

    Object.values(ships).forEach(s => {
      const latDiff = Math.abs(ac.llaLocation[0] - s.lat);
      const lonDiff = Math.abs(ac.llaLocation[1] - s.lon);

      // BIGGER AREA (important)
      if (latDiff < s.size && lonDiff < s.size) {

        // If below deck → snap up HARD
        if (ac.llaLocation[2] < s.deckAlt + 1) {
          ac.llaLocation[2] = s.deckAlt + 1;

          // kill downward movement COMPLETELY
          if (ac.velocity) {
            ac.velocity[2] = Math.max(0, ac.velocity[2]);
          }
        }
      }
    });
  }

  setInterval(collision, 20); // faster = stronger

  // =====================
  // KEYBINDS
  // =====================
  window.addEventListener("keydown", e => {
    const k = e.key;

    console.log("KEY:", k);

    if (ships[k]) tp(k);

    if (k === "+" || k === "=") adjust(1);
    if (k === "-" || k === "_") adjust(-1);
  });

  setTimeout(spawn, 2000);

  console.log(TAG, "READY");
})();
