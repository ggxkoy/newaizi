import { _decorator, Component, Node, Sprite } from 'cc';
import { playerData } from './../../framework/playerData';
import { GameLogic } from './../../framework/gameLogic';
import { clientEvent } from '../../framework/clientEvent';
import { uiManager } from '../../framework/uiManager';
import { constant } from '../../framework/constant';
import { localConfig } from '../../framework/localConfig';
import { resourceUtil } from '../../framework/resourceUtil';
import { AudioManager } from '../../framework/audioManager';
const { ccclass, property } = _decorator;

@ccclass('SkinPanel')
export class SkinPanel extends Component {
    @property(Node)
    public ndBtnReceive: Node = null!;//领取按钮

    @property(Node)
    public ndBtnSkip: Node = null!;//跳过按钮

    @property(Sprite)
    public spPay: Sprite = null!;//付费图标

    @property(Sprite)
    public spSkin: Sprite = null!;//皮肤图标 

    private _chanel = constant.SKIN_HAT_CHANEL.LEVEL;//界面通过什么途径打开，宝箱或者关卡
    private _skinType: number = constant.SKIN_TYPE.HAT;//皮肤类型
    private _skinStatus: any;//商品状态
    private _callback: Function = () => { };

    public show (chanel: number, skinType: number, skinStatus: any, callback: Function) {
        this._chanel = chanel;
        this._skinType = skinType;
        this._skinStatus = skinStatus;
        this._callback = callback;

        if (chanel === constant.SKIN_HAT_CHANEL.LEVEL) {
            //皮肤解锁界面
            this.spPay.node.active = true;
            this.ndBtnSkip.active = true;
            GameLogic.updatePayIcon(constant.SHARE_ID.SKIN, this.spPay);
        } else if (chanel === constant.SKIN_HAT_CHANEL.BOX) {
            //皮肤拥有界面
            this.spPay.node.active = false;
            this.ndBtnSkip.active = false;
        } else if (chanel === constant.SKIN_HAT_CHANEL.BOX_SETTLEMENT) {
            //皮肤拥有界面
            this.spPay.node.active = false;
            this.ndBtnSkip.active = false;
        }

        let path = "";

        let shopItemInfo = localConfig.instance.queryByID("shop", String(skinStatus.ID));

        if (skinType === constant.SKIN_TYPE.HAT) {
            path = `texture/icon/hats/${shopItemInfo.iconName}`;
        } else if (skinType === constant.SKIN_TYPE.SHOES) {
            path = `texture/icon/shoes/${shopItemInfo.iconName}`;
        }

        resourceUtil.setSpriteFrame(path, this.spSkin, (err: any) => {
        })
    }

    //获取皮肤按钮
    public onBtnReceiveClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.GET_SKIN);
        GameLogic.vibrateShort();

        if (this._chanel === constant.SKIN_HAT_CHANEL.LEVEL) {
            GameLogic.pay(constant.SHARE_ID.SKIN, (err: any) => {
                if (!err) {
                    this._getReward();
                }
            })
        } else if (this._chanel === constant.SKIN_HAT_CHANEL.BOX) {
            this._getReward();
        } else if (this._chanel === constant.SKIN_HAT_CHANEL.BOX_SETTLEMENT) {
            this._getReward();
        }
    }

    //获得皮肤奖励（同时会自动穿戴该皮肤），并跳转至主界面。
    private _getReward () {
        this._skinStatus.status = constant.SHOP_ITEM_STATUS.EQUIPMENT;

        clientEvent.dispatchEvent(constant.EVENT_TYPE.HIDE_HAT_EQUIPMENT);
        clientEvent.dispatchEvent(constant.EVENT_TYPE.REFRESH_HAT_ITEM, this._skinStatus);

        playerData.instance.updateHatStatus(this._skinStatus);

        this._close();
    }

    public onBtnSkipClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.CLICK);
        GameLogic.vibrateShort();

        // if (this._chanel === constant.SKIN_HAT_CHANEL.LEVEL) {
        //     this._skinStatus.status = constant.SHOP_ITEM_STATUS.UNLOCKED_NOT_OWNED;
        //     playerData.instance.updateHatStatus(this._skinStatus);
        // }

        this._close();
    }

    private _close () {
        uiManager.instance.hideDialog("skin/skinPanel");

        this._callback && this._callback();
    }

    // update (deltaTime: number) {
    //     // [4]
    // }
}

