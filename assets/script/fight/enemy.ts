import { AudioManager } from './../framework/audioManager';
import { EffectManager } from './../framework/effectManager';
import { ManModel } from './manModel';
import { _decorator, Component, RigidBodyComponent, BoxColliderComponent, Vec3, tween } from 'cc';
import { constant } from '../framework/constant';
import { GameManager } from './gameManager';
import { FightMap } from './fightMap';
import { util } from '../framework/util';
const { ccclass, property } = _decorator;

let v3_fly02: Vec3 = new Vec3();//fly02动画飞行结束时候的位置
let v3_fly03: Vec3 = new Vec3();//fly03动画掉落结束位置
let v3_cameraMoveWorPos: Vec3 = new Vec3();//相机移动位置
let v3_cameraLookAtPos: Vec3 = new Vec3();//相机看向的位置
@ccclass('Enemy')
export class Enemy extends Component {
    public scriptManModel: ManModel = null!;

    public static isHitFly: boolean = false;//是否被击飞

    private _costTime: number = 0;//飞行需要时间
    private _isRaiseSpeed: boolean = false;//是否加速

    onEnable () {
    }

    onDisable () {

    }

    start () {
      
    }

    public init () {
        this.scriptManModel = this.node.getChildByName("body")?.getComponent(ManModel) as ManModel;
        Enemy.isHitFly = false;
        this.scriptManModel.playAni(constant.ANI_TYPE.IDLE, true);
    }

    public hitFly(enemyHitFlyDistance: number) {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.ENEMY_HIT_FLY);
        
        Enemy.isHitFly = true; 
        this._isRaiseSpeed = true;

        let flyDistance = enemyHitFlyDistance - 0.5;

        let startWorPos = FightMap.ndRoadScore.worldPosition.clone();

        this._costTime = flyDistance * 0.4;

        console.log("飞行消耗时间", this._costTime);

        v3_fly02.set(0, 1.2, startWorPos.z - flyDistance * 0.7);
        v3_fly03.set(0, 1, startWorPos.z - flyDistance * 1);

        tween(this.node)
        .to(this._costTime * 0.5, {position: v3_fly02})
        .call(()=>{
            EffectManager.instance.playEffect(this.node, 'smoke/smokeLight01', false, true, 1.5, 2.5);
            this._isRaiseSpeed = false;
            this.scriptManModel.playAni(constant.ANI_TYPE.HIT_FLY_03, false, ()=>{
                let targetWroPos = this.node.worldPosition.clone(); 
                EffectManager.instance.playParticle('colorBar/colorBar', targetWroPos.clone().add3f(-0.3, 0, -1), 3, 1.5, null, null, true);
                EffectManager.instance.playParticle('colorBar/colorBar', targetWroPos.clone().add3f(0, 0, -1), 3, 1.5, null, null, true);
                EffectManager.instance.playParticle('colorBar/colorBar', targetWroPos.clone().add3f(0.3, 0, -1), 3, 1.5, null, null, true);
                AudioManager.instance.playSound(constant.AUDIO_SOUND.FIRE);
            });
        })
        .to(this._costTime * 0.5, {position: v3_fly03})
        .call(()=>{
            GameManager.isWin = true;
            Enemy.isHitFly = false;

            v3_cameraMoveWorPos.set(0.8, 2.5, startWorPos.z - enemyHitFlyDistance + 3);
            v3_cameraLookAtPos.set(-0.3, 0.5, startWorPos.z - enemyHitFlyDistance - 1);
            GameManager.scriptGameCamera.moveCamera(v3_cameraMoveWorPos, v3_cameraLookAtPos, ()=>{
            }, 2);
        })
        .start();
    }

    update () {
        if (Enemy.isHitFly) {
            //击飞慢慢加速
            if (this._isRaiseSpeed) {
                GameManager.gameSpeed = Number(util.lerp(1.4, GameManager.gameSpeed, 0.3).toFixed(1));
            } else {
                GameManager.gameSpeed = Number(util.lerp(1, GameManager.gameSpeed, 0.3).toFixed(1));
            }            
        }
    }
}
