import { _decorator, Component, Node, Prefab, Animation, ParticleSystemComponent, Vec3, find, isValid, AnimationState, AnimationClip, UITransform } from 'cc';
import { AudioManager } from './audioManager';
import { GameManager } from './../fight/gameManager';
import { poolManager } from './poolManager';
import { resourceUtil } from './resourceUtil';
import { FlyReward } from '../UI/common/flyReward';
import { constant } from './constant';

let v3_flyLightScale: Vec3 = new Vec3(2, 2, 2);//无敌状态播放的flyLight特效大小
let v3_fightBoomScale: Vec3 = new Vec3(2, 2, 2);//击飞播放flyBoom特效大小

const { ccclass, property } = _decorator;

@ccclass('EffectManager')
export class EffectManager extends Component {
    private _ndParent: Node = null!;
    public get ndParent () {
        if (!this._ndParent) {
            this._ndParent = find("effectManager") as Node;
        }

        return this._ndParent
    }

    static _instance: EffectManager;

    static get instance () {
        if (this._instance) {
            return this._instance;
        }

        this._instance = new EffectManager();
        return this._instance;
    }

    public playAni (path: string, aniName: string, worPos: Vec3 = new Vec3(), isLoop: boolean = false, isRecycle: boolean = false, scale: number = 1, callback: Function = () => { }) {
        let childName = path.split("/")[1];
        let ndEffect = this.ndParent.getChildByName(childName);

        let cb = () => {
            ndEffect?.setScale(scale, scale, scale);
            ndEffect?.setWorldPosition(worPos);
            let ani = ndEffect?.getComponent(Animation) as Animation;
            ani.play(aniName);
            let aniState = ani.getState(aniName) as AnimationState;
            if (aniState) {
                if (isLoop) {
                    aniState.wrapMode = AnimationClip.WrapMode.Loop;
                } else {
                    aniState.wrapMode = AnimationClip.WrapMode.Normal;
                }
            }

            ani.once(Animation.EventType.FINISHED, () => {
                callback && callback();
                if (isRecycle && ndEffect) {
                    poolManager.instance.putNode(ndEffect);
                }
            })
        }

        if (!ndEffect) {
            resourceUtil.loadModelRes(path).then((prefab: any) => {
                ndEffect = poolManager.instance.getNode(prefab as Prefab, this.ndParent) as Node;
                ndEffect.setScale(scale, scale, scale);
                ndEffect.setWorldPosition(worPos);
                cb();
            })
        } else {
            cb();
        }
    }

    public removeEffect (name: string, ndParent: Node = this.ndParent) {
        let ndEffect = ndParent.getChildByName(name);
        if (ndEffect) {
            let arrAni = ndEffect.getComponentsInChildren(Animation);
            arrAni.forEach((element: Animation) => {
                element.stop();
            })

            let arrParticle = ndEffect?.getComponentsInChildren(ParticleSystemComponent) as any;
            arrParticle.forEach((element: ParticleSystemComponent) => {
                element?.clear();
                element?.stop();
            })
            poolManager.instance.putNode(ndEffect);
        }
    }

    public playParticle (path: string, worPos: Vec3, recycleTime: number = 0, scale: number = 1, eulerAngles?: Vec3 | null, callback?: Function | null, isLoop: boolean = false) {
        resourceUtil.loadEffectRes(path).then((prefab: any) => {
            let ndEffect = poolManager.instance.getNode(prefab as Prefab, this.ndParent) as Node;
            ndEffect.setScale(new Vec3(scale, scale, scale));
            ndEffect.setWorldPosition(worPos);

            if (eulerAngles) {
                ndEffect.eulerAngles = eulerAngles;
            }

            let maxDuration: number = 0;

            let arrParticle = ndEffect.getComponentsInChildren(ParticleSystemComponent);
            arrParticle.forEach((item: ParticleSystemComponent) => {
                item.simulationSpeed = GameManager.gameSpeed;
                item?.clear();
                item?.stop();
                item?.play();
                item.loop = isLoop;

                let duration = item.duration;
                maxDuration = duration > maxDuration ? duration : maxDuration;
            })

            let seconds = recycleTime && recycleTime > 0 ? recycleTime : maxDuration;

            setTimeout(() => {
                if (ndEffect.parent) {
                    callback && callback();
                    poolManager.instance.putNode(ndEffect);
                }
            }, seconds * 1000 / GameManager.gameSpeed)
        })
    }

    /**
     * 播放节点下面的动画和粒子
     *
     * @param {Node} targetNode 特效挂载节点
     * @param {string} effectPath 特效路径
     * @param {boolean} [isPlayAni=true] 是否播放动画
     * @param {boolean} [isPlayParticle=true] 是否播放特效
     * @param {number} [recycleTime=0] 特效节点回收时间，如果为0，则使用默认duration
     * @param {number} [scale=1] 缩放倍数
     * @param {Vec3} [pos=new Vec3()] 位移
     * @param {Function} [callback=()=>{}] 回调函数
     * @returns
     * @memberof EffectManager
     */
    public playEffect (targetNode: Node, effectPath: string, isPlayAni: boolean = true, isPlayParticle: boolean = true, recycleTime: number = 0, scale: number = 1, pos: Vec3 = new Vec3(), eulerAngles?: Vec3, callback?: Function) {
        if (!targetNode.parent) {//父节点被回收的时候不播放
            return;
        }

        resourceUtil.loadEffectRes(effectPath).then((prefab: any) => {
            let ndEffect = poolManager.instance.getNode(prefab as Prefab, targetNode) as Node;
            ndEffect.setScale(scale, scale, scale);
            ndEffect.setPosition(pos);
            if (eulerAngles) {
                ndEffect.eulerAngles = eulerAngles;
            }
            let maxDuration: number = 0;

            if (isPlayAni) {
                let arrAni = ndEffect.getComponentsInChildren(Animation);

                arrAni.forEach((element: Animation, idx, arr) => {
                    element?.play();

                    let aniName = element?.defaultClip?.name;
                    if (aniName) {
                        let aniState = element.getState(aniName);
                        if (aniState) {
                            let duration = aniState.duration;
                            maxDuration = duration > maxDuration ? duration : maxDuration;

                            aniState.speed = GameManager.gameSpeed;
                        }
                    }
                })
            }

            if (isPlayParticle) {
                let arrParticle = ndEffect.getComponentsInChildren(ParticleSystemComponent);
                arrParticle.forEach((element: ParticleSystemComponent, idx, arr) => {
                    element.simulationSpeed = GameManager.gameSpeed;
                    element?.clear();
                    element?.stop();
                    element?.play()

                    let duration = element.duration;
                    maxDuration = duration > maxDuration ? duration : maxDuration;
                })
            }

            let seconds = recycleTime && recycleTime > 0 ? recycleTime : maxDuration;

            setTimeout(() => {
                if (ndEffect.parent) {
                    callback && callback();
                    poolManager.instance.putNode(ndEffect);
                }
            }, seconds * 1000 / GameManager.gameSpeed)
        })
    }

    /**
     * 显示飞入奖励
     */
    public showFlyReward (targetNum: number, callback: Function = () => { }) {
        resourceUtil.createUI('common/flyReward', (err: any, node: Node) => {
            if (err) {
                callback && callback();
                return;
            }
            // let UICom = node.getComponent(UITransform) as UITransform;
            // UICom.priority = constant.ZORDER.REWARD;
            let rewardScript = node.getComponent(FlyReward) as FlyReward;
            let scripGameManager = find("gameManager")?.getComponent(GameManager) as GameManager;
            rewardScript.createReward(targetNum, callback, scripGameManager);
        })
    }

    public playLevelUpStar (ndParent: Node) {
        resourceUtil.loadEffectRes('levelUpStar/levelUpStar').then((prefab: any) => {
            let ndEffect = poolManager.instance.getNode(prefab, ndParent);

            let arrParticle = ndEffect.getComponentsInChildren(ParticleSystemComponent);
            arrParticle.forEach((item: ParticleSystemComponent) => {
                item.simulationSpeed = GameManager.gameSpeed;
                item?.clear();
                item?.stop();
                item?.play()
            })

            setTimeout(() => {
                if (ndEffect.parent) {
                    poolManager.instance.putNode(ndEffect);
                }
            }, 500);
        })
    }

    /**
     * 左钩拳右勾拳特效
     * @param ndParent 
     * @param ndAttack 
     * @param offsetPos
     */
    public playHitEffect (ndParent: Node, ndAttack: Node, offsetPos: Vec3 = new Vec3()) {
        resourceUtil.loadEffectRes("hit/hit").then((prefab: any) => {
            let ndEffect = poolManager.instance.getNode(prefab as Prefab, this.ndParent) as Node;
            let parentWorPos = ndParent.worldPosition.clone();
            let attackWorPos = ndAttack.worldPosition.clone();
            let effectWorPos = new Vec3(parentWorPos.x + offsetPos.x, (parentWorPos.y + attackWorPos.y) * 0.5 + offsetPos.y, (parentWorPos.z + attackWorPos.z) * 0.5 + offsetPos.z);

            ndEffect.setWorldPosition(effectWorPos);
            ndEffect.lookAt(GameManager.scriptGameCamera.node.worldPosition.clone());

            let arrParticle = ndEffect.getComponentsInChildren(ParticleSystemComponent);
            arrParticle.forEach((item: ParticleSystemComponent) => {
                item.simulationSpeed = 1;
                item?.clear();
                item?.stop();
                item?.play()
            })

            AudioManager.instance.playSound(constant.AUDIO_SOUND.ATTACK[Math.floor(Math.random() * constant.AUDIO_SOUND.ATTACK.length)]);

            setTimeout(() => {
                ndEffect.destroy();
            }, 1500)
        })
    }

    /**
     * 腿部踢到箱子、boss、敌人、玩家
     * @param ndParent 
     * @param ndAttack 
     * @param offsetPos
     */
    public playFightBoomEffect (ndParent: Node, ndAttack: Node, offsetPos: Vec3 = new Vec3()) {
        resourceUtil.loadEffectRes("fightBoom/fightBoom").then((prefab: any) => {
            let ndEffect = poolManager.instance.getNode(prefab as Prefab, this.ndParent) as Node;
            let parentWorPos = ndParent.worldPosition.clone();
            let attackWorPos = ndAttack.worldPosition.clone();
            let effectWorPos = new Vec3(parentWorPos.x + offsetPos.x, (parentWorPos.y + parentWorPos.y) * 0.5 + offsetPos.y, (parentWorPos.z + attackWorPos.z) * 0.5 + offsetPos.z);

            ndEffect.setWorldPosition(effectWorPos);
            ndEffect.lookAt(GameManager.scriptGameCamera.node.worldPosition.clone());
            ndEffect.setScale(v3_fightBoomScale);

            let arrParticle = ndEffect.getComponentsInChildren(ParticleSystemComponent);
            arrParticle.forEach((item: ParticleSystemComponent) => {
                item.simulationSpeed = 1;
                item?.clear();
                item?.stop();
                item?.play()
            })

            setTimeout(() => {
                ndEffect.destroy();
            }, 1500)
        })
    }

    public playFlyLightEffect (ndParent: Node, pos: Vec3 = new Vec3()) {
        resourceUtil.loadEffectRes("flyLight/flyLight").then((prefab: any) => {
            let ndEffect = poolManager.instance.getNode(prefab as Prefab, ndParent) as Node;
            ndEffect.setPosition(pos);
            ndEffect.setScale(v3_flyLightScale);

            ndEffect.lookAt(GameManager.scriptGameCamera.node.worldPosition.clone());

            let arrParticle = ndEffect.getComponentsInChildren(ParticleSystemComponent);
            arrParticle.forEach((item: ParticleSystemComponent) => {
                item.simulationSpeed = 4;
                item?.clear();
                item?.stop();
                item?.play()
                item.loop = true;
            })
        })
    }
}
