import { _decorator, Component, Node, Label, Sprite, UITransform, Size } from 'cc';
import { GameLogic } from './../../framework/gameLogic';
import { uiManager } from './../../framework/uiManager';
import { GameManager } from '../../fight/gameManager';
import { constant } from '../../framework/constant';
import { clientEvent } from '../../framework/clientEvent';
import { AudioManager } from '../../framework/audioManager';
const { ccclass, property } = _decorator;

@ccclass('SettlementFailPanel')
export class SettlementFailPanel extends Component {
    @property(Node)
    public ndHeart: Node = null!;

    @property(Label)
    public lbCountDown: Label = null!;

    @property(Sprite)
    public spIconRevive: Sprite = null!;

    @property(Sprite)
    public spIconBeatEnemy: Sprite = null!;

    @property(Node)
    public ndBtnRevive: Node = null!;

    @property(Node)
    public ndBtnBeatEnemy: Node = null!;

    @property(Node)
    public ndMask: Node = null!;

    public set countDown (value: number) {
        this._countDown = value;
        this.lbCountDown.string = String(Math.floor(this._countDown));

        this._curMaskHeight += this._maxMaskHeight / (this._countDown * 120);
        this._curMaskHeight = this._curMaskHeight >= this._maxMaskHeight ? this._maxMaskHeight : this._curMaskHeight;
        this.ndMask.getComponent(UITransform)?.setContentSize(new Size(300, this._curMaskHeight));

        if (value < 0) {
            uiManager.instance.hideDialog("settlement/settlementFailPanel");
            clientEvent.dispatchEvent(constant.EVENT_TYPE.ON_INIT_GAME);
        }

    }

    public get countDown () {
        return this._countDown;
    }

    private _scriptGameManager: GameManager = null!;
    private _countDown: number = 10;
    private _maxMaskHeight: number = 260;
    private _curMaskHeight: number = 0;

    start () {
        // [3]

    }

    public show (scriptGameManager: GameManager) {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.FAIL);

        this._scriptGameManager = scriptGameManager;
        this._countDown = 10;
        this._curMaskHeight = 0;

        if (GameManager.gameStatus === constant.GAME_STATUS.FIGHT) {
            this.ndBtnBeatEnemy.active = true;
            this.ndBtnRevive.active = false;
            GameLogic.updatePayIcon(constant.SHARE_ID.SETTLEMENT_FAIL_BEAT_ENEMY, this.spIconBeatEnemy);
        } else if (GameManager.gameStatus === constant.GAME_STATUS.RUN) {
            this.ndBtnBeatEnemy.active = false;
            this.ndBtnRevive.active = true;
            GameLogic.updatePayIcon(constant.SHARE_ID.SETTLEMENT_FAIL_REVIVE, this.spIconRevive);
        }
    }

    public onBtnSkipClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.CLICK);
        GameLogic.vibrateShort();

        uiManager.instance.hideDialog("settlement/settlementFailPanel");
        clientEvent.dispatchEvent(constant.EVENT_TYPE.ON_INIT_GAME);
        uiManager.instance.showDialog("parkour/parkourPanel");
    }

    public onBtnReviveClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.CLICK);
        GameLogic.vibrateShort();

        GameLogic.pay(constant.SHARE_ID.SETTLEMENT_FAIL_REVIVE, (err: any) => {
            if (!err) {
                uiManager.instance.hideDialog("settlement/settlementFailPanel");
                clientEvent.dispatchEvent(constant.EVENT_TYPE.ON_REVIVE);
            }
        })
    }

    public onBtnBeatEnemyClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.CLICK);
        GameLogic.vibrateShort();

        GameLogic.pay(constant.SHARE_ID.SETTLEMENT_FAIL_BEAT_ENEMY, (err: any) => {
            if (!err) {
                uiManager.instance.hideDialog("settlement/settlementFailPanel");
                clientEvent.dispatchEvent(constant.EVENT_TYPE.ON_REVIVE);
            }
        })
    }

    update (deltaTime: number) {
        // [4]

        if (this.countDown > 0 && !GameLogic.isWatchVideoAd) {
            this.countDown -= deltaTime;
        }
    }
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
