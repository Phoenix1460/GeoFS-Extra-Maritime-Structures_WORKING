(async function () {
    const TAG = "[MARITIME]";

    const wait = setInterval(() => {
        if (!window.geofs || !window.Cesium) return;
        clearInterval(wait);
        init();
    }, 500);

    async function init() {
        const viewer = geofs.api.viewer;
        const base = "https://cdn.jsdelivr.net/gh/Phoenix1460/GeoFS-Extra-Maritime-Structures_WORKING@main/modelfiles/";

        const SHIPS = [
            {
                name:    "USS Nimitz (CVN-68)",
                model:   base + "nimitz.glb",
                lat:     32.6523,
                lon:     -117.1500,
                alt:     0,
                heading: 140,
                hw:      170,
                hd:      30,
                deckAlt: 20
            },
            {
                name:    "USS Dwight D. Eisenhower (CVN-69)",
                model:   base + "eisenhower.glb",
                lat:     36.9459,
                lon:     -76.0125,
                alt:     0,
                heading: 0,
                hw:      170,
                hd:      30,
                deckAlt: 20
            },
            {
                name:    "USS Gerald R. Ford (CVN-78)",
                model:   base + "geraldford.glb",
                lat:     36.9200,
                lon:     -76.0300,
                alt:     0,
                heading: 0,
                hw:      175,
                hd:      32,
                deckAlt: 20
            },
            {
                name:    "Oil rig (Gulf of Mexico)",
                model:   base + "simplerig.glb",
                lat:     28.5000,
                lon:     -89.0000,
                alt:     0,
                heading: 0,
                hw:      55,
                hd:      55,
                deckAlt: 35
            }
        ];

        // ── Spawn models ─────────────────────────────────────────────────────
        SHIPS.forEach(ship => {
            const pos = Cesium.Cartesian3.fromDegrees(ship.lon, ship.lat, ship.alt);
            const ori = Cesium.Transforms.headingPitchRollQuaternion(
                pos,
                new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(ship.heading), 0, 0)
            );
            viewer.entities.add({
                position:    pos,
                orientation: ori,
                model:       { uri: ship.model, scale: 3 }
            });
        });

        // ── Footprint check ──────────────────────────────────────────────────
        function getShipAt(lat, lon) {
            for (const ship of SHIPS) {
                const mPerLat = 111320;
                const mPerLon = 111320 * Math.cos(ship.lat * Math.PI / 180);
                const dx      = (lon - ship.lon) * mPerLon;
                const dy      = (lat - ship.lat) * mPerLat;
                const rad     = -ship.heading * Math.PI / 180;
                const lx      = dx * Math.cos(rad) - dy * Math.sin(rad);
                const ly      = dx * Math.sin(rad) + dy * Math.cos(rad);
                if (Math.abs(lx) <= ship.hw && Math.abs(ly) <= ship.hd) return ship;
            }
            return null;
        }

        // ── Hook GeoFS ground functions ──────────────────────────────────────
        const _origFast = geofs.api.getFastTerrainElevation.bind(geofs.api);
        geofs.api.getFastTerrainElevation = function (e) {
            const ship = getShipAt(e[0], e[1]);
            if (ship) return ship.alt + ship.deckAlt;
            return _origFast(e);
        };

        const _origGround = geofs.api.getGroundAltitude.bind(geofs.api);
        geofs.api.getGroundAltitude = function (e, t) {
            const ship = getShipAt(e[0], e[1]);
            if (ship) {
                const floor = ship.alt + ship.deckAlt;
                if (t) {
                    t.lastGroundAltitude = floor;
                    t.wrongAltitudeTries = 0;
                    t.wrongValue         = undefined;
                }
                return floor;
            }
            return _origGround(e, t);
        };

        console.log(TAG, "Ground hooks installed");

        // ── Keys ─────────────────────────────────────────────────────────────
        let teleportOffset = 0;

        window.addEventListener("keydown", e => {

            // 1-4: teleport to ship
            if (["1","2","3","4"].includes(e.key)) {
                const ship = SHIPS[Number(e.key) - 1];
                if (!ship) return;
                const ac = geofs.aircraft.instance;
                if (!ac) return;
                const spawnAlt = ship.alt + ship.deckAlt + teleportOffset;
                ac.llaLocation = [ship.lat, ship.lon, spawnAlt];
                ac.htr         = [ship.heading, 0, 0];
                ac.velocity    = [0, 0, 0];
                console.log(TAG, `Teleported to ${ship.name} at ${spawnAlt}m`);
                return;
            }

            // [ / ]: raise or lower the GeoFS ground floor on all ships
            if (e.key === "]" || e.key === "[") {
                const delta = e.key === "]" ? 1 : -1;
                SHIPS.forEach(s => s.deckAlt += delta);
                console.log(TAG, `Deck ground floor: ${SHIPS[0].deckAlt}m above ship base`);
                SHIPS.forEach((s, i) =>
                    console.log(`  [${i+1}] ${s.name} — ground at ${s.alt + s.deckAlt}m`)
                );
                return;
            }

            // +/-: raise or lower teleport spawn height only
            const plus  = e.key === "+" || e.key === "=";
            const minus = e.key === "-" || e.key === "_";
            if (!plus && !minus) return;
            teleportOffset += plus ? 1 : -1;
            console.log(TAG, `Teleport offset: ${teleportOffset >= 0 ? "+" : ""}${teleportOffset}m`);
        });

        console.log(TAG, "READY");
        console.log(TAG, "1-4: teleport | [/]: deck ground floor | +/-: teleport height");
    }
})();
