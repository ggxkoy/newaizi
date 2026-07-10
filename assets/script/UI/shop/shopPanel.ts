import { _decorator, Component, Node, Label, Button, Sprite, SpriteFrame, Prefab, PageView, instantiate } from 'cc';
import { poolManager } from './../../framework/poolManager';
import { FlyReward } from './../common/flyReward';
import { HatItem } from './hatItem';
import { playerData } from './../../framework/playerData';
import { GameManager } from './../../fight/gameManager';
import { GameLogic } from './../../framework/gameLogic';
import { uiManager } from './../../framework/uiManager';
import { constant } from '../../framework/constant';
import { EffectManager } from '../../framework/effectManager';
import { ShoesItem } from './shoesItem';
import { localConfig } from '../../framework/localConfig';
import { AudioManager } from '../../framework/audioManager';
import { clientEvent } from '../../framework/clientEvent';
const { ccclass, property } = _decorator;

@ccclass('ShopPanel')
export class ShopPanel extends Component {
    @property(Label)
    public lbDiamondRandomSkin: Label = null!;//随机皮肤价格

    @property(Label)
    public lbDiamondReceiveNum: Label = null!;//随机钻石领取的数量

    @property(Sprite)
    public spBtnHat: Sprite = null!;//帽子按钮sprite组件

    @property(Sprite)
    public spBtnShoes: Sprite = null!;//鞋子按钮sprite组件

    @property(SpriteFrame)
    public sfBtnSelect: SpriteFrame = null!; //按钮选中背景

    @property(SpriteFrame)
    public sfBtnUnSelect: SpriteFrame = null!; //按钮非选中背景

    @property(Sprite)
    public spPayIconReceiveDiamond: Sprite = null!; //获取钻石的视频图标

    @property(Node)
    public ndPageViewHat: Node = null!;//帽子页面节点

    @property(Node)
    public ndPageViewShoes: Node = null!;//鞋子页面节点

    @property(Button)
    public btnRandomSkin: Button = null!;//获取钻石皮肤按钮

    @property(Prefab)
    public pbPageHat: Prefab = null!;//帽子页面预制体

    @property(Node)
    public ndHatContent: Node = null!;//帽子页面容器

    @property(Node)
    public ndShoesContent: Node = null!;//鞋子页面容器

    @property(PageView)
    public pageViewComHat: PageView = null!;//帽子页面组件

    @property(PageView)
    public pageViewShoes: PageView = null!;//鞋子页面组件

    @property(SpriteFrame)
    public sfRandomSkinBlue: SpriteFrame = null!;//随机皮肤按钮可点击时背景

    @property(SpriteFrame)
    public sfRandomSkinGray: SpriteFrame = null!;//随机皮肤按钮不可点击时置灰背景

    @property(Sprite)
    public spRandomSkin: Sprite = null!;//随机皮肤按钮sprite

    @property(Prefab)
    public pbShoesItem: Prefab = null!;

    private _skinType: number = constant.SKIN_TYPE.HAT;//当前展示的皮肤类型
    private _pageHatIndex: number = 0;//帽子页面索引,最小为0
    private _pageShoesIndex: number = 0;//鞋子页面索引
    private _maxNumInPage: number = 9;//每页中的最多几个子节点
    private _randHatSkinUseTimes: number = 0;//随机帽子次数
    private _oriRandHatSkinDiamondNum: number = 100;//初始随机皮肤所需钻石数量为100， 后续100 * 1.2^（次数 - 1）；
    private _receiveDiamondUseTimes: number = 0;//获取钻石次数
    private _oriGetDiamondNum: number = 100;//初始获取钻书数量为100，后续100 * 1.2^（次数 - 1)； 
    private _curRandomSkinDiamond: number = 0;//当前随机皮肤所需要的钻石
    private _curReceiveDiamond: number = 0;//当前点击按钮能够获取宝石的数量

    onEnable () {

    }

    onDisable () {

    }

    start () {
        // [3]
    }

    public show () {
        GameLogic.updatePayIcon(constant.SHARE_ID.SHOP_RECEIVE_DIAMOND, this.spPayIconReceiveDiamond);

        if (this._skinType === constant.SKIN_TYPE.HAT) {
            this._showHat();
        } else if (this._skinType === constant.SKIN_TYPE.SHOES) {
            this._showShoes();
        }

        this._refreshBtnRandomSkin();
        this._refreshBtnReceiveDiamond();
    }

    /**
     * 点击关闭按钮
     */
    public onBtnCloseClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.CLICK);
        GameLogic.vibrateShort();

        this._close();
    }

    /**
     * 点击获取钻石按钮
     */
    public onBtnReceiveDiamondClick () {
        if (FlyReward.isRewardFlying) {
            return;
        }

        AudioManager.instance.playSound(constant.AUDIO_SOUND.DIAMOND_RECEIVE);
        GameLogic.vibrateShort();

        GameLogic.pay(constant.SHARE_ID.SHOP_RECEIVE_DIAMOND, (err: any) => {
            if (!err) {
                let diamond = Number(this.lbDiamondReceiveNum.string);
                EffectManager.instance.showFlyReward(diamond, () => {
                    this._receiveDiamondUseTimes += 1;
                    this._refreshBtnReceiveDiamond();
                    this._refreshBtnRandomSkin();
                });
            }
        })
    }

    /**
     * 点击帽子按钮
     */
    public onBtnHatClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.CLICK);
        GameLogic.vibrateShort();

        this._showHat();
    }

    private _showHat () {
        this._skinType = constant.SKIN_TYPE.HAT;
        this.spBtnHat.spriteFrame = this.sfBtnSelect;
        this.spBtnShoes.spriteFrame = this.sfBtnUnSelect;
        this.ndPageViewHat.active = true;
        this.ndPageViewShoes.active = false;
        this.btnRandomSkin.node.active = true;

        let arr = localConfig.instance.getTableArr("shop");
        let arrHat = arr.filter((item: any) => {
            return item.type === 1;
        })

        let minPages = Math.ceil(arrHat.length / this._maxNumInPage);

        while (this.ndHatContent.children.length < minPages) {
            let ndPageHat = instantiate(this.pbPageHat);
            this.pageViewComHat.addPage(ndPageHat);
        }

        while (this.ndHatContent.children.length > minPages) {
            this.pageViewComHat.removePageAtIndex(this.ndHatContent.children.length - 1);
        }

        let arrPageItem: any = [];
        this.ndHatContent.children.forEach((item: Node) => {
            arrPageItem = arrPageItem.concat(item.children);
        })

        arrPageItem.forEach((item: Node, idx: number, arr: any) => {
            let itemInfo = arrHat[idx];
            if (itemInfo) {
                item.active = true;
                let scriptHatItem = item.getComponent(HatItem) as HatItem;
                scriptHatItem.init(itemInfo);
            } else {
                item.active = false;
            }
        })
    }

    /**
     * 点击鞋子按钮
     */
    public onBtnShoesClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.CLICK);
        GameLogic.vibrateShort();

        this._showShoes();
    }

    private _showShoes () {
        this._skinType = constant.SKIN_TYPE.SHOES;
        this.spBtnHat.spriteFrame = this.sfBtnUnSelect;
        this.spBtnShoes.spriteFrame = this.sfBtnSelect;
        this.ndPageViewHat.active = false;
        this.ndPageViewShoes.active = true;
        this.btnRandomSkin.node.active = false;

        let ndPageShoes = this.ndShoesContent.getChildByName("pageShoes") as Node;

        let arr = localConfig.instance.getTableArr("shop");
        let arrShoes = arr.filter((item: any) => {
            return item.type === 2;
        })

        arrShoes.forEach((item: any, idx: number, arr: any) => {
            let ndShoesItem: Node;
            if (idx < ndPageShoes.children.length) {
                ndShoesItem = ndPageShoes.children[idx];
            } else {
                ndShoesItem = poolManager.instance.getNode(this.pbShoesItem, ndPageShoes);
            }

            let scriptShoesItem = ndShoesItem.getComponent(ShoesItem) as ShoesItem;
            scriptShoesItem.init(arrShoes[idx]);
        });

        ndPageShoes.children.splice(arrShoes.length);
    }

    /**
     * 点击随机购买皮肤按钮
     */
    public onBtnRandomSkinClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.CLICK);
        GameLogic.vibrateShort();

        let randShopItem;
        let arrHat = playerData.instance.playerInfo.hat;

        let arrUnLock = arrHat.filter((item: any) => {
            return item.status === constant.SHOP_ITEM_STATUS.UNLOCKED_NOT_OWNED;
        })

        if (arrUnLock.length) {
            randShopItem = arrUnLock[Math.floor(Math.random() * arrUnLock.length)];

            uiManager.instance.showDialog("skin/skinPanel", [constant.SKIN_HAT_CHANEL.BOX, this._skinType, randShopItem, () => {
                GameManager.addDiamond(-this._curRandomSkinDiamond);
                this._randHatSkinUseTimes += 1;
                this._refreshBtnRandomSkin();
                clientEvent.dispatchEvent(constant.EVENT_TYPE.EQUIPMENT_HAT);
            }]);
        }
    }

    /**
     * 更新 随机皮肤按钮 上的钻石数量
     */
    private _refreshBtnRandomSkin () {
        //当钻石不足或皮肤全解锁时按钮会灰置，不可点击。 
        // if (this._skinType === constant.SKIN_TYPE.HAT) {
        if (!this._randHatSkinUseTimes) {
            let randomSkinUseTimes = playerData.instance.getSetting(constant.SETTINGS_KEY.SHOP_RANDOM_SKIN_USE_TIMES);

            if (!randomSkinUseTimes) {
                this._randHatSkinUseTimes = 1;
            } else {
                this._randHatSkinUseTimes = randomSkinUseTimes;
            }
        }

        playerData.instance.setSetting(constant.SETTINGS_KEY.SHOP_RANDOM_SKIN_USE_TIMES, this._randHatSkinUseTimes);

        this._curRandomSkinDiamond = Math.round(this._oriRandHatSkinDiamondNum * Math.pow(1.2, (this._randHatSkinUseTimes - 1)));
        this.lbDiamondRandomSkin.string = this._curRandomSkinDiamond + '';

        let arrHat = playerData.instance.playerInfo.hat;

        //是否已经解锁但是未拥有，且所拥有的钻石能够购买的帽子
        this.btnRandomSkin.interactable = arrHat.some((item: any) => {
            return playerData.instance.playerInfo.diamond >= this._curRandomSkinDiamond && item.status === constant.SHOP_ITEM_STATUS.UNLOCKED_NOT_OWNED;
        })

        if (this.btnRandomSkin.interactable) {
            this.spRandomSkin.spriteFrame = this.sfRandomSkinBlue;
        } else {
            this.spRandomSkin.spriteFrame = this.sfRandomSkinGray;
        }

        // } 
    }

    /**
     * 更新 随机获取宝石按钮 上的钻石数量
     */
    private _refreshBtnReceiveDiamond () {
        if (!this._receiveDiamondUseTimes) {
            let receiveDiamondUseTimes = playerData.instance.getSetting(constant.SETTINGS_KEY.SHOP_RECEIVE_DIAMOND_USE_TIMES);

            if (!receiveDiamondUseTimes) {
                this._receiveDiamondUseTimes = 1;
            } else {
                this._receiveDiamondUseTimes = receiveDiamondUseTimes;
            }
        }

        playerData.instance.setSetting(constant.SETTINGS_KEY.SHOP_RECEIVE_DIAMOND_USE_TIMES, this._receiveDiamondUseTimes);
        this._curReceiveDiamond = Math.round(this._oriGetDiamondNum * Math.pow(1.2, (this._receiveDiamondUseTimes - 1)));
        this.lbDiamondReceiveNum.string = this._curReceiveDiamond + "";
    }

    public onPageViewHatEvent (event: PageView) {
        console.log("hatEvent", event);
        this._pageHatIndex = event.getCurrentPageIndex();
        console.log("hatIndex", this._pageHatIndex);
    }

    public onPageViewShoesEvent (event: PageView) {
        console.log("shoesEvent", event);
        this._pageShoesIndex = event.getCurrentPageIndex();
        console.log("shoesIndex", this._pageShoesIndex);
    }

    private _close () {
        uiManager.instance.hideDialog("shop/shopPanel");
    }

    // update (deltaTime: number) {
    //     // [4]
    // }
}