import {
    _decorator,
    Camera,
    Color,
    Component,
    director,
    EventTouch,
    find,
    input,
    Input,
    instantiate,
    Label,
    MeshRenderer,
    Node,
    Prefab,
    resources,
    SkeletalAnimation,
    SkinnedMeshRenderer,
    UITransform,
    Vec3,
} from 'cc';

const { ccclass } = _decorator;

interface MovingTarget {
    readonly node: Node;
    hp: number;
    speed: number;
    boss: boolean;
}

const LEFT_LANE_X = -1.65;
const RIGHT_LANE_X = 1.65;
const PLAYER_Z = -4.2;
const PLAYER_X_LIMIT = 2.55;
const BULLET_RANGE = 14;
const BULLET_SPEED = 10;
const ENEMIES_BEFORE_BOSS = 8;

@ccclass('DefenseBridgePrototype')
export class DefenseBridgePrototype extends Component {
    private readonly bullets: Node[] = [];
    private readonly enemies: MovingTarget[] = [];
    private readonly tempPosition = new Vec3();
    private player: Node | null = null;
    private upgradeProp: Node | null = null;
    private bulletPrefab: Prefab | null = null;
    private statusLabel: Label | null = null;
    private bossLabel: Label | null = null;
    private fireTimer = 0;
    private spawnTimer = 0;
    private upgradeHp = 8;
    private damage = 1;
    private fireInterval = 0.42;
    private kills = 0;
    private bossSpawned = false;
    private initialized = false;

    protected start(): void {
        void this.initialize();
    }

    protected update(deltaTime: number): void {
        if (!this.initialized || !this.player) {
            return;
        }
        this.fireTimer += deltaTime;
        this.spawnTimer += deltaTime;
        if (this.fireTimer >= this.fireInterval) {
            this.fireTimer = 0;
            this.fireBullet();
        }
        if (!this.bossSpawned && this.spawnTimer >= 1.2) {
            this.spawnTimer = 0;
            void this.spawnEnemy(false);
        }
        this.moveBullets(deltaTime);
        this.moveEnemies(deltaTime);
        this.resolveHits();
        if (!this.bossSpawned && this.kills >= ENEMIES_BEFORE_BOSS) {
            this.bossSpawned = true;
            void this.spawnEnemy(true);
        }
        this.refreshHud();
    }

    protected onDestroy(): void {
        input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
    }

    private async initialize(): Promise<void> {
        const scene = director.getScene();
        if (!scene) {
            throw new Error('DefenseBridgePrototype: active scene is required.');
        }
        const [playerPrefab, roadPrefab, propPrefab, bulletPrefab] = await Promise.all([
            this.loadPrefab('prefab/model/man/player'),
            this.loadPrefab('map/road/road01'),
            this.loadPrefab('map/box/box'),
            this.loadPrefab('map/diamond/diamond'),
        ]);
        const root = new Node('DefenseBridge');
        scene.addChild(root);
        this.setupCamera(scene, root);
        this.createHud();
        this.createBridge(root, roadPrefab);
        this.createPlayer(root, playerPrefab);
        this.createUpgradeProp(root, propPrefab);
        this.bulletPrefab = bulletPrefab;
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.initialized = true;
        this.refreshHud();
    }

    private loadPrefab(path: string): Promise<Prefab> {
        return new Promise((resolve, reject) => {
            resources.load(path, Prefab, (error, prefab) => {
                if (error || !prefab) {
                    reject(new Error(`DefenseBridgePrototype: failed to load ${path}: ${error?.message ?? 'unknown error'}`));
                    return;
                }
                resolve(prefab);
            });
        });
    }

    private setupCamera(scene: Node, root: Node): void {
        for (const camera of scene.getComponentsInChildren(Camera)) {
            if (camera.node.parent?.name !== 'Canvas') {
                camera.enabled = false;
            }
        }
        const cameraNode = new Node('DefenseCamera');
        root.addChild(cameraNode);
        cameraNode.setPosition(0, 7.2, -13.5);
        cameraNode.lookAt(new Vec3(0, 0.7, 6.5));
        const camera = cameraNode.addComponent(Camera);
        camera.priority = 1;
        camera.visibility = 0xffffffff;
        camera.clearColor = new Color(95, 154, 201, 255);
    }

    private createBridge(root: Node, roadPrefab: Prefab): void {
        for (const laneX of [LEFT_LANE_X, RIGHT_LANE_X]) {
            for (let segment = 0; segment < 5; segment += 1) {
                const road = instantiate(roadPrefab);
                this.disableNonVisualComponents(road);
                root.addChild(road);
                road.setPosition(laneX, 0, segment * 5.2 - 1);
                road.setScale(0.88, 1, 1.15);
            }
        }
    }

    private createPlayer(root: Node, playerPrefab: Prefab): void {
        const player = instantiate(playerPrefab);
        this.disableNonVisualComponents(player);
        root.addChild(player);
        player.setPosition(0, 0, PLAYER_Z);
        player.setScale(0.9, 0.9, 0.9);
        this.player = player;
    }

    private createUpgradeProp(root: Node, propPrefab: Prefab): void {
        const prop = instantiate(propPrefab);
        this.disableNonVisualComponents(prop);
        root.addChild(prop);
        prop.setPosition(LEFT_LANE_X, 0.1, 5.2);
        prop.setScale(0.9, 0.9, 0.9);
        this.upgradeProp = prop;
    }

    private disableNonVisualComponents(node: Node): void {
        for (const component of node.getComponentsInChildren(Component)) {
            if (component instanceof MeshRenderer || component instanceof SkinnedMeshRenderer || component instanceof SkeletalAnimation) {
                continue;
            }
            component.enabled = false;
        }
    }

    private createHud(): void {
        const canvas = find('Canvas');
        if (!canvas) {
            throw new Error('DefenseBridgePrototype: Canvas is required for the HUD.');
        }
        this.statusLabel = this.createLabel(canvas, 0, 550, 28, Color.WHITE);
        this.bossLabel = this.createLabel(canvas, 0, 488, 36, new Color(255, 229, 100, 255));
    }

    private createLabel(parent: Node, x: number, y: number, fontSize: number, color: Color): Label {
        const node = new Node('DefenseHudLabel');
        node.addComponent(UITransform).setContentSize(720, 54);
        node.setPosition(x, y, 0);
        parent.addChild(node);
        const label = node.addComponent(Label);
        label.fontSize = fontSize;
        label.lineHeight = 44;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.color = color;
        return label;
    }

    private onTouchMove(event: EventTouch): void {
        if (!this.player) {
            return;
        }
        const nextX = Math.max(-PLAYER_X_LIMIT, Math.min(PLAYER_X_LIMIT, this.player.position.x + event.getUIDelta().x * 0.012));
        this.player.setPosition(nextX, this.player.position.y, PLAYER_Z);
    }

    private fireBullet(): void {
        if (!this.player || !this.bulletPrefab) {
            return;
        }
        const bullet = instantiate(this.bulletPrefab);
        this.disableNonVisualComponents(bullet);
        this.player.parent?.addChild(bullet);
        bullet.setPosition(this.player.position.x, 0.9, this.player.position.z + 0.65);
        bullet.setScale(0.16, 0.16, 0.16);
        this.bullets.push(bullet);
    }

    private async spawnEnemy(boss: boolean): Promise<void> {
        const playerPrefab = await this.loadPrefab('prefab/model/man/player');
        if (!this.initialized || !this.player?.parent) {
            return;
        }
        const node = instantiate(playerPrefab);
        this.disableNonVisualComponents(node);
        this.player.parent.addChild(node);
        node.setPosition(RIGHT_LANE_X, 0, boss ? 20 : 17);
        const scale = boss ? 1.35 : 0.82;
        node.setScale(scale, scale, scale);
        node.setRotationFromEuler(0, 180, 0);
        this.enemies.push({ node, hp: boss ? 20 : 1, speed: boss ? 0.8 : 1.35, boss });
    }

    private moveBullets(deltaTime: number): void {
        for (let index = this.bullets.length - 1; index >= 0; index -= 1) {
            const bullet = this.bullets[index];
            bullet.getPosition(this.tempPosition);
            this.tempPosition.z += BULLET_SPEED * deltaTime;
            bullet.setPosition(this.tempPosition);
            if (this.tempPosition.z - PLAYER_Z > BULLET_RANGE) {
                bullet.destroy();
                this.bullets.splice(index, 1);
            }
        }
    }

    private moveEnemies(deltaTime: number): void {
        for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
            const enemy = this.enemies[index];
            enemy.node.getPosition(this.tempPosition);
            this.tempPosition.z -= enemy.speed * deltaTime;
            enemy.node.setPosition(this.tempPosition);
            if (this.tempPosition.z <= PLAYER_Z + 0.8) {
                enemy.node.destroy();
                this.enemies.splice(index, 1);
            }
        }
    }

    private resolveHits(): void {
        for (let bulletIndex = this.bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
            const bullet = this.bullets[bulletIndex];
            if (this.upgradeProp && this.upgradeHp > 0 && Vec3.distance(bullet.position, this.upgradeProp.position) <= 0.8) {
                this.upgradeHp = Math.max(0, this.upgradeHp - this.damage);
                bullet.destroy();
                this.bullets.splice(bulletIndex, 1);
                if (this.upgradeHp === 0) {
                    this.damage += 1;
                    this.fireInterval = Math.max(0.12, this.fireInterval - 0.1);
                    this.upgradeProp.destroy();
                    this.upgradeProp = null;
                }
                continue;
            }
            for (let enemyIndex = this.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
                const enemy = this.enemies[enemyIndex];
                if (Vec3.distance(bullet.position, enemy.node.position) > (enemy.boss ? 1.05 : 0.65)) {
                    continue;
                }
                enemy.hp -= this.damage;
                bullet.destroy();
                this.bullets.splice(bulletIndex, 1);
                if (enemy.hp <= 0) {
                    enemy.node.destroy();
                    this.enemies.splice(enemyIndex, 1);
                    if (!enemy.boss) {
                        this.kills += 1;
                    }
                }
                break;
            }
        }
    }

    private refreshHud(): void {
        if (this.statusLabel) {
            this.statusLabel.string = `LEFT PROP HP ${this.upgradeHp > 0 ? this.upgradeHp : 'COLLECTED'}   DMG ${this.damage}   FIRE ${this.fireInterval.toFixed(2)}s`;
        }
        const boss = this.enemies.find((enemy) => enemy.boss);
        if (this.bossLabel) {
            this.bossLabel.string = boss ? `BOSS HP ${boss.hp}` : this.bossSpawned ? 'BOSS DEFEATED' : `RIGHT LANE ENEMIES ${this.kills}/${ENEMIES_BEFORE_BOSS}`;
        }
    }
}
