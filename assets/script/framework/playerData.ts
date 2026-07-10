import { _decorator, Component } from "cc";
import { constant } from "./constant";
import { localConfig } from "./localConfig";
import { StorageManager } from "./storageManager";

const { ccclass, property } = _decorator;

@ccclass("playerData")
export class playerData extends Component {
    /* class member could be defined like this */
    // dummy = '';

    static _instance: playerData;

    static get instance () {
        if (this._instance) {
            return this._instance;
        }

        this._instance = new playerData();
        return this._instance;
    }

    serverTime: number = 0;
    localTime: number = 0;
    showCar: number = 0;
    isComeFromBalance: boolean = false;
    userId: string = '';
    playerInfo: any = null;
    history: any = null;
    settings: any = null;
    isNewBee: boolean = false;    //默认非新手
    dataVersion: string = '';
    isLoadFinished: boolean = false;
    
    public isUnlockAllSkin: boolean = false;

    public loadGlobalCache() {
        let userId = StorageManager.instance.getUserId();
        if (userId) {
            this.userId = userId;
        }
    }

    public loadFromCache() {
        //读取玩家基础数据
        this.playerInfo = this.loadDataByKey(constant.LOCAL_CACHE.PLAYER);
        this.history = this.loadDataByKey(constant.LOCAL_CACHE.HISTORY);
        this.settings = this.loadDataByKey(constant.LOCAL_CACHE.SETTINGS);
    }

    public loadDataByKey (keyName: any) {
        let ret = {};
        let str = StorageManager.instance.getConfigData(keyName);
        if (str) {
            try {
                ret = JSON.parse(str);
            } catch (e) {
                ret = {};
            }
        } 
        
        return ret;
    }

    public createPlayerInfo(loginData?:any) {
        this.playerInfo = {
            diamond: 0, //钻石总数
            key: 0, //钥匙数量
            level: 1,  //当前关卡
            createDate: new Date(), //记录创建时间
            hat: [],//帽子状态信息
            shoes: [],//鞋子状态信息
            handPowerLevel: 1,//手臂力量等级
            kickPowerLevel: 1,//腿部力量等级
        };
        
        this.isNewBee = true; //区分新老玩家

        if (loginData) {
            for (let key in loginData) {
                this.playerInfo[key] = loginData[key];
            }
        }

        this.savePlayerInfoToLocalCache();
    }

    /**
     * 生成随机账户
     * @returns
     */
     public generateRandomAccount () {
        this.userId = `${Date.now()}${0 | (Math.random() * 1000, 10)}`;
        StorageManager.instance.setUserId(this.userId);
    }


    public saveAccount(userId: any) {
        this.userId = userId;
        StorageManager.instance.setUserId(userId);
    }

    /**
     * 保存玩家数据
     */
     public savePlayerInfoToLocalCache() {
        StorageManager.instance.setConfigData(constant.LOCAL_CACHE.PLAYER, JSON.stringify(this.playerInfo));
    }
    
    /**
     * 保存玩家设置相关信息
     */
    public saveSettingsToLocalCache () {
        StorageManager.instance.setConfigData(constant.LOCAL_CACHE.SETTINGS, JSON.stringify(this.settings));
    }

    /**
     * 当数据同步完毕，即被覆盖的情况下，需要将数据写入到本地缓存，以免数据丢失
     */
     public saveAll() {
        StorageManager.instance.setConfigDataWithoutSave(constant.LOCAL_CACHE.PLAYER, JSON.stringify(this.playerInfo));
        StorageManager.instance.setConfigDataWithoutSave(constant.LOCAL_CACHE.HISTORY, JSON.stringify(this.history));
        StorageManager.instance.setConfigDataWithoutSave(constant.LOCAL_CACHE.SETTINGS, JSON.stringify(this.settings));
        StorageManager.instance.setConfigData(constant.LOCAL_CACHE.DATA_VERSION, this.dataVersion);
    }

    /**
     * 更新用户信息
     * 例如钻石、金币、道具
     * @param {String} key
     * @param {Number} value
     */
    public updatePlayerInfo(key:string, value: any) {
        let isChanged = false;
        if (this.playerInfo.hasOwnProperty(key)) {
            if (typeof value === 'number') {
                isChanged = true;
                this.playerInfo[key] += value;
                if (this.playerInfo[key] < 0) {
                    this.playerInfo[key] = 0;
                }
                //return;
            } else if (typeof value === 'boolean' || typeof value === 'string') {
                isChanged = true;
                this.playerInfo[key] = value;
            }
        }
        if (isChanged) {
            //有修改就保存到localcache
            StorageManager.instance.setConfigData(constant.LOCAL_CACHE.PLAYER, JSON.stringify(this.playerInfo));
        }
    }

    public updateHatStatus (obj: any) {
        this.playerInfo.hat.forEach((item: any) => {
            if (item.ID === obj.ID) {
                item.status = obj.status;
                this.savePlayerInfoToLocalCache();
            } else {
                if (obj.status === constant.SHOP_ITEM_STATUS.EQUIPMENT && item.status === constant.SHOP_ITEM_STATUS.EQUIPMENT) {
                    item.status = constant.SHOP_ITEM_STATUS.OWNED;
                    this.savePlayerInfoToLocalCache();
                }
            }
        });
    }

    public getHatStatus (ID: number) {
        let arrStatus = this.playerInfo.hat.filter((item: any)=>{
            return item.ID === ID;
        })

        let obj: any;
        if (arrStatus[0]) {
            obj = {ID: ID, status: arrStatus[0].status};
        } else {
            obj = {ID: ID, status: constant.SHOP_ITEM_STATUS.LOCK};
            this.playerInfo.hat.push(obj);
        }
        
        return obj;
    }

    public updateShoesStatus (obj: any) {
        this.playerInfo.shoes.forEach((item: any) => {
            if (item.ID === obj.ID) {
                item.status = obj.status;
                item.watchTimes = obj.watchTimes;
                this.savePlayerInfoToLocalCache();
            }
        });
    }

    public getShoesStatus (ID: number) {
        let arrStatus = this.playerInfo.shoes.filter((item: any)=>{
            return item.ID === ID;
        })

        let obj: any;
        if (arrStatus[0]) {
            obj = {ID: ID, status: arrStatus[0].status, watchTimes: arrStatus[0].watchTimes};
        } else {
            obj = {ID: ID, status: constant.SHOP_ITEM_STATUS.LOCK, watchTimes: 0};
            this.playerInfo.shoes.push(obj);
        }
        
        return obj;
    }
    
    /**
     * 获取玩家杂项值
     * @param {string} key 
     */
    public getSetting (key: string) {
        if (!this.settings) {
            return null;
        }

        if (!this.settings.hasOwnProperty(key)) {
            return null;
        }

        return this.settings[key];
    }

    /**
     * 设置玩家杂项值
     * @param {string} key 
     * @param {*} value 
     */
    public setSetting (key: string, value: any) {
        if (!this.settings) {
            this.settings = {};
        }

        this.settings[key] = value;

        this.saveSettingsToLocalCache();
    }

    /**
     * 宝箱中开启随机帽子皮肤，如果全部解锁则返回500钻石
     */
    public getBestRewardBox () {
        let objReward: any = {type: constant.REWARD_TYPE.DIAMOND, num: 500, obj: {}};
        let arrHatLock = this.playerInfo.hat.filter((item: any)=>{
            let itemInfo = localConfig.instance.queryByID("shop", item.ID);
            return item.status === constant.SHOP_ITEM_STATUS.LOCK && (itemInfo.chanel === constant.SKIN_HAT_CHANEL.BOX || itemInfo.chanel === constant.SKIN_HAT_CHANEL.BOX_SETTLEMENT);
        })

        if (arrHatLock.length) {
            let randomItemStatus = arrHatLock[Math.floor(Math.random() * arrHatLock.length)];

            if (Object.keys(randomItemStatus).length === 0) {
                return objReward;
            }

            objReward.type = constant.REWARD_TYPE.SKIN;
            objReward.obj = randomItemStatus;
        } 

        return objReward;
    }

    /*
    * 游戏进入后则更新皮肤状态 
    */
    public refreshSkinStatus () {
        let arrShop = localConfig.instance.getTableArr('shop');
        arrShop.forEach((item: any) => {
            if (item.type == constant.SKIN_TYPE.HAT) {
                this.getHatStatus(item.ID);
            } else if (item.type === constant.SKIN_TYPE.SHOES) {
                this.getShoesStatus(item.ID);
            } 
        });
    
        //如果没有关卡皮肤进度数据则生成一个
        let objProgress = this.getSetting(constant.SETTINGS_KEY.LEVEL_HAT_PROGRESS);
        if (!objProgress) {
            this.refreshHatProgress();
        }
    }

    /**
     * 更新关卡皮肤解锁进度
     *
     * @returns
     * @memberof playerData
     */
    public  refreshHatProgress () {
        let objProgress = this.getSetting(constant.SETTINGS_KEY.LEVEL_HAT_PROGRESS);
        let arrUnlockByLevel: any;

        let next: Function = ()=>{
            //生成一个
            arrUnlockByLevel = this.getArrHatUnlockByLevel();

            if (arrUnlockByLevel.length) {
                objProgress = {ID: arrUnlockByLevel[0].ID, progress: 0};
                this.setSetting(constant.SETTINGS_KEY.LEVEL_HAT_PROGRESS, objProgress);
            }
        }

        //第一次则生成一个
        if (!objProgress) {
            next();
            return;
        }

        if (objProgress.progress >= 100) {
            next();
        } else {
            this.setSetting(constant.SETTINGS_KEY.LEVEL_HAT_PROGRESS, {ID: objProgress.ID, progress: objProgress.progress});
        }
    }
    
    /**
     * 获取未解锁的且解锁途径为关卡的帽子,如果数组长度为0，则关卡解锁不用再判断了
     * @returns 
     */
    public getArrHatUnlockByLevel () {
        let arrUnlockByLevel = this.playerInfo.hat.filter((item: any)=>{
            let itemInfo = localConfig.instance.queryByID("shop", item.ID);
            return item.status === constant.SHOP_ITEM_STATUS.LOCK && itemInfo.chanel === constant.SKIN_HAT_CHANEL.LEVEL;
        })

        return arrUnlockByLevel;
    }

    /**
     * 由关卡解锁的皮肤是否都解锁完毕
     * @returns 
     */
    public isLevelHatUnlockOver () {
        let arrUnlockByLevel = this.getArrHatUnlockByLevel();
        let curLevelHatProgress =  this.getSetting(constant.SETTINGS_KEY.LEVEL_HAT_PROGRESS);
        
        return arrUnlockByLevel.length <= 0 && curLevelHatProgress.progress >= 100;
    }

    /**
     * 由宝箱或者结算宝箱打开的皮肤集合
     */
    public  getArrHatUnlockByBox() {
        let arrUnlockByBox = this.playerInfo.hat.filter((item: any) =>{
            let itemInfo = localConfig.instance.queryByID("shop", item.ID);
            return item.status === constant.SHOP_ITEM_STATUS.LOCK && (itemInfo.chanel === constant.SKIN_HAT_CHANEL.BOX || itemInfo.chanel === constant.SKIN_HAT_CHANEL.BOX_SETTLEMENT)
        })

        return arrUnlockByBox;
    }

    //由宝箱开启的皮肤是否都已经拥有
    public isBoxHatUnlockOver () {
        let arrUnlockByBox =  this.getArrHatUnlockByBox(); 
        return arrUnlockByBox.length <= 0;
    }

    public getFightTimes () {
        let fightTimes = this.getSetting(constant.SETTINGS_KEY.FIGHT_TIMES);

        if (!fightTimes) {
            fightTimes = 0;
            this.setSetting(constant.SETTINGS_KEY.FIGHT_TIMES, 0);
        } 

        return fightTimes;
    }

    public addFightTimes (times: number = 1) {
        let fightTimes = this.getFightTimes();

        fightTimes += 1;
        this.setSetting(constant.SETTINGS_KEY.FIGHT_TIMES, fightTimes);
    }

    public updateHandPowerLevel (level: number) {
        if (level > this.playerInfo.handPowerLevel) {
            this.playerInfo.handPowerLevel = level;
            this.savePlayerInfoToLocalCache();
        }
    }

    public updateKickPowerLevel (level: number) {
        if (level > this.playerInfo.kickPowerLevel) {
            this.playerInfo.kickPowerLevel = level;
            this.savePlayerInfoToLocalCache();
        }
    }

    public clear () {
        this.playerInfo = {};
        this.settings = {};
        this.saveAll();
    }
}
