import { _decorator, Component, Node, EventTouch, Label, ProgressBar, Vec3, view, Animation, SpriteFrame, Sprite, find, clamp, screen } from 'cc';
import { HomePanel } from './../home/homePanel';
import { PlayerRigidController } from './../../fight/playerRigidController';
import { EffectManager } from './../../framework/effectManager';
import { GameManager } from '../../fight/gameManager';
import { playerData } from './../../framework/playerData';
import { clientEvent } from '../../framework/clientEvent';
import { constant } from '../../framework/constant';
import { localConfig } from '../../framework/localConfig';
import { FightMap } from '../../fight/fightMap';
import { Enemy } from '../../fight/enemy';
import { AudioManager } from '../../framework/audioManager';
import { GameLogic } from '../../framework/gameLogic';
import { uiManager } from '../../framework/uiManager';
const { ccclass, property } = _decorator;
//跑酷界面

@ccclass('ParkourPanel')
export class ParkourPanel extends Component {
    @property(Label)
    public lbLevel: Label = null!;//等级

    @property(Label)
    public lbPeople: Label = null!;//小人数量

    @property(Label)
    public lbDiamond: Label = null!;//钻石数量

    @property(Label)
    public lbKey: Label = null!; //钥匙数量

    @property(ProgressBar)
    public progressBarCountdown: ProgressBar = null!;//倒计时进度条

    @property(Node)
    public ndCountDown: Node = null!;//奖励关UI节点

    @property(Node)
    public ndInfo: Node = null!;//界面左边钻石、钥匙、小人

    @property(Node)
    public ndPeople: Node = null!;//小人节点

    @property(Node)
    public ndContinueClick: Node = null!;//不断点击

    @property(Node)
    public ndFightNormal: Node = null!;//普通关父节点

    @property(ProgressBar)
    public pbNormalPlayerBlood: ProgressBar = null!;//普通关卡玩家血条进度条

    @property(ProgressBar)
    public pbNormalEnemyBlood: ProgressBar = null!;//普通关卡敌人血条进度条

    @property(ProgressBar)
    public pbNormalCrazyClick: ProgressBar = null!;//普通关卡刺激点击进度

    @property(Node)
    public ndFightBoss: Node = null!;//boss关卡父节点

    @property(ProgressBar)
    public pbPlayerBlood: ProgressBar = null!;//boss关卡玩家血条进度条

    @property(ProgressBar)
    public pbBossBlood: ProgressBar = null!;//boss关卡敌人血条进度条

    @property(Node)
    public ndArrow: Node = null!;//箭头提示

    @property(Node)
    public ndScoreLight: Node = null!;//分数父节点

    @property(Label)
    public lbScoreNum: Label = null!;//分数文字

    @property(Animation)
    public aniScore: Animation = null!;//分数动画

    @property(Node)
    public ndEnergyProgress: Node = null!;//能量进度节点

    @property(ProgressBar)
    public pbEnergy: ProgressBar = null!;//能量进度条

    @property(SpriteFrame)
    public sfEnergyNormal: SpriteFrame = null!;//能量进度条默认背景

    @property(SpriteFrame)
    public sfEnergyColorful: SpriteFrame = null!;//能量进度条无敌后彩色背景

    @property(Sprite)
    public spEnergyBar: Sprite = null!;//能量进度条子节点

    @property(Node)
    public ndHomePanel: Node = null!;//主界面里面的内容，为了点击一次能直接开始游戏，将主界面跟跑酷界面合并

    @property(Node)
    public ndContainer: Node = null!;//跑酷战斗界面内容

    public bossStatus: string = constant.BOSS_STATUS.HIDE;//当前boss关卡阶段

    private _progressCrazyClick: number = 1; //刺激点击进度0～1之间
    private _countDownTime: number = 0;//倒计时时间
    private _intervalCrazyClick: number = 0;//刺激进度条当前累计展示时间
    private _mapInfo: any = null!;
    private _attackInterval: number = 1;//敌人/boss攻击间隔几秒
    private _bossAttackTimes: number = 0;//boss攻击次数
    private _bossComaTime: number = 0;//boss眩晕阶段时间
    private _bossFightDuration: number = 0;//boss关卡战斗持续时间
    // private _isClickLeft: boolean = false;//是否点击右边，反之点击左边
    private _scriptGameManager: GameManager = null!;
    private _clickTimes: number = 0;//点击次数
    private _scriptPlayerRigidController: PlayerRigidController = null!;
    private _debugClickTimes: number = 0;

    onEnable () {
        this.node.on(Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this._onTouchCancel, this);

        clientEvent.on(constant.EVENT_TYPE.REFRESH_DIAMOND, this._refreshDiamond, this);
        clientEvent.on(constant.EVENT_TYPE.REFRESH_PEOPLE, this._refreshPeople, this);
        clientEvent.on(constant.EVENT_TYPE.REFRESH_KEY, this._refreshKey, this);
        clientEvent.on(constant.EVENT_TYPE.RESET_PB_ENERGY, this._resetPbEnergy, this);
        clientEvent.on(constant.EVENT_TYPE.ARRIVE_END, this._arriveEnd, this);
        clientEvent.on(constant.EVENT_TYPE.WEAPON_HIT_PLAYER, this._weaponHitPlayer, this);
        clientEvent.on(constant.EVENT_TYPE.ON_REVIVE, this._onRevive, this);
        clientEvent.on(constant.EVENT_TYPE.SHOW_INVINCIBLE, this._showInvincible, this);
    }

    onDisable () {
        this.node.off(Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this._onTouchCancel, this);

        clientEvent.off(constant.EVENT_TYPE.REFRESH_DIAMOND, this._refreshDiamond, this);
        clientEvent.off(constant.EVENT_TYPE.REFRESH_PEOPLE, this._refreshPeople, this);
        clientEvent.off(constant.EVENT_TYPE.REFRESH_KEY, this._refreshKey, this);
        clientEvent.off(constant.EVENT_TYPE.RESET_PB_ENERGY, this._resetPbEnergy, this);
        clientEvent.off(constant.EVENT_TYPE.ARRIVE_END, this._arriveEnd, this);
        clientEvent.off(constant.EVENT_TYPE.WEAPON_HIT_PLAYER, this._weaponHitPlayer, this);
        clientEvent.off(constant.EVENT_TYPE.ON_REVIVE, this._onRevive, this);
        clientEvent.off(constant.EVENT_TYPE.SHOW_INVINCIBLE, this._showInvincible, this);
    }

    start () {
        this.lbDiamond.string = '0';
        this.lbPeople.string = '0';
        this.lbKey.string = '0';
    }

    public show () {
        this._scriptGameManager = find("gameManager")?.getComponent(GameManager) as GameManager;
        this._progressCrazyClick = 0;
        this._clickTimes = 0;
        this._intervalCrazyClick = constant.INTERVAL_CRAZY_CLICK;
        this._debugClickTimes = 0;

        this.ndHomePanel.active = true;
        this.ndHomePanel.getComponent(HomePanel)?.show();
        this.ndContainer.active = false;
        this.spEnergyBar.spriteFrame = this.sfEnergyNormal;
    }

    private _showInvincible () {
        this.spEnergyBar.spriteFrame = this.sfEnergyColorful;
    }

    private _onTouchStart (event: EventTouch) {
        if (this.ndHomePanel.active) {
            this.ndContainer.active = true;
            this.ndHomePanel.active = false;
            clientEvent.dispatchEvent(constant.EVENT_TYPE.CHANGE_OFFSET);

            GameManager.isGameStart = true;
            GameManager.scriptPlayer.scriptManModel.playAni(constant.ANI_TYPE.RUN, true);

            this.ndInfo.active = true;
            this.ndEnergyProgress.active = true;
            this.ndContinueClick.active = false;
            this.ndFightBoss.active = false;
            this.ndCountDown.active = false;
            this.ndFightNormal.active = false;
            this.ndScoreLight.active = false;

            let level = playerData.instance.playerInfo.level;
            this.lbLevel.string = `第${level}关`;

            this._mapInfo = localConfig.instance.queryByID("map", level);

            this.ndPeople.active = true;
            if (GameManager.gameType === constant.GAME_TYPE.BOSS) {
                this.bossStatus = constant.BOSS_STATUS.HIDE;
            } else if (GameManager.gameType === constant.GAME_TYPE.REWARD) {
                this.ndPeople.active = false;
            }

            this._scriptPlayerRigidController = GameManager.scriptPlayer.node.getComponent(PlayerRigidController) as PlayerRigidController;

            GameLogic.customEventStatistics(`事件统计-开始游戏`);
        }

        this._scriptPlayerRigidController.touchStart(event)
    }

    private _onTouchMove (event: EventTouch) {


        if (GameManager.isGameOver || GameManager.isGamePause) {
            return;
        }

        if (GameManager.gameStatus === constant.GAME_STATUS.RUN && GameManager.isGameStart && this._scriptPlayerRigidController) {
            this._scriptPlayerRigidController.touchMove(event);
        }
    }

    private _onTouchEnd (event: EventTouch) {
        if (GameManager.isGameOver && !this._scriptPlayerRigidController) {
            return;
        }

        this._scriptPlayerRigidController.touchEnd(event);

        if (GameManager.gameStatus === constant.GAME_STATUS.RUN) {

        } else if (GameManager.gameStatus === constant.GAME_STATUS.FIGHT) {
            if (GameManager.gameType === constant.GAME_TYPE.NORMAL) {
                if (GameManager.scriptPlayer.isArriveEnd && this.pbNormalEnemyBlood.progress > 0 && this.ndFightNormal.active && !FightMap.scriptEnemy.scriptManModel.isKicking && !FightMap.scriptEnemy.scriptManModel.isAttacking) {
                    this._progressCrazyClick = clamp(this._progressCrazyClick + 0.15, 0, 1);

                    this.pbNormalCrazyClick.progress = this._progressCrazyClick;

                    GameManager.scriptPlayer.scriptManModel.playAniAttack(() => {
                        let ratio = GameManager.scriptPlayer.damageValue / this._mapInfo.enemyHp;
                        let progress = this.pbNormalEnemyBlood.progress - ratio;
                        this.pbNormalEnemyBlood.progress = progress <= 0 ? 0 : progress;

                        if (this.pbNormalEnemyBlood.progress <= 0) {
                            this.ndFightNormal.active = false;
                            this.ndContinueClick.active = false;

                            if (!FightMap.scriptEnemy.scriptManModel.isKicking) {
                                GameManager.scriptPlayer.scriptManModel.playAni(constant.ANI_TYPE.KICK, false);
                            }
                        } else {
                            if (!FightMap.scriptEnemy.scriptManModel.isKicking) {
                                FightMap.scriptEnemy.scriptManModel.playAni(constant.ANI_TYPE.HIT_SMALL, false, () => {
                                    if (!FightMap.scriptEnemy.scriptManModel.isKicking) {
                                        FightMap.scriptEnemy.scriptManModel.playAni(constant.ANI_TYPE.FIGHT_IDLE, true, () => { }, 6);
                                    }
                                });
                            }
                        }
                    });
                }
            } else if (GameManager.gameType === constant.GAME_TYPE.REWARD) {
                if (GameManager.scriptPlayer.isArriveEnd) {
                    //加分
                    if (this.ndCountDown.active) {
                        if (!this.ndScoreLight.active) {
                            this.ndScoreLight.active = true;
                        }

                        this._clickTimes += 1;
                        GameManager.scriptPlayer.scriptManModel.playAniAttack();
                        //展示分数效果
                        this._refreshMultiple();
                    }
                }
            } else if (GameManager.gameType === constant.GAME_TYPE.BOSS) {
                if (GameManager.scriptPlayer.isArriveEnd && !GameManager.isGameOver) {
                    if (this.bossStatus === constant.BOSS_STATUS.HIDE) {
                        if (this.ndArrow.active) {
                            let locationX = event.getLocationX();
                            let contentSize = screen.windowSize.x;

                            let isClickLeft = locationX < contentSize * 0.5;

                            //玩家向指定位置位移
                            GameManager.scriptPlayer.jump(isClickLeft, () => {
                                this.ndArrow.active = false;
                            });
                        }
                    } else if (this.bossStatus === constant.BOSS_STATUS.FIGHT) {
                        if (this.ndContinueClick.active) {
                            console.log("boss眩晕，玩家攻击");

                            GameManager.scriptPlayer.scriptManModel.playAniAttack(() => {
                                if (this.bossStatus === constant.BOSS_STATUS.FIGHT && !FightMap.scriptBoss.isAngry && !FightMap.scriptBoss.isAttacking && !FightMap.scriptBoss.isComa) {
                                    FightMap.scriptBoss.playAni(constant.BOSS_ANI_TYPE.BOSS_HIT, false, () => {
                                        if (this.bossStatus === constant.BOSS_STATUS.FIGHT && !FightMap.scriptBoss.isAngry && !FightMap.scriptBoss.isAttacking && !FightMap.scriptBoss.isComa) {
                                            FightMap.scriptBoss.playAni(constant.BOSS_ANI_TYPE.BOSS_FIGHT_IDLE, true);
                                        }
                                    })
                                }

                                if (!GameManager.scriptPlayer.isDie && !GameManager.scriptPlayer.isJumping && !GameManager.scriptPlayer.scriptManModel.isKicking) {
                                    GameManager.scriptPlayer.scriptManModel.playAni(constant.ANI_TYPE.FIGHT_IDLE, true);
                                }
                            });

                            let ratio = GameManager.scriptPlayer.damageValue / this._mapInfo.enemyHp;
                            let progress = Number((this.pbBossBlood.progress - ratio).toFixed(2));
                            this.pbBossBlood.progress = progress <= 0 ? 0 : progress;

                            if (this.pbBossBlood.progress <= 0) {
                                //敌人血量为0进入昏迷
                                if (this.ndFightBoss.active) {
                                    this.ndFightBoss.active = false;
                                    this.ndCountDown.active = true;

                                    this.progressBarCountdown.progress = 1;
                                    this._countDownTime = this._mapInfo.bossComaTime;
                                    this.bossStatus = constant.BOSS_STATUS.COMA;
                                    FightMap.scriptBoss.showAniComa();

                                    //镜头往右上角移动
                                    GameManager.scriptPlayer.cameraMoveAttackBoss();
                                }
                            }
                        }
                    } else if (this.bossStatus === constant.BOSS_STATUS.COMA) {
                        if (this.ndCountDown.active) {
                            if (!this.ndScoreLight.active) {
                                this.ndScoreLight.active = true;
                            }
                            console.log("boss昏迷，玩家攻击");
                            this._clickTimes += 1;
                            GameManager.scriptPlayer.scriptManModel.playAniAttack();
                            this._refreshMultiple();
                        }
                    }
                }
            }
        }
    }

    private _onTouchCancel (event: EventTouch) {
        if (this._scriptPlayerRigidController) {
            this._scriptPlayerRigidController.touchCancel(event);
        }
    }

    private _refreshDiamond (value: number = 1) {
        this._scriptGameManager.diamond += value;
        this.lbDiamond.string = String(this._scriptGameManager.diamond);

        //奖励关吃到钻石会加能量 += 1
        if (GameManager.gameType === constant.GAME_TYPE.REWARD && !GameManager.scriptPlayer.isInvincible) {
            GameManager.scriptPlayer.energy += 1;
        }
    }

    private _refreshPeople (value: number = 1) {
        this._scriptGameManager.people += value;
        this.lbPeople.string = String(this._scriptGameManager.people);
    }

    private _refreshKey () {
        this.lbKey.string = playerData.instance.playerInfo.key;
    }

    /**
     * 重置能量进度条（防止出现进度条增长，但是背景色为彩色）
     */
    private _resetPbEnergy () {
        this.pbEnergy.progress = 0;
        this.spEnergyBar.spriteFrame = this.sfEnergyNormal;
    }

    /**
     * 刷新倒计时下的倍数
     */
    private _refreshMultiple () {
        let kickPowerValue = this._scriptGameManager.kickPowerItemInfo.kickPowerValue;
        let multiple = Math.ceil(this._clickTimes * 0.2 * kickPowerValue);
        this.lbScoreNum.string = String(multiple);
        this._scriptGameManager.multiple = multiple;
        this.aniScore.stop();
        this.aniScore.play();
    }

    /**
     * 达到终点后根据模式切换相应界面
     *
     * @private
     * @memberof ParkourPanel
     */
    private _arriveEnd () {
        let playerWorPos = GameManager.scriptPlayer.node.worldPosition.clone();
        let cameraMoveWorPos: Vec3 = new Vec3();
        let cameraLookAtPos: Vec3 = new Vec3();

        this.ndInfo.active = false;
        this.ndEnergyProgress.active = false;
        this._clickTimes = 0;

        //到达终点，调整摄像机角度、高度和展示对应的UI
        if (GameManager.gameType == constant.GAME_TYPE.NORMAL) {
            let enemyWorPos = FightMap.ndEnemy.worldPosition.clone();
            let playerWorPos = GameManager.scriptPlayer.node.worldPosition.clone();
            let averageZ = (enemyWorPos.z - playerWorPos.z) * 0.5;
            cameraMoveWorPos = playerWorPos.clone().add3f(2.2, 1, averageZ);
            cameraLookAtPos = playerWorPos.clone().add3f(0, 0.4, averageZ);

            GameManager.scriptGameCamera.moveCamera(cameraMoveWorPos, cameraLookAtPos, () => {
                this.ndFightBoss.active = false;
                this.ndCountDown.active = false;
                this.ndFightNormal.active = true;

                this.pbNormalEnemyBlood.progress = 1;
                this.pbNormalPlayerBlood.progress = 1;
                this.pbNormalCrazyClick.progress = 0;
                this.ndContinueClick.active = true;

                GameManager.scriptPlayer.isArriveEnd = true;
            }, 2, false);
        } else if (GameManager.gameType == constant.GAME_TYPE.REWARD) {
            cameraMoveWorPos = playerWorPos.clone().add3f(2.5, 0.9, 0.45);
            cameraLookAtPos = playerWorPos.clone().add3f(0, 0.3, -0.25);
            GameManager.scriptGameCamera.moveCamera(cameraMoveWorPos, cameraLookAtPos, () => {
                this.ndFightBoss.active = false;
                this.ndCountDown.active = true;
                this.ndFightNormal.active = false;
                this.ndContinueClick.active = true;
                this._countDownTime = constant.COUNTDOWN_REWARD;

                GameManager.scriptPlayer.isArriveEnd = true;
            }, 2, false)
        } else if (GameManager.gameType == constant.GAME_TYPE.BOSS) {
            if (!GameManager.scriptPlayer.isArriveEnd) {
                cameraMoveWorPos = playerWorPos.clone().add3f(0, 1, 2);
                cameraLookAtPos = playerWorPos.clone().add3f(0, 0.4, 0);

                GameManager.scriptGameCamera.moveCamera(cameraMoveWorPos, cameraLookAtPos, () => {
                    this.ndFightBoss.active = true;
                    this.ndCountDown.active = false;
                    this.ndFightNormal.active = false;
                    this.ndArrow.active = false;
                    this.pbPlayerBlood.progress = 1;
                    this.pbBossBlood.progress = 1;

                    this._attackInterval = 0;
                    this._bossAttackTimes = this._mapInfo.bossAttackTimes;
                    this._bossFightDuration = this._mapInfo.bossFightDuration;
                    this._bossComaTime = 0;
                    FightMap.scriptBoss.bossAttackTimes = this._bossAttackTimes;

                    GameManager.scriptPlayer.isArriveEnd = true;
                }, 1, true)
            }
        }
    }

    /**
     * 玩家被boss的武器攻击到
     */
    private _weaponHitPlayer () {
        if (!GameManager.scriptPlayer.isJumping) {
            GameLogic.vibrateShort();
            AudioManager.instance.playSound("bossWeaponHit");

            GameManager.scriptPlayer.playAniHitBig(() => {
                if (this.pbPlayerBlood.progress > 0) {
                    GameManager.scriptPlayer.scriptManModel.playAni(constant.ANI_TYPE.FIGHT_IDLE, true, () => { }, 7);
                }
            })

            let ratio = this._mapInfo.enemyDamage / GameManager.scriptPlayer.hp;
            let progress = this.pbPlayerBlood.progress - ratio;
            this.pbPlayerBlood.progress = progress <= 0 ? 0 : progress;

            if (this.pbPlayerBlood.progress <= 0) {
                GameManager.gameSpeed = 0.2;

                //玩家被击飞效果
                GameManager.scriptPlayer.hitFlyPlayer(() => {
                    FightMap.scriptBoss?.playAni(constant.BOSS_ANI_TYPE.BOSS_WIN, true);
                    EffectManager.instance.removeEffect("attackSmoke");
                    GameManager.isWin = false;
                    this.ndFightBoss.active = false;
                });
            }

            GameManager.scriptPlayer.scriptManModel.playHitHeadEffect();
            FightMap.scriptBoss?.refreshAniAttackSpeed();
        }
    }

    //监听复活刷新UI
    private _onRevive () {
        if (GameManager.gameStatus === constant.GAME_STATUS.RUN) {

        } else if (GameManager.gameStatus === constant.GAME_STATUS.FIGHT) {
            this.ndInfo.active = true;
        }
    }

    public onBtnDebugClick () {
        this._debugClickTimes += 1;

        if (this._debugClickTimes >= 5) {
            this._debugClickTimes = 0;
            uiManager.instance.showDialog("debug/debugPanel");
        }
    }

    update (deltaTime: number) {
        if (GameManager.isGameOver) {
            return;
        }

        if (GameManager.gameStatus === constant.GAME_STATUS.RUN) {
            this.pbEnergy.progress = GameManager.scriptPlayer.energy / GameManager.scriptPlayer.energyMax;

            if (this.pbEnergy.progress <= 0) {
                this.spEnergyBar.spriteFrame = this.sfEnergyNormal;
            }
        } else if (GameManager.gameStatus === constant.GAME_STATUS.FIGHT) {
            if (GameManager.gameType == constant.GAME_TYPE.NORMAL) {
                this._intervalCrazyClick -= deltaTime;
                if (this._intervalCrazyClick <= 0) {
                    this._intervalCrazyClick = constant.INTERVAL_CRAZY_CLICK;
                    this._progressCrazyClick = this._progressCrazyClick - 0.01 <= 0 ? 0 : this._progressCrazyClick - 0.01;
                    this.pbNormalCrazyClick.progress = this._progressCrazyClick;
                }

                if (!GameManager.scriptPlayer.scriptManModel.isAttacking && this.ndFightNormal.active && this.pbNormalEnemyBlood.progress > 0 && !GameManager.isRevive) {
                    this._attackInterval -= deltaTime;
                }

                if (this._attackInterval <= 0 && !GameManager.scriptPlayer.scriptManModel.isAttacking && this.ndFightNormal.active && !GameManager.scriptPlayer.scriptManModel.isKicking) {
                    FightMap.scriptEnemy.scriptManModel?.playAniAttack(() => {
                        FightMap.scriptEnemy.scriptManModel.playAni(constant.ANI_TYPE.FIGHT_IDLE, true, () => { }, 8);

                        let ratio = this._mapInfo.enemyDamage / GameManager.scriptPlayer.hp;
                        let progress = this.pbNormalPlayerBlood.progress - ratio;
                        this.pbNormalPlayerBlood.progress = progress <= 0 ? 0 : progress;

                        if (this.pbNormalPlayerBlood.progress <= 0) {
                            this.ndFightNormal.active = false;
                            this.ndContinueClick.active = false;

                            //玩家死亡前被击飞
                            let playerWorPos = GameManager.scriptPlayer.node.worldPosition.clone();
                            let cameraMoveWorPos = playerWorPos.clone().add3f(2.2, 1.3, -1);
                            let cameraLookAtPos = playerWorPos.clone().add3f(0, 0.3, 0);
                            GameManager.scriptGameCamera.moveCamera(cameraMoveWorPos, cameraLookAtPos, () => {

                            })

                            if (!GameManager.scriptPlayer.scriptManModel.isKicking) {
                                FightMap.ndEnemy.getComponent(Enemy)?.scriptManModel.playAni(constant.ANI_TYPE.KICK);
                            }
                        } else {
                            if (!GameManager.scriptPlayer.scriptManModel.isKicking) {
                                GameManager.scriptPlayer.scriptManModel.playAni(constant.ANI_TYPE.HIT_SMALL, false, () => {
                                    if (!GameManager.scriptPlayer.scriptManModel.isKicking) {
                                        GameManager.scriptPlayer.scriptManModel.playAni(constant.ANI_TYPE.FIGHT_IDLE, true, () => { }, 9);
                                    }
                                });
                            }
                        }
                    });

                    this._attackInterval = this._mapInfo.attackInterval;
                }
            } else if (GameManager.gameType == constant.GAME_TYPE.REWARD) {
                if (this._countDownTime > 0) {
                    this._countDownTime -= deltaTime;
                    let ratio = this._countDownTime / constant.COUNTDOWN_REWARD;
                    this.progressBarCountdown.progress = clamp(ratio, 0, 1);
                    if (this._countDownTime <= 0) {
                        this.ndContinueClick.active = false;
                        this.ndCountDown.active = false;

                        GameManager.scriptPlayer.scriptManModel.playAni(constant.ANI_TYPE.KICK, false, () => {
                        });
                    }
                }
            } else if (GameManager.gameType === constant.GAME_TYPE.BOSS) {
                if (!GameManager.scriptPlayer.isArriveEnd || GameManager.isRevive) {
                    return;
                }

                if (this.bossStatus === constant.BOSS_STATUS.HIDE) {//躲避阶段,boss攻击玩家
                    if (FightMap.scriptBoss?.isAttacking || GameManager.scriptPlayer.scriptManModel.notIdleAniPlaying()) {
                        return;
                    }

                    if (this._bossAttackTimes > 0) {
                        if (this._attackInterval <= 0) {
                            this._attackInterval = this._mapInfo.attackInterval;
                            EffectManager.instance.playAni('circleRed/circleRed', 'circleRed01', GameManager.scriptPlayer.preJumpPos.clone().add3f(0, 0.02, 0), true, false, 1, () => { });
                            this.ndArrow.active = true;
                        }

                        this._attackInterval -= deltaTime;

                        if (this._attackInterval <= 0) {

                            //boss播放攻击
                            FightMap.scriptBoss?.playAniAttack(() => {
                                EffectManager.instance.playParticle('smoke/attackSmoke', GameManager.scriptPlayer.preJumpPos, 1);

                                //关闭红色标记
                                EffectManager.instance.playAni('circleRed/circleRed', 'circleRed02', GameManager.scriptPlayer.preJumpPos.clone().add3f(0, 0.02, 0), false, false, 1, () => { });
                                this.ndArrow.active = false;

                                //boss攻击完了之后转向
                                FightMap.scriptBoss.isLookAtPlayer = true;

                                this._bossAttackTimes -= 1;

                                FightMap.scriptBoss.bossAttackTimes -= 1;

                                if (this._bossAttackTimes <= 0) {
                                    this.bossStatus = constant.BOSS_STATUS.FIGHT;
                                }
                            });
                        }
                    }
                } else if (this.bossStatus === constant.BOSS_STATUS.FIGHT) {//战斗阶段,玩家攻击boss
                    if (FightMap.scriptBoss?.isAngry || GameManager.scriptPlayer.isDie) {
                        return;
                    }

                    if (!FightMap.scriptBoss?.isVertigo && !FightMap.scriptBoss.isAttacking) {
                        //boss攻击完毕，进入眩晕状态,玩家进行攻击
                        FightMap.scriptBoss?.showAniVertigo();
                        this.ndContinueClick.active = true;
                    }

                    //眩晕倒计时
                    if (FightMap.scriptBoss?.isVertigo) {
                        this._bossFightDuration -= deltaTime;
                        //玩家指定时间攻击结束之后boss爆发怒气
                        if (this._bossFightDuration <= 0) {
                            FightMap.scriptBoss?.playAniAngry(() => {
                                if (this.bossStatus !== constant.BOSS_STATUS.COMA) {
                                    this.bossStatus = constant.BOSS_STATUS.HIDE;
                                    this._attackInterval = 0;
                                    this._bossAttackTimes = this._mapInfo.bossAttackTimes;
                                    this._bossFightDuration = this._mapInfo.bossFightDuration;
                                    FightMap.scriptBoss.bossAttackTimes = this._bossAttackTimes;
                                }
                            })

                            this.ndContinueClick.active = false;
                            this.ndArrow.active = false;
                        }
                    }
                } else if (this.bossStatus === constant.BOSS_STATUS.COMA) {//boss血量为0昏迷阶段
                    if (this._countDownTime > 0) {
                        this._countDownTime -= deltaTime;
                        let ratio = this._countDownTime / this._mapInfo.bossComaTime;
                        this.progressBarCountdown.progress = clamp(ratio, 0, 1);
                        if (this._countDownTime <= 0 && this.ndCountDown.active) {
                            this.ndContinueClick.active = false;
                            this.ndCountDown.active = false;

                            //boss被击飞效果
                            GameManager.scriptPlayer.scriptManModel.playAni(constant.ANI_TYPE.KICK, false, () => { });
                            GameManager.scriptPlayer.cameraMoveHitFlyBoss();
                        }
                    }
                }
            }
        }
    }
}
