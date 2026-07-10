import { _decorator, Component, Node, find, isValid, Vec3, UITransform } from "cc";
import { resourceUtil } from "./resourceUtil";
import { poolManager } from "./poolManager";
import { constant } from "./constant";
import { tips } from "../UI/common/tips";
import { FightTip } from "../UI/common/fightTip";
const { ccclass, property } = _decorator;

const SHOW_STR_INTERVAL_TIME = 800;

@ccclass("uiManager")
export class uiManager {
    /* class member could be defined like this */
    // dummy = '';

    /* use `property` decorator if your want the member to be serializable */
    // @property
    // serializableDummy = 0;
    dictSharedPanel: any = {}
    dictLoading: any = {}
    arrPopupDialog: any = []
    showTipsTime: number = 0


    static _instance: uiManager;

    static get instance () {
        if (this._instance) {
            return this._instance;
        }

        this._instance = new uiManager();
        return this._instance;
    }

    /**
     * 检查当前界面是否正在展示
     * @param panelPath 
     */
    isDialogVisible (panelPath: string) {
        if (!this.dictSharedPanel.hasOwnProperty(panelPath)) {
            return false;
        }

        let panel = this.dictSharedPanel[panelPath];

        return isValid(panel) && panel.active && panel.parent;
    }


    /**
     * 显示单例界面
     * @param {String} panelPath 
     * @param {Array} args 
     * @param {Function} cb 回调函数，创建完毕后回调
     */
    showDialog (panelPath: string, args?: any, cb?: Function) {
        if (this.dictLoading[panelPath]) {
            return;
        }

        let idxSplit = panelPath.lastIndexOf('/');
        let scriptName = panelPath.slice(idxSplit + 1);


        if (!args) {
            args = [];
        }

        if (this.dictSharedPanel.hasOwnProperty(panelPath)) {
            let panel = this.dictSharedPanel[panelPath];
            if (isValid(panel)) {
                panel.parent = find("Canvas");
                panel.active = true;
                let script = panel.getComponent(scriptName);
                let script2 = panel.getComponent(scriptName.charAt(0).toUpperCase() + scriptName.slice(1));

                if (script && script.show) {
                    script.show.apply(script, args);
                    cb && cb(script);
                } else if (script2 && script2.show) {
                    script2.show.apply(script2, args);
                    cb && cb(script2);
                } else {
                    throw `查找不到脚本文件${scriptName}`;
                }

                return;
            }
        }

        this.dictLoading[panelPath] = true;
        resourceUtil.createUI(panelPath, (err: any, node: any) => {
            //判断是否有可能在显示前已经被关掉了？
            let isCloseBeforeShow = false;
            if (!this.dictLoading[panelPath]) {
                //已经被关掉
                isCloseBeforeShow = true;
            }

            this.dictLoading[panelPath] = false;
            if (err) {
                console.error(err);
                return;
            }

            this.dictSharedPanel[panelPath] = node;

            let script: any = node.getComponent(scriptName);
            let script2: any = node.getComponent(scriptName.charAt(0).toUpperCase() + scriptName.slice(1));
            if (script && script.show) {
                script.show.apply(script, args);
                cb && cb(script);
            } else if (script2 && script2.show) {
                script2.show.apply(script2, args);
                cb && cb(script2);
            } else {
                throw `查找不到脚本文件${scriptName}`;
            }

            if (isCloseBeforeShow) {
                //如果在显示前又被关闭，则直接触发关闭掉
                this.hideDialog(panelPath);
            }
        });
    }

    /**
     * 隐藏单例界面
     * @param {String} panelPath 
     * @param {fn} callback
     */
    hideDialog (panelPath: string, callback?: Function) {
        if (this.dictSharedPanel.hasOwnProperty(panelPath)) {
            let panel = this.dictSharedPanel[panelPath];
            if (panel && isValid(panel)) {
                let ani = panel.getComponent('animationUI');
                if (ani) {
                    ani.close(() => {
                        panel.parent = null;
                        if (callback && typeof callback === 'function') {
                            callback();
                        }
                    });
                } else {
                    panel.parent = null;
                    if (callback && typeof callback === 'function') {
                        callback();
                    }
                }
            } else if (callback && typeof callback === 'function') {
                callback();
            }
        }

        this.dictLoading[panelPath] = false;
    }

    /**
     * 将弹窗加入弹出窗队列
     * @param {string} panelPath 
     * @param {string} scriptName 
     * @param {*} param 
     */
    pushToPopupSeq (panelPath: string, scriptName: string, param: any) {
        let popupDialog = {
            panelPath: panelPath,
            scriptName: scriptName,
            param: param,
            isShow: false
        };

        this.arrPopupDialog.push(popupDialog);

        this.checkPopupSeq();
    }

    /**
     * 将弹窗加入弹出窗队列
     * @param {number} index 
     * @param {string} panelPath 
     * @param {string} scriptName 
     * @param {*} param 
     */
    insertToPopupSeq (index: number, panelPath: string, param: any) {
        let popupDialog = {
            panelPath: panelPath,
            param: param,
            isShow: false
        };

        this.arrPopupDialog.splice(index, 0, popupDialog);
        //this.checkPopupSeq();
    }

    /**
     * 将弹窗从弹出窗队列中移除
     * @param {string} panelPath 
     */
    shiftFromPopupSeq (panelPath: string) {
        this.hideDialog(panelPath, () => {
            if (this.arrPopupDialog[0] && this.arrPopupDialog[0].panelPath === panelPath) {
                this.arrPopupDialog.shift();
                this.checkPopupSeq();
            }
        })
    }

    /**
     * 检查当前是否需要弹窗
     */
    checkPopupSeq () {
        if (this.arrPopupDialog.length > 0) {
            let first = this.arrPopupDialog[0];

            if (!first.isShow) {
                this.showDialog(first.panelPath, first.param);
                this.arrPopupDialog[0].isShow = true;
            }
        }
    }

    /**
     * 显示提示
     * @param {String} content 
     * @param {Function} cb 
     */
    showTips (content: string | number, type: string = 'txt', targetPos: Vec3 = new Vec3(), scale: number = 1, callback: Function = () => { }) {
        let str = String(content);
        let next = () => {
            this._showTipsAni(str, type, targetPos, scale, callback);
        }

        var now = Date.now();
        if (now - this.showTipsTime < SHOW_STR_INTERVAL_TIME && type !== 'gold' && type !== 'heart') {
            var spareTime = SHOW_STR_INTERVAL_TIME - (now - this.showTipsTime);
            setTimeout(() => {
                next();
            }, spareTime);

            this.showTipsTime = now + spareTime;
        } else {
            next();
            this.showTipsTime = now;
        }
    }

    /**
     * 内部函数
     * @param {String} content 
     * @param {Function} cb 
     */
    _showTipsAni (content: string, type: string, targetPos: Vec3, scale: number, callback?: Function) {
        resourceUtil.getUIPrefabRes('common/tips', function (err: any, prefab: any) {
            if (err) {
                return;
            }

            let tipsNode = poolManager.instance.getNode(prefab, find("Canvas") as Node);

            // if (type === constant.TIP_TYPE.GOLD || type === constant.TIP_TYPE.HEART) {
            //     tipsNode.getComponent(UITransform).priority = constant.ZORDER.NORMAL;
            // } else if (type = constant.TIP_TYPE.TXT) {
            //     tipsNode.getComponent(UITransform).priority = constant.ZORDER.TIPS;
            // }

            let tipScript = tipsNode.getComponent(tips) as tips;
            tipScript.show(content, type, targetPos, scale, callback);
        });
    }

    showFightTips (type: number, txt: string, pos: Vec3, callback?: Function) {
        resourceUtil.getUIPrefabRes('common/fightTip', (err: any, prefab: any) => {
            if (err) {
                return;
            }

            let ndTip = <Node>poolManager.instance.getNode(prefab, <Node>find("Canvas"));
            ndTip.setPosition(pos);


            let UICom = ndTip.getComponent(UITransform) as UITransform;

            // if (type === constant.FIGHT_TIP_INDEX.SCORE_ADD) {
            //     UICom.priority = constant.ZORDER.TIPS;
            // } else if (type === constant.FIGHT_TIP_INDEX.SCORE_MINUS) {
            //     UICom.priority = constant.ZORDER.TIPS_1;
            // }

            let scriptTip = <FightTip>ndTip.getComponent(FightTip);
            scriptTip.show(type, txt, callback);
        });
    }
}
