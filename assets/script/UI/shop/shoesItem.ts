import { GameLogic } from './../../framework/gameLogic';
import { resourceUtil } from './../../framework/resourceUtil';
import { _decorator, Component, Node, Sprite, SpriteFrame, Label, Button } from 'cc';
import { clientEvent } from '../../framework/clientEvent';
import { constant } from '../../framework/constant';
import { playerData } from '../../framework/playerData';
import { AudioManager } from '../../framework/audioManager';
const { ccclass, property } = _decorator;

@ccclass('ShoesItem')
export class ShoesItem extends Component {
    // [1]
    // dummy = '';

    // [2]
    // @property
    // serializableDummy = 0;

    @property(Sprite)
    public spItemBg: Sprite = null!;//底图sprite

    @property(SpriteFrame)
    public sfWhite: SpriteFrame = null!;//白色底

    @property(SpriteFrame)
    public sfGray: SpriteFrame = null!;//灰色底

    @property(Node)
    public ndTick: Node = null!;//打勾图标

    @property(Node)
    public ndSelect: Node = null!;//绿色边框

    @property(Sprite)
    public spShoesIcon: Sprite = null!;//鞋子图标

    @property(Node)
    public ndPay: Node = null!; //广告内容节点

    @property(Sprite)
    public spPayIcon: Sprite = null!;//视频广告icon节点

    @property(Label)
    public lbTxt: Label = null!;//广告次数文本节点

    @property(Button)
    public btnItem: Button = null!;

    private _status = constant.SHOP_ITEM_STATUS.LOCK;//鞋子状态
    private _itemInfo: any;//鞋子信息
    private _obj: any;


    onEnable () {
        clientEvent.on(constant.EVENT_TYPE.HIDE_SHOES_EQUIPMENT, this._hideShoesEquipment, this);
        clientEvent.on(constant.EVENT_TYPE.REFRESH_SHOES_ITEM, this._refreshShoesItem, this);
    }

    onDisable () {
        clientEvent.off(constant.EVENT_TYPE.HIDE_SHOES_EQUIPMENT, this._hideShoesEquipment, this);
        clientEvent.off(constant.EVENT_TYPE.REFRESH_SHOES_ITEM, this._refreshShoesItem, this);
    }

    start () {
        // [3]
    }

    public init (itemInfo: any) {
        this._itemInfo = itemInfo;

        this._obj = playerData.instance.getShoesStatus(itemInfo.ID);
        this._status = this._obj.status;
        let path = `texture/icon/shoes/${itemInfo.iconName}`;
        GameLogic.updatePayIcon(constant.SHARE_ID.SHOP_SHOES, this.spPayIcon);

        switch (this._obj.status) {
            case constant.SHOP_ITEM_STATUS.LOCK:
                this.spItemBg.spriteFrame = this.sfGray;
                this.ndSelect.active = false;
                this.ndTick.active = false;
                this.lbTxt.node.active = true;
                this.lbTxt.string = `${this._obj.watchTimes}/${itemInfo.videoTimes}`;
                resourceUtil.setSpriteFrame("texture/icon/shoes/111", this.spShoesIcon, () => { });
                break;
            case constant.SHOP_ITEM_STATUS.OWNED:
                this.spItemBg.spriteFrame = this.sfWhite;
                this.ndSelect.active = false;
                this.ndTick.active = false;
                this.lbTxt.node.active = false;
                resourceUtil.setSpriteFrame(path, this.spShoesIcon, () => { });
                break;
            case constant.SHOP_ITEM_STATUS.EQUIPMENT:
                this.spItemBg.spriteFrame = this.sfWhite;
                this.ndSelect.active = true;
                this.ndTick.active = true;
                this.lbTxt.node.active = false;
                resourceUtil.setSpriteFrame(path, this.spShoesIcon, () => { });
                break;
        }
    }

    public onShoesItemClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.CLICK);
        GameLogic.vibrateShort();

        if (this._status === constant.SHOP_ITEM_STATUS.OWNED) {
            clientEvent.dispatchEvent(constant.EVENT_TYPE.HIDE_SHOES_EQUIPMENT);
            this._obj.status = constant.SHOP_ITEM_STATUS.EQUIPMENT;
            playerData.instance.updateShoesStatus(this._obj);
            this.init(this._itemInfo);
            clientEvent.dispatchEvent(constant.EVENT_TYPE.EQUIPMENT_SHOES);
        } else if (this._status === constant.SHOP_ITEM_STATUS.LOCK) {
            if (this._obj.watchTimes < this._itemInfo.videoTimes) {
                GameLogic.pay(constant.SHARE_ID.SHOP_SHOES, (err: any) => {
                    if (!err) {
                        this._obj.watchTimes += 1;

                        if (this._obj.watchTimes >= this._itemInfo.videoTimes) {
                            clientEvent.dispatchEvent(constant.EVENT_TYPE.HIDE_SHOES_EQUIPMENT);
                            this._obj.status = constant.SHOP_ITEM_STATUS.EQUIPMENT;

                            playerData.instance.updateShoesStatus(this._obj);
                            this.init(this._itemInfo);
                            clientEvent.dispatchEvent(constant.EVENT_TYPE.EQUIPMENT_SHOES);
                        } else {
                            playerData.instance.updateShoesStatus(this._obj);
                            this.init(this._itemInfo);
                        }
                    }
                })
            }
        } else if (this._status === constant.SHOP_ITEM_STATUS.OWNED) {

        }
    }

    private _hideShoesEquipment () {
        if (this._status === constant.SHOP_ITEM_STATUS.EQUIPMENT) {
            this._obj.status = constant.SHOP_ITEM_STATUS.OWNED;
            playerData.instance.updateShoesStatus(this._obj);
            this.init(this._itemInfo);
        }
    }

    private _refreshShoesItem (obj: any) {
        if (obj.ID === this._obj.ID) {
            this._obj.status = obj.status;
            playerData.instance.updateShoesStatus(this._obj);
            this.init(this._itemInfo);
        }
    }

    // update (deltaTime: number) {
    //     // [4]
    // }
}