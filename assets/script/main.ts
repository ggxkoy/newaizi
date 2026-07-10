import { GameLogic } from './framework/gameLogic';
import { constant } from './framework/constant';
import { AudioManager } from './framework/audioManager';
import { clientEvent } from './framework/clientEvent';
import { uiManager } from './framework/uiManager';
import { _decorator, Component, game, Game, PhysicsSystem, profiler, utils } from 'cc';
import { playerData } from './framework/playerData';
import { StorageManager } from './framework/storageManager';
import { localConfig } from './framework/localConfig';
import { util } from './framework/util';

const { ccclass, property } = _decorator;

@ccclass('Main')
export class Main extends Component {
    start () {
        let frameRate = StorageManager.instance.getGlobalData("frameRate");
        if (typeof frameRate !== "number") {
            frameRate = constant.GAME_FRAME;
            //@ts-ignore
            if (window.wx && util.checkIsLowPhone()) {
                frameRate = 30;
            }

            StorageManager.instance.setGlobalData("frameRate", frameRate);
        }

        console.log("###frameRate", frameRate);

        game.frameRate = frameRate;
        PhysicsSystem.instance.fixedTimeStep = 1 / frameRate;

        let isDebugOpen = StorageManager.instance.getGlobalData("debug") ?? false;
        isDebugOpen === true ? profiler.showStats() : profiler.hideStats();

        //@ts-ignore
        if (window.cocosAnalytics) {
            //@ts-ignore
            window.cocosAnalytics.init({
                appID: "651231029",              // 游戏ID
                version: '1.0.0',           // 游戏/应用版本号
                storeID: "cocosPlay",     // 分发渠道
                engine: "cocos",            // 游戏引擎
            });
        }

        uiManager.instance.showDialog("loading/loadingPanel");

        playerData.instance.loadGlobalCache();
        if (!playerData.instance.userId) {
            playerData.instance.generateRandomAccount();
            console.log("###生成随机userId", playerData.instance.userId);
        }

        playerData.instance.loadFromCache();

        if (!playerData.instance.playerInfo || !playerData.instance.playerInfo.createDate) {
            playerData.instance.createPlayerInfo();
        }

        //加载CSV相关配置
        localConfig.instance.loadConfig(() => {
            this._loadFinish();

            GameLogic.shareGame("奔跑吧巨人", "");
        })

        // if (GameLogic.isTest) {
        //     playerData.instance.playerInfo.level = 31;
        //     playerData.instance.savePlayerInfoToLocalCache();
        // }

        //引导
        //GuideManager.instance.start();

        //加载子包
        // SubPackageManager.instance.loadAllPackage();

        //记录离线时间
        game.on(Game.EVENT_HIDE, () => {
            if (!playerData.instance.settings) {
                playerData.instance.settings = {}
            }

            playerData.instance.settings.hideTime = Date.now();
            playerData.instance.saveAll();
            StorageManager.instance.save();
        })
    }

    private _loadFinish () {

        playerData.instance.refreshSkinStatus();

        // if (GameLogic.isTest) {
        // uiManager.instance.showDialog("box/boxPanel");
        // uiManager.instance.showDialog("shop/shopPanel");
        // uiManager.instance.showDialog("settlement/settlementSuccessPanel", [this]);
        // return;
        // }

        playerData.instance.isLoadFinished = true;
        clientEvent.dispatchEvent(constant.EVENT_TYPE.ON_INIT_GAME);
    }

    // update (deltaTime: number) {
    //     // Your update function goes here.
    // }
}
