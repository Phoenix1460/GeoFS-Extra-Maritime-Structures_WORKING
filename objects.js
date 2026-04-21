export function createObject(data) {
    return {
        name: data.name,
        lat: data.location[0],
        lon: data.location[1],
        alt: data.location[2],
        heading: data.location[3] || 0,
        model: null
    };
}

export function spawnObject(obj) {
    obj.model = geofs.api.createModel({
        url: `models/${obj.name}.glb`,
        lat: obj.lat,
        lon: obj.lon,
        alt: obj.alt,
        heading: obj.heading
    });
}
