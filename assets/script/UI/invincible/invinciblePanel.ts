import { Player } from './../../fight/player';
import { GameManager } from './../../fight/gameManager';
import { uiManager } from './../../framework/uiManager';
import { GameLogic } from './../../framework/gameLogic';

import { _decorator, Component, Node, Sprite } from 'cc';
import { constant } from '../../framework/constant';
import { clientEvent } from '../../framework/clientEvent';
import { AudioManager } from '../../framework/audioManager';
const { ccclass, property } = _decorator;

@ccclass('InvinciblePanel')
export class InvinciblePanel extends Component {
    @property(Sprite)
    public spPayIcon: Sprite = null!;

    public show () {
        GameLogic.updatePayIcon(constant.SHARE_ID.INVINCIBLE, this.spPayIcon);

        //动态展示内容
    }

    public onBtnInvincibleClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.CLICK);
        GameLogic.vibrateShort();

        if (GameManager.scriptPlayer.energy === constant.INVINCIBLE_ENERGY) {
            return;
        }

        GameLogic.pay(constant.SHARE_ID.INVINCIBLE, (err: any) => {
            if (!err) {
                //直接给25能量，每秒减去能量1，最少持续5秒
                GameManager.scriptPlayer.energy = constant.INVINCIBLE_ENERGY;
                GameManager.scriptPlayer.updateVolume(50);
                this._close();
            }
        })
    }

    public onBtnCloseClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.CLICK);
        GameLogic.vibrateShort();

        this._close();
    }

    private _close () {
        uiManager.instance.hideDialog('invincible/invinciblePanel');
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
