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
    Material,
    MeshRenderer,
    Node,
    ParticleSystem,
    Prefab,
    resources,
    SkeletalAnimation,
    SkinnedMeshRenderer,
    tween,
    UITransform,
    Vec3,
} from 'cc';

const { ccclass } = _decorator;

interface MovingTarget {
    readonly node: Node;
    readonly material: Material | null;
    hp: number;
    speed: number;
    boss: boolean;
}

// 左路目标物：火力道具（power）与 +N 数字门（squad）轮流出现
interface LaneObjective {
    readonly node: Node;
    readonly kind: 'power' | 'squad';
    readonly bonus: number;
    hp: number;
}

// —— 场景比例（单位：米）——
// road01 网格实测 1(宽)x1(长)x1(高)，是一个墩子：底部在 y=0（水面），可行走的顶面在 y≈1。
const SURFACE_Y = 1.0;

// 双路合并成一整块桥面：2 列 tile 各拉宽 2.5 倍拼成总宽 5m，
// 中缝的包边正好形成参考视频里左右分幅的分道线。
const ROAD_X_SCALE = 2.5;
const ROAD_Z_SCALE = 2;
const BRIDGE_START_Z = -8;
const BRIDGE_END_Z = 18;

// 相机从桥尾朝 +z 方向看，世界 +x 在画面左侧：
// 画面左半幅（道具/数字门）用 +x，画面右半幅（敌人/boss）用 -x
const LEFT_LANE_X = 1.25;
const RIGHT_LANE_X = -1.25;
const PLAYER_Z = -4.2;
// 锚点活动范围要给编队宽度（±0.85）留出余量，避免队员走出桥沿
const PLAYER_X_LIMIT = 1.65;

// 角色相对 5m 桥宽的比例（小人模型净高 1.74m）
const PLAYER_SCALE = 0.55;
// 小兵比主角明显小一号，方便同屏堆出人海压力
const MINION_SCALE = 0.4;
const BOSS_SCALE = 1;

// 小队编队：锚点在队首，后续队员向后按行排开
const FORMATION_OFFSETS = [
    new Vec3(0, 0, 0),
    new Vec3(-0.5, 0, -0.45), new Vec3(0.5, 0, -0.45),
    new Vec3(-0.85, 0, -0.95), new Vec3(0, 0, -0.95), new Vec3(0.85, 0, -0.95),
    new Vec3(-0.5, 0, -1.45), new Vec3(0.5, 0, -1.45),
    new Vec3(-0.85, 0, -1.95), new Vec3(0, 0, -1.95), new Vec3(0.85, 0, -1.95),
    new Vec3(0, 0, -2.45),
];

const BULLET_RANGE = 16;
const BULLET_SPEED = 10;
const BULLET_HEIGHT = 0.5; // 子弹相对桥面的飞行高度（小兵胸口）
const BULLET_CORE_SCALE = 0.3;
// 吃到火力道具后子弹变大变金色，给出明显的强化反馈
const UPGRADED_BULLET_CORE_SCALE = 0.42;
const UPGRADED_TRACER_COLOR = new Color(255, 190, 40, 255);
const ENEMIES_BEFORE_BOSS = 30;
const MINION_SPAWN_Z = 14;
const BOSS_SPAWN_Z = 16;

// 命中判定半径（只比较水平面 XZ 距离）
const MINION_HIT_RADIUS = 0.4;
const BOSS_HIT_RADIUS = 0.9;
const POWER_HIT_RADIUS = 0.7;
const GATE_HIT_RADIUS = 1.0;

// 接触判定：小兵碰到队员一换一（即死一名队员），boss 碾过范围内的所有队员
const MINION_CONTACT_RADIUS = 0.4;
const BOSS_CONTACT_RADIUS = 1.1;
// 敌人越过整个编队纵深后从桥尾消失
const ENEMY_PASS_Z = PLAYER_Z - 3;

// 左路目标物轮换：火力道具与 +5 数字门交替，血量逐轮增长
const OBJECTIVE_Z = 5.2;
const SQUAD_GATE_BONUS = 5;
const POWER_BASE_HP = 8;
const POWER_HP_PER_CYCLE = 6;
const GATE_BASE_HP = 20;
const GATE_HP_PER_CYCLE = 8;
const OBJECTIVE_RESPAWN_DELAY = 2;

// 小兵从远端以散兵形态涌来（随机散布，不排整齐队列），
// 节奏随时间加压：刷新间隔压缩、每波数量增加，开局仍留出去左路吃道具的时间
const ENEMY_SPEED = 1.1;
const ENEMY_LANE_HALF_WIDTH = 0.95; // 右半幅内的横向散布半宽
const ENEMY_SPAWN_Z_SCATTER = 1.5;  // 每波在纵深方向的散布
const SPAWN_INTERVAL_START = 1.0;
const SPAWN_INTERVAL_END = 0.45;
const SPAWN_COUNT_START = 2;
const SPAWN_COUNT_END = 4;
const SPAWN_RAMP_SECONDS = 45;
// 同屏骨骼动画角色的性能上限，达到后暂停刷怪
const MAX_ALIVE_MINIONS = 80;

// 头顶血量数字相对目标原点的高度
const POWER_LABEL_HEIGHT = 1.6;
const GATE_LABEL_HEIGHT = 2.2;
// 数字门的 +N 奖励数字贴在门体正面中部，与血量分开显示
const GATE_BONUS_LABEL_HEIGHT = 1.0;
const BOSS_LABEL_HEIGHT = 2.2;

// 小人（manAll.FBX）与 boss（bossAll.FBX）自带的骨骼动画 clip 名
const PLAYER_IDLE_CLIP = 'fightIdle';
const PLAYER_ATTACK_CLIPS = ['attackLeft', 'attackRight'];
const ENEMY_RUN_CLIP = 'run';
const BOSS_IDLE_CLIP = 'bossFightIdle';
const BOSS_DIE_CLIP = 'bossDie';
const CORPSE_FALLBACK_SECONDS = 5;

// 与 manRed01.mtl 相同的敌人红色
const ENEMY_COLOR = new Color(253, 69, 69, 255);

// —— 受击/死亡反馈 ——
// 受击闪白：短暂拉高自发光再恢复（标准材质 emissive 默认为黑）
const HIT_FLASH_COLOR = new Color(255, 255, 255, 255);
const HIT_FLASH_SECONDS = 0.08;
// 死亡后尸体变灰（对带贴图的 boss 则表现为整体压暗）
const DEATH_GRAY = new Color(110, 110, 110, 255);
// 小兵死亡击飞：先向后上方抛起，再坠落，最后缩没消失
const KNOCKBACK_RISE = new Vec3(0, 1.6, 2.8);
const KNOCKBACK_FALL = new Vec3(0, -3.0, 1.6);
const ENEMY_FLY_START_CLIP = 'hitFly01';
const ENEMY_FLY_LOOP_CLIP = 'hitFly02';

@ccclass('DefenseBridgePrototype')
export class DefenseBridgePrototype extends Component {
    private readonly bullets: Node[] = [];
    private readonly enemies: MovingTarget[] = [];
    private readonly squadMembers: Node[] = [];
    private readonly tempPosition = new Vec3();
    private root: Node | null = null;
    private squadAnchor: Node | null = null;
    private objective: LaneObjective | null = null;
    private playerPrefab: Prefab | null = null;
    private propPrefab: Prefab | null = null;
    private gatePrefab: Prefab | null = null;
    private bulletPrefab: Prefab | null = null;
    private tracerPrefab: Prefab | null = null;
    private hitEffectPrefab: Prefab | null = null;
    private statusLabel: Label | null = null;
    private objectiveHpLabel: Label | null = null;
    private gateBonusLabel: Label | null = null;
    private bossHpLabel: Label | null = null;
    private camera: Camera | null = null;
    private canvas: Node | null = null;
    private readonly uiPosition = new Vec3();
    private fireTimer = 0;
    private spawnTimer = 0;
    private elapsed = 0;
    private attackClipIndex = 0;
    private objectiveIndex = 0;
    private upgradeLevel = 0;
    private damage = 1;
    private fireInterval = 0.42;
    private kills = 0;
    private bossSpawned = false;
    private bossDefeated = false;
    private gameOver = false;
    private initialized = false;

    protected start(): void {
        void this.initialize();
    }

    protected update(deltaTime: number): void {
        if (!this.initialized || !this.squadAnchor) {
            return;
        }
        if (this.gameOver) {
            this.refreshHud();
            return;
        }
        this.elapsed += deltaTime;
        this.fireTimer += deltaTime;
        this.spawnTimer += deltaTime;
        if (this.fireTimer >= this.fireInterval) {
            this.fireTimer = 0;
            this.fireVolley();
        }
        if (!this.bossSpawned && this.spawnTimer >= this.currentSpawnInterval()) {
            this.spawnTimer = 0;
            this.spawnEnemyBurst();
        }
        this.moveBullets(deltaTime);
        this.moveEnemies(deltaTime);
        this.resolveHits();
        this.resolveContacts();
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
        const [playerPrefab, roadPrefab, propPrefab, gatePrefab, bulletPrefab, tracerPrefab, hitEffectPrefab] = await Promise.all([
            this.loadPrefab('prefab/model/man/player'),
            this.loadPrefab('map/road/road01'),
            this.loadPrefab('map/box/box'),
            this.loadPrefab('map/organ/organDoor'),
            this.loadPrefab('map/diamond/diamond'),
            this.loadPrefab('prefab/effect/flyLight/flyLight'),
            this.loadPrefab('prefab/effect/hit/hit'),
        ]);
        const root = new Node('DefenseBridge');
        scene.addChild(root);
        this.root = root;
        this.playerPrefab = playerPrefab;
        this.propPrefab = propPrefab;
        this.gatePrefab = gatePrefab;
        this.bulletPrefab = bulletPrefab;
        this.tracerPrefab = tracerPrefab;
        this.hitEffectPrefab = hitEffectPrefab;
        this.setupCamera(scene, root);
        this.createHud();
        this.createBridge(root, roadPrefab);
        this.createSquad(root);
        this.spawnNextObjective();
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.initialized = true;
        this.refreshHud();
    }

    private currentSpawnInterval(): number {
        const progress = Math.min(1, this.elapsed / SPAWN_RAMP_SECONDS);
        return SPAWN_INTERVAL_START + (SPAWN_INTERVAL_END - SPAWN_INTERVAL_START) * progress;
    }

    private spawnEnemyBurst(): void {
        if (this.enemies.length >= MAX_ALIVE_MINIONS) {
            return;
        }
        const progress = Math.min(1, this.elapsed / SPAWN_RAMP_SECONDS);
        const count = Math.round(SPAWN_COUNT_START + (SPAWN_COUNT_END - SPAWN_COUNT_START) * progress);
        // 散兵形态：在右半幅内完全随机落位，不排整齐队列
        for (let i = 0; i < count; i += 1) {
            const offsetX = (Math.random() * 2 - 1) * ENEMY_LANE_HALF_WIDTH;
            const offsetZ = Math.random() * ENEMY_SPAWN_Z_SCATTER;
            void this.spawnEnemy(false, offsetX, offsetZ);
        }
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
        // 拉近、抬高并压低看向点，让桥面充满竖屏（参考视频的近俯视构图）
        cameraNode.setPosition(0, SURFACE_Y + 8.2, -10.8);
        cameraNode.lookAt(new Vec3(0, SURFACE_Y, 2.5));
        const camera = cameraNode.addComponent(Camera);
        camera.priority = 1;
        camera.visibility = 0xffffffff;
        camera.clearColor = new Color(95, 154, 201, 255);
        this.camera = camera;
    }

    private createBridge(root: Node, roadPrefab: Prefab): void {
        // 两列拉宽的 tile 无缝拼成一整块桥面，墩子底部落在水面（y=0）
        for (const laneX of [-ROAD_X_SCALE / 2, ROAD_X_SCALE / 2]) {
            for (let z = BRIDGE_START_Z; z <= BRIDGE_END_Z; z += ROAD_Z_SCALE) {
                const road = instantiate(roadPrefab);
                this.stripNonVisualComponents(road);
                root.addChild(road);
                road.setPosition(laneX, 0, z);
                road.setScale(ROAD_X_SCALE, 1, ROAD_Z_SCALE);
            }
        }
    }

    private createSquad(root: Node): void {
        // 锚点是不可见的队首参照物：触摸移动、射击原点、接触判定都围绕它
        const anchor = new Node('SquadAnchor');
        root.addChild(anchor);
        anchor.setPosition(0, SURFACE_Y, PLAYER_Z);
        this.squadAnchor = anchor;
        this.addSquadMembers(1);
    }

    private addSquadMembers(count: number): void {
        if (!this.squadAnchor || !this.playerPrefab) {
            return;
        }
        for (let i = 0; i < count; i += 1) {
            const slot = this.squadMembers.length;
            if (slot >= FORMATION_OFFSETS.length) {
                return;
            }
            const member = instantiate(this.playerPrefab);
            this.stripNonVisualComponents(member);
            this.squadAnchor.addChild(member);
            member.setPosition(FORMATION_OFFSETS[slot]);
            member.setScale(PLAYER_SCALE, PLAYER_SCALE, PLAYER_SCALE);
            // player.prefab 的 body 子节点预转了 180°，根节点再转 180° 面向 +z 来敌方向
            member.setRotationFromEuler(0, 180, 0);
            this.squadMembers.push(member);
            this.playClip(member, PLAYER_IDLE_CLIP, true);
        }
    }

    private killSquadMember(index: number): void {
        const member = this.squadMembers[index];
        this.squadMembers.splice(index, 1);
        this.spawnHitEffect(member.worldPosition);
        member.destroy();
        if (this.squadMembers.length === 0) {
            this.gameOver = true;
        }
    }

    private spawnNextObjective(): void {
        if (!this.root || this.gameOver) {
            return;
        }
        const isPower = this.objectiveIndex % 2 === 0;
        const cycle = Math.floor(this.objectiveIndex / 2);
        const prefab = isPower ? this.propPrefab : this.gatePrefab;
        if (!prefab) {
            return;
        }
        const node = instantiate(prefab);
        this.stripNonVisualComponents(node);
        this.root.addChild(node);
        node.setPosition(LEFT_LANE_X, SURFACE_Y + (isPower ? 0.1 : 0), OBJECTIVE_Z);
        node.setScale(0.9, 0.9, 0.9);
        this.objective = {
            node,
            kind: isPower ? 'power' : 'squad',
            bonus: isPower ? 1 : SQUAD_GATE_BONUS,
            hp: isPower ? POWER_BASE_HP + cycle * POWER_HP_PER_CYCLE : GATE_BASE_HP + cycle * GATE_HP_PER_CYCLE,
        };
        this.objectiveIndex += 1;
    }

    private applyObjectiveReward(objective: LaneObjective): void {
        if (objective.kind === 'power') {
            this.upgradeLevel += 1;
            this.damage += 1;
            this.fireInterval = Math.max(0.12, this.fireInterval - 0.1);
        } else {
            this.addSquadMembers(objective.bonus);
        }
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
        // 目标物/boss 的血量数字跟随各自头顶（世界坐标每帧转换到 UI 坐标）
        this.objectiveHpLabel = this.createLabel(canvas, 0, 0, 40, Color.WHITE);
        // 数字门的 +N 奖励数字单独贴在门体上，避免和血量混在一起引起误解
        this.gateBonusLabel = this.createLabel(canvas, 0, 0, 56, new Color(140, 255, 120, 255));
        this.bossHpLabel = this.createLabel(canvas, 0, 0, 46, new Color(255, 229, 100, 255));
        this.objectiveHpLabel.node.active = false;
        this.gateBonusLabel.node.active = false;
        this.bossHpLabel.node.active = false;
    }

    private createLabel(parent: Node, x: number, y: number, fontSize: number, color: Color): Label {
        const node = new Node('DefenseHudLabel');
        node.addComponent(UITransform).setContentSize(720, 108);
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
        if (!this.squadAnchor || this.gameOver) {
            return;
        }
        // 世界 +x 在画面左侧，手指右滑（UI delta 为正）应向世界 -x 移动
        const nextX = Math.max(-PLAYER_X_LIMIT, Math.min(PLAYER_X_LIMIT, this.squadAnchor.position.x - event.getUIDelta().x * 0.012));
        this.squadAnchor.setPosition(nextX, SURFACE_Y, PLAYER_Z);
    }

    private fireVolley(): void {
        if (!this.bulletPrefab || this.squadMembers.length === 0) {
            return;
        }
        // 每名队员从自己的位置发射一颗子弹：人越多火力越密
        for (const member of this.squadMembers) {
            this.spawnBullet(member.worldPosition);
        }
        this.playShootAnimation();
    }

    private spawnBullet(origin: Vec3): void {
        if (!this.root || !this.bulletPrefab) {
            return;
        }
        // 外层节点保持 scale 1，让拖尾粒子不被子弹本体的缩放压小
        const bullet = new Node('DefenseBullet');
        const core = instantiate(this.bulletPrefab);
        this.stripNonVisualComponents(core);
        const upgraded = this.upgradeLevel > 0;
        const coreScale = upgraded ? UPGRADED_BULLET_CORE_SCALE : BULLET_CORE_SCALE;
        core.setScale(coreScale, coreScale, coreScale);
        bullet.addChild(core);
        if (this.tracerPrefab) {
            const tracer = instantiate(this.tracerPrefab);
            if (upgraded) {
                // 升级后拖尾变金色，强化"变强了"的视觉反馈
                const particle = tracer.getComponent(ParticleSystem) ?? tracer.getComponentInChildren(ParticleSystem);
                if (particle) {
                    particle.startColor.color = UPGRADED_TRACER_COLOR;
                }
            }
            bullet.addChild(tracer);
        }
        this.root.addChild(bullet);
        bullet.setPosition(origin.x, SURFACE_Y + BULLET_HEIGHT, origin.z + 0.65);
        this.bullets.push(bullet);
    }

    private playShootAnimation(): void {
        const clip = PLAYER_ATTACK_CLIPS[this.attackClipIndex];
        this.attackClipIndex = (this.attackClipIndex + 1) % PLAYER_ATTACK_CLIPS.length;
        for (const member of this.squadMembers) {
            this.playClip(member, clip, false, () => {
                if (member.isValid && this.squadMembers.includes(member)) {
                    this.playClip(member, PLAYER_IDLE_CLIP, true);
                }
            });
        }
    }

    private async spawnEnemy(boss: boolean, offsetX = 0, offsetZ = 0): Promise<void> {
        const prefab = await this.loadPrefab(boss ? 'map/people/peopleBoss' : 'map/people/peopleEnemy');
        if (!this.initialized || !this.root || this.gameOver) {
            return;
        }
        const node = instantiate(prefab);
        this.stripNonVisualComponents(node);
        this.root.addChild(node);
        node.setPosition(RIGHT_LANE_X + offsetX, SURFACE_Y, (boss ? BOSS_SPAWN_Z : MINION_SPAWN_Z) + offsetZ);
        const scale = boss ? BOSS_SCALE : MINION_SCALE;
        node.setScale(scale, scale, scale);
        // peopleEnemy/peopleBoss 的 body 子节点没有像 player.prefab 那样预转 180°，
        // 模型原生朝 +z，需要在根节点转身面向桥尾的主角（-z 行进方向）
        node.setRotationFromEuler(0, 180, 0);
        const material = this.getBodyMaterial(node);
        if (!boss) {
            // peopleEnemy 的材质（manEnemy.mtl）无贴图、由 mainColor 决定颜色，改实例属性即可
            material?.setProperty('mainColor', ENEMY_COLOR);
        }
        this.playClip(node, boss ? BOSS_IDLE_CLIP : ENEMY_RUN_CLIP, true);
        this.enemies.push({ node, material, hp: boss ? 20 : 1, speed: boss ? 0.8 : ENEMY_SPEED, boss });
    }

    private getBodyMaterial(characterRoot: Node): Material | null {
        const renderer = characterRoot.getComponentInChildren(SkinnedMeshRenderer);
        return renderer?.getMaterialInstance(0) ?? null;
    }

    private flashTarget(target: MovingTarget): void {
        if (!target.material) {
            return;
        }
        target.material.setProperty('emissive', HIT_FLASH_COLOR);
        this.scheduleOnce(() => {
            if (target.node.isValid) {
                target.material?.setProperty('emissive', Color.BLACK);
            }
        }, HIT_FLASH_SECONDS);
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
            // 越过整个编队纵深仍未接触到任何队员，从桥尾走掉
            if (this.tempPosition.z <= ENEMY_PASS_Z) {
                enemy.node.destroy();
                this.enemies.splice(index, 1);
            }
        }
    }

    /**
     * 接触判定：小兵碰到队员时一换一（队员即死、小兵击飞死亡）；
     * boss 不会死于接触，而是一路碾过碰到的每一名队员。
     */
    private resolveContacts(): void {
        for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
            const enemy = this.enemies[index];
            // 敌人还没走到编队纵深范围，跳过
            if (enemy.node.position.z > PLAYER_Z + 1) {
                continue;
            }
            const radius = enemy.boss ? BOSS_CONTACT_RADIUS : MINION_CONTACT_RADIUS;
            let traded = false;
            for (let m = this.squadMembers.length - 1; m >= 0; m -= 1) {
                const member = this.squadMembers[m];
                if (this.horizontalDistanceSq(enemy.node.worldPosition, member.worldPosition) > radius * radius) {
                    continue;
                }
                this.killSquadMember(m);
                traded = true;
                if (!enemy.boss) {
                    break;
                }
            }
            if (traded && !enemy.boss) {
                this.enemies.splice(index, 1);
                this.playDeath(enemy);
            }
        }
    }

    private horizontalDistanceSq(a: Vec3, b: Vec3): number {
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        return dx * dx + dz * dz;
    }

    private spawnHitEffect(position: Vec3): void {
        if (!this.hitEffectPrefab || !this.root) {
            return;
        }
        // hit.prefab 是一次性粒子（playOnAwake、不循环），放完销毁
        const effect = instantiate(this.hitEffectPrefab);
        this.root.addChild(effect);
        effect.setPosition(position);
        this.scheduleOnce(() => {
            if (effect.isValid) {
                effect.destroy();
            }
        }, 1);
    }

    private resolveHits(): void {
        for (let bulletIndex = this.bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
            const bullet = this.bullets[bulletIndex];
            const objective = this.objective;
            if (objective) {
                const radius = objective.kind === 'power' ? POWER_HIT_RADIUS : GATE_HIT_RADIUS;
                if (this.horizontalDistanceSq(bullet.position, objective.node.position) <= radius * radius) {
                    objective.hp = Math.max(0, objective.hp - this.damage);
                    this.spawnHitEffect(bullet.position);
                    bullet.destroy();
                    this.bullets.splice(bulletIndex, 1);
                    if (objective.hp === 0) {
                        this.applyObjectiveReward(objective);
                        objective.node.destroy();
                        this.objective = null;
                        this.scheduleOnce(() => this.spawnNextObjective(), OBJECTIVE_RESPAWN_DELAY);
                    }
                    continue;
                }
            }
            for (let enemyIndex = this.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
                const enemy = this.enemies[enemyIndex];
                const radius = enemy.boss ? BOSS_HIT_RADIUS : MINION_HIT_RADIUS;
                if (this.horizontalDistanceSq(bullet.position, enemy.node.position) > radius * radius) {
                    continue;
                }
                enemy.hp -= this.damage;
                this.spawnHitEffect(bullet.position);
                this.flashTarget(enemy);
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
        // 死亡变灰（boss 材质带贴图，mainColor 变灰表现为整体压暗）
        if (target.material) {
            target.material.setProperty('mainColor', DEATH_GRAY);
            target.material.setProperty('emissive', Color.BLACK);
        }
        if (target.boss) {
            const played = this.playClip(node, BOSS_DIE_CLIP, false, () => {
                if (node.isValid) {
                    node.destroy();
                }
            });
            if (!played) {
                node.destroy();
                return;
            }
        } else {
            // 小兵被击飞：向后上方抛起、坠落，最后缩没消失
            this.playClip(node, ENEMY_FLY_START_CLIP, false, () => {
                if (node.isValid) {
                    this.playClip(node, ENEMY_FLY_LOOP_CLIP, true);
                }
            });
            tween(node)
                .by(0.4, { position: KNOCKBACK_RISE.clone() }, { easing: 'sineOut' })
                .by(0.4, { position: KNOCKBACK_FALL.clone() }, { easing: 'sineIn' })
                .to(0.15, { scale: new Vec3(0, 0, 0) })
                .call(() => {
                    if (node.isValid) {
                        node.destroy();
                    }
                })
                .start();
        }
        // FINISHED/tween 在极端情况下可能收不到（如节点被打断），兜底清理尸体
        this.scheduleOnce(() => {
            if (node.isValid) {
                node.destroy();
            }
        }, CORPSE_FALLBACK_SECONDS);
    }

    private refreshHud(): void {
        if (this.statusLabel) {
            let progress: string;
            if (this.gameOver) {
                progress = '全员阵亡 · 游戏结束';
            } else if (this.bossDefeated) {
                progress = 'BOSS 已击败！';
            } else if (this.bossSpawned) {
                progress = 'BOSS 来袭';
            } else {
                progress = `击杀 ${this.kills}/${ENEMIES_BEFORE_BOSS}`;
            }
            this.statusLabel.string = `人数 ${this.squadMembers.length} · 伤害 ${this.damage} · ${progress}`;
        }
        const objective = this.objective && this.objective.node.isValid ? this.objective : null;
        const isGate = objective?.kind === 'squad';
        // 血量数字在目标物上方，数字门的 +N 单独贴在门体正面
        this.updateOverheadLabel(this.objectiveHpLabel, objective?.node ?? null,
            isGate ? GATE_LABEL_HEIGHT : POWER_LABEL_HEIGHT, objective ? `${objective.hp}` : '');
        this.updateOverheadLabel(this.gateBonusLabel, isGate ? objective!.node : null,
            GATE_BONUS_LABEL_HEIGHT, isGate ? `+${objective!.bonus}` : '');
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
