export function updateCatapult(plane, catapultZones) {
    catapultZones.forEach(zone => {
        if (zone.active && zone.ready) {
            // inject forward velocity
            plane.vel[0] += zone.force;
        }
    });
}
