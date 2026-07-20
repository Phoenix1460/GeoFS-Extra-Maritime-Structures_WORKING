(async function () {
    var TAG = "[MARITIME-MOD]";
    var wait = setInterval(function () {
        if (!window.geofs || !window.Cesium) return;
        clearInterval(wait);
        init();
    }, 500);

    function init() {
        var viewer = geofs.api.viewer;
        var base = "https://cdn.jsdelivr.net/gh/Phoenix1460/GeoFS-Extra-Maritime-Structures_WORKING@main/modelfiles/";

        var SHIPS = [
            {
                name: "USS Nimitz (CVN-68)",
                model: "https://cdn.jsdelivr.net/gh/Phoenix1460/GeoFS-Extra-Maritime-Structures_WORKING@master/modelfiles/nimitz.glb",
                lat: 32.600, lon: -117.320, visualLat: 32.600, visualLon: -117.320,
                alt: 0, visualAlt: 52, heading: 315, hw: 170, hd: 30, deckAlt: 60, teleportAlt: 63, scale: 3
            },
            {
                name: "USS Dwight D. Eisenhower (CVN-69)",
                model: base + "eisenhower.glb",
                lat: 36.800, lon: -75.800, visualLat: 36.800, visualLon: -75.800,
                alt: 0, visualAlt: 0, heading: 45, hw: 170, hd: 30, deckAlt: 60, teleportAlt: 63, scale: 3
            },
            {
                name: "USS Gerald R. Ford (CVN-78)",
                model: base + "geraldford.glb",
                lat: 36.950, lon: -75.700, visualLat: 36.9432, visualLon: -75.7056,
                alt: 0, visualAlt: -31, heading: 45, hw: 175, hd: 32, deckAlt: 62, teleportAlt: 64, scale: 3
            },
            {
                name: "Oil rig (Gulf of Mexico)",
                model: base + "simplerig.glb",
                lat: 28.740, lon: -88.370, visualLat: 28.740, visualLon: -88.370,
                alt: 0, visualAlt: 16, heading: 0, hw: 55, hd: 55, deckAlt: 37, teleportAlt: 40, scale: 10
            }
        ];

        // Teleport using geofs.flyTo — native call keeps panel open
        function teleportTo(ship) {
            if (typeof geofs.flyTo === "function") {
                geofs.flyTo([ship.lat, ship.lon, ship.teleportAlt, ship.heading, true]);
            } else {
                var ac = geofs.aircraft.instance;
                if (!ac) return;
                ac.llaLocation = [ship.lat, ship.lon, ship.teleportAlt];
                ac.htr = [ship.heading, 0, 0];
                ac.velocity = [0, 0, 0];
            }
            setTimeout(function () {
                var ac = geofs.aircraft.instance;
                if (!ac) return;
                ac.velocity = [0, 0, 0];
                if (ac.rigidBody && ac.rigidBody.linearVelocity) {
                    ac.rigidBody.linearVelocity.setZero();
                }
            }, 500);
            console.log(TAG, "Teleported to " + ship.name);
        }

        // Spawn models
        SHIPS.forEach(function (ship) {
            var pos = Cesium.Cartesian3.fromDegrees(ship.visualLon, ship.visualLat, ship.alt + ship.visualAlt);
            var ori = Cesium.Transforms.headingPitchRollQuaternion(
                pos, new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(ship.heading), 0, 0)
            );
            viewer.entities.add({
                position: pos, orientation: ori,
                model: { uri: ship.model, scale: ship.scale, minimumPixelSize: 0, maximumScale: 100000 }
            });
        });
        viewer.scene.requestRender();

        // Ground altitude hooks
        function getShipAt(lat, lon) {
            for (var i = 0; i < SHIPS.length; i++) {
                var s = SHIPS[i];
                var mLat = 111320, mLon = 111320 * Math.cos(s.lat * Math.PI / 180);
                var dx = (lon - s.lon) * mLon, dy = (lat - s.lat) * mLat;
                var r = -s.heading * Math.PI / 180;
                var lx = dx * Math.cos(r) - dy * Math.sin(r);
                var ly = dx * Math.sin(r) + dy * Math.cos(r);
                if (Math.abs(lx) <= s.hw && Math.abs(ly) <= s.hd) return s;
            }
            return null;
        }

        var _oFast = geofs.api.getFastTerrainElevation.bind(geofs.api);
        geofs.api.getFastTerrainElevation = function (e) {
            var s = getShipAt(e[0], e[1]);
            return s ? s.alt + s.deckAlt : _oFast(e);
        };

        var _oGround = geofs.api.getGroundAltitude.bind(geofs.api);
        geofs.api.getGroundAltitude = function (e, t) {
            var s = getShipAt(e[0], e[1]);
            if (s) {
                var f = s.alt + s.deckAlt;
                if (t) { t.lastGroundAltitude = f; t.wrongAltitudeTries = 0; t.wrongValue = undefined; }
                return f;
            }
            return _oGround(e, t);
        };

        // Inject using GeoFS native classes — same pattern as Tokke_1111's mod
        // Watches for .geofs-location-list.geofs-visible so it runs each time panel opens
        function injectMenu() {
            var locationList = document.querySelector(
                ".geofs-list.geofs-toggle-panel.geofs-location-list.geofs-visible"
            );
            if (!locationList) return;
            if (locationList.dataset.mi) return;
            locationList.dataset.mi = "1";

            // geofs-list-collapsible-item = native collapsible section header
            var section = document.createElement("li");
            section.className = "geofs-list-collapsible-item";
            section.textContent = "Maritime Structures";

            // geofs-collapsible = native item list inside a section
            var ul = document.createElement("ul");
            ul.className = "geofs-collapsible";

            SHIPS.forEach(function (ship) {
                var li = document.createElement("li");
                li.textContent = ship.name;
                li.style.cursor = "pointer";
                li.addEventListener("click", function (e) {
                    e.stopPropagation();
                    teleportTo(ship);
                });
                ul.appendChild(li);
            });

            section.appendChild(ul);
            locationList.insertBefore(section, locationList.firstChild);
            console.log(TAG, "Maritime Structures injected into Location menu");
        }

        // Re-inject every time DOM changes — needed because GeoFS
        // destroys and recreates the list each time the panel opens
        new MutationObserver(function () {
            injectMenu();
        }).observe(document.body, { childList: true, subtree: true });

        console.log(TAG, "READY | Open LOCATION > Maritime Structures to teleport");
    }

})();
