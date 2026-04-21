const solids = [];

export function registerCollision(obj, settings) {
    if (!settings) return;

    solids.push({
        name: obj.name,
        collAlt: settings.collAlt,
        squares: settings.elevatorSquares || []
    });
}

export function updateCollision(plane) {
    solids.forEach(solid => {
        solid.squares.forEach(square => {
            if (pointInPolygon(plane.lla, square)) {
                plane.lla[2] = solid.collAlt;
                plane.vel[2] = 0;
            }
        });
    });
}

function pointInPolygon(point, polygon) {
    let x = point[0], y = point[1];
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        let xi = polygon[i][0], yi = polygon[i][1];
        let xj = polygon[j][0], yj = polygon[j][1];

        let intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

        if (intersect) inside = !inside;
    }

    return inside;
}
