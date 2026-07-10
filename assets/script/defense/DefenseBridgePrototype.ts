import {
    _decorator,
    AnimationClip,
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
    ParticleSystem,
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

// 相机从桥尾朝 +z 方向看，所以世界 +x 在画面左侧：
// 画面左路（升级道具）用 +x，画面右路（敌人/boss）用 -x
const LEFT_LANE_X = 1.65;
const RIGHT_LANE_X = -1.65;
const PLAYER_Z = -4.2;
const PLAYER_X_LIMIT = 2.55;
const BULLET_RANGE = 14;
const BULLET_SPEED = 10;
const ENEMIES_BEFORE_BOSS = 12;

// road01（"低直路"）模块沿 z 长度为 1 个单位，按缩放后的步长首尾相接铺成连续桥面
const ROAD_Z_SCALE = 1.2;
const BRIDGE_START_Z = -8;
const BRIDGE_END_Z = 22;

// 每波小兵在右路车道内的散布（车道中心为原点）
const WAVE_OFFSETS = [
    { x: 0, z: 0 },
    { x: -0.45, z: 0.8 },
    { x: 0.45, z: 1.5 },
];
const WAVE_INTERVAL = 1.8;

// 头顶血量数字相对角色/道具原点的高度
const PROP_LABEL_HEIGHT = 1.6;
const BOSS_LABEL_HEIGHT = 2.8;

// 小人（manAll.FBX）与 boss（bossAll.FBX）自带的骨骼动画 clip 名
const PLAYER_IDLE_CLIP = 'fightIdle';
const PLAYER_ATTACK_CLIPS = ['attackLeft', 'attackRight'];
const ENEMY_RUN_CLIP = 'run';
const ENEMY_DIE_CLIP = 'die';
const BOSS_IDLE_CLIP = 'bossFightIdle';
const BOSS_DIE_CLIP = 'bossDie';
const CORPSE_FALLBACK_SECONDS = 5;

// 与 manRed01.mtl 相同的敌人红色
const ENEMY_COLOR = new Color(253, 69, 69, 255);

@ccclass('DefenseBridgePrototype')
export class DefenseBridgePrototype extends Component {
    private readonly bullets: Node[] = [];
    private readonly enemies: MovingTarget[] = [];
    private readonly tempPosition = new Vec3();
    private player: Node | null = null;
    private upgradeProp: Node | null = null;
    private bulletPrefab: Prefab | null = null;
    private tracerPrefab: Prefab | null = null;
    private statusLabel: Label | null = null;
    private propHpLabel: Label | null = null;
    private bossHpLabel: Label | null = null;
    private camera: Camera | null = null;
    private canvas: Node | null = null;
    private readonly uiPosition = new Vec3();
    private fireTimer = 0;
    private spawnTimer = 0;
    private attackClipIndex = 0;
    private upgradeHp = 8;
    private damage = 1;
    private fireInterval = 0.42;
    private kills = 0;
    private bossSpawned = false;
    private bossDefeated = false;
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
        if (!this.bossSpawned && this.spawnTimer >= WAVE_INTERVAL) {
            this.spawnTimer = 0;
            for (const offset of WAVE_OFFSETS) {
                void this.spawnEnemy(false, offset.x, offset.z);
            }
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
        const [playerPrefab, roadPrefab, propPrefab, bulletPrefab, tracerPrefab] = await Promise.all([
            this.loadPrefab('prefab/model/man/player'),
            this.loadPrefab('map/road/road01'),
            this.loadPrefab('map/box/box'),
            this.loadPrefab('map/diamond/diamond'),
            this.loadPrefab('prefab/effect/flyLight/flyLight'),
        ]);
        const root = new Node('DefenseBridge');
        scene.addChild(root);
        this.setupCamera(scene, root);
        this.createHud();
        this.createBridge(root, roadPrefab);
        this.createPlayer(root, playerPrefab);
        this.createUpgradeProp(root, propPrefab);
        this.bulletPrefab = bulletPrefab;
        this.tracerPrefab = tracerPrefab;
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
        // 拉近、抬高并压低看向点，让双桥充满竖屏（参考视频的近俯视构图）
        cameraNode.setPosition(0, 8.2, -10.8);
        cameraNode.lookAt(new Vec3(0, 0, 2.5));
        const camera = cameraNode.addComponent(Camera);
        camera.priority = 1;
        camera.visibility = 0xffffffff;
        camera.clearColor = new Color(95, 154, 201, 255);
        this.camera = camera;
    }

    private createBridge(root: Node, roadPrefab: Prefab): void {
        for (const laneX of [LEFT_LANE_X, RIGHT_LANE_X]) {
            for (let z = BRIDGE_START_Z; z <= BRIDGE_END_Z; z += ROAD_Z_SCALE) {
                const road = instantiate(roadPrefab);
                this.stripNonVisualComponents(road);
                root.addChild(road);
                road.setPosition(laneX, 0, z);
                road.setScale(0.88, 1, ROAD_Z_SCALE);
            }
        }
    }

    private createPlayer(root: Node, playerPrefab: Prefab): void {
        const player = instantiate(playerPrefab);
        this.stripNonVisualComponents(player);
        root.addChild(player);
        player.setPosition(0, 0, PLAYER_Z);
        player.setScale(0.9, 0.9, 0.9);
        // 小人模型默认朝 -z（面向镜头），转身面向 +z 的来敌方向
        player.setRotationFromEuler(0, 180, 0);
        this.player = player;
        this.playClip(player, PLAYER_IDLE_CLIP, true);
    }

    private createUpgradeProp(root: Node, propPrefab: Prefab): void {
        const prop = instantiate(propPrefab);
        this.stripNonVisualComponents(prop);
        root.addChild(prop);
        prop.setPosition(LEFT_LANE_X, 0.1, 5.2);
        prop.setScale(0.9, 0.9, 0.9);
        this.upgradeProp = prop;
    }

    private stripNonVisualComponents(node: Node): void {
        for (const component of node.getComponentsInChildren(Component)) {
            if (component instanceof MeshRenderer || component instanceof SkinnedMeshRenderer
                || component instanceof SkeletalAnimation || component instanceof ParticleSystem) {
                continue;
            }
            // 必须销毁而不是禁用：动画 clip 上的帧事件（onFrameAttackLeft 等）会按函数名
            // 调用节点上所有组件的方法，旧跑酷脚本的这些方法依赖跑酷全局对象，在防守场景会报错
            component.destroy();
        }
    }

    private playClip(characterRoot: Node, clipName: string, loop: boolean, onFinished?: () => void): boolean {
        const animation = characterRoot.getComponent(SkeletalAnimation) ?? characterRoot.getComponentInChildren(SkeletalAnimation);
        const state = animation?.getState(clipName);
        if (!animation || !state) {
            return false;
        }
        state.wrapMode = loop ? AnimationClip.WrapMode.Loop : AnimationClip.WrapMode.Normal;
        animation.play(clipName);
        if (!loop && onFinished) {
            animation.once(SkeletalAnimation.EventType.FINISHED, onFinished);
        }
        return true;
    }

    private createHud(): void {
        const canvas = find('Canvas');
        if (!canvas) {
            throw new Error('DefenseBridgePrototype: Canvas is required for the HUD.');
        }
        this.canvas = canvas;
        this.statusLabel = this.createLabel(canvas, 0, 480, 30, Color.WHITE);
        // 道具/boss 的血量数字跟随各自头顶（世界坐标每帧转换到 UI 坐标）
        this.propHpLabel = this.createLabel(canvas, 0, 0, 40, Color.WHITE);
        this.bossHpLabel = this.createLabel(canvas, 0, 0, 46, new Color(255, 229, 100, 255));
        this.propHpLabel.node.active = false;
        this.bossHpLabel.node.active = false;
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
        // 世界 +x 在画面左侧，手指右滑（UI delta 为正）应向世界 -x 移动
        const nextX = Math.max(-PLAYER_X_LIMIT, Math.min(PLAYER_X_LIMIT, this.player.position.x - event.getUIDelta().x * 0.012));
        this.player.setPosition(nextX, this.player.position.y, PLAYER_Z);
    }

    private fireBullet(): void {
        if (!this.player || !this.bulletPrefab) {
            return;
        }
        // 外层节点保持 scale 1，让拖尾粒子不被子弹本体的缩放压小
        const bullet = new Node('DefenseBullet');
        const core = instantiate(this.bulletPrefab);
        this.stripNonVisualComponents(core);
        core.setScale(0.3, 0.3, 0.3);
        bullet.addChild(core);
        if (this.tracerPrefab) {
            bullet.addChild(instantiate(this.tracerPrefab));
        }
        this.player.parent?.addChild(bullet);
        bullet.setPosition(this.player.position.x, 0.9, this.player.position.z + 0.65);
        this.bullets.push(bullet);
        this.playShootAnimation();
    }

    private playShootAnimation(): void {
        const player = this.player;
        if (!player) {
            return;
        }
        const clip = PLAYER_ATTACK_CLIPS[this.attackClipIndex];
        this.attackClipIndex = (this.attackClipIndex + 1) % PLAYER_ATTACK_CLIPS.length;
        this.playClip(player, clip, false, () => {
            if (player.isValid && this.player === player) {
                this.playClip(player, PLAYER_IDLE_CLIP, true);
            }
        });
    }

    private async spawnEnemy(boss: boolean, offsetX = 0, offsetZ = 0): Promise<void> {
        const prefab = await this.loadPrefab(boss ? 'map/people/peopleBoss' : 'map/people/peopleEnemy');
        if (!this.initialized || !this.player?.parent) {
            return;
        }
        const node = instantiate(prefab);
        this.stripNonVisualComponents(node);
        this.player.parent.addChild(node);
        node.setPosition(RIGHT_LANE_X + offsetX, 0, (boss ? 20 : 17) + offsetZ);
        // boss 预制体（bossAll.FBX）本身就比小人大，不再额外放大
        const scale = boss ? 1 : 0.82;
        node.setScale(scale, scale, scale);
        // 模型默认朝 -z，正好面向桥尾的主角，无需转身
        if (!boss) {
            this.tintCharacter(node, ENEMY_COLOR);
        }
        this.playClip(node, boss ? BOSS_IDLE_CLIP : ENEMY_RUN_CLIP, true);
        this.enemies.push({ node, hp: boss ? 20 : 1, speed: boss ? 0.8 : 1.35, boss });
    }

    private tintCharacter(characterRoot: Node, color: Color): void {
        const renderer = characterRoot.getComponentInChildren(SkinnedMeshRenderer);
        // peopleEnemy 的材质（manEnemy.mtl）无贴图、由 mainColor 决定颜色，改实例属性即可
        renderer?.getMaterialInstance(0)?.setProperty('mainColor', color);
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
                    this.enemies.splice(enemyIndex, 1);
                    if (enemy.boss) {
                        this.bossDefeated = true;
                    } else {
                        this.kills += 1;
                    }
                    this.playDeath(enemy);
                }
                break;
            }
        }
    }

    private playDeath(target: MovingTarget): void {
        const node = target.node;
        const played = this.playClip(node, target.boss ? BOSS_DIE_CLIP : ENEMY_DIE_CLIP, false, () => {
            if (node.isValid) {
                node.destroy();
            }
        });
        if (!played) {
            node.destroy();
            return;
        }
        // FINISHED 事件在极端情况下可能收不到（如动画被打断），兜底清理尸体
        this.scheduleOnce(() => {
            if (node.isValid) {
                node.destroy();
            }
        }, CORPSE_FALLBACK_SECONDS);
    }

    private refreshHud(): void {
        if (this.statusLabel) {
            let progress: string;
            if (this.bossDefeated) {
                progress = 'BOSS 已击败！';
            } else if (this.bossSpawned) {
                progress = 'BOSS 来袭';
            } else {
                progress = `击杀 ${this.kills}/${ENEMIES_BEFORE_BOSS}`;
            }
            this.statusLabel.string = `伤害 ${this.damage} · 射速 ${(1 / this.fireInterval).toFixed(1)}/s · ${progress}`;
        }
        const prop = this.upgradeProp && this.upgradeHp > 0 ? this.upgradeProp : null;
        this.updateOverheadLabel(this.propHpLabel, prop, PROP_LABEL_HEIGHT, `${this.upgradeHp}`);
        const boss = this.enemies.find((enemy) => enemy.boss);
        this.updateOverheadLabel(this.bossHpLabel, boss?.node ?? null, BOSS_LABEL_HEIGHT, boss ? `${boss.hp}` : '');
    }

    private updateOverheadLabel(label: Label | null, target: Node | null, height: number, text: string): void {
        if (!label) {
            return;
        }
        if (!target || !target.isValid || !this.camera || !this.canvas) {
            label.node.active = false;
            return;
        }
        label.node.active = true;
        label.string = text;
        this.tempPosition.set(target.worldPosition);
        this.tempPosition.y += height;
        this.camera.convertToUINode(this.tempPosition, this.canvas, this.uiPosition);
        label.node.setPosition(this.uiPosition);
    }
}
