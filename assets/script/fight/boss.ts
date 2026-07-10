//boss组件
import { EffectManager } from './../framework/effectManager';
import { poolManager } from './../framework/poolManager';
import { _decorator, Component, Node, SkeletalAnimationComponent, RigidBodyComponent, BoxColliderComponent, AnimationClip, SkeletalAnimationState, Vec3, Prefab, Animation, Quat, Sprite, Game } from 'cc';
import { clientEvent } from '../framework/clientEvent';
import { constant } from '../framework/constant';
import { resourceUtil } from '../framework/resourceUtil';
import { GameManager } from './gameManager';
import { AudioManager } from '../framework/audioManager';
const { ccclass, property } = _decorator;

let v3_dir: Vec3 = new Vec3();//下一次要看向的向量
let v3_offset: Vec3 = new Vec3();//临时向量
let v3_upDirection: Vec3 = new Vec3(0, 1, 0);
let v3_lookAtPos: Vec3 = new Vec3();//看向的向量
@ccclass('Boss')
export class Boss extends Component {
    @property(SkeletalAnimationComponent)
    public aniCom: SkeletalAnimationComponent = null!;

    @property(Node)
    public ndSocketHand: Node = null!;//手掌心节点

    @property(Node)
    public ndSocketHead: Node = null!;//头顶节点

    public aniType: string = '';//动画类型
    public isAniPlaying: boolean = false;
    public isVertigo: boolean = false;//是否眩晕
    public isComa: boolean = false;//是否昏迷（血量为0时）
    public isAttacking: boolean = false;//是否攻击
    public isAngry: boolean = false;//是否愤怒的
    public isLookAtPlayer: boolean = false;//是否看向玩家
    public bossAttackTimes: number = 0;//boss关卡躲避阶段攻击次数

    private _ndWeapon: Node = null!;//武器
    private _ndHornHat: Node = null!;//boss牛角帽子
    private _attackCallback: Function = null!;//boss攻击回调，由帧事件触发
    private _aniState: SkeletalAnimationState = null!;
    private _aniComComa: Animation = null!;//昏迷动画
    private _curLookAtPos: Vec3 = null!;//当前看向的位置
    private _colliderComWeapon: BoxColliderComponent = null!;//武器碰撞框

    onEnable () {
    }

    onDisable () {
    }

    start () {
        // [3]

    }

    public init () {
        if (!this._ndWeapon) {
            resourceUtil.loadModelRes("weapon/mace").then((prefab: any) => {
                this._ndWeapon = poolManager.instance.getNode(prefab, this.ndSocketHand) as Node;
                this._colliderComWeapon = this._ndWeapon.getComponent(BoxColliderComponent) as BoxColliderComponent;
                this._colliderComWeapon.isTrigger = true;
                this._colliderComWeapon.enabled = false;
            });
        } else {
            this._colliderComWeapon = this._ndWeapon.getComponent(BoxColliderComponent) as BoxColliderComponent;
            this._colliderComWeapon.isTrigger = true;
            this._colliderComWeapon.enabled = false;
        }

        if (!this._ndHornHat) {
            resourceUtil.loadModelRes("hat/hornHat").then((prefab: any) => {
                this._ndHornHat = poolManager.instance.getNode(prefab, this.ndSocketHead) as Node;
            });
        }

        this.isLookAtPlayer = false;
        this.playAni(constant.BOSS_ANI_TYPE.BOSS_FIGHT_IDLE, true);
        this.hideAniVertigo();

        let bossWorPos = this.node.worldPosition.clone();

        v3_lookAtPos.set(0, 1, bossWorPos.z - 1);
        this.node.lookAt(v3_lookAtPos, v3_upDirection);

        this._curLookAtPos = null!;
        this.isAttacking = false;
        this.isAngry = false;
        this.isAniPlaying = false;
        this.isComa = false;
        this.isVertigo = false;
    }

    /**
   * 播放玩家动画
   *
   * @param {string} aniType 动画类型
   * @param {boolean} [isLoop=false] 是否循环
   * @param {Function} [callback] 回调函数
   * @returns
   * @memberof Player
   */
    public playAni (aniType: string, isLoop: boolean = false, callback: Function = () => { }) {
        // console.log("boss.playAni aniType", aniType);

        this.aniType = aniType;

        if (!this.aniCom) {
            this.aniCom = this.node.getComponent(SkeletalAnimationComponent) as SkeletalAnimationComponent;
        }

        this.aniCom?.crossFade(aniType);
        this.isAniPlaying = true;

        this._aniState = this.aniCom?.getState(aniType) as SkeletalAnimationState;
        if (this._aniState) {
            if (isLoop) {
                this._aniState.wrapMode = AnimationClip.WrapMode.Loop;
            } else {
                this._aniState.wrapMode = AnimationClip.WrapMode.Normal;
            }

            if (aniType === constant.BOSS_ANI_TYPE.BOSS_ATTACK) {
                this._aniState.speed = 1.5;
            } else {
                this._aniState.speed = 1;
            }
        }

        if (!isLoop) {
            this.aniCom.once(SkeletalAnimationComponent.EventType.FINISHED, () => {
                this.isAniPlaying = false;
                callback && callback();
            })
        }
    }

    public refreshAniAttackSpeed () {
        this._aniState = this.aniCom?.getState(constant.BOSS_ANI_TYPE.BOSS_ATTACK) as SkeletalAnimationState;
        if (this._aniState) {
            this._aniState.speed = GameManager.gameSpeed;
        }
    }

    /**
     * 播放攻击动画
     * @param callback 
     */
    public playAniAttack (callback: Function) {
        this.isAttacking = true;
        this._attackCallback = callback;
        this.playAni(constant.BOSS_ANI_TYPE.BOSS_ATTACK, false, () => {
            //判断bossAttackTimes > 1是因为防止动画切换过于频繁造成视觉效果不好（攻击->待机->眩晕），改后的效果：攻击->待机， 攻击—>眩晕
            if (!this.isComa && !this.isVertigo && this.bossAttackTimes > 1) {
                this.playAni(constant.BOSS_ANI_TYPE.BOSS_FIGHT_IDLE, true);
            }
            this.isAttacking = false;
            clientEvent.dispatchEvent(constant.EVENT_TYPE.REFRESH_ATTACK_WOR_POS);
        })
    }

    /**
     * 播放怒气动画
     * @param callback 
     */
    public playAniAngry (callback: Function) {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.BOSS_ANGRY);

        this.hideAniVertigo();
        this.isAngry = true;
        this.playAni(constant.BOSS_ANI_TYPE.BOSS_ANGRY, false, () => {

        })

        EffectManager.instance.playEffect(this.node, 'bossAngry/bossAngry', false, true, 2, 1, new Vec3(), new Vec3(), () => {
            this.isAngry = false;
            this.playAni(constant.BOSS_ANI_TYPE.BOSS_FIGHT_IDLE, true);
            callback && callback();
        });
    }

    /**
     * 展示眩晕效果
     */
    public showAniVertigo () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.BOSS_VERTIGO);

        this.isVertigo = true;
        this.playAni(constant.BOSS_ANI_TYPE.BOSS_SWOON, true);
        this._showStar();
    }

    /**
     * boss头上展示星星
     */
    private _showStar () {
        if (this._aniComComa) {
            this._aniComComa.node.active = true;
            this._aniComComa.play("star01");
        } else {
            resourceUtil.loadEffectRes("star/star01").then((prefab: any) => {
                let ndEffect = poolManager.instance.getNode(prefab, this.ndSocketHead) as Node;
                this._aniComComa = ndEffect.getComponent(Animation) as Animation;
                this._aniComComa.play("star01");
            })
        }
    }

    /**
    * 隐藏头上星星
    */
    public hideAniVertigo () {
        if (this.isVertigo && this._aniComComa) {
            this._aniComComa.stop();
            this._aniComComa.node.active = false;
            this.isVertigo = false;
        }
    }

    /**
     * boss昏迷
     */
    public showAniComa () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.BOSS_VERTIGO);

        this.playAni(constant.BOSS_ANI_TYPE.BOSS_LOSE);
        this._showStar();
    }

    /**
     * attack帧事件：开启武器碰撞器
     */
    public onFrameEnableCollider () {
        this._colliderComWeapon.enabled = true;
        this._colliderComWeapon.isTrigger = true;

        AudioManager.instance.playSound(constant.AUDIO_SOUND.BOSS_ATTACK_GROUND[Math.floor(Math.random() * constant.AUDIO_SOUND.BOSS_ATTACK_GROUND.length)]);
    }

    /**
     * attack帧事件：boss攻击动作距离地面最近，关闭武器碰撞器
     */
    public onFrameDisableCollider () {
        this._colliderComWeapon.enabled = false;
        this._colliderComWeapon.isTrigger = true;
        this._attackCallback && this._attackCallback();
        this._attackCallback = null!;
    }

    /**
     * 开始挥舞武器
     */
    public onFrameUseWeapon () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.BOSS_WEAPON_WAVING[Math.floor(Math.random() * constant.AUDIO_SOUND.BOSS_WEAPON_WAVING.length)]);
    }

    /**
     * boss被击飞效果
     */
    public hitFlyBoss () {
        this.hideAniVertigo();
        // this.playAni(constant.BOSS_ANI_TYPE.BOSS_DIE);
    }

    update (deltaTime: number) {
        if (this.isLookAtPlayer && !GameManager.scriptPlayer.isJumping && GameManager.scriptPlayer.jumpPos !== GameManager.scriptPlayer.preJumpPos) {
            //boss开始攻击的时候朝向玩家对面的坐标
            if (!this._curLookAtPos) {
                this._curLookAtPos = GameManager.scriptPlayer.getOriLookAtPos();
            }

            v3_dir = GameManager.scriptPlayer.oppositeSidePos;
            this._curLookAtPos.lerp(v3_dir, 0.1);
            this.node.lookAt(this._curLookAtPos, v3_upDirection);

            v3_offset = Vec3.subtract(v3_offset, v3_dir, this._curLookAtPos);

            console.log("offset", v3_offset.length());
            if (v3_offset.length() <= 0.05) {
                this.isLookAtPlayer = false;
            }

            //或者换成用equal写法
        }
    }
}