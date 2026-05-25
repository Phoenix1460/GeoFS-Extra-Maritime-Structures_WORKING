(async function () {
    const TAG = "[MARITIME-MOD]";

    const wait = setInterval(() => {
        if (!window.geofs || !window.Cesium) return;
        clearInterval(wait);
        init();
    }, 500);

    async function init() {
        const viewer = geofs.api.viewer;
        const base = "https://cdn.jsdelivr.net/gh/Phoenix1460/GeoFS-Extra-Maritime-Structures_WORKING@main/modelfiles/";

        // ── Ships ────────────────────────────────────────────────────────────
        // deckAlt: metres above alt where the deck surface is.
        //          Tune with +/- keys after teleporting — note the value that
        //          feels right and hardcode it here for next time.
        // ────────────────────────────────────────────────────────────────────
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
        // Returns the ship if lat/lon is over its deck, otherwise null
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

        // ── Hook getFastTerrainElevation ─────────────────────────────────────
        // This is what GeoFS physics calls every single frame.
        // e = [lat, lon, alt]
        const _origFast = geofs.api.getFastTerrainElevation.bind(geofs.api);
        geofs.api.getFastTerrainElevation = function (e) {
            const ship = getShipAt(e[0], e[1]);
            if (ship) return ship.alt + ship.deckAlt;
            return _origFast(e);
        };

        // ── Hook getGroundAltitude ───────────────────────────────────────────
        // This is the slower call with smoothing/error correction.
        // We also patch it so GeoFS doesn't fight our value with its error logic.
        const _origGround = geofs.api.getGroundAltitude.bind(geofs.api);
        geofs.api.getGroundAltitude = function (e, t) {
            const ship = getShipAt(e[0], e[1]);
            if (ship) {
                const floor = ship.alt + ship.deckAlt;
                if (t) {
                    // Tell GeoFS this is a known-good value so error correction
                    // doesn't try to override it
                    t.lastGroundAltitude  = floor;
                    t.wrongAltitudeTries  = 0;
                    t.wrongValue          = undefined;
                }
                return floor;
            }
            return _origGround(e, t);
        };

        console.log(TAG, "Ground hooks installed — GeoFS will treat ship decks as terrain");

        // ── Teleport keys ────────────────────────────────────────────────────
        // +/- only moves the height you spawn at when pressing 1-4.
        // Ships, collision, everything else is untouched.
        let teleportOffset = 0;

        window.addEventListener("keydown", e => {
            if (["1","2","3","4"].includes(e.key)) {
                const ship = SHIPS[Number(e.key) - 1];
                if (!ship) return;
                const ac = geofs.aircraft.instance;
                if (!ac) return;
                const spawnAlt = ship.alt + ship.deckAlt + teleportOffset;
                ac.llaLocation = [ship.lat, ship.lon, spawnAlt];
                ac.htr         = [ship.heading, 0, 0];
                ac.velocity    = [0, 0, 0];
                console.log(TAG, `Teleported to ${ship.name} at ${spawnAlt}m (offset ${teleportOffset >= 0 ? "+" : ""}${teleportOffset}m)`);
                return;
            }

            const plus  = e.key === "+" || e.key === "=";
            const minus = e.key === "-" || e.key === "_";
            if (!plus && !minus) return;

            teleportOffset += plus ? 1 : -1;
            console.log(TAG, `Teleport offset: ${teleportOffset >= 0 ? "+" : ""}${teleportOffset}m`);
        });

        console.log(TAG, "READY | 1-4: teleport | +/-: adjust teleport height");
    }
})();
