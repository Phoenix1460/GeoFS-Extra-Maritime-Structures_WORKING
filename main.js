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

        const SHIPS = [
            {
                name:        "USS Nimitz (CVN-68)",
                model:       "https://cdn.jsdelivr.net/gh/Phoenix1460/GeoFS-Extra-Maritime-Structures_WORKING@master/modelfiles/nimitz.glb",
                lat:         32.600,   lon:       -117.320,
                visualLat:   32.600,   visualLon: -117.320,
                alt:         0,        visualAlt: 52,
                heading:     315,
                hw:          170,      hd:        30,
                deckAlt:     60,
                teleportAlt: 63,
                scale:       3
            },
            {
                name:        "USS Dwight D. Eisenhower (CVN-69)",
                model:       base + "eisenhower.glb",
                lat:         36.800,   lon:       -75.800,
                visualLat:   36.800,   visualLon: -75.800,
                alt:         0,        visualAlt: 0,
                heading:     45,
                hw:          170,      hd:        30,
                deckAlt:     60,
                teleportAlt: 63,
                scale:       3
            },
            {
                name:        "USS Gerald R. Ford (CVN-78)",
                model:       base + "geraldford.glb",
                lat:         36.950,   lon:       -75.700,
                visualLat:   36.9432,  visualLon: -75.7056,
                alt:         0,        visualAlt: -31,
                heading:     45,
                hw:          175,      hd:        32,
                deckAlt:     62,
                teleportAlt: 64,
                scale:       3
            },
            {
                name:        "Oil rig (Gulf of Mexico)",
                model:       base + "simplerig.glb",
                lat:         28.740,   lon:       -88.370,
                visualLat:   28.740,   visualLon: -88.370,
                alt:         0,        visualAlt: 16,
                heading:     0,
                hw:          55,       hd:        55,
                deckAlt:     37,
                teleportAlt: 40,
                scale:       10
            }
        ];

        // Spawn all models
        SHIPS.forEach(ship => {
            const pos = Cesium.Cartesian3.fromDegrees(
                ship.visualLon,
                ship.visualLat,
                ship.alt + ship.visualAlt
            );
            const ori = Cesium.Transforms.headingPitchRollQuaternion(
                pos,
                new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(ship.heading), 0, 0)
            );
            viewer.entities.add({
                position:    pos,
                orientation: ori,
                model: {
                    uri:              ship.model,
                    scale:            ship.scale,
                    minimumPixelSize: 0,
                    maximumScale:     100000
                }
            });
        });
        viewer.scene.requestRender();

        // Hook GeoFS ground altitude — makes ship decks solid natively
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

        // 1-4: teleport to ship
        window.addEventListener("keydown", e => {
            if (!["1","2","3","4"].includes(e.key)) return;
            const ship = SHIPS[Number(e.key) - 1];
            if (!ship) return;
            const ac = geofs.aircraft.instance;
            if (!ac) return;
            ac.llaLocation = [ship.lat, ship.lon, ship.teleportAlt];
            ac.htr         = [ship.heading, 0, 0];
            ac.velocity    = [0, 0, 0];
            console.log(TAG, `Teleported to ${ship.name}`);
        }, { capture: true });

        console.log(TAG, "READY — 1: Nimitz | 2: Eisenhower | 3: Gerald Ford | 4: Oil Rig");
    }
})();
