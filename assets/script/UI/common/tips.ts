import { _decorator, Component, Node, Label, Vec3, tween, UIOpacityComponent, isValid, SpriteFrame, Sprite, UITransform, Color } from 'cc';
import { poolManager } from './../../framework/poolManager';
import { util } from './../../framework/util';
const { ccclass, property } = _decorator;

let color0 = new Color(214, 132, 53, 255);
let color1 = new Color(255, 255, 255, 255);
let v3_targetPos = new Vec3(0, 230, 0);

@ccclass('tips')
export class tips extends Component {

    @property(Label)
    public lbTips: Label = null!;

    @property(Sprite)
    public spIcon: Sprite = null!;

    @property(Sprite)
    public spBg: Sprite = null!;

    @property(UIOpacityComponent)
    public UIOpacityBg: UIOpacityComponent = null!;

    @property(SpriteFrame)
    public sfGold: SpriteFrame = null!;

    @property(SpriteFrame)
    public sfHeart: SpriteFrame = null!;

    start () {

    }

    public show (content: string, type: string, targetPos: Vec3, scale: number, callback: Function = () => { }) {
        this.node.setScale(scale, scale, scale);

        let size = this.lbTips?.node?.getComponent(UITransform)?.contentSize;
        if (!isValid(size)) {//size不存在，自我销毁
            poolManager.instance.putNode(this.node);
            return;
        }

        this.lbTips.string = content;
        this.lbTips.color = color0;

        if (type === 'gold' || type === 'heart') {
            this.spBg.enabled = false;
            this.UIOpacityBg.opacity = 50;

            if (type === 'gold') {
                this.spIcon.spriteFrame = this.sfGold;
            } else if (type === 'heart') {
                this.spIcon.spriteFrame = this.sfHeart;
            }

            this.lbTips.color = color1;
            this.lbTips.string = util.formatValue(Number(content));

            tween(this.node)
                .to(1.2, { scale: new Vec3(scale, scale, scale) }, { easing: 'smooth' })
                .start();

            tween(this.UIOpacityBg)
                .to(0.8, { opacity: 255 }, { easing: 'smooth' })
                .to(0.4, { opacity: 0 }, { easing: 'smooth' })
                .call(() => {
                    callback && callback();
                    poolManager.instance.putNode(this.node);
                })
                .start();
        } else {
            //纯文字提示
            this.spBg.enabled = true;
            this.UIOpacityBg.opacity = 255;
            this.node.setPosition(targetPos);

            this.spIcon.node.active = false;

            this.scheduleOnce(() => {
                tween(this.node)
                    .to(1.1, { position: v3_targetPos }, { easing: 'smooth' })
                    .call(() => {
                        callback && callback();
                        poolManager.instance.putNode(this.node);
                    })
                    .start();

                tween(this.UIOpacityBg)
                    .to(0.7, { opacity: 220 }, { easing: 'smooth' })
                    .to(0.4, { opacity: 0 }, { easing: 'smooth' })
                    .call(() => {

                    })
                    .start();
            }, 0.8);
        }
    }
}
