(async function () {
    const TAG = "[REAL-COLLISION]";

    const wait = setInterval(() => {
        if (!window.geofs || !window.Cesium) return;
        clearInterval(wait);
        init();
    }, 500);

    async function init() {
        const viewer = geofs.api.viewer;

        const base = "https://cdn.jsdelivr.net/gh/Phoenix1460/GeoFS-Extra-Maritime-Structures_WORKING@main/";

        const collisions = await fetch(base + "collisionsettings.json").then(r => r.json());
        const locations = await fetch(base + "BuildingsLOC.json").then(r => r.json());

        const models = {
            "USS Nimitz (CVN-68)": base + "modelfiles/nimitz.glb",
            "USS Dwight D. Eisenhower (CVN-69)": base + "modelfiles/eisenhower.glb",
            "USS Gerald R. Ford (CVN-78)": base + "modelfiles/geraldford.glb",
            "Oil rig (Gulf of Mexico)": base + "modelfiles/simplerig.glb"
        };

        const spawned = [];

        locations.forEach(obj => {
            if (!obj.location || !models[obj.name]) return;

            const [lat, lon, alt, heading = 0] = obj.location;

            const pos = Cesium.Cartesian3.fromDegrees(lon, lat, alt);

            const ori = Cesium.Transforms.headingPitchRollQuaternion(
                pos,
                new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(heading), 0, 0)
            );

            viewer.entities.add({
                position: pos,
                orientation: ori,
                model: {
                    uri: models[obj.name],
                    scale: 3
                }
            });

            spawned.push({
                name: obj.name,
                lat,
                lon,
                heading,
                config: collisions[obj.name]
            });
        });

        function pointInPoly(p, poly) {
            let inside = false;
            for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                const xi = poly[i][0], yi = poly[i][1];
                const xj = poly[j][0], yj = poly[j][1];
                const intersect =
                    yi > p[1] !== yj > p[1] &&
                    p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi;
                if (intersect) inside = !inside;
            }
            return inside;
        }

        function worldToLocal(ac, ship) {
            const dx = (ac.llaLocation[1] - ship.lon) * 111320;
            const dy = (ac.llaLocation[0] - ship.lat) * 111320;
            const rad = -ship.heading * Math.PI / 180;

            return [
                dx * Math.cos(rad) - dy * Math.sin(rad),
                dx * Math.sin(rad) + dy * Math.cos(rad)
            ];
        }

        function loop() {
            const ac = geofs.aircraft.instance;
            if (!ac) return requestAnimationFrame(loop);

            for (let ship of spawned) {
                if (!ship.config) continue;

                const local = worldToLocal(ac, ship);

                for (let sq of ship.config.elevatorSquares) {
                    if (pointInPoly(local, sq)) {
                        if (ac.llaLocation[2] < ship.config.collAlt) {
                            ac.llaLocation[2] = ship.config.collAlt;
                            ac.velocity[2] = 0;
                        }
                    }
                }
            }

            requestAnimationFrame(loop);
        }

        loop();

        window.addEventListener("keydown", e => {
            if (!["1","2","3","4"].includes(e.key)) return;

            const ship = spawned[e.key - 1];
            if (!ship) return;

            const ac = geofs.aircraft.instance;

            ac.llaLocation = [ship.lat, ship.lon, 40];
            ac.htr = ship.heading;
            ac.velocity = [0,0,0];
        });

        console.log(TAG, "READY");
    }
})();
