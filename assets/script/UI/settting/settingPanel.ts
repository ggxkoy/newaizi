import { _decorator, Component, Node, SpriteFrame, Sprite, Vec3, profiler } from 'cc';
import { GameLogic } from './../../framework/gameLogic';
import { uiManager } from './../../framework/uiManager';
import { AudioManager } from './../../framework/audioManager';
import { constant } from '../../framework/constant';
import { StorageManager } from '../../framework/storageManager';
const { ccclass, property } = _decorator;

let v_0: Vec3 = new Vec3();

@ccclass('SettingPanel')
export class SettingPanel extends Component {
    @property(SpriteFrame)
    public sfSelect: SpriteFrame = null!;

    @property(SpriteFrame)
    public sfUnSelect: SpriteFrame = null!;

    @property(Node)
    public ndBtnVibration: Node = null!;

    @property(Node)
    public ndBtnMusic: Node = null!;

    @property(Node)
    public ndBtnDebug: Node = null!;

    private _isMusicOpen: boolean = false;
    private _isVibrationOpen: boolean = false;
    private _isDebugOpen: boolean = false;

    public show () {
        this._isMusicOpen = AudioManager.instance.getAudioSetting(true);
        this._changeState(this.ndBtnMusic, this._isMusicOpen);

        this._isVibrationOpen = StorageManager.instance.getGlobalData("vibration") ?? true;
        this._changeState(this.ndBtnVibration, this._isVibrationOpen);

        this._isDebugOpen = StorageManager.instance.getGlobalData("debug") ?? false;
        this._changeState(this.ndBtnDebug, this._isDebugOpen);
    }

    private _changeState (ndParget: Node, isOpen: boolean) {
        let spCom = ndParget.getComponent(Sprite) as Sprite;
        let ndDot = ndParget.getChildByName("dot") as Node;
        let ndDotPos = ndDot.position.clone();

        if (isOpen) {
            spCom.spriteFrame = this.sfSelect;
            v_0.set(24, ndDotPos.y, ndDotPos.z);
            ndDot.setPosition(v_0);
        } else {
            spCom.spriteFrame = this.sfUnSelect;
            v_0.set(-24, ndDotPos.y, ndDotPos.z);
            ndDot.setPosition(v_0);
        }
    }

    public onBtnVibrationClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.CLICK);
        GameLogic.vibrateShort();

        this._isVibrationOpen = !this._isVibrationOpen;
        this._changeState(this.ndBtnVibration, this._isVibrationOpen);
        StorageManager.instance.setGlobalData("vibration", this._isVibrationOpen);
    }

    public onBtnMusicClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.CLICK);
        GameLogic.vibrateShort();

        this._isMusicOpen = !this._isMusicOpen;
        this._changeState(this.ndBtnMusic, this._isMusicOpen);

        if (this._isMusicOpen) {
            AudioManager.instance.switchMusic(true);
            AudioManager.instance.switchSound(true);
        } else {
            AudioManager.instance.switchMusic(false);
            AudioManager.instance.switchSound(false);
        }
    }

    public onBtnDebugClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.CLICK);
        GameLogic.vibrateShort();

        this._isDebugOpen = !this._isDebugOpen;
        this._changeState(this.ndBtnDebug, this._isDebugOpen);
        StorageManager.instance.setGlobalData("debug", this._isDebugOpen);

        this._isDebugOpen === true ? profiler.showStats() : profiler.hideStats();
    }

    public onBtnCloseClick () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.CLICK);
        GameLogic.vibrateShort();

        uiManager.instance.hideDialog("setting/settingPanel");
    }

    // update (deltaTime: number) {
    //     // [4]
    // }
}
