import { _decorator, Component, Node, sys, log, native } from "cc";
import { util } from './util';

const { ccclass, property } = _decorator;

@ccclass("StorageManager")
export class StorageManager {
    /* class member could be defined like this */
    // dummy = '';

    /* use `property` decorator if your want the member to be serializable */
    // @property
    // serializableDummy = 0;

    static _instance: StorageManager;

    static get instance () {
        if (this._instance) {
            return this._instance;
        }

        this._instance = new StorageManager();
        this._instance.start();
        return this._instance;
    }

    jsonData: any = null;
    path: any = null;
    KEY_CONFIG: string = 'gangConfig';
    markSave: boolean = false;
    saveTimer: number = -1;

    start () {
        this.jsonData = {
            "userId": "",
        };

        this.path = this.getConfigPath();

        var content;
        if (sys.isNative) {
            var valueObject = native.fileUtils.getValueMapFromFile(this.path);
            content = valueObject[this.KEY_CONFIG];
        } else {
            content = sys.localStorage.getItem(this.KEY_CONFIG);
        }

        // // 解密代码
        // if (cc.game.config["encript"]) {
        //     var newContent = new Xxtea("upgradeHeroAbility").xxteaDecrypt(content);
        //     if (newContent && newContent.length > 0) {
        //         content = newContent;
        //     }
        // }

        if (content && content.length) {
            if (content.startsWith('@')) {
                content = content.substring(1);
                content = util.decrypt(content);
            }

            try {
                //初始化操作
                var jsonData = JSON.parse(content);
                this.jsonData = jsonData;
            } catch (excepaiton) {

            }

        }

        //启动无限定时器，每1秒保存一次数据，而不是无限保存数据
        // this.saveTimer = setInterval(() =>{
        //     this.scheduleSave();
        // }, 500);

        //每隔5秒保存一次数据，主要是为了保存最新在线时间，方便离线奖励时间判定
        this.saveTimer = setInterval(() => {
            this.scheduleSave();
        }, 5000);
    }

    setConfigDataWithoutSave (key: string, value: any) {
        var account = this.jsonData.userId;
        if (this.jsonData[account]) {
            this.jsonData[account][key] = value;
        } else {
            console.error("no account can not save");
        }
    }

    setConfigData (key: string, value: any) {
        this.setConfigDataWithoutSave(key, value);
        this.markSave = true; //标记为需要存储，避免一直在写入，而是每隔一段时间进行写入
    }

    getConfigData (key: string) {
        var account = this.jsonData.userId;
        if (this.jsonData[account]) {
            var value = this.jsonData[account][key];
            return value ? value : "";
        } else {
            log("no account can not load");
            return "";
        }
    }

    setGlobalData (key: string, value: any) {
        this.jsonData[key] = value;
        this.save();
    }

    getGlobalData (key: string) {
        return this.jsonData[key];
    }

    setUserId (userId: string) {
        this.jsonData.userId = userId;
        if (!this.jsonData[userId]) {
            this.jsonData[userId] = {};
        }

        this.save();
    }

    getUserId () {
        return this.jsonData.userId;
    }

    scheduleSave () {
        if (!this.markSave) {
            return;
        }

        this.save();
    }

    /**
     * 标记为已修改
     */
    markModified () {
        this.markSave = true;
    }

    save () {
        // 写入文件
        var str = JSON.stringify(this.jsonData);

        // // 加密代码
        // if (cc.game.config["encript"]) {
        //     str = new Xxtea("upgradeHeroAbility").xxteaEncrypt(str);
        // }

        let zipStr = '@' + util.encrypt(str);
        // let zipStr = str;

        this.markSave = false;

        if (!sys.isNative) {
            var ls = sys.localStorage;
            ls.setItem(this.KEY_CONFIG, zipStr);
            return;
        }

        var valueObj: any = {};
        valueObj[this.KEY_CONFIG] = zipStr;
        native.fileUtils.writeToFile(valueObj); //, this.path

    }

    getConfigPath () {

        var platform = sys.platform;

        var path = "";

        if (sys.os === sys.OS.WINDOWS) {
            path = "src/conf";
        } else if (sys.os === sys.OS.LINUX) {
            path = "./conf";
        } else {
            if (sys.isNative) {
                path = native.fileUtils.getWritablePath();
                path = path + "conf";
            } else {
                path = "src/conf";
            }
        }

        return path;
    }
}
