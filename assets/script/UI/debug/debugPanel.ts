import { _decorator, Component, Node, Prefab, game, PhysicsSystem, profiler, Sprite, Color } from 'cc';
import { constant } from './../../framework/constant';
import { DebugLevelItem } from './debugLevelItem';
import { poolManager } from './../../framework/poolManager';
import { playerData } from './../../framework/playerData';
import { uiManager } from './../../framework/uiManager';
import { localConfig } from './../../framework/localConfig';
import { StorageManager } from '../../framework/storageManager';
const { ccclass, property } = _decorator;

@ccclass('DebugPanel')
export class DebugPanel extends Component {
    @property(Node)
    public ndContent: Node = null!;

    @property(Prefab)
    public pbLevelItem: Prefab = null!;

    public show () {
        this._initLevelView();
    }

    private _initLevelView () {
        let mapInfo = localConfig.instance.getTableArr("map");

        this.ndContent.children.forEach((item: Node) => {
            item.active = false;
        })

        mapInfo.forEach((itemInfo: any, idx: number, arr: any) => {
            let ndChild: Node = null!;

            if (idx < this.ndContent.children.length) {
                ndChild = this.ndContent.children[idx];
            } else {
                ndChild = poolManager.instance.getNode(this.pbLevelItem, this.ndContent);
            }

            ndChild.active = true;
            let scriptDebugLevelItem = ndChild.getComponent(DebugLevelItem) as DebugLevelItem;
            scriptDebugLevelItem.lbLevelTxt.string = String(idx + 1);

            let spCom = ndChild.getComponent(Sprite) as Sprite;

            if (itemInfo.type === constant.GAME_TYPE.NORMAL) {
                spCom.color = new Color().fromHEX("#E7A8E7");
            } else if (itemInfo.type === constant.GAME_TYPE.REWARD) {
                spCom.color = new Color().fromHEX("#EBE08A");
            } else if (itemInfo.type === constant.GAME_TYPE.BOSS) {
                spCom.color = new Color().fromHEX("#B1A5B1");
            }
        });
    }

    public onBtnCloseClick () {
        uiManager.instance.hideDialog("debug/debugPanel");
    }

    public onBtnClearStorageClick () {
        playerData.instance.playerInfo = null;
        playerData.instance.history = null;
        playerData.instance.settings = null;
        playerData.instance.saveAll();

        StorageManager.instance.jsonData = {};
        StorageManager.instance.save();
        uiManager.instance.showTips("游戏缓存已清除，请完全关闭游戏并重新打开！");
    }

    public onToggleFrame30Click () {
        uiManager.instance.showTips("游戏已经切换为30帧");
        StorageManager.instance.setGlobalData("frameRate", 30);
        game.frameRate = 30;
        PhysicsSystem.instance.fixedTimeStep = 1 / 30;

        this._showState();
    }

    public onToggleFrame60Click () {
        uiManager.instance.showTips("游戏已经切换为60帧");
        StorageManager.instance.setGlobalData("frameRate", 60);
        game.frameRate = 60;
        PhysicsSystem.instance.fixedTimeStep = 1 / 60;

        this._showState();
    }

    private _showState () {
        let isDebugOpen = StorageManager.instance.getGlobalData("debug") ?? false;
        isDebugOpen === true ? profiler.showStats() : profiler.hideStats();
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
