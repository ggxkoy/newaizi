import { Enum, SpriteFrame, Sprite } from 'cc';
import { AudioManager } from './../../framework/audioManager';
import { playerData } from './../../framework/playerData';
import { constant } from './../../framework/constant';
import { _decorator, Component, Node } from 'cc';
import { localConfig } from '../../framework/localConfig';
import { resourceUtil } from '../../framework/resourceUtil';
import { clientEvent } from '../../framework/clientEvent';
import { GameLogic } from '../../framework/gameLogic';
const { ccclass, property } = _decorator;

@ccclass('HatItem')
export class HatItem extends Component {
    // [1]
    // dummy = '';

    // [2]
    // @property
    // serializableDummy = 0;
    @property(Sprite)
    public spItemBg: Sprite = null!;//底图

    @property(SpriteFrame)
    public sfWhite: SpriteFrame = null!;//白色底

    @property(SpriteFrame)
    public sfGray: SpriteFrame = null!;//灰色底

    @property(Node)
    public ndLock: Node = null!;//锁的图标

    @property(Node)
    public ndTick: Node = null!;//打勾图标

    @property(Node)
    public ndSelect: Node = null!;//绿色边框

    @property(Sprite)
    public spHatIcon: Sprite = null!;//帽子

    private _status = constant.SHOP_ITEM_STATUS.LOCK;
    private _obj: any;
    private _itemInfo: any;

    onEnable () {
        clientEvent.on(constant.EVENT_TYPE.HIDE_HAT_EQUIPMENT, this._hideHatEquipment, this);
        clientEvent.on(constant.EVENT_TYPE.REFRESH_HAT_ITEM, this._refreshHatItem, this);
    }

    onDisable () {
        clientEvent.off(constant.EVENT_TYPE.HIDE_HAT_EQUIPMENT, this._hideHatEquipment, this);
        clientEvent.off(constant.EVENT_TYPE.REFRESH_HAT_ITEM, this._refreshHatItem, this);
    }

    start () {
        // [3]
    }

    public init (itemInfo: any) {
        this._itemInfo = itemInfo;

        this._obj = playerData.instance.getHatStatus(itemInfo.ID);
        this._status = this._obj.status;
        let path = `texture/icon/hats/${itemInfo.iconName}`;

        switch (this._status) {
            case constant.SHOP_ITEM_STATUS.LOCK:
                this.spItemBg.spriteFrame = this.sfGray;
                this.spHatIcon.node.active = false;
                this.ndLock.active = true;
                this.ndSelect.active = false;
                this.ndTick.active = false;
                break;
            case constant.SHOP_ITEM_STATUS.UNLOCKED_NOT_OWNED:
                this.spItemBg.spriteFrame = this.sfGray;
                this.spHatIcon.node.active = true;
                this.ndLock.active = false;
                this.ndSelect.active = false;
                this.ndTick.active = false;
                resourceUtil.setSpriteFrame(`texture/icon/hats/h10`, this.spHatIcon, () => { });
                break;
            case constant.SHOP_ITEM_STATUS.OWNED:
                this.spItemBg.spriteFrame = this.sfWhite;
                this.spHatIcon.node.active = true;

                this.ndLock.active = false;
                this.ndSelect.active = false;
                this.ndTick.active = false;
                resourceUtil.setSpriteFrame(path, this.spHatIcon, () => { });
                break;
            case constant.SHOP_ITEM_STATUS.EQUIPMENT:
                this.spItemBg.spriteFrame = this.sfWhite;
                this.spHatIcon.node.active = true;
                this.ndLock.active = false;
                this.ndSelect.active = true;
                this.ndTick.active = true;

                resourceUtil.setSpriteFrame(path, this.spHatIcon, () => { });
                break;
        }
    }

    public onHatItemClick () {
        if (this._status === constant.SHOP_ITEM_STATUS.OWNED) {
            AudioManager.instance.playSound(constant.AUDIO_SOUND.CLICK);
            GameLogic.vibrateShort();

            clientEvent.dispatchEvent(constant.EVENT_TYPE.HIDE_HAT_EQUIPMENT);
            this._obj.status = constant.SHOP_ITEM_STATUS.EQUIPMENT;
            playerData.instance.updateHatStatus(this._obj);
            this.init(this._itemInfo);

            clientEvent.dispatchEvent(constant.EVENT_TYPE.EQUIPMENT_HAT);
        }
    }

    private _hideHatEquipment () {
        if (this._status === constant.SHOP_ITEM_STATUS.EQUIPMENT) {
            this._obj.status = constant.SHOP_ITEM_STATUS.OWNED;
            playerData.instance.updateHatStatus(this._obj);
            this.init(this._itemInfo);
        }
    }

    private _refreshHatItem (obj: any) {
        if (obj.ID === this._obj.ID) {
            this._obj.status = obj.status;
            // playerData.instance.updateHatStatus(this._obj);
            this.init(this._itemInfo);
        }
    }

    // update (deltaTime: number) {
    //     // [4]
    // }
}

/**
 * [1] Class member could be defined like this.
 * [2] Use `property` decorator if your want the member to be serializable.
 * [3] Your initialization goes here.
 * [4] Your update function goes here.
 *
 * Learn more about scripting: https://docs.cocos.com/creator/3.0/manual/en/scripting/
 * Learn more about CCClass: https://docs.cocos.com/creator/3.0/manual/en/scripting/ccclass.html
 * Learn more about life-cycle callbacks: https://docs.cocos.com/creator/3.0/manual/en/scripting/life-cycle-callbacks.html
 */
