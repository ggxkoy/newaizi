import { _decorator, Component, Node, Label, Sprite, UITransform, size, Prefab, Animation, find, Vec3, SpriteFrame } from 'cc';
import { poolManager } from './../../framework/poolManager';
import { localConfig } from './../../framework/localConfig';
import { uiManager } from './../../framework/uiManager';
import { EffectManager } from './../../framework/effectManager';
import { GameLogic } from './../../framework/gameLogic';
import { GameManager } from './../../fight/gameManager';
import { playerData } from './../../framework/playerData';
import { constant } from '../../framework/constant';
import { clientEvent } from '../../framework/clientEvent';
import { resourceUtil } from '../../framework/resourceUtil';
import { AudioManager } from '../../framework/audioManager';
import { util } from '../../framework/util';
const { ccclass, property } = _decorator;

let v3_boxRewardPos: Vec3 = new Vec3(0, -0.3, -5);//宝箱位置
let v3_boxRewardEuler: Vec3 = new Vec3(20, 0, 0);//宝箱角度
let v3_boxOpenPos: Vec3 = new Vec3();//宝箱开箱特效位置
let v3_colorBarLeft: Vec3 = new Vec3(0, 0, -15);//左边烟花位置
let v3_colorBarRight: Vec3 = new Vec3(0, 0, 15);//右边烟花位置

@ccclass('SettlementSuccessPanel')
export class SettlementSuccessPanel extends Component {
    @property(Node)
    public ndPeople: Node = null!;

    @property(Node)
    public ndDiamond: Node = null!;

    @property(Node)
    public ndMultiple: Node = null!;

    @property(Label)
    public lbPeople: Label = null!;

    @property(Label)
    public lbDiamond: Label = null!;

    @property(Label)
    public lbMultiple: Label = null!;

    @property(Node)
    public ndList: Node = null!;//人数，钻石，倍速父节点

    @property(Node)
    public ndBtnNormal: Node = null!;//普通领取按钮

    @property(Node)
    public ndBtnDouble: Node = null!;//双倍领取按钮

    @property(Sprite)
    public spIcon: Sprite = null!;//付费按钮图标

    @property(Label)
    public lbDiamondNormal: Label = null!;//普通领取 钻石数量

    @property(Label)
    public lbDiamondDouble: Label = null!;//双倍领取 钻石数量

    @property(Label)
    public lbBtnMultiple: Label = null!;//按钮上的倍数

    @property(Node)
    public ndArrow: Node = null!;//箭头节点

    @property(Sprite)
    public spSkinIcon: Sprite = null!;//皮肤图标

    @property(UITransform)
    public UIComImgGray: UITransform = null!;//皮肤灰色遮罩

    @property(Label)
    public lbSkinProgress: Label = null!;//皮肤收集进度

    @property(Node)
    public ndSkin: Node = null!; //皮肤父节点

    @property(Prefab)
    public pbBoxDiamond: Prefab = null!;//宝箱预制体

    @property(Node)
    public ndLottery: Node = null!;//翻倍奖励节点

    @property(Node)
    public ndBoxContent: Node = null!;//宝箱父节点

    @property(Node)
    public ndReward: Node = null!;//奖励节点

    @property(Sprite)
    public spRewardIcon: Sprite = null!;//奖励图标组件

    @property(SpriteFrame)
    public sfKey: SpriteFrame = null!;//钥匙图片

    @property(SpriteFrame)
    public sfDiamond: SpriteFrame = null!//钻石图片

    @property(Label)
    public lbRewardNum: Label = null!;//奖励数量范围

    @property(Animation)
    public aniLottery: Animation = null!;//翻倍奖励动画

    private _scriptGameManager: GameManager = null!;
    private _curDiamond: number = 0;//当前钻石数量
    private _curPeople: number = 0;//当前小人数量
    private _curMultiple: number = 0;//当前倍数
    private _rewardDiamond: number = 10;//基础钻石奖励
    private _diamondMultiple: number = 0;//钻石倍数
    private _boxRewardType: number = 0;//宝箱奖励类型
    private _ndBoxReward: Node = null!;//宝箱节点
    private _isStopArrow: boolean = false;//是否停止指针转动
    private _randomSkin: any;//随机皮肤
    private _hatProgress: any = null!;//帽子加载进度

    start () {
        // [3]
    }

    public show (scriptGameManager: GameManager) {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.WIN);

        this._scriptGameManager = scriptGameManager;
        this._curDiamond = 0;
        this._curMultiple = 0;
        this._curPeople = 0;
        this._isStopArrow = false;
        this._boxRewardType = constant.REWARD_TYPE.DIAMOND;
        this._hatProgress = null;
        this.ndList.active = true;
        this.ndSkin.active = false;
        this.ndLottery.active = true;
        this.ndReward.active = false;
        this.spRewardIcon.node.active = false;

        this.schedule(this._numRaise, 0.05);

        this.aniLottery.getState("lottery").time = 0;
        this.aniLottery.getState("lottery").sample();

        this._rewardDiamond = (scriptGameManager.people + scriptGameManager.diamond) * scriptGameManager.multiple;

        if (GameManager.gameType === constant.GAME_TYPE.REWARD) {
            this._rewardDiamond = scriptGameManager.diamond * scriptGameManager.multiple;
            this.ndPeople.active = false;
        } else {
            this.ndPeople.active = true;
        }

        this.lbDiamondNormal.string = String(Math.ceil(this._rewardDiamond));
        this.lbDiamondDouble.string = String(Math.ceil(this._rewardDiamond));

        this.ndBtnDouble.active = true;
        this.ndBtnNormal.active = false;

        setTimeout(() => {
            if (this.node.active && !this._isStopArrow) {
                this.ndBtnNormal.active = true;
            }
        }, 2000);

        GameLogic.updatePayIcon(constant.SHARE_ID.SETTLEMENT_SUCCESS_DOUBLE, this.spIcon, (type: any) => {
            if (type === constant.OPEN_REWARD_TYPE.NULL) {
                // this.ndBtnDouble.active = false;
            }
        })
    }

    private _numRaise () {
        let targetDiamond = this._scriptGameManager.diamond;
        let targetMultiple = this._scriptGameManager.multiple;
        let targetPeople = this._scriptGameManager.people;

        let ratio = 0.3;

        this._curDiamond = Math.ceil(this._curDiamond + (targetDiamond - this._curDiamond) * ratio);
        this._curMultiple = this._curMultiple + (targetMultiple - this._curMultiple) * ratio;
        this._curPeople = Math.ceil(this._curPeople + (targetPeople - this._curPeople) * ratio);

        this.lbDiamond.string = String(this._curDiamond);
        this.lbMultiple.string = this._curMultiple - Math.floor(this._curMultiple) !== 0 ? `x${Number(this._curMultiple.toFixed(1))}` : `x${Number(this._curMultiple.toFixed(1))}.0`;
        this.lbPeople.string = String(this._curPeople);

        if (this._curDiamond === targetDiamond && Number(this._curMultiple.toFixed(1)) === targetMultiple && this._curPeople === targetPeople) {
            this.unschedule(this._numRaise);

            setTimeout(() => {
                this.ndList.active = false;

                this._showSkinProgress();
            }, 1000)
        }
    }

    private _showSkinProgress () {
        //皮肤收集进度
        if (!playerData.instance.isLevelHatUnlockOver()) {
            this.ndSkin.active = true;
            this._hatProgress = playerData.instance.getSetting(constant.SETTINGS_KEY.LEVEL_HAT_PROGRESS);

            let itemInfo = localConfig.instance.queryByID("shop", this._hatProgress.ID);
            resourceUtil.setSpriteFrame(`texture/icon/hats/${itemInfo.iconName}`, this.spSkinIcon, () => { });

            this.lbSkinProgress.string = `${this._hatProgress.progress}%`;
            this.lbSkinProgress.node.active = true;

            let curSize = this.UIComImgGray.contentSize;
            this.UIComImgGray.setContentSize(size(curSize.width, curSize.width * (1 - this._hatProgress.progress * 0.01)));

            this._hatProgress.progress += constant.unlockHatSkinProgress;
            this._hatProgress.progress = this._hatProgress.progress >= 100 ? 100 : this._hatProgress.progress;
            playerData.instance.setSetting(constant.SETTINGS_KEY.LEVEL_HAT_PROGRESS, this._hatProgress);

            this.schedule(this._progressRaise, 0.1);

            if (this._hatProgress.progress >= 100) {
                //先标记为解锁状态
                let hatProgress = playerData.instance.getSetting(constant.SETTINGS_KEY.LEVEL_HAT_PROGRESS);
                let hatStatus = playerData.instance.getHatStatus(hatProgress.ID);
                hatStatus.status = constant.SHOP_ITEM_STATUS.UNLOCKED_NOT_OWNED;
                playerData.instance.updateHatStatus(hatStatus);
                // playerData.instance.refreshHatProgress();
            }
        } else {
            this.ndSkin.active = false;
        }
    }

    private _progressRaise () {
        let num = util.lerp(this._hatProgress.progress, Number(this.lbSkinProgress.string.split("%")[0]), 0.15);

        if (Math.ceil(num) !== Number(this.lbSkinProgress.string)) {
            AudioManager.instance.playSound(constant.AUDIO_SOUND.NUM_RAISE);

            GameLogic.vibrateShort();

            this.lbSkinProgress.string = Math.ceil(num) + "%";
            let curSize = this.UIComImgGray.contentSize;
            this.UIComImgGray.setContentSize(size(curSize.width, curSize.width * (1 - num * 0.01)));
        }

        if (Math.ceil(num) === this._hatProgress.progress) {
            this.unschedule(this._progressRaise);

            if (Math.ceil(num) === 100) {
                this.lbSkinProgress.node.active = false;
            }
        }
    }

    public onBtnNormalClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.DIAMOND_RECEIVE);
        GameLogic.vibrateShort();

        if (this._isStopArrow) {
            return;
        }

        this.ndBtnDouble.active = false;
        this.ndBtnNormal.active = false;

        this._close();
    }

    public onBtnDoubleClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.CLICK);
        GameLogic.vibrateShort();

        if (this._isStopArrow) {
            return;
        }

        this.ndBtnDouble.active = false;
        this.ndBtnNormal.active = false;

        GameLogic.pay(constant.SHARE_ID.SETTLEMENT_SUCCESS_DOUBLE, (err: any) => {
            if (!err) {
                AudioManager.instance.playSound(constant.AUDIO_SOUND.DIAMOND_RECEIVE);

                this._isStopArrow = true;

                this.aniLottery.play("lottery");

                if (this.lbBtnMultiple.string === "??") {
                    this._showBox();
                } else {
                    this._close();
                }
            }
        })
    }

    private _showBox () {
        let randomNum = Math.random();
        if (randomNum >= 0 && randomNum < 0.3) {
            this._boxRewardType = constant.REWARD_TYPE.DIAMOND;
        } else if (randomNum >= 0.3 && randomNum < 0.7) {
            this._boxRewardType = constant.REWARD_TYPE.KEY;
        } else {
            this._boxRewardType = constant.REWARD_TYPE.SKIN;

            if (playerData.instance.isBoxHatUnlockOver()) {
                this._boxRewardType = constant.REWARD_TYPE.DIAMOND;
            } else {
                this._randomSkin = playerData.instance.getArrHatUnlockByBox()[0];
            }
        }

        let ndParent = find("Camera3D") as Node;
        this._ndBoxReward = poolManager.instance.getNode(this.pbBoxDiamond, ndParent);
        this._ndBoxReward.setPosition(v3_boxRewardPos);
        this._ndBoxReward.setScale(2, 2, 2);
        this._ndBoxReward.eulerAngles = v3_boxRewardEuler;

        let aniCom = this._ndBoxReward.getComponentInChildren(Animation) as Animation;
        this.scheduleOnce(() => {
            AudioManager.instance.playSound(constant.AUDIO_SOUND.REWARD_SMALL_BOX);

            aniCom.play("boxOpen");
            EffectManager.instance.playEffect(this._ndBoxReward, 'box/boxOpen02', true, true, 5, 1, v3_boxOpenPos);
        }, 0.5)

        aniCom.once(Animation.EventType.FINISHED, () => {
            //多展示一秒再关闭
            this.scheduleOnce(() => {
                this.ndReward.active = true;

                //箱子打开后展示奖品图标和数量
                if (this._boxRewardType === constant.REWARD_TYPE.DIAMOND) {
                    this.spRewardIcon.spriteFrame = this.sfDiamond;
                    this.lbRewardNum.string = String(Math.ceil(this._rewardDiamond * this._diamondMultiple));
                } else if (this._boxRewardType === constant.REWARD_TYPE.KEY) {
                    this.spRewardIcon.spriteFrame = this.sfKey;
                    this.lbRewardNum.string = "1";
                } else if (this._boxRewardType === constant.REWARD_TYPE.SKIN) {
                    let shopItemInfo = localConfig.instance.queryByID("shop", String(this._randomSkin.ID));
                    let path = `texture/icon/hats/${shopItemInfo.iconName}`;
                    resourceUtil.setSpriteFrame(path, this.spRewardIcon, (err: any) => {

                    })
                    this.lbRewardNum.string = "1";
                }

                this.spRewardIcon.node.active = true;

                this._ndBoxReward.destroy();
                this._close();
            }, 1);
        })

        //底下播放烟花
        let targetWroPos = this._ndBoxReward.worldPosition;
        EffectManager.instance.playParticle('colorBar/colorBar01', targetWroPos.clone().add3f(-1.5, -2.2, 0), 3, 1.5, v3_colorBarLeft);
        EffectManager.instance.playParticle('colorBar/colorBar01', targetWroPos.clone().add3f(1.5, -2.2, 0), 3, 1.5, v3_colorBarRight);

        AudioManager.instance.playSound(constant.AUDIO_SOUND.FIRE);
    }

    private _close () {
        let diamond = Math.ceil(this._rewardDiamond * this._diamondMultiple);

        EffectManager.instance.showFlyReward(diamond, () => {
            this.unscheduleAllCallbacks();
            uiManager.instance.hideDialog("settlement/settlementSuccessPanel");

            let next = () => {
                console.log("检查是否拥有3把钥匙,当前有几把：", playerData.instance.playerInfo.key);
                if (playerData.instance.playerInfo.key >= 3) {
                    uiManager.instance.showDialog("box/boxPanel");
                } else {
                    clientEvent.dispatchEvent(constant.EVENT_TYPE.CHECK_LEVEL_UNLOCK_HAT_SKIN);
                }
            }

            if (this._boxRewardType === constant.REWARD_TYPE.DIAMOND) {
                next();
            } else if (this._boxRewardType === constant.REWARD_TYPE.KEY) {
                playerData.instance.updatePlayerInfo('key', 1);
                next();
            } else if (this._boxRewardType === constant.REWARD_TYPE.SKIN) {
                uiManager.instance.showDialog("skin/skinPanel", [constant.SKIN_HAT_CHANEL.BOX_SETTLEMENT, constant.SKIN_TYPE.HAT, this._randomSkin, () => {
                    next();
                }]);
            } else {
                next();
            }
        });
    }

    update (deltaTime: number) {
        // [4]

        if (this._isStopArrow) {
            return;
        }

        let eulerAnglesZ = this.ndArrow.eulerAngles.z;
        //依次从左到右
        if (eulerAnglesZ >= 54 && eulerAnglesZ < 90) {
            this._diamondMultiple = 2;
            this.lbDiamondDouble.string = String(Math.ceil(this._rewardDiamond * this._diamondMultiple));
        } else if (eulerAnglesZ >= 18 && eulerAnglesZ < 54) {
            this._diamondMultiple = 3;
            this.lbDiamondDouble.string = String(Math.ceil(this._rewardDiamond * this._diamondMultiple));
        } else if (eulerAnglesZ >= -18 && eulerAnglesZ < 18) {
            this._diamondMultiple = 2;
            this.lbBtnMultiple.string = "??";
            this.lbDiamondDouble.string = "???";
            return;
        } else if (eulerAnglesZ >= -54 && eulerAnglesZ < -18) {
            this._diamondMultiple = 3;
            this.lbDiamondDouble.string = String(Math.ceil(this._rewardDiamond * this._diamondMultiple));
        } else {
            this._diamondMultiple = 2;
            this.lbDiamondDouble.string = String(Math.ceil(this._rewardDiamond * this._diamondMultiple));
        }

        this.lbBtnMultiple.string = 'X' + this._diamondMultiple;
    }
}
