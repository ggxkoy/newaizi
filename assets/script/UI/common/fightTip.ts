import { Label, tween, Vec3, UITransform, view, _decorator, Component, Node, Tween, screen } from 'cc';
import { poolManager } from './../../framework/poolManager';
import { constant } from './../../framework/constant';

let v3_zero = new Vec3();
let v3_scale = new Vec3(0.7, 0.7, 0.7);
let v3_scale_0 = new Vec3();
let v3_scale_1 = new Vec3(1, 1, 1);

const { ccclass, property } = _decorator;

@ccclass('FightTip')
export class FightTip extends Component {
    /* class member could be defined like this */
    // dummy = '';

    /* use `property` decorator if your want the member to be serializable */
    // @property
    // serializableDummy = 0;
    //@ts-ignore
    tweenTip: Tween = null;

    costTime: number = 1.5;

    start () {
        // Your initialization goes here.
    }

    public show (tipType: number, txt: string, callback?: Function) {
        this._closeTweenTip();
        this.node.eulerAngles = v3_zero;
        this.node.setScale(v3_scale);
        let arrChildren = this.node.children;
        arrChildren.forEach((item) => {
            item.active = false;
        })

        let lbHitNum;

        let ndSub: Node = null!;
        if (tipType === constant.FIGHT_TIP_INDEX.SCORE_ADD) {
            ndSub = this.node.getChildByName("add") as Node;
        } else if (tipType === constant.FIGHT_TIP_INDEX.SCORE_MINUS) {
            ndSub = this.node.getChildByName("minus") as Node;
        }

        ndSub.active = true;

        lbHitNum = ndSub.getChildByName('num')?.getComponent(Label);
        lbHitNum && (lbHitNum.string = txt);

        let pos = this.node.getPosition();
        //@ts-ignore
        let width: number = ndSub.getComponent(UITransform)?.width;
        //@ts-ignore
        let height: number = ndSub.getComponent(UITransform)?.height;
        if ((Math.abs(pos.x) + width / 2) > screen.windowSize.width / 2) {
            let w = screen.windowSize.width / 2 - width / 2;
            pos.x = pos.x > 0 ? w : -w;
        }

        if ((Math.abs(pos.y) + height / 2) > screen.windowSize.height / 2) {
            let h = screen.windowSize.height / 2 - height / 2;
            pos.y = pos.y > 0 ? h : -h;
        }
        this.node.setPosition(pos);

        this.tweenTip = tween(this.node)
            .to(this.costTime * 0.4, { scale: v3_scale_1 }, { easing: 'backOutIn' })
            .to(this.costTime * 0.2, { scale: v3_scale_0 })
            .call(() => {
                this._closeTweenTip();
                poolManager.instance.putNode(this.node);
                callback && callback();
            })
            .start();
    }

    private _closeTweenTip () {
        if (this.tweenTip) {
            this.tweenTip.stop();
            this.tweenTip = null;
        }
    }

    // update (deltaTime: number) {
    //     // Your update function goes here.
    // }
}
