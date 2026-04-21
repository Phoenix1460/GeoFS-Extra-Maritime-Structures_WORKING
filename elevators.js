export function updateElevators(objects, collisionSettings) {
    objects.forEach(obj => {
        const settings = collisionSettings[obj.name];
        if (!settings || !settings.elevatorSquares) return;

        // Example: animate elevator height
        // (you will later tie this to UI or keybind)
    });
}
