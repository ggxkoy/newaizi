import { constant } from './../../framework/constant';
import { uiManager } from './../../framework/uiManager';
import { _decorator, Component, Node, Tween, tween, UIOpacityComponent, UIComponent, easing } from 'cc';
import { clientEvent } from '../../framework/clientEvent';
const { ccclass, property } = _decorator;

@ccclass('LoadingPanel')
export class LoadingPanel extends Component {
    // [1]
    // dummy = '';

    // [2]
    // @property
    // serializableDummy = 0;

    @property(UIOpacityComponent)
    public opacityCom: UIOpacityComponent = null!;

    onEnable () {
        clientEvent.on(constant.EVENT_TYPE.SHOW_LOADING_PANEL, this._showLoadingPanel, this);
        clientEvent.on(constant.EVENT_TYPE.HIDE_LOADING_PANEL, this._hideLoadingPanel, this);
    }

    onDisable () {
        clientEvent.off(constant.EVENT_TYPE.SHOW_LOADING_PANEL, this._showLoadingPanel, this);
        clientEvent.off(constant.EVENT_TYPE.HIDE_LOADING_PANEL, this._hideLoadingPanel, this);
    }

    start () {
        // [3]
    }

    public show () {
        this._showLoadingPanel();
    }

    private _hideLoadingPanel () {
        tween(this.opacityCom)
        .to(2, {opacity: 200}, {easing: 'smooth'})
        .to(1, {opacity: 50}, {easing: 'smooth'})
        .call(()=>{
            uiManager.instance.hideDialog("loading/loadingPanel");
            uiManager.instance.showDialog("parkour/parkourPanel", [this]);
        })
        .start();
    }

    private _showLoadingPanel () {
        this.opacityCom.opacity = 255;
    }

    // update (deltaTime: number) {
    //     // [4]
    // }
}