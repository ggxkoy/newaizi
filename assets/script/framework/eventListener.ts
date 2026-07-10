// Learn cc.Class:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] http://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] http://www.cocos2d-x.org/docs/creator/en/scripting/life-cycle-callbacks.html

import { _decorator } from "cc";
const { ccclass, property } = _decorator;

@ccclass("oneToOneListener")
class oneToOneListener {
    supportEvent: {}

    constructor(){
        this.supportEvent = null;
    }

    on (eventName, handler, target) {
        this[eventName] = { handler: handler, target: target };
    }

    off (eventName, handler) {
        var oldObj = this[eventName];
        if (oldObj && oldObj.handler && oldObj.handler === handler) {
            this[eventName] = null;
        }
    }

    dispatchEvent (eventName/**/) {
        if (this.supportEvent !== null && !this.supportEvent.hasOwnProperty(eventName)) {
            cc.error("please add the event into clientEvent.js");
            return;
        }

        var objHandler = this[eventName];
        var args = [];
        for (var i = 1; i < arguments.length; i++) {
            args.push(arguments[i]);
        }

        if (objHandler.handler) {
            objHandler.handler.apply(objHandler.target, args);
        } else {
            cc.log("not register " + eventName + "    callback func");
        }
    }

    setSupportEventList (arrSupportEvent) {
        if (!(arrSupportEvent instanceof Array)) {
            cc.error("supportEvent was not array");
            return false;
        }

        this.supportEvent = {};
        for (var i in arrSupportEvent) {
            var eventName = arrSupportEvent[i];
            this.supportEvent[eventName] = i;
        }

        return true;
    }
};

// @ccclass("oneToMultiListener")
// class oneToMultiListener {
//     handlers: {};
//     supportEvent: {};

//     constructor(){
        
//     }

//     on (eventName, handler, target) {
//         var objHandler = {handler: handler, target: target};
//         var handlerList = this.handlers[eventName];
//         if (!handlerList) {
//             handlerList = [];
//             this.handlers[eventName] = handlerList;
//         }

//         for (var i = 0; i < handlerList.length; i++) {
//             if (!handlerList[i]) {
//                 handlerList[i] = objHandler;
//                 return i;
//             }
//         }

//         handlerList.push(objHandler);

//         return handlerList.length;
//     };

//     off (eventName, handler, target) {
//         var handlerList = this.handlers[eventName];

//         if (!handlerList) {
//             return;
//         }

//         for (var i = 0; i < handlerList.length; i++) {
//             var oldObj = handlerList[i];
//             if (oldObj.handler === handler && (!target || target === oldObj.target)) {
//                 handlerList.splice(i, 1);
//                 break;
//             }
//         }
//     };

//     dispatchEvent (eventName/**/) {
//         if (this.supportEvent !== null && !this.supportEvent.hasOwnProperty(eventName)) {
//             cc.error("please add the event into clientEvent.js");
//             return;
//         }

//         var handlerList = this.handlers[eventName];

//         var args = [];
//         var i;
//         for (i = 1; i < arguments.length; i++) {
//             args.push(arguments[i]);
//         }

//         if (!handlerList) {
//             return;
//         }

//         for (i = 0; i < handlerList.length; i++) {
//             var objHandler = handlerList[i];
//             if (objHandler.handler) {
//                 objHandler.handler.apply(objHandler.target, args);
//             }
//         }
//     };

//     setSupportEventList (arrSupportEvent) {
//         if (!(arrSupportEvent instanceof Array)) {
//             cc.error("supportEvent was not array");
//             return false;
//         }

//         this.supportEvent = {};
//         for (var i in arrSupportEvent) {
//             var eventName = arrSupportEvent[i];
//             this.supportEvent[eventName] = i;
//         }

//         return true;
//     };
// };


@ccclass("eventListener")
export class eventListener {
    /* class member could be defined like this */
    // dummy = '';

    /* use `property` decorator if your want the member to be serializable */
    // @property
    // serializableDummy = 0;

    public static getBaseClass (type:string) {
        // if (type === "multi") {
        //     return oneToMultiListener;
        // } else {
        //     return oneToOneListener;
        // }

        return oneToOneListener;
    }

    // update (deltaTime: number) {
    //     // Your update function goes here.
    // }
}
