import { Player } from './player';
import { util } from './../framework/util';
import { AudioManager } from './../framework/audioManager';
import { Enemy } from './enemy';
import { FightMap } from './fightMap';
import { EffectManager } from './../framework/effectManager';
import { _decorator, Component, Node, SkeletalAnimationComponent, SkeletalAnimationState, AnimationClip, tween, Vec3, Game, Texture2D } from 'cc';
import { clientEvent } from '../framework/clientEvent';
import { constant } from '../framework/constant';
import { GameManager } from './gameManager';
import { GameLogic } from '../framework/gameLogic';

//临时向量，避免多次创建
let v3_zero = new Vec3();//零向量
let v3_attackLeftNormalPlayer = new Vec3(0, 0, -0.1);//普通关玩家左钩拳拳特效位置
let v3_attackLeftNormalEnemy = new Vec3(0, 0, 0.1);//普通关敌人左钩拳拳特效位置
let v3_attackLeftRewardPlayer = new Vec3(0, 0.1, 0);//奖励关玩家左钩拳拳特效位置
let v3_attackLeftBossPlayer = new Vec3(0, 0.4, 0);//boss玩家左钩拳拳特效位置

let v3_attackRightNormalPlayer = new Vec3(0, 0, -0.1);//普通关玩家右钩拳拳特效位置
let v3_attackRightNormalEnemy = new Vec3(0, 0, 0.1);//普通关敌人右钩拳拳特效位置
let v3_attackRightRewardPlayer = new Vec3(0, 0.1, 0);//奖励关玩家右钩拳拳特效位置
let v3_attackRightBossPlayer = new Vec3(0, 0.4, 0);//boss玩家右钩拳拳特效位置

let v3_kickUpNormalPlayer: Vec3 = new Vec3(0, 0, -0.1);//普通关玩家抬腿播放特效位置
let v3_kickUpNormalEnemy: Vec3 = new Vec3(0, -0.2, 0.2);//普通关敌人抬腿播放特效位置
let v3_kickUpBossPlayer: Vec3 = new Vec3(0, 0.3, 0);//boss关玩家抬腿播放特效位置

const { ccclass, property } = _decorator;
//玩家和敌人通用组件
@ccclass('ManModel')
export class ManModel extends Component {
    // [1]
    // dummy = '';

    // [2]
    // @property
    // serializableDummy = 0;

    @property
    public isPlayer: boolean = false;

    @property(SkeletalAnimationComponent)
    public aniComPlayer: SkeletalAnimationComponent = null!;

    @property(Node)
    public ndSocketHead: Node = null!;//头部

    @property(Node)
    public ndSocketLeftFinger: Node = null!;//左手掌

    @property(Node)
    public ndSocketRightFinger: Node = null!; //右手掌

    @property(Node)
    public ndSocketLeftFoot: Node = null!;//左脚跟

    @property(Node)
    public ndSocketRightFoot: Node = null!;//右脚跟
    public aniType: string = "";//动画类型
    public isAniPlaying: Boolean = false;//当前动画是否正在播放
    public isKicking: boolean = true; //是否正在用脚步动画，以KO对方

    public get isAttacking () {
        let aniStateLeft = this.aniComPlayer?.getState(constant.ANI_TYPE.ATTACK_LEFT) as SkeletalAnimationState;
        let aniStateRight = this.aniComPlayer?.getState(constant.ANI_TYPE.ATTACK_RIGHT) as SkeletalAnimationState;
        return aniStateLeft.isPlaying || aniStateRight.isPlaying;
    }

    private _aniState: SkeletalAnimationState = null!;
    private _isAttackLeft: Boolean = true;//是否使用左钩拳
    
    onEnable () {
        clientEvent.on(constant.EVENT_TYPE.ARRIVE_END_LINE, this._arriveEndLine, this);
      
    }

    onDisable () {
        clientEvent.off(constant.EVENT_TYPE.ARRIVE_END_LINE, this._arriveEndLine, this);
    }

    start () {
        // [3]
        this._isAttackLeft = true;
        this.isKicking = false;
    }

    /**
     * 普通关卡的敌人会提前播放战斗待机动画
     */
    private _arriveEndLine () {
        if (GameManager.gameType === constant.GAME_TYPE.NORMAL) {
            if (!this.isPlayer) {
                this.playAni(constant.ANI_TYPE.FIGHT_IDLE, true, ()=>{}, 0);
            }
        }

        if (this.isPlayer) {
            GameManager.scriptPlayer.isEnableMoveLeftOrRight = false;
        }
    }

    /**
     * 播放玩家动画
     *
     * @param {string} aniType 动画类型
     * @param {boolean} [isLoop=false] 是否循环
     * @param {Function} [callback] 回调函数
     * @param {number} [callback] 调用播放动画的位置，方便用于测试
     * @returns
     * @memberof Player
     */
     public playAni (aniType: string, isLoop: boolean = false, callback?: Function, pos?: number) {
        // console.log("playerAniType", aniType, "curAni", this.aniType, "pos", pos);

        this.aniType = aniType;
        
        if (!this.aniComPlayer) {
            this.aniComPlayer = this.node.getComponent(SkeletalAnimationComponent) as SkeletalAnimationComponent;
        }

        // this.aniComPlayer?.crossFade(aniType);
        this.aniComPlayer?.play(aniType);

        this.isAniPlaying = true;
        this.isKicking = false;

        this._aniState = this.aniComPlayer?.getState(aniType) as SkeletalAnimationState;
        if (this._aniState) {
            if (isLoop) {
                this._aniState.wrapMode = AnimationClip.WrapMode.Loop;    
            } else {
                this._aniState.wrapMode = AnimationClip.WrapMode.Normal;    
            }

            switch (aniType) {
                case constant.ANI_TYPE.ATTACK_LEFT:
                    this._aniState.speed = GameManager.gameSpeed * 1.1;
                    break;
                case constant.ANI_TYPE.ATTACK_RIGHT:
                    this._aniState.speed = GameManager.gameSpeed * 1.1;
                    break;
                case constant.ANI_TYPE.KICK:
                    this.isKicking = true;
                    break;
                case constant.ANI_TYPE.DIE:
                    this._aniState.speed = GameManager.gameSpeed * 4;

                    if (this.isPlayer) {
                        GameManager.scriptPlayer.triggerDie();
                    }
                    break;
                case constant.ANI_TYPE.RUN:
                    this._aniState.speed = GameManager.gameSpeed * 1.2;
                    break;
                case constant.ANI_TYPE.DODGE_LEFT:
                    this._aniState.speed = GameManager.gameSpeed * 0.7;
                    break;
                case constant.ANI_TYPE.DODGE_RIGHT:
                    this._aniState.speed = GameManager.gameSpeed * 0.7;
                    break;
                default:
                    this._aniState.speed = GameManager.gameSpeed * 1;
                    break;
            }
        }

        if (!isLoop) {
            this.aniComPlayer.once(SkeletalAnimationComponent.EventType.FINISHED, ()=>{
                this.isAniPlaying = false;
                callback && callback();
            })
        }
    }

     /**
     * 左钩拳右勾拳循环
     */
      public playAniAttack (callback?: Function) {
        let aniStateLeft = this.aniComPlayer?.getState(constant.ANI_TYPE.ATTACK_LEFT) as SkeletalAnimationState;
        let aniStateRight = this.aniComPlayer?.getState(constant.ANI_TYPE.ATTACK_RIGHT) as SkeletalAnimationState;
        if (aniStateLeft.isPlaying || aniStateRight.isPlaying || GameManager.isGameOver) {
            return;
        }

        if (this._isAttackLeft) {
            this.playAni(constant.ANI_TYPE.ATTACK_LEFT, false, ()=>{
                callback && callback();
                if (GameManager.gameType === constant.GAME_TYPE.REWARD) {
                    clientEvent.dispatchEvent(constant.EVENT_TYPE.ON_BOX_HIT);
                }
            });

            this._isAttackLeft = false;
        } else {
            this.playAni(constant.ANI_TYPE.ATTACK_RIGHT, false, ()=>{
                callback && callback();
                if (GameManager.gameType === constant.GAME_TYPE.REWARD) {
                    clientEvent.dispatchEvent(constant.EVENT_TYPE.ON_BOX_HIT);
                }
            });

            this._isAttackLeft = true;
        }
    }

    /**
     * kick帧事件：由于特效加载慢，在脚跟刚抬起且未达到顶部时，提前播放击中头部特效
     */
    public onFrameKickUp () {
        if (GameManager.gameType === constant.GAME_TYPE.NORMAL) {
            if (this.isPlayer) {
                EffectManager.instance.playFightBoomEffect(this.ndSocketHead, FightMap.scriptEnemy.scriptManModel.ndSocketHead, v3_kickUpNormalPlayer);
            } else {
                EffectManager.instance.playFightBoomEffect(this.ndSocketHead, GameManager.scriptPlayer.scriptManModel.ndSocketHead, v3_kickUpNormalEnemy);
            }
        } else if (GameManager.gameType === constant.GAME_TYPE.REWARD) {
            if (this.isPlayer) {
                EffectManager.instance.playFightBoomEffect(this.ndSocketHead, FightMap.ndBox);
            }
        } else if (GameManager.gameType === constant.GAME_TYPE.BOSS) {
            if (this.isPlayer) {
                EffectManager.instance.playFightBoomEffect(this.node, FightMap.ndBoss, v3_kickUpBossPlayer);
            }
        }
    } 

    /**
     * kick帧事件：脚跟到达顶部
     * 
     * @memberof Player
     */

    public onFrameKickTop () {
        GameLogic.vibrateShort();

        if (GameManager.gameType === constant.GAME_TYPE.REWARD) {
            if (this.isPlayer) {
                console.log("onKickStart");
                GameManager.gameSpeed = 0.8;
                AudioManager.instance.playSound(constant.AUDIO_SOUND.ATTACK[Math.floor(Math.random() * constant.AUDIO_SOUND.ATTACK.length)]);
            }
        }  else if (GameManager.gameType === constant.GAME_TYPE.NORMAL) {
            if (this.isPlayer && this.aniType === constant.ANI_TYPE.KICK) {
                GameManager.gameSpeed = 0.2;
                
                let endWorPos = FightMap.ndEnemy.worldPosition.clone();
                let cameraMoveWorPos = endWorPos.clone().add3f(0.5, 0.8, 2.4);
                let cameraLookAtPos = endWorPos.clone().add3f(0, 0.4, 0);
                GameManager.scriptGameCamera.moveCamera(cameraMoveWorPos, cameraLookAtPos, ()=>{
                }, 2, true);

                AudioManager.instance.playSound(constant.AUDIO_SOUND.ATTACK[Math.floor(Math.random() * constant.AUDIO_SOUND.ATTACK.length)]);

                FightMap.scriptEnemy.scriptManModel.playAni(constant.ANI_TYPE.HIT_FLY_01, false, ()=>{
                    clientEvent.dispatchEvent(constant.EVENT_TYPE.HIT_FLY_ENEMY);
                    GameManager.scriptGameCamera.moveCameraFollowTarget(FightMap.ndEnemy);

                    FightMap.scriptEnemy.scriptManModel.playAni(constant.ANI_TYPE.HIT_FLY_02, true);
                });

                clientEvent.dispatchEvent(constant.EVENT_TYPE.SHOW_SCORE_LINE);
            } else if (!this.isPlayer && this.aniType === constant.ANI_TYPE.KICK) {
                AudioManager.instance.playSound(constant.AUDIO_SOUND.ATTACK[Math.floor(Math.random() * constant.AUDIO_SOUND.ATTACK.length)]);
            }
        } else if (GameManager.gameType === constant.GAME_TYPE.BOSS) {
            if (this.isPlayer && this.aniType === constant.ANI_TYPE.KICK) {
                AudioManager.instance.playSound(constant.AUDIO_SOUND.ATTACK[Math.floor(Math.random() * constant.AUDIO_SOUND.ATTACK.length)]);
                GameManager.gameSpeed = 0.2;
                FightMap.scriptBoss?.playAni(constant.BOSS_ANI_TYPE.BOSS_DIE, false, ()=>{
                    AudioManager.instance.playSound(constant.AUDIO_SOUND.FALL_DOWN_ON_GROUND);
                });
            }
        }
    }

    /**
     * kick帧事件：达到最高点后回落下降一点高度
     */
    public onFrameKickDown () {
        if (GameManager.gameType === constant.GAME_TYPE.REWARD) {
            if (this.isPlayer) {
                GameManager.gameSpeed = 1;
    
                clientEvent.dispatchEvent(constant.EVENT_TYPE.ON_BOX_OPEN, ()=>{
                    tween(this.node)
                    .to(1, {eulerAngles: v3_zero}, {easing: 'smooth'})
                    .call(()=>{
                        this.playAni(constant.ANI_TYPE.WIN, true);
                        let playerWorPos = GameManager.scriptPlayer.node.worldPosition.clone();
                        let cameraMoveWorPos = playerWorPos.clone().add3f(0, 0.9, 2);
                        let cameraLookAtPos = playerWorPos.clone().add3f(0, 0.3, -0.2);
                        GameManager.scriptGameCamera.moveCamera(cameraMoveWorPos, cameraLookAtPos, ()=>{
                            GameManager.isWin = true;
                        }, 2, true);
                    })
                    .start();
                });
            }
        } else if (GameManager.gameType === constant.GAME_TYPE.NORMAL) {
            if (this.isPlayer && this.aniType === constant.ANI_TYPE.KICK) {
                // GameManager.gameSpeed = 1;
                // clientEvent.dispatchEvent("hitFlyEnemy");
                // GameManager.scriptGameCamera.moveCameraFollowTarget(FightMap.ndEnemy);
            }
        } else if (GameManager.gameType === constant.GAME_TYPE.BOSS) {
            if (this.isPlayer && this.aniType === constant.ANI_TYPE.KICK) {
            
                GameManager.gameSpeed = 1;
                FightMap.scriptBoss.hitFlyBoss();
            }
        }  
    }

    /**
     * kick帧事件:kick返回途中速度变缓慢
     */
    public onFrameKickBack () {
        if (GameManager.gameType === constant.GAME_TYPE.NORMAL) {
            if (this.isPlayer && this.aniType === constant.ANI_TYPE.KICK) {

            } else if (!this.isPlayer && this.aniType === constant.ANI_TYPE.KICK) {
                let playerWorPos = GameManager.scriptPlayer.node.worldPosition.clone();                    
                let cameraMoveWorPos = playerWorPos.clone().add3f(0, 1.1, 3);
                let cameraLookAtPos = playerWorPos.clone().add3f(0, 0.3, 0);
                GameManager.scriptGameCamera.moveCamera(cameraMoveWorPos, cameraLookAtPos, ()=>{}, 2, true);

                GameManager.scriptPlayer.scriptManModel.playAni(constant.ANI_TYPE.DIE, false, ()=>{
                    AudioManager.instance.playSound(constant.AUDIO_SOUND.FALL_DOWN_ON_GROUND);
                });                
            }
        }
    }

    /**
     * kick帧事件:kick结束恢复速度
     */
    public onFrameKickEnd () {
        if (GameManager.gameType === constant.GAME_TYPE.NORMAL) { 
            if (this.isPlayer && this.aniType === constant.ANI_TYPE.KICK) {
                this.playAni(constant.ANI_TYPE.WIN, true);
            } else if (!this.isPlayer && this.aniType === constant.ANI_TYPE.KICK) {
                this.playAni(constant.ANI_TYPE.WIN, true);
                GameManager.isWin = false;
            }
        } else if (GameManager.gameType === constant.GAME_TYPE.BOSS) {
            this.playAni(constant.ANI_TYPE.WIN, true);
            GameManager.isWin = true;
            GameManager.scriptPlayer.showFireworks();
        }
    }

    /**
     * die帧事件:boss关卡中，玩家播放die动画被击飞
     */
    public onFrameHitFly () {
        if (GameManager.gameType === constant.GAME_TYPE.BOSS) {
            if (this.isPlayer) {
                GameManager.gameSpeed = 1;
            }
        }
    }

    /**
     * attackLeft帧事件：特效加载慢，得提前播
     */
    public onFrameAttackLeft () {
        if (GameManager.gameType === constant.GAME_TYPE.NORMAL) {
            if (this.isPlayer) {
                EffectManager.instance.playHitEffect(this.ndSocketLeftFinger, FightMap.scriptEnemy.scriptManModel.ndSocketLeftFinger, v3_attackLeftNormalPlayer);
            } else {
                EffectManager.instance.playHitEffect(this.ndSocketLeftFinger, GameManager.scriptPlayer.scriptManModel.ndSocketLeftFinger, v3_attackLeftNormalEnemy);
            }
        } else if (GameManager.gameType === constant.GAME_TYPE.REWARD) {
            if (this.isPlayer) {
                EffectManager.instance.playHitEffect(this.ndSocketLeftFinger, FightMap.ndBox, v3_attackLeftRewardPlayer);
            }
        } else if (GameManager.gameType === constant.GAME_TYPE.BOSS) {
            if (this.isPlayer) {
                EffectManager.instance.playHitEffect(this.ndSocketLeftFinger, FightMap.ndBoss, v3_attackLeftBossPlayer);
            }
        }
    }

    /**
     * attackRight帧事件：特效加载慢，得提前播
     */
    public onFrameAttackRight () {
        if (GameManager.gameType === constant.GAME_TYPE.NORMAL) {
            if (this.isPlayer) {
                EffectManager.instance.playHitEffect(this.ndSocketRightFinger, FightMap.scriptEnemy.scriptManModel.ndSocketRightFinger, v3_attackRightNormalPlayer);
            } else {
                EffectManager.instance.playHitEffect(this.ndSocketRightFinger, GameManager.scriptPlayer.scriptManModel.ndSocketRightFinger, v3_attackRightNormalEnemy);
            } 
        } else if (GameManager.gameType === constant.GAME_TYPE.REWARD) {
            if (this.isPlayer) {
                EffectManager.instance.playHitEffect(this.ndSocketRightFinger, FightMap.ndBox, v3_attackRightRewardPlayer);
            }
        } else if (GameManager.gameType === constant.GAME_TYPE.BOSS) {
            if (this.isPlayer) {
                EffectManager.instance.playHitEffect(this.ndSocketRightFinger, FightMap.ndBoss, v3_attackRightBossPlayer);
            }
        }
    }

    /**
     * run帧事件： 脚步声
     */
    public onFrameRunFootstep () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.FOOT_STEP[Math.floor(Math.random() * constant.AUDIO_SOUND.FOOT_STEP.length)]);
    }

    public onFrameRunHit () {

    }

    /**
     * hit-fly03帧事件：人物掉落地面播放音效、震动
     */
    public onFrameFallGround () {
        if (!this.isPlayer) {
            AudioManager.instance.playSound(constant.AUDIO_SOUND.FALL_DOWN_ON_GROUND);
            GameLogic.vibrateShort();
        }
    }

    /**
     * attackLeft、attackRight帧事件，拳头击中对方的时候震动
     */
    public onFrameAttackPeople () {
        GameLogic.vibrateShort();
    }

    /**
     * dodgeRight和dodgeLeft帧事件：跳跃后到达地面
     */
    public onFrameJumpLandGround () {
        if (this.isPlayer) {
            AudioManager.instance.playSound(constant.AUDIO_SOUND.JUMP_LAND_GROUND);
        }
    }

    /**
     * 当前播放的动画是否为非idle和非fight_idle的动画
     * @returns 
     */
    public notIdleAniPlaying () {
        if (this.isPlayer) {
            return  GameManager.scriptPlayer.scriptManModel.isAniPlaying && (this.aniType !== constant.ANI_TYPE.FIGHT_IDLE && this.aniType !== constant.ANI_TYPE.IDLE);
        }   
    }

    /**
     * boss关卡武器击中玩家头部
     */
    public playHitHeadEffect () {
        EffectManager.instance.playEffect(this.ndSocketHead, 'fightBoom/fightBoom', false, true, 3, 3 * Player.scaleRatio, v3_zero);
    }

    // update (deltaTime: number) {
    //     // [4]
    // }
}
