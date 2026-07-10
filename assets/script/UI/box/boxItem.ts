import { Vec3, Sprite, Animation, Label, Prefab } from 'cc';
import { GameLogic } from './../../framework/gameLogic';
import { AudioManager } from './../../framework/audioManager';
import { uiManager } from './../../framework/uiManager';
import { _decorator, Component, Node } from 'cc';
import { BoxPanel } from './boxPanel';
import { constant } from '../../framework/constant';
import { resourceUtil } from '../../framework/resourceUtil';
import { localConfig } from '../../framework/localConfig';
import { EffectManager } from '../../framework/effectManager';
const { ccclass, property } = _decorator;

@ccclass('BoxItem')
export class BoxItem extends Component {
    @property(Animation)
    public aniComLight: Animation = null!;

    @property(Label)
    public lbDiamond: Label = null!;

    @property(Sprite)
    public spSkin: Sprite = null!;

    @property(Node)
    public ndDiamond: Node = null!;

    @property(Node)
    public ndSkin: Node = null!;

    @property(Prefab)
    public pbBox: Prefab = null!;

    @property(Node)
    public ndBoxReward: Node = null!;

    @property(Animation)
    public aniComBox: Animation = null!;

    private _isOpen: boolean = false;//是否已经开启
    private _rewardType: number = constant.REWARD_TYPE.DIAMOND;//奖励类型，钻石或者皮肤
    private _diamond: number = 0;//钻石数量
    private _scriptBoxPanel: BoxPanel = null!;//boxPanel脚本
    private _isBestReward: boolean = false;//是否是最佳奖励

    start () {
        // [3]
    }

    public init (rewardType: number, scriptBoxPanel: BoxPanel, isBestReward: boolean, diamondNum: number = 100) {
        this._rewardType = rewardType;
        this._scriptBoxPanel = scriptBoxPanel;
        this._diamond = diamondNum;
        this._isOpen = false;
        this.aniComLight.node.active = false;
        this.aniComLight.getState("doubleLight02").time = 0;
        this.aniComLight.getState("doubleLight02").sample();
        this.aniComBox.getState("boxOpen").time = 0;
        this.aniComBox.getState("boxOpen").sample();
        this.ndDiamond.active = false;
        this.ndSkin.active = false;
        this._isBestReward = isBestReward;
        this.ndBoxReward.active = true;
        this.lbDiamond.string = String(diamondNum);


        if (rewardType === constant.REWARD_TYPE.DIAMOND && isBestReward) {
            this.lbDiamond.string = scriptBoxPanel.objBestReward.num;
        }
    }

    public onBoxItemClick () {
        if (!this._isOpen && this._scriptBoxPanel.keyNum > 0) {
            GameLogic.vibrateShort();

            this._isOpen = true;

            this.aniComLight.node.active = true;
            this.aniComLight.play("doubleLight01");
            this.aniComLight.on(Animation.EventType.FINISHED, () => {
                this.aniComLight.play("doubleLight02");
            })

            //宝箱动画
            this.scheduleOnce(() => {
                AudioManager.instance.playSound(constant.AUDIO_SOUND.REWARD_SMALL_BOX);

                this.aniComBox.play("boxOpen");
                EffectManager.instance.playEffect(this.ndBoxReward, 'box/boxOpen01', true, true, 5, 1);
            }, 0.5)

            this.aniComBox.once(Animation.EventType.FINISHED, () => {
                this.scheduleOnce(() => {
                    this.ndBoxReward.active = false;
                    this.unscheduleAllCallbacks();
                }, 0.5)

                if (this._rewardType === constant.REWARD_TYPE.DIAMOND) {
                    this.ndDiamond.active = true;
                    this.ndSkin.active = false;

                    if (this._isBestReward) {
                        this._diamond = this._scriptBoxPanel.objBestReward.num;
                        this.lbDiamond.string = String(this._diamond);

                        AudioManager.instance.playSound(constant.AUDIO_SOUND.BEST_REWARD);
                    }

                    this._scriptBoxPanel.diamondNum += this._diamond;
                } else if (this._rewardType === constant.REWARD_TYPE.SKIN) {
                    AudioManager.instance.playSound(constant.AUDIO_SOUND.BEST_REWARD);

                    this.ndDiamond.active = false;
                    this.ndSkin.active = true;

                    let obj = this._scriptBoxPanel.objBestReward.obj;
                    let itemInfo = localConfig.instance.queryByID("shop", obj.ID);
                    let path = `texture/icon/hats/${itemInfo.iconName}`;
                    resourceUtil.setSpriteFrame(path, this.spSkin, () => { });

                    this._scriptBoxPanel.isOpenHatSkin = true;
                }
            });

            this._scriptBoxPanel.useKey();
        }
    }

    // update (deltaTime: number) {
    //     // [4]
    // }
}