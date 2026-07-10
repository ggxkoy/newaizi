import { _decorator, Component, Node, Label, SpriteFrame, Sprite, UITransform, Color, Animation, Vec3, profiler } from 'cc';
import { AudioManager } from './../../framework/audioManager';
import { GameManager } from './../../fight/gameManager';
import { uiManager } from './../../framework/uiManager';
import { playerData } from './../../framework/playerData';
import { clientEvent } from '../../framework/clientEvent';
import { localConfig } from '../../framework/localConfig';
import { constant } from '../../framework/constant';
import { GameLogic } from '../../framework/gameLogic';
import { EffectManager } from '../../framework/effectManager';
import { StorageManager } from '../../framework/storageManager';
const { ccclass, property } = _decorator;
//主界面
@ccclass('HomePanel')
export class HomePanel extends Component {

    @property(Label)
    public lbDiamond: Label = null!;

    @property(Label)
    public lbLevel: Label = null!;

    @property(Node)
    public ndLevelList: Node = null!;

    @property(Node)
    public ndLineList: Node = null!;

    @property(Node)
    public ndLevelView: Node = null!;

    @property(SpriteFrame)
    public sfBox: SpriteFrame = null!;

    @property(SpriteFrame)
    public sfBoss: SpriteFrame = null!;

    @property(SpriteFrame)
    public sfBlue: SpriteFrame = null!;

    @property(SpriteFrame)
    public sfGray: SpriteFrame = null!;

    @property(SpriteFrame)
    public sfLineBlue: SpriteFrame = null!;

    @property(SpriteFrame)
    public sfLineGray: SpriteFrame = null!;

    @property(Sprite)
    public spPayIconPowerHand: Sprite = null!;

    @property(Sprite)
    public spPayIconPowerKick: Sprite = null!;

    @property(Node)
    public ndHand: Node = null!;

    @property(Node)
    public ndKick: Node = null!;

    @property(Node)
    public ndHandTip: Node = null!;

    @property(Node)
    public ndKickTip: Node = null!;

    @property(Node)
    public ndHandVideo: Node = null!;

    @property(Node)
    public ndKickVideo: Node = null!;

    @property(Node)
    public ndHandPrice: Node = null!;

    @property(Node)
    public ndKickPrice: Node = null!;

    @property(Node)
    public ndHandDesc: Node = null!;

    @property(Node)
    public ndKickDesc: Node = null!;

    private _nextHandInfo: any = null!;
    private _nextKickInfo: any = null!;
    private _debugClickTimes: number = 0;

    onEnable () {
    }

    onDisable () {
    }

    start () {
        // [3]
    }

    public show () {
        let isDebugOpen = StorageManager.instance.getGlobalData("debug") ?? false;
        isDebugOpen === true ? profiler.showStats() : profiler.hideStats();

        clientEvent.dispatchEvent(constant.EVENT_TYPE.REFRESH_DIAMOND);

        this._refreshHandUpgradeBtn();
        this._refreshKickUpgradeBtn();
        this._refreshLevel();

        this._debugClickTimes = 0;
    }

    private _refreshHandUpgradeBtn (isShowTip: boolean = true) {
        let curHandLevel = playerData.instance.playerInfo.handPowerLevel;
        this._nextHandInfo = localConfig.instance.queryByID("power", curHandLevel + 1);

        let fightTimes = playerData.instance.getFightTimes();

        if (this._nextHandInfo) {
            this.ndHandDesc.active = false;

            if (this._nextHandInfo.handCost < playerData.instance.playerInfo.diamond) {
                this.ndHandPrice.active = true;
                this.ndHandVideo.active = false;
                let lbComPrice = this.ndHandPrice.getChildByName("txt")?.getComponent(Label) as Label;
                lbComPrice.string = this._nextHandInfo.handCost;
            } else {
                this.ndHandPrice.active = false;
                this.ndHandVideo.active = true;
                GameLogic.updatePayIcon(constant.SHARE_ID.HOME_POWER_HAND, this.spPayIconPowerHand);
            }

            if (fightTimes % 3 === 0 && fightTimes !== 0 && isShowTip) {
                if (playerData.instance.playerInfo.kickPowerLevel < this._nextHandInfo.ID) {
                    this.ndHandTip.active = true;
                } else {
                    this.ndHandTip.active = false;
                }
            } else {
                this.ndHandTip.active = false;
            }
        } else {
            //都解锁完了
            this.ndHandDesc.active = true;
            this.ndHandPrice.active = false;
            this.ndHandTip.active = false;
            this.ndHandVideo.active = false;
        }
    }

    private _refreshKickUpgradeBtn (isShowTip: boolean = true) {
        let curKickLevel = playerData.instance.playerInfo.kickPowerLevel;
        this._nextKickInfo = localConfig.instance.queryByID("power", curKickLevel + 1);

        let fightTimes = playerData.instance.getFightTimes();

        if (this._nextKickInfo) {
            this.ndKickDesc.active = false;

            if (this._nextKickInfo.kickCost < playerData.instance.playerInfo.diamond) {
                this.ndKickPrice.active = true;
                this.ndKickVideo.active = false;
                let lbComPrice = this.ndKickPrice.getChildByName("txt")?.getComponent(Label) as Label;
                lbComPrice.string = this._nextKickInfo.kickCost;
            } else {
                this.ndKickPrice.active = false;
                this.ndKickVideo.active = true;
                GameLogic.updatePayIcon(constant.SHARE_ID.HOME_POWER_HAND, this.spPayIconPowerKick);
            }

            if (fightTimes % 3 === 0 && fightTimes !== 0 && isShowTip) {
                if (playerData.instance.playerInfo.kickPowerLevel < this._nextKickInfo.ID) {
                    this.ndKickTip.active = true;
                } else {
                    this.ndKickTip.active = false;
                }
            } else {
                this.ndKickTip.active = false;
            }
        } else {
            //都解锁完了
            this.ndKickDesc.active = true;
            this.ndKickPrice.active = false;
            this.ndKickTip.active = false;
            this.ndKickVideo.active = false;
        }
    }

    private _refreshLevel () {
        let level = playerData.instance.playerInfo.level;
        this.lbLevel.string = `第${level}关`;
        let arrMap = localConfig.instance.getTableArr("map");

        let firstMapLevel = 1;//最左边第一个展示的关卡
        let curLevelIndex = 0;//当前关卡在ndLevelList子节点中的索引

        //策划说最少5关
        if (level <= 2) {
            firstMapLevel = 1;
            curLevelIndex = level - 1;
        } else if (level >= arrMap.length - 4) {
            firstMapLevel = arrMap.length - 4;
            curLevelIndex = level - (arrMap.length - 4);
        } else {
            firstMapLevel = level - 2;
            curLevelIndex = 2;
        }

        this.ndLevelList.children.forEach((item: Node, i: number, arr: any) => {
            let levelInfo = localConfig.instance.queryByID("map", String(firstMapLevel));
            if (levelInfo) {
                let lbLevel = item.getChildByName("level")?.getComponent(Label) as Label;
                let spIcon = item.getChildByName("icon")?.getComponent(Sprite) as Sprite;
                let spLine = this.ndLineList.children[i].getComponent(Sprite) as Sprite;
                let spItemBg = item.getComponent(Sprite) as Sprite;
                let aniCom = item.getComponent(Animation) as Animation;

                aniCom.stop();

                if (i < curLevelIndex) {
                    spItemBg.spriteFrame = this.sfBlue;
                    spLine.spriteFrame = this.sfLineBlue;
                } else if (i === curLevelIndex) {
                    aniCom.play();
                    spItemBg.spriteFrame = this.sfBlue;
                    spLine.spriteFrame = this.sfLineBlue;
                } else {
                    spItemBg.spriteFrame = this.sfGray;
                    spLine.spriteFrame = this.sfLineGray;
                }

                if (i === arr.length - 1) {
                    spLine.node.active = false;
                }

                if (levelInfo.type == constant.GAME_TYPE.NORMAL) {
                    lbLevel.node.active = true;
                    spIcon.node.active = false;
                    lbLevel.string = levelInfo.ID;
                    item.getComponent(UITransform)?.setContentSize(56, 56);

                    lbLevel.color = new Color(255, 255, 255, 255);
                } else if (levelInfo.type == constant.GAME_TYPE.REWARD) {
                    lbLevel.node.active = false;
                    spIcon.node.active = true;
                    spIcon.spriteFrame = this.sfBox;
                    item.getComponent(UITransform)?.setContentSize(74, 74);
                } else {
                    lbLevel.node.active = false;
                    spIcon.node.active = true;
                    spIcon.spriteFrame = this.sfBoss;
                    item.getComponent(UITransform)?.setContentSize(74, 74);
                }
            }

            firstMapLevel++;
        })
    }

    public onBtnSettingClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.CLICK);
        GameLogic.vibrateShort();

        uiManager.instance.showDialog("setting/settingPanel");
    }

    public onBtnInvincibleClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.CLICK);
        GameLogic.vibrateShort();

        uiManager.instance.showDialog("invincible/invinciblePanel");
    }

    public onBtnShopClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.CLICK);
        GameLogic.vibrateShort();

        uiManager.instance.showDialog("shop/shopPanel");
    }

    public onBtnUpgradeHandClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.CLICK);
        GameLogic.vibrateShort();

        if (!this._nextHandInfo) {
            return;
        }

        EffectManager.instance.playLevelUpStar(this.ndHand);

        let callback = () => {
            AudioManager.instance.playSound(constant.AUDIO_SOUND.LEVEL_UP);

            EffectManager.instance.playEffect(GameManager.scriptPlayer.node, 'levelUp/levelUp', true, true, 2, 1.5, new Vec3(0, 0, 0));
            this.ndHandTip.active = false;
            playerData.instance.updateHandPowerLevel(this._nextHandInfo.ID);
            this._refreshHandUpgradeBtn(false);
        }

        if (this.ndHandVideo.active) {
            GameLogic.pay(constant.SHARE_ID.HOME_POWER_HAND, (err: any) => {
                if (!err) {
                    callback();
                }
            })
        } else {
            GameManager.addDiamond(-this._nextHandInfo.handCost);
            callback();
        }

    }

    public onBtnUpgradeKickClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.CLICK);
        GameLogic.vibrateShort();

        if (!this._nextKickInfo) {
            return;
        }

        EffectManager.instance.playLevelUpStar(this.ndKick);

        let callback = () => {
            AudioManager.instance.playSound(constant.AUDIO_SOUND.LEVEL_UP);

            EffectManager.instance.playEffect(GameManager.scriptPlayer.node, 'levelUp/levelUp', true, true, 2, 1.5, new Vec3(0, 0, 0));
            this.ndKickTip.active = false;
            playerData.instance.updateKickPowerLevel(this._nextKickInfo.ID);
            this._refreshKickUpgradeBtn(false);
        }

        if (this.ndKickVideo.active) {
            GameLogic.pay(constant.SHARE_ID.HOME_POWER_KICK, (err: any) => {
                if (!err) {
                    callback();
                }
            })
        } else {
            GameManager.addDiamond(-this._nextKickInfo.kickCost);
            callback();
        }
    }

    public onBtnDebugClick () {
        this._debugClickTimes += 1;

        if (this._debugClickTimes >= 1) {
            this._debugClickTimes = 0;
            uiManager.instance.showDialog("debug/debugPanel");
        }
    }

    // update (deltaTime: number) {
    //     // [4]
    // }
}

