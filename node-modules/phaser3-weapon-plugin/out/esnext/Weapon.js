import Bullet from './Bullet';
import { KillType, Angle, FrameType } from './consts';
import validateConfig, { log } from './validateConfig';
import { WEAPON_FIRE, WEAPON_FIRE_LIMIT } from './events';
/**
 * The Weapon provides the ability to easily create a bullet pool and manager.
 *
 * Weapons fire {@link Bullet} objects, which are essentially Sprites with a
 * few extra properties. The Bullets are enabled for Arcade Physics. They do
 * not currently work with Impact or Matter Physics.
 *
 * The Bullets are created inside of {@link bullets weapon.bullets}, which is
 * a {@link https://photonstorm.github.io/phaser3-docs/Phaser.GameObjects.Group.html Group} instance. Anything you can usually do
 * with a Group, like iterate it, etc can be done to the bullets Group too.
 *
 * Bullets can have textures and even animations. You can control the speed at
 * which they are fired, the firing rate, the firing angle, and even set things
 * like gravity for them.
 *
 * A small example, using add.weapon, assumed to be running from within a
 * {@link https://photonstorm.github.io/phaser3-docs/Phaser.Types.Scenes.html#.SceneCreateCallback Phaser.Scene.create} method:
 *
 * ```javascript
 * var weapon = this.add.weapon(10, 'bullet');
 * weapon.fireFrom.setPosition(300, 300);
 * this.input.on(Phaser.Input.Events.POINTER_DOWN, weapon.fire, this);
 * ```
 */
class Weapon extends Phaser.Events.EventEmitter {
    /**
     * TODO: a builder style interface would be neat. Can be kicked way forward
     * into polishing.
     * @param scene - A reference to the {@link https://photonstorm.github.io/phaser3-docs/Phaser.Scene.html Phaser.Scene} instance.
     * @param bulletLimit - The quantity of bullets to seed the Weapon with. If -1 it will set the pool to automatically expand.
     * @param key - The texture cache key of the image that this Sprite will use.
     * @param frame - If the Sprite image contains multiple frames you can specify which one to use here.
     * @param group - Optional Group to add the object to.
     */
    constructor(scene, bulletLimit, key = '', frame = '', group) {
        super();
        /**
         * Should debug graphics render for physics bodies?
         */
        this.debugPhysics = false;
        /**
         * Private var that holds the public {@link autoExpandBulletsGroup} property.
         */
        this._autoExpandBulletsGroup = false;
        /**
         * Private var that holds the public {@link autofire} property.
         */
        this._autofire = false;
        /**
         * Private var that holds the public {@link shots} property.
         */
        this._shots = 0;
        /**
         * Private var that holds the public {@link fireLimit} property.
         */
        this._fireLimit = 0;
        /**
         * Private var that holds the public {@link fireRate} property.
         */
        this._fireRate = 100;
        /**
         * Private var that holds the public {@link fireRateVariance} property.
         */
        this._fireRateVariance = 0;
        /**
         * Private var that holds the public {@link fireFrom} property.
         */
        this._fireFrom = new Phaser.Geom.Rectangle(0, 0, 1, 1);
        /**
         * Private var that holds the public {@link fireAngle} property.
         */
        this._fireAngle = Angle.ANGLE_UP;
        /**
         * Private var that holds the public {@link bulletInheritSpriteSpeed} property.
         */
        this._bulletInheritSpriteSpeed = false;
        /**
         * Private var that holds the public {@link bulletAnimation} property.
         */
        this._bulletAnimation = '';
        /**
         * Private var that holds the public {@link bulletFrameRandom} property.
         */
        this._bulletFrameRandom = false;
        /**
         * Private var that holds the public {@link bulletFrameCycle} property.
         */
        this._bulletFrameCycle = false;
        /**
         * Private var that holds the public {@link bulletWorldWrap} property.
         */
        this._bulletWorldWrap = false;
        /**
         * Private var that holds the public {@link bulletWorldWrapPadding} property.
         */
        this._bulletWorldWrapPadding = 0;
        /**
         * Private var that holds the public {@link bulletAngleOffset} property.
         */
        this._bulletAngleOffset = 0;
        /**
         * Private var that holds the public {@link bulletAngleVariance} property.
         */
        this._bulletAngleVariance = 0;
        /**
         * Private var that holds the public {@link bulletSpeed} property.
         */
        this._bulletSpeed = 200;
        /**
         * Private var that holds the public {@link bulletSpeedVariance} property.
         */
        this._bulletSpeedVariance = 0;
        /**
         * Private var that holds the public {@link bulletLifespan} property.
         */
        this._bulletLifespan = 0;
        /**
         * Private var that holds the public {@link bulletKillDistance} property.
         */
        this._bulletKillDistance = 0;
        /**
         * Private var that holds the public {@link bulletGravity} property.
         */
        this._bulletGravity = new Phaser.Math.Vector2(0, 0);
        /**
         * Private var that holds the public {@link bulletRotateToVelocity} property.
         */
        this._bulletRotateToVelocity = false;
        /**
         * Private var that holds the public {@link bulletClass} property.
         */
        this._bulletClass = Bullet;
        /**
         * Private var that holds the public {@link bulletCollideWorldBounds} property.
         */
        this._bulletCollideWorldBounds = false;
        /**
         * Private var that holds the public {@link bulletKillType} property.
         */
        this._bulletKillType = KillType.KILL_WORLD_BOUNDS;
        /**
         * Holds internal data about custom bullet body sizes.
         */
        this._data = {
            customBody: false,
            width: 0,
            height: 0,
            offsetX: 0,
            offsetY: 0,
        };
        /**
         * Private var that holds the public {@link bounds} property.
         */
        this._bounds = new Phaser.Geom.Rectangle();
        /**
         * This array stores the frames added via {@link setBulletFrames}.
         */
        this._bulletFrames = [];
        /**
         * Private var that holds the public {@link bulletFrameIndex} property.
         */
        this._bulletFrameIndex = 0;
        /**
         * An internal object that stores the animation data added via {@link addBulletAnimation}.
         */
        this.anims = {};
        /**
         * Private var that holds the public {@link multiFire} property.
         */
        this._multiFire = false;
        /**
         * Internal multiFire test flag.
         */
        this._hasFired = false;
        /**
         * Private var that holds the public {@link trackRotation} property.
         */
        this._trackRotation = false;
        /**
         * Private var that holds the public {@link trackOffset} property.
         */
        this._trackOffset = new Phaser.Math.Vector2();
        /**
         * Internal firing rate time tracking variable.
         */
        this._nextFire = 0;
        /**
         * Internal firing rate time tracking variable used by multiFire.
         */
        this._tempNextFire = 0;
        /**
         * Internal firing rotation tracking point.
         */
        this._rotatedPoint = new Phaser.Math.Vector2();
        /**
         * Log level for this weapon. Either `warn`, `error' or `off`. `warn` is the default.
         * If you change this, please do so before setting any other properties.
         */
        this.logLevel = 'warn';
        this.scene = scene;
        this._bulletKey = key;
        this._bulletFrame = frame;
        this._bulletBounds = this.scene.physics.world.bounds;
        validateConfig(this);
        this.createBullets(bulletLimit, key, frame, group);
    }
    /**
     * This is the {@link https://photonstorm.github.io/phaser3-docs/Phaser.GameObjects.Group.html Group} that contains all of the bullets managed by this plugin.
     */
    get bullets() {
        return this._bullets;
    }
    set bullets(value) {
        this._bullets = value;
        validateConfig(this, 'bullets');
    }
    /**
     * Should the bullet pool run out of bullets (i.e. they are all in flight) then this
     * boolean controls if the Group will create a brand new bullet object or not.
     * @default false
     */
    get autoExpandBulletsGroup() {
        return this._autoExpandBulletsGroup;
    }
    set autoExpandBulletsGroup(value) {
        this._autoExpandBulletsGroup = value;
        validateConfig(this, 'autoExpandBulletsGroup');
    }
    /**
     * Will this weapon auto fire? If set to true then a new bullet will be fired
     * based on the {@link fireRate} value.
     * @default false
     */
    get autofire() {
        return this._autofire;
    }
    set autofire(value) {
        this._autofire = value;
        validateConfig(this, 'autofire');
    }
    /**
     * The total number of bullets this Weapon has fired so far.
     * You can limit the number of shots allowed (via {@link fireLimit}), and reset
     * this total via {@link resetShots}.
     * @default 0
     */
    get shots() {
        return this._shots;
    }
    set shots(value) {
        this._shots = value;
        validateConfig(this, 'shots');
    }
    /**
     * The maximum number of shots that this Weapon is allowed to fire before it stops.
     * When the limit is hit the {@link WEAPON_FIRE_LIMIT} event is dispatched.
     * You can reset the shot counter via {@link resetShots}.
     * @default 0
     */
    get fireLimit() {
        return this._fireLimit;
    }
    set fireLimit(value) {
        this._fireLimit = value;
        validateConfig(this, 'fireLimit');
    }
    /**
     * The minimum interval between shots, in milliseconds.
     * @default 100
     */
    get fireRate() {
        return this._fireRate;
    }
    set fireRate(value) {
        this._fireRate = value;
        validateConfig(this, 'fireRate');
    }
    /**
     * This is a modifier that is added to the {@link fireRate} each update to add variety
     * to the firing rate of the Weapon. The value is given in milliseconds.
     * If you've a {@link fireRate} of 200 and a {@link fireRateVariance} of 50 then the actual
     * firing rate of the Weapon will be between 150 and 250.
     * @default 0
     */
    get fireRateVariance() {
        return this._fireRateVariance;
    }
    set fireRateVariance(value) {
        this._fireRateVariance = value;
        validateConfig(this, 'fireRateVariance');
    }
    /**
     * This is a Rectangle from within which the bullets are fired. By default it's a 1x1
     * rectangle, the equivalent of a Point. But you can change the width and height, and if
     * larger than 1x1 it'll pick a random point within the rectangle to launch the bullet from.
     */
    get fireFrom() {
        return this._fireFrom;
    }
    set fireFrom(value) {
        this._fireFrom = value;
        validateConfig(this, 'fireFrom');
    }
    /**
     * The angle at which the bullets are fired. This can be a const such as {@link Angle.ANGLE_UP ANGLE_UP}
     * or it can be any number from 0 to 360 inclusive, where 0 degrees is to the right.
     * @default {@link Angle.ANGLE_UP ANGLE_UP}
     */
    get fireAngle() {
        return this._fireAngle;
    }
    set fireAngle(value) {
        this._fireAngle = value;
        validateConfig(this, 'fireAngle');
    }
    /**
     * When a Bullet is fired it can optionally inherit the velocity of the {@link trackedSprite} if set.
     * @default false
     */
    get bulletInheritSpriteSpeed() {
        return this._bulletInheritSpriteSpeed;
    }
    set bulletInheritSpriteSpeed(value) {
        this._bulletInheritSpriteSpeed = value;
        validateConfig(this, 'bulletInheritSpriteSpeed');
    }
    /**
     * The string based name of the animation that the Bullet will be given on launch.
     * This is set via {@link addBulletAnimation}.
     * @default ''
     */
    get bulletAnimation() {
        return this._bulletAnimation;
    }
    set bulletAnimation(value) {
        this._bulletAnimation = value;
        validateConfig(this, 'bulletAnimation');
    }
    /**
     * If you've added a set of frames via {@link setBulletFrames} then you can optionally
     * chose for each Bullet fired to pick a random frame from the set.
     * @default false
     */
    get bulletFrameRandom() {
        return this._bulletFrameRandom;
    }
    set bulletFrameRandom(value) {
        this._bulletFrameRandom = value;
        validateConfig(this, 'bulletFrameRandom');
    }
    /**
     * If you've added a set of frames via {@link setBulletFrames} then you can optionally
     * chose for each Bullet fired to use the next frame in the set. The frame index is then
     * advanced one frame until it reaches the end of the set, then it starts from the start
     * again. Cycling frames like this allows you to create varied bullet effects via
     * sprite sheets.
     * @default false
     */
    get bulletFrameCycle() {
        return this._bulletFrameCycle;
    }
    set bulletFrameCycle(value) {
        this._bulletFrameCycle = value;
        validateConfig(this, 'bulletFrameCycle');
    }
    /**
     * Should the Bullets wrap around the world bounds? This automatically calls
     * {@link https://photonstorm.github.io/phaser3-docs/Phaser.Physics.Arcade.World.html#wrap World.wrap} on the Bullet each frame. See the docs for that method for details.
     * @default false
     */
    get bulletWorldWrap() {
        return this._bulletWorldWrap;
    }
    set bulletWorldWrap(value) {
        this._bulletWorldWrap = value;
        validateConfig(this, 'bulletWorldWrap');
    }
    /**
     * If {@link bulletWorldWrap} is true then you can provide an optional padding value with this
     * property. It's added to the calculations determining when the Bullet should wrap around
     * the world or not. The value is given in pixels.
     * @default 0
     */
    get bulletWorldWrapPadding() {
        return this._bulletWorldWrapPadding;
    }
    set bulletWorldWrapPadding(value) {
        this._bulletWorldWrapPadding = value;
        validateConfig(this, 'bulletWorldWrapPadding');
    }
    /**
     * An optional angle offset applied to the Bullets when they are launched.
     * This is useful if for example your bullet sprites have been drawn facing up, instead of
     * to the right, and you want to fire them at an angle. In which case you can set the
     * angle offset to be 90 and they'll be properly rotated when fired.
     * @default 0
     */
    get bulletAngleOffset() {
        return this._bulletAngleOffset;
    }
    set bulletAngleOffset(value) {
        this._bulletAngleOffset = value;
        validateConfig(this, 'bulletAngleOffset');
    }
    /**
     * This is a variance added to the angle of Bullets when they are fired.
     * If you fire from an angle of 90 and have a {@link bulletAngleVariance} of 20 then the actual
     * angle of the Bullets will be between 70 and 110 degrees. This is a quick way to add a
     * great 'spread' effect to a Weapon.
     * @default 0
     */
    get bulletAngleVariance() {
        return this._bulletAngleVariance;
    }
    set bulletAngleVariance(value) {
        this._bulletAngleVariance = value;
        validateConfig(this, 'bulletAngleVariance');
    }
    /**
     * The initial velocity of fired bullets, in pixels per second.
     * @default 200
     */
    get bulletSpeed() {
        return this._bulletSpeed;
    }
    set bulletSpeed(value) {
        this._bulletSpeed = value;
        validateConfig(this, 'bulletSpeed');
    }
    /**
     * This is a variance added to the speed of Bullets when they are fired.
     * If bullets have a {@link bulletSpeed} value of 200, and a {@link bulletSpeedVariance} of 50
     * then the actual speed of the Bullets will be between 150 and 250 pixels per second.
     * @default 0
     */
    get bulletSpeedVariance() {
        return this._bulletSpeedVariance;
    }
    set bulletSpeedVariance(value) {
        this._bulletSpeedVariance = value;
        validateConfig(this, 'bulletSpeedVariance');
    }
    /**
     * If you've set {@link bulletKillType} to {@link KillType.KILL_LIFESPAN KILL_LIFESPAN} this controls the amount
     * of lifespan the Bullets have set on launch. The value is given in milliseconds.
     * When a Bullet hits its lifespan limit it will be automatically killed.
     * @default 0
     */
    get bulletLifespan() {
        return this._bulletLifespan;
    }
    set bulletLifespan(value) {
        this._bulletLifespan = value;
        validateConfig(this, 'bulletLifespan');
    }
    /**
     * If you've set {@link bulletKillType} to {@link KillType.KILL_DISTANCE KILL_DISTANCE} this controls the distance
     * the Bullet can travel before it is automatically killed. The distance is given in pixels.
     * @default 0
     */
    get bulletKillDistance() {
        return this._bulletKillDistance;
    }
    set bulletKillDistance(value) {
        this._bulletKillDistance = value;
        validateConfig(this, 'bulletKillDistance');
    }
    /**
     * This is the amount of {@link https://photonstorm.github.io/phaser3-docs/Phaser.Physics.Arcade.Body.html#gravity Phaser.Physics.Arcade.Body.gravity} added to the Bullets physics body when fired.
     * Gravity is expressed in pixels / second / second.
     */
    get bulletGravity() {
        return this._bulletGravity;
    }
    set bulletGravity(value) {
        this._bulletGravity = value;
        validateConfig(this, 'bulletGravity');
    }
    /**
     * Bullets can optionally adjust their rotation in-flight to match their velocity.
     * This can create the effect of a bullet 'pointing' to the path it is following, for example
     * an arrow being fired from a bow, and works especially well when added to {@link bulletGravity}.
     * @default false
     */
    get bulletRotateToVelocity() {
        return this._bulletRotateToVelocity;
    }
    set bulletRotateToVelocity(value) {
        this._bulletRotateToVelocity = value;
        validateConfig(this, 'bulletRotateToVelocity');
    }
    /**
     * The Texture Key that the Bullets use when rendering.
     * Changing this has no effect on bullets in-flight, only on newly spawned bullets.
     * @default ''
     */
    get bulletKey() {
        return this._bulletKey;
    }
    set bulletKey(value) {
        this._bulletKey = value;
        validateConfig(this, 'bulletKey');
    }
    /**
     * The Texture Frame that the Bullets use when rendering.
     * Changing this has no effect on bullets in-flight, only on newly spawned bullets.
     * @default ''
     */
    get bulletFrame() {
        return this._bulletFrame;
    }
    set bulletFrame(value) {
        this._bulletFrame = value;
        validateConfig(this, 'bulletFrame');
    }
    /**
     * The Class of the bullets that are launched by this Weapon. Defaults to {@link Bullet}, but can be
     * overridden before calling {@link createBullets} and set to your own class type.
     *
     * It should be a constructor function accepting `(scene, x, y, key, frame)`.
     * @default Bullet
     */
    get bulletClass() {
        return this._bulletClass;
    }
    set bulletClass(classType) {
        this._bulletClass = classType;
        // `this.bullets` exists only after createBullets()
        if (this.bullets) {
            this.bullets.classType = this._bulletClass;
        }
        validateConfig(this, 'bulletClass');
    }
    /**
     * Should bullets collide with the World bounds or not?
     * @default false
     */
    get bulletCollideWorldBounds() {
        return this._bulletCollideWorldBounds;
    }
    set bulletCollideWorldBounds(value) {
        this._bulletCollideWorldBounds = value;
        this.bullets.children.each(child => {
            child.body.collideWorldBounds = value;
            child.setData('bodyDirty', false);
        });
        validateConfig(this, 'bulletCollideWorldBounds');
    }
    /**
     * This controls how the bullets will be killed. The default is {@link KillType.KILL_WORLD_BOUNDS KILL_WORLD_BOUNDS}.
     *
     * There are 7 different "kill types" available:
     *
     * * {@linkcode KillType.KILL_NEVER KILL_NEVER}
     * The bullets are never destroyed by the Weapon. It's up to you to destroy them via your own code.
     *
     * * {@linkcode KillType.KILL_LIFESPAN KILL_LIFESPAN}
     * The bullets are automatically killed when their {@link bulletLifespan} amount expires.
     *
     * * {@linkcode KillType.KILL_DISTANCE KILL_DISTANCE}
     * The bullets are automatically killed when they
     * exceed {@link bulletKillDistance} pixels away from their original launch position.
     *
     * * {@linkcode KillType.KILL_WEAPON_BOUNDS KILL_WEAPON_BOUNDS}
     * The bullets are automatically killed when they no longer intersect with the {@link bounds} rectangle.
     *
     * * {@linkcode KillType.KILL_CAMERA_BOUNDS KILL_CAMERA_BOUNDS}
     * The bullets are automatically killed when they no longer intersect with the {@link https://photonstorm.github.io/phaser3-docs/Phaser.Cameras.Scene2D.Camera.html#getBounds Camera.getBounds} rectangle.
     *
     * * {@linkcode KillType.KILL_WORLD_BOUNDS KILL_WORLD_BOUNDS}
     * The bullets are automatically killed when they no longer intersect with the {@link https://photonstorm.github.io/phaser3-docs/Phaser.Physics.Arcade.World.html#bounds World.bounds} rectangle.
     *
     * * {@linkcode KillType.KILL_STATIC_BOUNDS KILL_STATIC_BOUNDS}
     * The bullets are automatically killed when they no longer intersect with the {@link bounds} rectangle.
     * The difference between static bounds and weapon bounds, is that a static bounds will never be adjusted to
     * match the position of a tracked sprite or pointer.
     * @default {@link KillType.KILL_WORLD_BOUNDS KILL_WORLD_BOUNDS}
     */
    get bulletKillType() {
        return this._bulletKillType;
    }
    set bulletKillType(type) {
        switch (type) {
            case KillType.KILL_STATIC_BOUNDS:
            case KillType.KILL_WEAPON_BOUNDS:
                this.bulletBounds = this.bounds;
                break;
            case KillType.KILL_CAMERA_BOUNDS:
                this.bulletBounds = this.scene.sys.cameras.main.getBounds();
                break;
            case KillType.KILL_WORLD_BOUNDS:
                this.bulletBounds = this.scene.physics.world.bounds;
                break;
        }
        this._bulletKillType = type;
        validateConfig(this, 'bulletKillType');
    }
    /**
     * This Rectangle defines the bounds that are used when determining if a Bullet should be killed or not.
     * It's used in combination with {@link bulletKillType} when that is set to either {@link KillType.KILL_WEAPON_BOUNDS KILL_WEAPON_BOUNDS}
     * or {@link KillType.KILL_STATIC_BOUNDS KILL_STATIC_BOUNDS}. If you are not using either of these kill types then the bounds are ignored.
     * If you are tracking a Sprite or Point then the bounds are centered on that object every frame.
     */
    get bounds() {
        return this._bounds;
    }
    set bounds(value) {
        this._bounds = value;
        validateConfig(this, 'bounds');
    }
    /**
     * The Rectangle used to calculate the bullet bounds from.
     */
    get bulletBounds() {
        return this._bulletBounds;
    }
    set bulletBounds(value) {
        this._bulletBounds = value;
        validateConfig(this, 'bulletBounds');
    }
    /**
     * This array stores the frames added via {@link setBulletFrames}.
     */
    get bulletFrames() {
        return this._bulletFrames;
    }
    set bulletFrames(value) {
        this._bulletFrames = value;
        validateConfig(this, 'bulletFrames');
    }
    /**
     * The index of the frame within {@link bulletFrames} that is currently being used.
     * This value is only used if {@link bulletFrameCycle} is set to `true`.
     */
    get bulletFrameIndex() {
        return this._bulletFrameIndex;
    }
    set bulletFrameIndex(value) {
        this._bulletFrameIndex = value;
        validateConfig(this, 'bulletFrameIndex');
    }
    /**
     * The Sprite currently being tracked by the Weapon, if any.
     * This is set via the {@link trackSprite} method.
     */
    get trackedSprite() {
        return this._trackedSprite;
    }
    set trackedSprite(value) {
        this._trackedSprite = value;
        validateConfig(this, 'trackedSprite');
    }
    /**
     * The Pointer currently being tracked by the Weapon, if any.
     * This is set via the {@link trackPointer} method.
     */
    get trackedPointer() {
        return this._trackedPointer;
    }
    set trackedPointer(value) {
        this._trackedPointer = value;
        validateConfig(this, 'trackedPointer');
    }
    /**
     * If you want this Weapon to be able to fire more than 1 bullet in a single
     * update, then set this property to `true`. When `true` the Weapon plugin won't
     * set the shot / firing timers until the {@link postRender} phase of the game loop.
     * This means you can call {@link fire} (and similar methods) as often as you like in one
     * single game update.
     * @default false
     */
    get multiFire() {
        return this._multiFire;
    }
    set multiFire(value) {
        this._multiFire = value;
        validateConfig(this, 'multiFire');
    }
    /**
     * If the Weapon is tracking a Sprite, should it also track the Sprites rotation?
     * This is useful for a game such as Asteroids, where you want the weapon to fire based
     * on the sprites rotation.
     * @default false
     */
    get trackRotation() {
        return this._trackRotation;
    }
    set trackRotation(value) {
        this._trackRotation = value;
        validateConfig(this, 'trackRotation');
    }
    /**
     * The Track Offset is a Vector2 object that allows you to specify a pixel offset that bullets use
     * when launching from a tracked Sprite or Pointer. For example if you've got a bullet that is 2x2 pixels
     * in size, but you're tracking a Sprite that is 32x32, then you can set `trackOffset.x = 16` to have
     * the bullet launched from the center of the Sprite.
     */
    get trackOffset() {
        return this._trackOffset;
    }
    set trackOffset(value) {
        this._trackOffset = value;
        validateConfig(this, 'trackOffset');
    }
    /**
     * The x coordinate from which bullets are fired. This is the same as {@link Weapon.fireFrom}.x, and
     * can be overridden by the {@link fire} arguments.
     */
    get x() {
        return this.fireFrom.x;
    }
    set x(value) {
        this.fireFrom.x = value;
    }
    /**
     * The y coordinate from which bullets are fired. This is the same as {@link Weapon.fireFrom}.y, and
     * can be overridden by the {@link fire} arguments.
     */
    get y() {
        return this.fireFrom.y;
    }
    set y(value) {
        this.fireFrom.y = value;
    }
    /**
     * This method performs two actions: First it will check to see if the
     * {@link bullets} Group exists or not, and if not it creates it, adding its
     * children to the `group` given as the 4th argument.
     *
     * Then it will seed the bullet pool with the `quantity` number of Bullets,
     * using the texture key and frame provided (if any).
     *
     * If for example you set the quantity to be 10, then this Weapon will only
     * ever be able to have 10 bullets in-flight simultaneously. If you try to
     * fire an 11th bullet then nothing will happen until one, or more, of the
     * in-flight bullets have been killed, freeing them up for use by the Weapon
     * again.
     *
     * If you do not wish to have a limit set, then pass in -1 as the quantity.
     * In this instance the Weapon will keep increasing the size of the bullet
     * pool as needed. It will never reduce the size of the pool however, so be
     * careful it doesn't grow too large.
     *
     * You can either set the texture key and frame here, or via the
     * {@link bulletKey} and {@link bulletFrame} properties. You can also
     * animate bullets, or set them to use random frames. All Bullets belonging
     * to a single Weapon instance must share the same texture key however.
     *
     * @param quantity - The quantity of bullets to seed the Weapon
     *  with. If -1 it will set the pool to automatically expand.
     * @param key - The texture cache key of the image that this
     *  Sprite will use.
     * @param frame - If the Sprite image contains multiple
     *  frames you can specify which one to use here.
     * @param group - Optional Group to add the object to.
     * @return This Weapon instance.
     */
    createBullets(quantity = 1, key, frame, group, bulletClass) {
        if (bulletClass) {
            this._bulletClass = bulletClass;
        }
        if (!this.bullets || !this.bullets.scene) {
            this.bullets = this.scene.add.group({
                classType: this._bulletClass,
                maxSize: quantity,
                runChildUpdate: true,
            });
        }
        if (quantity !== 0) {
            if (quantity === -1) {
                this.autoExpandBulletsGroup = true;
                quantity = 1;
            }
            this.bullets.createMultiple({
                key,
                frame,
                repeat: quantity,
                active: false,
                visible: false,
            });
            this.bullets.children.each(child => {
                child.setData('bulletManager', this);
            });
            if (typeof key === 'string') {
                this.bulletKey = key;
            }
            if (typeof frame === 'string') {
                this.bulletFrame;
            }
            if (group) {
                group.addMultiple(this.bullets.children.entries);
            }
        }
        return this;
    }
    /* eslint-disable no-unused-vars */
    /**
     * Call a function on each in-flight bullet in this Weapon.
     *
     * See {@link https://photonstorm.github.io/phaser3-docs/Phaser.Structs.Set.html#each Set.each} for more details.
     *
     * @param callback - The function that will be called for each applicable child.
     * The child will be passed as the first argument.
     * @param callbackContext - The context in which the function should be called (usually 'this').
     * @param args - Additional arguments to pass to the callback function, after the child item.
     * @return This Weapon instance.
     */
    forEach(callback, callbackContext, ...args) {
        this.bullets.children.each(child => {
            if (child.active) {
                callback.call(callbackContext, child, args);
            }
        });
        return this;
    }
    /* eslint-enable no-unused-vars */
    /**
     * Sets {@link https://photonstorm.github.io/phaser3-docs/Phaser.Physics.Arcade.Body.html#enable Body.enable} to `false` on each bullet in this Weapon.
     * This has the effect of stopping them in-flight should they be moving.
     * It also stops them being able to be checked for collision.
     *
     * @return This Weapon instance.
     */
    pauseAll() {
        this.bullets.children.each(child => {
            child.body.enable = false;
            const timeEvent = child.getData('timeEvent');
            if (timeEvent !== undefined) {
                timeEvent.paused = true;
            }
        }, this);
        return this;
    }
    /**
     * Sets {@link https://photonstorm.github.io/phaser3-docs/Phaser.Physics.Arcade.Body.html#enable Body.enable} to `true` on each bullet in this Weapon.
     * This has the effect of resuming their motion should they be in-flight.
     * It also enables them for collision checks again.
     *
     * @return This Weapon instance.
     */
    resumeAll() {
        this.bullets.children.each(child => {
            child.body.enable = true;
            const timeEvent = child.getData('timeEvent');
            if (timeEvent !== undefined) {
                timeEvent.paused = false;
            }
        }, this);
        return this;
    }
    /**
     * Calls {@link Bullet.kill} on every in-flight bullet in this Weapon.
     * Also re-enables their physics bodies, should they have been disabled via {@link pauseAll}.
     *
     * @return This Weapon instance.
     */
    killAll() {
        this.bullets.children.each(child => {
            if (child.active) {
                child.kill();
            }
            child.body.enable = true;
        });
        return this;
    }
    /**
     * Resets the {@link shots} counter back to zero. This is used when you've set
     * {@link fireLimit} and have hit (or just wish to reset) your limit.
     *
     * @param newLimit - Optionally set a new {@link fireLimit}.
     * @return This Weapon instance.
     */
    resetShots(newLimit) {
        this.shots = 0;
        if (newLimit !== undefined) {
            this.fireLimit = newLimit;
        }
        return this;
    }
    /**
     * Sets this Weapon to track the given Sprite, or any {@link ObjectWithTransform Object with x/y coords and optionally rotation}
     * When a Weapon tracks a Sprite it will automatically update its {@link fireFrom} value to match the
     * Sprite's position within the Game World, adjusting the coordinates based on the offset arguments.
     *
     * This allows you to lock a Weapon to a Sprite, so that bullets are always launched from its location.
     *
     * Calling {@link trackSprite} will reset {@link trackedPointer} to undefined, should it have been set, as you can
     * only track _either_ a Sprite, or a Pointer, at once, but not both.
     *
     * @param sprite - The Sprite to track the position of.
     * @param offsetX - The horizontal offset from the Sprites position to be applied to the Weapon.
     * @param offsetY - The vertical offset from the Sprites position to be applied to the Weapon.
     * @param trackRotation - Should the Weapon also track the Sprites rotation?
     * @return This Weapon instance.
     */
    trackSprite(sprite, offsetX = 0, offsetY = 0, trackRotation = false) {
        this.trackedPointer = undefined;
        this.trackedSprite = sprite;
        this.trackRotation = trackRotation;
        this.trackOffset.set(offsetX, offsetY);
        return this;
    }
    /**
     * Sets this Weapon to track the given Pointer.
     * When a Weapon tracks a Pointer it will automatically update its {@link fireFrom} value to match the Pointer's
     * position within the Game World, adjusting the coordinates based on the offset arguments.
     *
     * This allows you to lock a Weapon to a Pointer, so that bullets are always launched from its location.
     *
     * Calling {@link trackPointer} will reset {@link trackedSprite} to undefined, should it have been set, as you can
     * only track _either_ a Pointer, or a Sprite, at once, but not both.
     *
     * @param pointer - The Pointer to track the position of.
     * Defaults to {@link https://photonstorm.github.io/phaser3-docs/Phaser.Input.InputPlugin.html#activePointer InputPlugin.activePointer} if not specified.
     * @param offsetX - The horizontal offset from the Pointers position to be applied to the Weapon.
     * @param offsetY - The vertical offset from the Pointers position to be applied to the Weapon.
     * @return This Weapon instance.
     */
    trackPointer(pointer, offsetX = 0, offsetY = 0) {
        if (pointer === undefined && this.scene.input) {
            pointer = this.scene.input.activePointer;
        }
        this.trackedPointer = pointer;
        this.trackedSprite = undefined;
        this.trackRotation = false;
        this.trackOffset.set(offsetX, offsetY);
        return this;
    }
    /**
     * Attempts to fire multiple bullets from the positions defined in the given array.
     *
     * If you provide a `from` argument, or if there is a tracked Sprite or Pointer, then
     * the positions are treated as __offsets__ from the given objects position.
     *
     * If `from` is undefined, and there is no tracked object, then the bullets are fired
     * from the given positions, as they exist in the world.
     *
     * Calling this method sets {@link multiFire} to `true`.
     *
     * If there are not enough bullets available in the pool, and the pool cannot be extended,
     * then this method may not fire from all of the given positions.
     *
     * When the bullets are launched they have their texture and frame updated, as required.
     * The velocity of the bullets are calculated based on Weapon properties like {@link bulletSpeed}.
     *
     * @param positions - An array of positions. Each position can be any Object, as long as it
     * has public `x` and `y` properties, such as {@link https://photonstorm.github.io/phaser3-docs/Phaser.Geom.Point.html Point}, { x: 0, y: 0 }, {@link https://photonstorm.github.io/phaser3-docs/Phaser.GameObjects.Sprite.html Sprite}
     * @param from Optionally fires the bullets **from** the {@link x} and {@link y} properties of this object,
     * _instead_ of any {@link trackedSprite} or {@link trackedPointer} that is set.
     * @return An array containing all of the fired Bullet objects,
     * if a launch was successful, otherwise an empty array.
     */
    fireMany(positions, from) {
        this.multiFire = true;
        const bullets = [];
        if (from || this.trackedSprite || this.trackedPointer) {
            positions.forEach(offset => {
                const bullet = this.fire(from, null, null, offset.x, offset.y);
                if (bullet) {
                    bullets.push(bullet);
                }
            });
        }
        else {
            positions.forEach(position => {
                const bullet = this.fire(position);
                if (bullet) {
                    bullets.push(bullet);
                }
            });
        }
        return bullets;
    }
    /**
     * Attempts to fire a single Bullet from a tracked Sprite or Pointer, but applies an offset
     * to the position first. This is the same as calling {@link fire} and passing in the offset arguments.
     *
     * If there are no more bullets available in the pool, and the pool cannot be extended,
     * then this method returns `undefined`. It will also return `undefined` if not enough time has expired since the last time
     * the Weapon was fired, as defined in the {@link fireRate} property.
     *
     * Otherwise the first available bullet is selected, launched, and returned.
     *
     * When the bullet is launched it has its texture and frame updated, as required. The velocity of the bullet is
     * calculated based on Weapon properties like {@link bulletSpeed}.
     *
     * If you wish to fire multiple bullets in a single game update, then set {@link multiFire} to `true`
     * and you can call this method as many times as you like, per loop. See also {@link fireMany}.
     *
     * @param offsetX - The horizontal offset from the position of the tracked Sprite or Pointer,
     * as set with {@link trackSprite}.
     * @param offsetY - The vertical offset from the position of the tracked Sprite or Pointer,
     * as set with {@link trackSprite}.
     * @return The fired bullet, if a launch was successful, otherwise `undefined`.
     */
    fireOffset(offsetX = 0, offsetY = 0) {
        return this.fire(null, null, null, offsetX, offsetY);
    }
    /**
     * Fires a bullet **at** the given Pointer. The bullet will be launched from the {@link fireFrom} position,
     * or from a Tracked Sprite or Pointer, if you have one set.
     *
     * @param pointer - The Pointer to fire the bullet towards.
     * @return The fired bullet if successful, undefined otherwise.
     */
    fireAtPointer(pointer) {
        if (pointer === undefined && this.scene.input) {
            pointer = this.scene.input.activePointer;
        }
        return this.fire(null, pointer?.x, pointer?.y);
    }
    /**
     * Fires a bullet **at** the given Sprite. The bullet will be launched from the {@link fireFrom} position,
     * or from a Tracked Sprite or Pointer, if you have one set.
     *
     * @param sprite - The Sprite to fire the bullet towards.
     * @return The fired bullet if successful, undefined otherwise.
     */
    fireAtSprite(sprite) {
        return this.fire(null, sprite?.x, sprite?.y);
    }
    /**
     * Fires a bullet **at** the given coordinates. The bullet will be launched from the {@link fireFrom} position,
     * or from a Tracked Sprite or Pointer, if you have one set.
     *
     * @param x - The x coordinate, in world space, to fire the bullet towards.
     * @param y - The y coordinate, in world space, to fire the bullet towards.
     * @return The fired bullet if successful, undefined otherwise.
     */
    fireAtXY(x, y) {
        return this.fire(null, x, y);
    }
    /**
     * Attempts to fire a single Bullet. If there are no more bullets available in the pool,
     * and the pool cannot be extended, then this method returns `undefined`. It will also return `undefined`
     * if not enough time has expired since the last time the Weapon was fired,
     * as defined in the {@link fireRate} property.
     *
     * Otherwise the first available bullet is selected, launched, and returned.
     *
     * The arguments are all optional, but allow you to control both where the bullet is launched from, and aimed at.
     *
     * If you don't provide any of the arguments then it uses those set via properties such as {@link trackedSprite},
     * {@link fireAngle} and so on.
     *
     * When the bullet is launched it has its texture and frame updated, as required. The velocity of the bullet is
     * calculated based on Weapon properties like {@link bulletSpeed}.
     *
     * If you wish to fire multiple bullets in a single game update, then set `Weapon.multiFire = true`
     * and you can call {@link fire} as many times as you like, per loop. Multiple fires in a single update
     * only counts once towards the {@link shots} total, but you will still receive an event for each bullet.
     *
     * @param from Optionally fires the bullet **from** the {@link x} and {@link y} properties of this object.
     * If set this overrides {@link trackedSprite} or {@link trackedPointer}. Pass `null` to ignore it.
     * @param x - The x coordinate, in world space, to fire the bullet **towards**.
     * If left as `undefined`, or `null`, the bullet direction is based on its angle.
     * @param y - The y coordinate, in world space, to fire the bullet **towards**.
     * If left as `undefined`, or `null`, the bullet direction is based on its angle.
     * @param offsetX - If the bullet is fired from a tracked Sprite or Pointer,
     * or the `from` argument is set, this applies a horizontal offset from the launch position.
     * @param offsetY - If the bullet is fired from a tracked Sprite or Pointer,
     * or the `from` argument is set, this applies a vertical offset from the launch position.
     * @return The fired bullet, if a launch was successful, otherwise `undefined`.
     */
    fire(from, x, y, offsetX = 0, offsetY = 0) {
        if (this.scene.time.now < this._nextFire ||
            (this.fireLimit > 0 && this.shots === this.fireLimit)) {
            return undefined;
        }
        let speed = this.bulletSpeed;
        //  Apply +- speed variance
        if (this.bulletSpeedVariance !== 0) {
            speed += Phaser.Math.Between(-this.bulletSpeedVariance, this.bulletSpeedVariance);
        }
        // Position the fireFrom rectangle
        if (from) {
            // Fire based on passed coordinates
            this.updateFireFrom(from.x, from.y);
        }
        else if (this.trackedSprite &&
            typeof this.trackedSprite.rotation === 'number') {
            // Fire based on tracked sprite
            if (this.trackRotation) {
                this._rotatedPoint.set(this.trackedSprite.x + this.trackOffset.x, this.trackedSprite.y + this.trackOffset.y);
                Phaser.Math.RotateAround(this._rotatedPoint, this.trackedSprite.x, this.trackedSprite.y, this.trackedSprite.rotation);
                this.updateFireFrom(this._rotatedPoint.x, this._rotatedPoint.y);
            }
            else {
                this.updateFireFrom(this.trackedSprite.x, this.trackedSprite.y);
            }
            if (this.bulletInheritSpriteSpeed && this.trackedSprite.body) {
                speed += this.trackedSprite.body.speed;
            }
        }
        else if (this.trackedPointer) {
            // Fire based on tracked pointer
            this.updateFireFrom(this.trackedPointer.x, this.trackedPointer.y);
        }
        // Take offset into account
        this.fireFrom.x += offsetX;
        this.fireFrom.y += offsetY;
        // Pick a random coordinate inside the fireFrom rectangle if bigger than 1
        const fromX = this.fireFrom.width > 1
            ? this.fireFrom.x + Math.random() * this.fireFrom.width
            : this.fireFrom.x;
        const fromY = this.fireFrom.height > 1
            ? this.fireFrom.y + Math.random() * this.fireFrom.height
            : this.fireFrom.y;
        let angle = typeof this.trackedSprite?.angle === 'number' && this.trackRotation
            ? this.trackedSprite.angle
            : this.fireAngle;
        //  The position (in world space) to fire the bullet towards, if set
        if (typeof x === 'number' && typeof y === 'number') {
            angle = Phaser.Math.RadToDeg(Math.atan2(y - fromY, x - fromX));
        }
        //  Apply +- angle variance
        if (this.bulletAngleVariance !== 0) {
            angle += Phaser.Math.Between(-this.bulletAngleVariance, this.bulletAngleVariance);
        }
        let moveX = 0;
        let moveY = 0;
        //  Avoid unnecessary sin/cos for right-angled shots
        if (angle === 0 || angle === 180) {
            // Only cos needed
            moveX = Math.cos(Phaser.Math.DegToRad(angle)) * speed;
        }
        else if (angle === 90 || angle === 270) {
            // Only sin needed
            moveY = Math.sin(Phaser.Math.DegToRad(angle)) * speed;
        }
        else {
            // Need to calculate both
            moveX = Math.cos(Phaser.Math.DegToRad(angle)) * speed;
            moveY = Math.sin(Phaser.Math.DegToRad(angle)) * speed;
        }
        let bullet;
        // Attempt to get a bullet instance to use
        if (this.autoExpandBulletsGroup) {
            bullet = this.bullets.getFirstDead(true, fromX, fromY, this.bulletKey, this.bulletFrame);
            bullet?.setData('bulletManager', this);
        }
        else {
            bullet = this.bullets.getFirstDead(false);
        }
        // Prepare and fire the bullet
        if (bullet !== undefined) {
            bullet.prepare(fromX, fromY);
            bullet.setData({
                fromX,
                fromY,
                killType: this.bulletKillType,
                killDistance: this.bulletKillDistance,
                rotateToVelocity: this.bulletRotateToVelocity,
            });
            // Prepare timer for bullet lifespan
            if (this.bulletKillType === KillType.KILL_LIFESPAN) {
                bullet.setData('timeEvent', this.scene.time.addEvent({
                    delay: this.bulletLifespan,
                    callback: bullet.kill,
                    callbackScope: bullet,
                }));
                bullet.lifespan = this.bulletLifespan;
            }
            bullet.angle = angle + this.bulletAngleOffset;
            //  Frames and Animations
            if (this.bulletAnimation) {
                bullet.anims.play(this.bulletAnimation);
            }
            else if (this.bulletFrameCycle) {
                // Calculate bullet frame to use
                if (this.bulletFrameIndex >= this.bulletFrames.length) {
                    this.bulletFrameIndex = 0;
                }
                bullet.setTexture(this.bulletKey, this.bulletFrameIndex);
                this.bulletFrameIndex++;
            }
            else if (this.bulletFrameRandom) {
                // Pick a bullet frame at random
                const nextFrame = Math.floor(Math.random() * this.bulletFrames.length);
                bullet.setTexture(this.bulletKey, nextFrame);
            }
            // Set correct size and position for bullet body
            if (bullet.getData('bodyDirty')) {
                if (this._data.customBody) {
                    bullet.body.setSize(this._data.width, this._data.height);
                    bullet.body.setOffset(this._data.offsetX, this._data.offsetY);
                }
                bullet.body.collideWorldBounds = this.bulletCollideWorldBounds;
                bullet.setData('bodyDirty', false);
            }
            bullet.body.setVelocity(moveX, moveY);
            bullet.body.setGravity(this.bulletGravity.x, this.bulletGravity.y);
            let next = 0;
            // Calculate when to fire next bullet, taking into account speed variance
            if (this.bulletSpeedVariance !== 0) {
                let rate = this.fireRate;
                rate += Phaser.Math.Between(-this.fireRateVariance, this.fireRateVariance);
                if (rate < 0) {
                    rate = 0;
                }
                next = this.scene.time.now + rate;
            }
            else {
                next = this.scene.time.now + this.fireRate;
            }
            // Prepare for next shot
            if (this.multiFire) {
                if (!this._hasFired) {
                    //  We only add 1 to the 'shots' count for multiFire shots
                    this._hasFired = true;
                    this._tempNextFire = next;
                    this.shots++;
                }
            }
            else {
                this._nextFire = next;
                this.shots++;
            }
            // Emit events
            this.emit(WEAPON_FIRE, bullet, this, speed);
            if (this.fireLimit > 0 && this.shots === this.fireLimit) {
                this.emit(WEAPON_FIRE_LIMIT, this, this.fireLimit);
            }
        }
        return bullet;
    }
    /**
     * Set the fireFrom rectangle based on passed coords
     * @private
     * @param x - X coordinate for where to fire from
     * @param y - Y coordinate for where to fire from
     */
    updateFireFrom(x, y) {
        if (this.fireFrom.width > 1) {
            // If size is larger than 1, center on coordinates
            Phaser.Geom.Rectangle.CenterOn(this.fireFrom, x + this.trackOffset.x, y + this.trackOffset.y);
        }
        else {
            this.fireFrom.x = x + this.trackOffset.x;
            this.fireFrom.y = y + this.trackOffset.y;
        }
    }
    /**
     * You can modify the size of the physics Body the Bullets use to be any dimension you need.
     * This allows you to make it smaller, or larger, than the parent Sprite.
     * You can also control the x and y offset of the Body. This is the position of the
     * Body relative to the top-left of the Sprite _texture_.
     *
     * For example: If you have a Sprite with a texture that is 80x100 in size,
     * and you want the physics body to be 32x32 pixels in the middle of the texture, you would do:
     *
     * `setSize(32 / Math.abs(this.scale.x), 32 / Math.abs(this.scale.y), 24, 34)`
     *
     * Where the first two parameters are the new Body size (32x32 pixels) relative to the Sprite's scale.
     * 24 is the horizontal offset of the Body from the top-left of the Sprites texture, and 34
     * is the vertical offset.
     *
     * @param width - The width of the Body.
     * @param height - The height of the Body.
     * @param offsetX - The X offset of the Body from the top-left of the Sprites texture.
     * @param offsetY - The Y offset of the Body from the top-left of the Sprites texture.
     * @return This Weapon instance.
     */
    setBulletBodyOffset(width, height, offsetX = 0, offsetY = 0) {
        this._data.customBody = true;
        this._data.width = width;
        this._data.height = height;
        this._data.offsetX = offsetX;
        this._data.offsetY = offsetY;
        //  Update all bullets in the pool
        this.bullets.children.each(child => {
            child.body.setSize(width, height);
            child.body.setOffset(offsetX, offsetY);
            child.setData('bodyDirty', false);
        });
        return this;
    }
    /**
     * Sets the texture frames that the bullets can use when being launched.
     *
     * This is intended for use when you've got numeric based frames, such as
     * those loaded via a Sprite Sheet.
     *
     * It works by calling {@link https://photonstorm.github.io/phaser3-docs/Phaser.Utils.Array.html#.NumberArray Phaser.Utils.Array.NumberArray} internally, using
     * the min and max values provided. Then it sets the frame index to be zero.
     *
     * You can optionally set the cycle and random booleans, to allow bullets to
     * cycle through the frames when they're fired, or pick one at random.
     *
     * @param min - The minimum value the frame can be. Usually zero.
     * @param max - The maximum value the frame can be.
     * @param selectionMethod - Specifies how the
     *  frame for the fired bullet will be selected. See {@link FrameType consts.FrameType}
     *  for options.
     * @return This Weapon instance.
     */
    setBulletFrames(min, max, selectionMethod = FrameType.BULLET_FRAME_STABLE) {
        if (typeof selectionMethod !== 'number' ||
            selectionMethod < FrameType.BULLET_FRAME_STABLE ||
            selectionMethod > FrameType.BULLET_FRAME_RANDOM) {
            log(`Invalid bullet frame selection method specified: ${selectionMethod}`, this.logLevel);
        }
        if (min > max) {
            log(`min frame (${min}) must be <= max frame (${max})`, this.logLevel);
        }
        this.bulletFrames = Phaser.Utils.Array.NumberArray(min, max);
        this.bulletFrameIndex = 0;
        this.bulletFrameCycle = selectionMethod === FrameType.BULLET_FRAME_CYCLE;
        this.bulletFrameRandom = selectionMethod === FrameType.BULLET_FRAME_RANDOM;
        return this;
    }
    /**
     * Adds a new animation under the given key. Optionally set the frames, frame rate and loop.
     * The arguments are all the same as for {@link https://photonstorm.github.io/phaser3-docs/Phaser.Animations.AnimationManager.html#add AnimationManager.add}, and work in the same way.
     *
     * {@link bulletAnimation} will be set to this animation after it's created. From that point on, all
     * bullets fired will play using this animation. You can swap between animations by calling this method
     * several times, and then just changing the {@link bulletAnimation} property to the name of the animation
     * you wish to play for the next launched bullet.
     *
     * If you wish to stop using animations at all, set {@link bulletAnimation} to '' (an empty string).
     *
     * @param name - The unique (within the Weapon instance) name for the animation, i.e. "fire", "blast".
     * @param frames - An array of numbers/strings that correspond to the framesto add to this animation
     * and in which order. e.g. [1, 2, 3] or ['run0', 'run1', run2]). If null then all frames will be used.
     * @param frameRate - The speed at which the animation should play.
     * The speed is given in frames per second.
     * @param repeat - Number of times to repeat the animation. Set to -1 to repeat forever.
     * @return This Weapon instance.
     */
    addBulletAnimation(name, frames, frameRate = 60, repeat = 0) {
        if (!this.scene.sys.anims.exists(name)) {
            this.scene.sys.anims.create({
                key: name,
                frames,
                frameRate,
                repeat,
            });
            this.anims[name] = this.scene.sys.anims.get(name);
        }
        this.bulletAnimation = name;
        return this;
    }
    /**
     * Internal update method, called by the Weapon Plugin.
     */
    update() {
        if (this._bulletKillType === KillType.KILL_WEAPON_BOUNDS) {
            if (this.trackedSprite) {
                Phaser.Geom.Rectangle.CenterOn(this.bounds, this.trackedSprite.x, this.trackedSprite.y);
            }
            else if (this.trackedPointer) {
                Phaser.Geom.Rectangle.CenterOn(this.bounds, this.trackedPointer.x, this.trackedPointer.y);
            }
        }
        if (this.autofire) {
            this.fire();
        }
    }
    /**
     * Internal update method, called by the Weapon Plugin.
     */
    postRender() {
        if (!this.multiFire || !this._hasFired) {
            return;
        }
        this._hasFired = false;
        this._nextFire = this._tempNextFire;
    }
    /**
     * Destroys this Weapon.
     * You must release everything in here, all references, all objects, free it all up.
     */
    destroy() {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.scene = undefined;
        this.bullets.destroy(true);
    }
}
export default Weapon;