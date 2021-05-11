import consts from './consts';
/**
 * Log text to the console or throw an error
 * @param text - Text to be logged
 * @param logLevel - The log level, either `warn`, `error' or `off`
 */
function log(text, logLevel) {
    if (logLevel === 'warn') {
        /* eslint-disable-next-line no-console */
        console.warn(text);
    }
    else if (logLevel === 'error') {
        throw new Error(text);
    }
}
/**
 * Check the config of the weapon for common errors and weird configurations.
 * @param weapon - The weapon being validated
 * @param property - The property of the weapon being validated
 */
function validateConfig(weapon, property = 'all') {
    var _a, _b;
    if ((['bulletWorldWrap', 'bulletKillType'].includes(property) ||
        property === 'all') &&
        weapon.bulletWorldWrap &&
        (weapon.bulletKillType === consts.KillType.KILL_WORLD_BOUNDS ||
            weapon.bulletKillType === consts.KillType.KILL_WEAPON_BOUNDS)) {
        log('Warning: KILL_WORLD_BOUNDS and KILL_WEAPON_BOUNDS does not work well with bulletWorldWrap set to true.', weapon.logLevel);
    }
    if ((['bulletKillType', 'bulletLifespan'].includes(property) ||
        property === 'all') &&
        weapon.bulletKillType === consts.KillType.KILL_LIFESPAN &&
        weapon.bulletLifespan < 0) {
        log('Invalid bulletLifespan; must be > 0; currently ' + weapon.bulletLifespan, weapon.logLevel);
    }
    if ((['trackRotation', 'trackedSprite'].includes(property) ||
        property === 'all') &&
        weapon.trackRotation === true &&
        (((_a = weapon.trackedSprite) === null || _a === void 0 ? void 0 : _a.rotation) === undefined ||
            weapon.trackedSprite.angle === undefined)) {
        log('Warning: Weapon cannot track rotation of an object without a rotation and/or angle property.', weapon.logLevel);
    }
    if ((['bulletInheritSpriteSpeed', 'trackedSprite'].includes(property) ||
        property === 'all') &&
        weapon.bulletInheritSpriteSpeed === true &&
        !((_b = weapon.trackedSprite) === null || _b === void 0 ? void 0 : _b.body)) {
        log('Warning: Bullet cannot inherit speed from a sprite without a body.', weapon.logLevel);
    }
    const shouldBePositive = [
        'fireLimit',
        'fireRate',
        'fireRateVariance',
        'bulletAngleVariance',
        'bulletSpeedVariance',
        'bulletKillDistance',
    ];
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    if (property === 'all') {
        shouldBePositive.forEach(key => {
            if (weapon[key] !== undefined && weapon[key] < 0) {
                log('Invalid ' + property + '; must be >= 0; currently ' + weapon[key], weapon.logLevel);
            }
        });
    }
    else if (shouldBePositive.includes(property) &&
        weapon[property] !== undefined &&
        weapon[property] < 0) {
        log('Invalid ' + property + '; must be >= 0; currently ' + weapon[property], weapon.logLevel);
    }
}
export { log };
export default validateConfig;
