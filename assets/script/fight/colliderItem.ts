import { GameLogic } from './../framework/gameLogic';
import { AudioManager } from './../framework/audioManager';
import { Player } from './player';
import { clientEvent } from './../framework/clientEvent';
import { EffectManager } from './../framework/effectManager';
import { Quat, MeshColliderComponent, RigidBodyComponent, TERRAIN_HEIGHT_BASE, find, isValid } from 'cc';
import { poolManager } from './../framework/poolManager';
import { GameManager } from './gameManager';
import { _decorator, Component, Material, MeshRenderer, BoxColliderComponent, CylinderColliderComponent, ITriggerEvent, Vec3, Color, Tween, tween, Enum, Animation, CapsuleColliderComponent } from 'cc';
import { constant } from '../framework/constant';
import { FightMap } from './fightMap';
import { localConfig } from '../framework/localConfig';
//碰撞器组件

//临时向量，避免多次创建
let v3_zero: Vec3 = new Vec3();//零向量
let v3_rotatingBlade: Vec3 = new Vec3();//旋转刀片当前位置
let v3_diamondEffect: Vec3 = new Vec3(0, 1.35, 1);//钻石特效位置
let v3_keyEffect: Vec3 = new Vec3(0, 1.35, 1);//钥匙特效位置
let v3_wallEffect: Vec3 = new Vec3(0, 0.5, 0);//撞墙墙特效位置
let v3_colorLightEffect: Vec3 = new Vec3(0, 0.5, 0);//colorLight特效位置
let v3_boxHitEffect: Vec3 = new Vec3(0, 0.25, 0);//箱子打开特效位置

const { ccclass, property } = _decorator;

const COLLIDER_NAME = Enum({
    WALL: 1,//墙
    MACE_SECTOR: 2,//180度狼牙板块
    MACE_LEFT_RIGHT: 3,//左右移动狼牙棒（废弃）
    ROTATING_RING: 4,//旋转圈/旋转墙
    ORGAN_DOOR: 5,//开合机关门
    ORGAN_BTN: 6,//开合机关门按钮(废弃)
    BOX: 7,//宝箱(废弃)
    GOLD: 8,//金币（废弃）
    DIAMOND: 9,//钻石
    KEY: 10,//钥匙
    COLOR_LIGHT_RED: 11,//红色亮圈
    COLOR_LIGHT_PURPLE: 12,//粉色色亮圈（废弃）
    COLOR_LIGHT_YELLOW: 13,//黄色亮圈
    COLOR_LIGHT_GREEN: 14,//绿色亮圈
    PEOPLE_RED: 15,//红色小人
    PEOPLE_PURPLE: 16,//粉色小人（废弃）
    PEOPLE_YELLOW: 17,//黄色小人
    PEOPLE_GREEN: 18,//绿色小人
    END_NORMAL: 19,//普通关终点
    PUT_UP_CAMERA: 20, //抬高相机（废弃）
    END_LINE: 21,//终点线
    END_REWARD: 22,//奖励关终点（废弃）
    END_BOSS: 23,//boss关终点（废弃）
    ENEMY: 24,//普通关卡敌人（废弃）
    BOSS: 25,//boss
    WEAPON: 26,//boss关卡武器
    ROTATING_BLADE: 27,//旋转刀片
    SPINE_ROAD: 28,//尖刺路
    BRICK: 29, //砖块
    RUN_HIT_WALL_EFFECT: 30,//撞墙特效提前一丢丢播放
})

//管理障碍类型
@ccclass('ColliderItem')
export class ColliderItem extends Component {
    // [1]
    // dummy = '';

    // [2]
    // @property
    // serializableDummy = 0;  

    @property({
        type: COLLIDER_NAME,
        displayOrder: 1
    })
    public colliderName: any = COLLIDER_NAME.WALL;//碰撞体类型名称

    public colliderCom: any = null;
    public ani: Animation = null!;

    public set timer (obj: any) {
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
    }

    public static COLLIDER_NAME = COLLIDER_NAME;

    private _curQuat: Quat = new Quat();
    private _rotatingBladeDirection: number = 1;//默认向右
    // private _arrMat: Material[] = [];
    private _oriScale: Vec3 = new Vec3();//原始缩放大小
    private _oriWorPos: Vec3 = new Vec3();//原始世界坐标
    private _isInhaling: boolean = false;//是否正在吸入
    private _isOnSpineRoad: boolean = false;//当前是否站在尖刺路上
    private _checkInterval: number = 1;//在尖刺路上减去体积的间隔时间为1秒
    private _curMat: Material = null!;//当前小人材质
    private _oriMat: Material = null!;//原始小人材质
    private _timer: any = null;//定时器

    onLoad () {
        this.colliderCom = this.node.getComponent(BoxColliderComponent) || this.node.getComponent(CylinderColliderComponent) || this.node.getComponent(CapsuleColliderComponent) || this.node.getComponent(MeshColliderComponent);

        if (!this.colliderCom) {
            console.error("this node does not have collider component");
        }
    }

    onEnable () {
        if (this.colliderCom.isTrigger) {
            this.colliderCom.on('onTriggerEnter', this._onTriggerEnterCb, this);
        } else {
            this.colliderCom.on('onCollisionEnter', this._onCollisionEnterCb, this);
        }

        if (this.colliderName === ColliderItem.COLLIDER_NAME.SPINE_ROAD) {
            this.colliderCom.on("onTriggerStay", this._onTriggerStayCb, this);
            this.colliderCom.on("onTriggerExit", this._onTriggerExitCb, this);
        }

        clientEvent.on(constant.EVENT_TYPE.ON_BOX_HIT, this._onBoxHit, this);
        clientEvent.on(constant.EVENT_TYPE.ON_BOX_OPEN, this._onBoxOpen, this);
        clientEvent.on(constant.EVENT_TYPE.PEOPLE_BECOME_SAME_SKIN, this._peopleBecomeSameSkin, this);
        clientEvent.on(constant.EVENT_TYPE.PEOPLE_RECOVERY_ORI_SKIN, this._peopleRecoveryOriSkin, this);
    }

    onDisable () {
        if (this.colliderCom.isTrigger) {
            this.colliderCom.off('onTriggerEnter', this._onTriggerEnterCb, this);
        } else {
            this.colliderCom.off('onCollisionEnter', this._onCollisionEnterCb, this);
        }

        if (this.colliderName === ColliderItem.COLLIDER_NAME.SPINE_ROAD) {
            this.colliderCom.off("onTriggerStay", this._onTriggerStayCb, this);
            this.colliderCom.off("onTriggerExit", this._onTriggerExitCb, this);
        }

        clientEvent.off(constant.EVENT_TYPE.ON_BOX_HIT, this._onBoxHit, this);
        clientEvent.off(constant.EVENT_TYPE.ON_BOX_OPEN, this._onBoxOpen, this);
        clientEvent.off(constant.EVENT_TYPE.PEOPLE_BECOME_SAME_SKIN, this._peopleBecomeSameSkin, this);
        clientEvent.off(constant.EVENT_TYPE.PEOPLE_RECOVERY_ORI_SKIN, this._peopleRecoveryOriSkin, this);
    }

    start () {
        this._oriScale = this.node.getScale();
        this._oriWorPos = this.node.getWorldPosition();
    }

    /**
     * 初始化
     */
    public init () {
        if (this.colliderName === COLLIDER_NAME.PEOPLE_GREEN || this.colliderName === COLLIDER_NAME.PEOPLE_RED || this.colliderName === COLLIDER_NAME.PEOPLE_YELLOW) {
            let ndMan = this.node.getChildByName("people");
            let meshCom = ndMan?.getComponent(MeshRenderer) as MeshRenderer;

            //从对象吃回收的小人， 变回原来的颜色
            if (this._oriMat && this._curMat && this._curMat !== this._oriMat) {
                if (GameManager.scriptPlayer && GameManager.scriptPlayer.isInvincible) {
                    this._curMat = GameManager.peopleInvincibleMaterial;
                    meshCom?.setMaterial(this._curMat, 0);
                } else {
                    meshCom?.setMaterial(this._oriMat, 0);
                }
            } else {
                if (GameManager.scriptPlayer && GameManager.scriptPlayer.isInvincible) {
                    this._oriMat = meshCom.getSharedMaterial(0) as Material;
                    this._curMat = GameManager.peopleInvincibleMaterial;
                    meshCom?.setMaterial(this._curMat, 0);
                }
            }
        }
    }

    private _onTriggerEnterCb (event: ITriggerEvent) {
        this._hitPlayer(event.otherCollider);
    }

    private _onCollisionEnterCb (event: ITriggerEvent) {
        this._hitPlayer(event.otherCollider);
    }

    private _hitPlayer (otherCollider: any) {
        if (otherCollider.getGroup() == constant.GROUP_TYPE.PLAYER && !GameManager.isGameOver && GameManager.ndPlayer) {
            switch (this.colliderName) {
                case COLLIDER_NAME.WALL:
                    let arrBrickGroup1: any, arrBrickGroup2: any;
                    arrBrickGroup1 = this.node.getChildByName("brick01Group")?.getComponentsInChildren(RigidBodyComponent) as any;
                    arrBrickGroup2 = this.node.getChildByName("brick02Group")?.getComponentsInChildren(RigidBodyComponent) as any;

                    let arrBrickGroup = arrBrickGroup1?.concat(arrBrickGroup2);

                    arrBrickGroup.forEach((item: RigidBodyComponent) => {
                        item.enabled = true;
                        item.useGravity = true;
                        item.wakeUp();
                        item.mass = 0.15;
                        item.linearDamping = 0.07;
                        item.angularDamping = 0.07;
                    })

                    this._timer = setTimeout(() => {
                        //如果过关失败，则4秒后清除砖块的刚体状态， 并将其刚体类型改为static，减少性能消耗
                        if (isValid(this.node) && this.node.parent) {
                            arrBrickGroup1 = this.node.getChildByName("brick01Group")?.getComponentsInChildren(RigidBodyComponent) as any;
                            arrBrickGroup2 = this.node.getChildByName("brick02Group")?.getComponentsInChildren(RigidBodyComponent) as any;

                            let arrBrickGroup = arrBrickGroup1?.concat(arrBrickGroup2);

                            if (arrBrickGroup.length) {
                                arrBrickGroup.forEach((item: RigidBodyComponent) => {
                                    item.clearState();
                                    item.type = RigidBodyComponent.Type.STATIC;
                                })
                            }
                        }
                    }, 4000)

                    GameManager.scriptPlayer.hitWall();

                    GameLogic.vibrateShort();
                    break;
                case COLLIDER_NAME.MACE_SECTOR:
                    if (this._checkIsEffective()) {
                        let moduleItemInfo = localConfig.instance.queryByID("module", "5001");
                        GameManager.scriptPlayer.updateVolume(-moduleItemInfo.reduceVolume, constant.UPDATE_VOLUME_TYPE.HIT_BY_COLLIDER);

                        GameLogic.vibrateShort();
                    }
                    break;
                case COLLIDER_NAME.ROTATING_RING:
                    if (this._checkIsEffective()) {
                        let moduleItemInfo = localConfig.instance.queryByID("module", "1201");
                        GameManager.scriptPlayer.updateVolume(-moduleItemInfo.reduceVolume, constant.UPDATE_VOLUME_TYPE.HIT_BY_COLLIDER);

                        GameLogic.vibrateShort();
                    }
                    break;
                case COLLIDER_NAME.ORGAN_DOOR:
                    if (this._checkIsEffective()) {
                        let moduleItemInfo = localConfig.instance.queryByID("module", "4001");
                        GameManager.scriptPlayer.updateVolume(-moduleItemInfo.reduceVolume, constant.UPDATE_VOLUME_TYPE.HIT_BY_COLLIDER);

                        GameLogic.vibrateShort();
                    }
                    break;
                case COLLIDER_NAME.ROTATING_BLADE:
                    if (this._checkIsEffective()) {
                        let moduleItemInfo = localConfig.instance.queryByID("module", '1101');
                        GameManager.scriptPlayer.updateVolume(-moduleItemInfo.reduceVolume, constant.UPDATE_VOLUME_TYPE.HIT_BY_COLLIDER);

                        GameLogic.vibrateShort();
                    }
                    break;
                case COLLIDER_NAME.DIAMOND:
                    poolManager.instance.putNode(this.node);
                    EffectManager.instance.playEffect(GameManager.scriptPlayer.node, 'collectColor/collectPurple', true, true, 0.4, 3 * Player.scaleRatio, v3_diamondEffect);
                    clientEvent.dispatchEvent(constant.EVENT_TYPE.REFRESH_DIAMOND);
                    clientEvent.dispatchEvent("constant.EVENT_TYPE.CHANGE_SKIN, this.colliderName");
                    AudioManager.instance.playSound(constant.AUDIO_SOUND.DIAMOND_COLLECT);
                    this._isInhaling = false;

                    GameLogic.vibrateShort();
                    break;
                case COLLIDER_NAME.KEY:
                    poolManager.instance.putNode(this.node);
                    EffectManager.instance.playEffect(GameManager.scriptPlayer.node, 'collectColor/collectYellow', true, true, 0.4, 3 * Player.scaleRatio, v3_keyEffect);
                    GameManager.addKey();
                    clientEvent.dispatchEvent(constant.EVENT_TYPE.CHANGE_SKIN, this.colliderName);
                    AudioManager.instance.playSound(constant.AUDIO_SOUND.COLLECT_KEY);
                    this._isInhaling = false;

                    GameLogic.vibrateShort();
                    break;
                case COLLIDER_NAME.COLOR_LIGHT_RED:
                    clientEvent.dispatchEvent(constant.EVENT_TYPE.CHANGE_SKIN, this.colliderName);
                    EffectManager.instance.playEffect(GameManager.scriptPlayer.node, 'changeColor/changeRed', true, true, 1, 2 * Player.scaleRatio, v3_colorLightEffect);
                    AudioManager.instance.playSound(constant.AUDIO_SOUND.CHANGE_COLOR);

                    GameLogic.vibrateShort();
                    break;
                case COLLIDER_NAME.COLOR_LIGHT_GREEN:
                    clientEvent.dispatchEvent(constant.EVENT_TYPE.CHANGE_SKIN, this.colliderName);
                    EffectManager.instance.playEffect(GameManager.scriptPlayer.node, 'changeColor/changeGreen', true, true, 1, 2 * Player.scaleRatio, v3_colorLightEffect);
                    AudioManager.instance.playSound(constant.AUDIO_SOUND.CHANGE_COLOR);

                    GameLogic.vibrateShort();

                    break;
                case COLLIDER_NAME.COLOR_LIGHT_YELLOW:
                    clientEvent.dispatchEvent(constant.EVENT_TYPE.CHANGE_SKIN, this.colliderName);
                    EffectManager.instance.playEffect(GameManager.scriptPlayer.node, 'changeColor/changeYellow', true, true, 1, 2 * Player.scaleRatio, v3_colorLightEffect);
                    AudioManager.instance.playSound(constant.AUDIO_SOUND.CHANGE_COLOR);

                    GameLogic.vibrateShort();
                    break;
                case COLLIDER_NAME.PEOPLE_RED:
                    GameManager.scriptPlayer.hitPeople(this.colliderName);
                    clientEvent.dispatchEvent(constant.EVENT_TYPE.CHANGE_SKIN, this.colliderName);
                    poolManager.instance.putNode(this.node);
                    this._isInhaling = false;

                    GameLogic.vibrateShort();
                    break;
                case COLLIDER_NAME.PEOPLE_YELLOW:
                    GameManager.scriptPlayer.hitPeople(this.colliderName);
                    clientEvent.dispatchEvent(constant.EVENT_TYPE.CHANGE_SKIN, this.colliderName);
                    poolManager.instance.putNode(this.node);
                    this._isInhaling = false;

                    GameLogic.vibrateShort();
                    break;
                case COLLIDER_NAME.PEOPLE_GREEN:
                    GameManager.scriptPlayer.hitPeople(this.colliderName);
                    clientEvent.dispatchEvent(constant.EVENT_TYPE.CHANGE_SKIN, this.colliderName);
                    poolManager.instance.putNode(this.node);
                    this._isInhaling = false;

                    GameLogic.vibrateShort();
                    break;
                case COLLIDER_NAME.END_LINE:
                    clientEvent.dispatchEvent(constant.EVENT_TYPE.ARRIVE_END_LINE);
                    GameManager.isRevive = false;
                    GameManager.isArriveEndLine = true;
                    break;
                case COLLIDER_NAME.WEAPON:
                    clientEvent.dispatchEvent(constant.EVENT_TYPE.WEAPON_HIT_PLAYER);
                    break;
                case COLLIDER_NAME.RUN_HIT_WALL_EFFECT:
                    //特效需要提前一丢丢播放才显得顺滑
                    EffectManager.instance.playHitEffect(GameManager.scriptPlayer.node, FightMap.ndWall, v3_wallEffect);

                    setTimeout(() => {
                        let moduleItemInfo = localConfig.instance.queryByID("module", "9001");
                        if (GameManager.scriptPlayer.volume - moduleItemInfo.reduceVolume - 10 > 0 || GameManager.scriptPlayer.isInvincible) {
                            GameManager.scriptPlayer.scriptManModel.playAni(constant.ANI_TYPE.RUN_HIT, false, () => {
                                GameManager.scriptPlayer.scriptManModel.playAni(constant.ANI_TYPE.RUN, true);
                            });
                        } else {
                            GameManager.scriptPlayer.scriptManModel.playAni(constant.ANI_TYPE.RUN_HIT);
                        }
                    }, 100)

                    break;
                case COLLIDER_NAME.BRICK:
                    break;
                case COLLIDER_NAME.SPINE_ROAD:
                    break;
                default:
                    console.warn("colliderName not found", this.colliderName);
                    break;
            }

            // console.log(`hit by ${this.colliderName}`);
        }
    }

    /**
     * 在尖刺路范围,
     */
    private _onTriggerStayCb () {
        this._isOnSpineRoad = true;
    }

    /**
     * 离开尖刺路
     */
    private _onTriggerExitCb () {
        this._isOnSpineRoad = false;

        clientEvent.dispatchEvent(constant.EVENT_TYPE.RECOVERY_ORI_SPEED);
    }

    private _onBoxHit () {
        if (this.colliderName == COLLIDER_NAME.BOX) {
            this.node.setPosition(v3_zero);
            this.node.eulerAngles = v3_zero;

            let ani = this.node.getComponent(Animation) as Animation;

            let aniStateBoxHit = ani.getState("boxHit");
            if (aniStateBoxHit.isPlaying) {
                return;
            }

            ani.play("boxHit");
            EffectManager.instance.playEffect(this.node, 'box/boxHit', true, true, 2, 3, v3_boxHitEffect);
        }
    }

    private _onBoxOpen (callback: Function) {
        if (this.colliderName == COLLIDER_NAME.BOX) {
            AudioManager.instance.playSound(constant.AUDIO_SOUND.REWARD_BIG_BOX);

            let aniCom = this.node.getComponent(Animation) as Animation;
            aniCom.play("boxOpen");

            //好奇怪，回调了两次
            let isLoaded = false;
            aniCom.once(Animation.EventType.FINISHED, () => {
                //播放礼花效果
                if (!isLoaded) {
                    isLoaded = true;
                    let targetWroPos = GameManager.scriptPlayer.node.worldPosition.clone();

                    EffectManager.instance.playParticle('colorBar/colorBar', targetWroPos.clone().add3f(-0.3, 0, 0), 3, 1.5, null, null, true);
                    EffectManager.instance.playParticle('colorBar/colorBar', targetWroPos.clone().add3f(0.3, 0, 0), 3, 1.5, null, null, true);
                    EffectManager.instance.playParticle('colorBar/colorBar', targetWroPos.clone().add3f(0, 0, -1.3), 3, 1.5, null, null, true);

                    AudioManager.instance.playSound(constant.AUDIO_SOUND.FIRE);

                    callback();
                }
            })

            EffectManager.instance.playEffect(this.node, 'box/boxOpen', true, true, 5, 5, new Vec3(0, 0, 0));
        }
    }

    /**
     * 小人变成同种颜色
     * @param type 
     */
    private _peopleBecomeSameSkin () {
        if (this.colliderName === ColliderItem.COLLIDER_NAME.PEOPLE_RED || this.colliderName === ColliderItem.COLLIDER_NAME.PEOPLE_YELLOW || this.colliderName === ColliderItem.COLLIDER_NAME.PEOPLE_GREEN) {
            this._curMat = GameManager.peopleInvincibleMaterial;
            let ndMan = this.node.getChildByName("people");
            let meshCom = ndMan?.getComponent(MeshRenderer) as MeshRenderer;
            this._oriMat = meshCom.getSharedMaterial(0) as Material;
            meshCom?.setMaterial(this._curMat, 0);
        }
    }

    /**
     * 变色的小人恢复回原来的颜色
     *
     * @private
     * @memberof ColliderItem
     */
    private _peopleRecoveryOriSkin () {
        if (this.colliderName === ColliderItem.COLLIDER_NAME.PEOPLE_RED || this.colliderName === ColliderItem.COLLIDER_NAME.PEOPLE_YELLOW || this.colliderName === ColliderItem.COLLIDER_NAME.PEOPLE_GREEN) {
            if (this._oriMat && this._curMat && this._curMat !== this._oriMat) {
                let ndMan = this.node.getChildByName("people");
                let meshCom = ndMan?.getComponent(MeshRenderer) as MeshRenderer;
                meshCom?.setMaterial(this._oriMat, 0);
            }
        }
    }

    /**
     * 检查障碍是否对玩家有效：非无敌时候有效，无敌的时候部分关卡有效，需要注意的是复活后0.5秒内障碍都对玩家无效
     */
    private _checkIsEffective () {
        let ID = 0;

        //注意：如果module配置表格ID字段有改变，则条件得更新
        switch (this.colliderName) {
            case ColliderItem.COLLIDER_NAME.WALL:
                ID = 9001;
                break;
            case ColliderItem.COLLIDER_NAME.MACE_SECTOR:
                ID = 5001;
                break;
            case ColliderItem.COLLIDER_NAME.ROTATING_RING:
                ID = 1201;
                break;
            case ColliderItem.COLLIDER_NAME.ORGAN_DOOR:
                ID = 4001;
                break;
            case ColliderItem.COLLIDER_NAME.ROTATING_BLADE:
                ID = 1101;
                break;
            case ColliderItem.COLLIDER_NAME.SPINE_ROAD:
                ID = 1301;
                break;
        }

        return (!GameManager.scriptPlayer.isInvincible || (GameManager.scriptPlayer.isInvincible && FightMap.arrEffective.indexOf(ID) != -1)) && GameManager.scriptPlayer.reviveInvincibleTime <= 0;
    }

    update (deltaTime: number) {
        if (GameManager.isGameOver || !GameManager.ndPlayer) {
            return;
        }

        if (this.colliderName === COLLIDER_NAME.DIAMOND) {
            Quat.fromEuler(this._curQuat, 0, 120 * deltaTime, 0);
            this.node.rotate(this._curQuat);
        } else if (this.colliderName === COLLIDER_NAME.ROTATING_BLADE) {
            let curWorPos = this.node.worldPosition;
            let speed = 0.1;
            if (this._rotatingBladeDirection === 1) {
                v3_rotatingBlade.set(deltaTime * speed, 0, 0);
                this.node?.parent?.translate(v3_rotatingBlade);
                if (curWorPos.x > 0.4) {
                    this._rotatingBladeDirection = -1;
                }
            } else {
                v3_rotatingBlade.set(-deltaTime * speed, 0, 0);
                this.node?.parent?.translate(v3_rotatingBlade);
                if (curWorPos.x < -0.4) {
                    this._rotatingBladeDirection = 1;
                }
            }
        }

        //无敌时吸入小人和钻石
        if (this.colliderName === COLLIDER_NAME.DIAMOND || this.colliderName === COLLIDER_NAME.PEOPLE_RED || this.colliderName === COLLIDER_NAME.PEOPLE_GREEN || this.colliderName === COLLIDER_NAME.PEOPLE_YELLOW) {
            if (GameManager.scriptPlayer && GameManager.scriptPlayer.node) {
                if (GameManager.scriptPlayer.isInvincible) {
                    //如果位于玩家前后为1则被玩家吸入
                    if (this.node.worldPosition.z <= GameManager.scriptPlayer.node.worldPosition.z + 1 && this.node.worldPosition.z >= GameManager.scriptPlayer.node.worldPosition.z - 1) {
                        this._isInhaling = true;
                        let playerHeadWorPos = GameManager.scriptPlayer.node.worldPosition.clone();
                        let curWorPos = this.node.worldPosition.clone();
                        let targetWorPos = curWorPos.lerp(playerHeadWorPos.add3f(0, 0.3, -0.3), 0.2);
                        this.node.setWorldPosition(targetWorPos);

                        let curScale = this.node.getScale().clone();
                        let targetScale = curScale.lerp(this._oriScale.clone().multiplyScalar(0.3), 0.15);
                        this.node.setScale(targetScale);
                    }
                } else {
                    if (this._isInhaling) {
                        poolManager.instance.putNode(this.node);
                        this._isInhaling = false;
                    }
                }
            }
        }

        //检测是否走在尖刺路上，每隔固定时间扣减一定伤害
        if (this.colliderName === COLLIDER_NAME.SPINE_ROAD && this._isOnSpineRoad && this._checkIsEffective()) {
            this._checkInterval += deltaTime;
            if (this._checkInterval >= 0.5) {
                this._checkInterval = 0;
                GameManager.scriptPlayer.walkOnSpineRoad();
                clientEvent.dispatchEvent(constant.EVENT_TYPE.CHANGE_TO_SPINE_SPEED);
            }
        }

        //砖块超过父节点z向量一定返回的时候隐藏
        if (this.colliderName === COLLIDER_NAME.BRICK) {
            if (this.node.parent && this.node.worldPosition.z <= this.node?.parent?.worldPosition.z - 0.5) {
                this.node.active = false;
            }
        }
    }
}

