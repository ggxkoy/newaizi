import { _decorator, Component, Node, SpriteFrame, Sprite, Label } from 'cc';
import { AudioManager } from './../../framework/audioManager';
import { GameLogic } from './../../framework/gameLogic';
import { uiManager } from './../../framework/uiManager';
import { BoxItem } from './boxItem';
import { constant } from '../../framework/constant';
import { EffectManager } from '../../framework/effectManager';
import { playerData } from '../../framework/playerData';
import { localConfig } from '../../framework/localConfig';
import { resourceUtil } from '../../framework/resourceUtil';
import { clientEvent } from '../../framework/clientEvent';
const { ccclass, property } = _decorator;
//宝箱界面
@ccclass('BoxPanel')
export class BoxPanel extends Component {
    // [1]
    // dummy = '';

    // [2]
    // @property
    // serializableDummy = 0;

    @property(SpriteFrame)
    public sfKeyEnable: SpriteFrame = null!;//钥匙可使用状态

    @property(SpriteFrame)
    public sfKeyDisable: SpriteFrame = null!;//钥匙已使用状态

    @property(SpriteFrame)
    public sfDiamondIcon: SpriteFrame = null!;//钻石图标

    @property(Node)
    public ndKeyList: Node = null!;//钥匙列表

    @property(Node)
    public ndBtnReceiveKey: Node = null!;//获取钥匙按钮

    @property(Node)
    public ndBtnSkip: Node = null!;//跳过按钮

    @property(Node)
    public ndBtnReceiveDiamondDouble: Node = null!;//双倍钻石领取按钮

    @property(Node)
    public ndBtnReceiveDiamondNormal: Node = null!;//普通钻石领取按钮

    @property(Node)
    public ndContainer: Node = null!;//宝箱父节点

    @property(Sprite)
    public spPayIconKey: Sprite = null!;//获取钥匙视频图标

    @property(Sprite)
    public spPayIconDouble: Sprite = null!;//双倍奖励视频图标

    @property(Sprite)
    public spBestReward: Sprite = null!;//最佳奖品图标

    @property(Label)
    public lbBestRewardNum: Label = null!;//最佳奖励数量

    @property(Label)
    public lbDouble: Label = null!;//双倍领取钻石数量

    @property(Label)
    public lbNormal: Label = null!;//普通领取上钻石量

    public keyNum: number = 0;//可使用的钥匙数量
    public objBestReward: any;//最佳奖励数据
    public isOpenHatSkin: boolean = false;//是否开出皮肤
    public get diamondNum () {
        return this._diamondNum;
    }

    public set diamondNum (value: number) {
        this._diamondNum = value;
        this.lbDouble.string = String(this._diamondNum * 2);
        this.lbNormal.string = String(this._diamondNum);
    }

    private _unlockNum: number = 0;//已经解锁宝箱数量   
    // private _buyKeyTimes: number = 0;//购买钥匙次数
    private _bestRewardType: number = 0;//最佳奖励类型
    private _bestRewardIndex: number = 0;//最佳奖品在节点中索引
    private _diamondNum: number = 0;//已收集的钻石数量

    onEnable () {

    }

    onDisable () {

    }

    start () {
        // [3]
    }

    public show () {
        this.ndKeyList.active = false;
        this.ndBtnReceiveKey.active = false;
        this.ndBtnSkip.active = false;
        this.ndBtnReceiveDiamondNormal.active = false;
        this.ndBtnReceiveDiamondDouble.active = false;
        this.isOpenHatSkin = false;
        this.diamondNum = 0;
        this._unlockNum = 0;
        this._bestRewardIndex = 0;

        this._initBestReward();
        this._initBoxItem();
        this._getKey();
    }

    private _initBestReward () {
        this.objBestReward = playerData.instance.getBestRewardBox();
        this._bestRewardType = this.objBestReward.type;

        if (this._bestRewardType === constant.REWARD_TYPE.DIAMOND) {
            this.lbBestRewardNum.node.active = true;
            this.lbBestRewardNum.string = this.objBestReward.num;
            this.spBestReward.spriteFrame = this.sfDiamondIcon;
        } else if (this._bestRewardType === constant.REWARD_TYPE.SKIN) {
            let itemInfo = localConfig.instance.queryByID("shop", this.objBestReward.obj.ID);
            this.lbBestRewardNum.node.active = false;
            let path = `texture/icon/hats/${itemInfo.iconName}`;
            resourceUtil.setSpriteFrame(path, this.spBestReward, () => { });
        }
    }

    private _initBoxItem () {
        this._bestRewardIndex = Math.floor(Math.random() * 9);
        console.log(`最佳奖品在第${this._bestRewardIndex + 1}个宝箱`);

        this.ndContainer.children.forEach((item: Node, idx: number, arr: any) => {
            let scriptBoxItem = item.getComponent(BoxItem) as BoxItem;

            if (idx === this._bestRewardIndex) {
                if (this._bestRewardType === constant.REWARD_TYPE.SKIN) {
                    scriptBoxItem.init(constant.REWARD_TYPE.SKIN, this, true);
                } else if (this._bestRewardType === constant.REWARD_TYPE.DIAMOND) {
                    scriptBoxItem.init(constant.REWARD_TYPE.DIAMOND, this, true);
                }
            } else {
                scriptBoxItem.init(constant.REWARD_TYPE.DIAMOND, this, false);
            }
        })
    }

    public useKey () {
        this._unlockNum += 1;

        this.keyNum -= 1;
        playerData.instance.updatePlayerInfo('key', -1);

        if (this.keyNum <= 0) {
            this.ndKeyList.active = false;
            //是否购买过3次钥匙
            this.ndBtnReceiveKey.active = true;
            this.ndBtnSkip.active = true;

            if (this._unlockNum >= 9) {
                this.ndBtnSkip.active = false;
                this.ndBtnReceiveKey.active = false;
                this.ndBtnReceiveDiamondDouble.active = true;
                this.ndBtnReceiveDiamondNormal.active = true;
                GameLogic.updatePayIcon(constant.SHARE_ID.BOX_RECEIVE_DOUBLE, this.spPayIconDouble);
                return;
            }

            GameLogic.updatePayIcon(constant.SHARE_ID.BOX_RECEIVE_KEY, this.spPayIconKey);
        }

        this.ndKeyList.children.forEach((item: Node, index: number, arr: any) => {
            let element = this.ndKeyList.children[index];
            let spCom = element.getComponent(Sprite) as Sprite;

            if (index < this.keyNum) {
                spCom.spriteFrame = this.sfKeyEnable;
            } else {
                spCom.spriteFrame = this.sfKeyDisable;
            }
        })
    }

    private _getKey () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.COLLECT_KEY);

        this.keyNum = 3;
        playerData.instance.updatePlayerInfo('key', 3);

        this.ndKeyList.active = true;
        this.ndKeyList.children.forEach((item: Node) => {
            let spCom = item.getComponent(Sprite) as Sprite;
            spCom.spriteFrame = this.sfKeyEnable;
        })
    }

    /**
     * 是否购买钥匙
     */
    public onBtnReceiveKeyClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.CLICK);
        GameLogic.vibrateShort();

        GameLogic.pay(constant.SHARE_ID.BOX_RECEIVE_KEY, (err: any) => {
            if (!err) {
                this._getKey();

                this.ndBtnSkip.active = false;
                this.ndBtnReceiveKey.active = false;
            }
        });
    }

    public onBtnSkipClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.CLICK);
        GameLogic.vibrateShort();

        this.ndBtnSkip.active = false;
        this.ndBtnReceiveKey.active = false;
        this.ndBtnReceiveDiamondDouble.active = true;
        this.ndBtnReceiveDiamondNormal.active = true;

        this.lbDouble.string = String(this.diamondNum * 2);
        this.lbNormal.string = String(this.diamondNum);

        GameLogic.updatePayIcon(constant.SHARE_ID.BOX_RECEIVE_DOUBLE, this.spPayIconDouble);
    }

    public onBtnReceiveDiamondNormal () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.DIAMOND_RECEIVE);
        GameLogic.vibrateShort();

        this._getReward();
    }

    public onBtnReceiveDiamondDouble () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.DIAMOND_RECEIVE);
        GameLogic.vibrateShort();

        GameLogic.pay(constant.SHARE_ID.BOX_RECEIVE_DOUBLE, (err: any) => {
            if (!err) {
                this.diamondNum *= 2;
                this._getReward();
            }
        });
    }

    private _getReward () {
        this.ndBtnReceiveDiamondDouble.active = false;
        this.ndBtnReceiveDiamondNormal.active = false;

        EffectManager.instance.showFlyReward(this.diamondNum, () => {
            uiManager.instance.hideDialog("box/boxPanel");

            //宝箱是否开出皮肤
            if (this.isOpenHatSkin) {
                uiManager.instance.showDialog("skin/skinPanel", [constant.SKIN_HAT_CHANEL.BOX, constant.SKIN_TYPE.HAT, this.objBestReward.obj, () => {
                    clientEvent.dispatchEvent(constant.EVENT_TYPE.CHECK_LEVEL_UNLOCK_HAT_SKIN);
                }]);
            } else {
                clientEvent.dispatchEvent(constant.EVENT_TYPE.CHECK_LEVEL_UNLOCK_HAT_SKIN);
            }
        });
    }

    // update (deltaTime: number) {
    //     // [4]
    // }
}