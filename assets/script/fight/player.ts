import { GameLogic } from './../framework/gameLogic';
import { AudioManager } from './../framework/audioManager';
import { ColliderItem } from './colliderItem';
import { uiManager } from './../framework/uiManager';
import { constant } from './../framework/constant';
import { GameManager } from './gameManager';
import { _decorator, Component, Node, RigidBodyComponent, BoxColliderComponent, Vec3, MeshRenderer, clamp, find, tween, Material, Texture2D, Quat, Prefab, director } from 'cc';
import { clientEvent } from '../framework/clientEvent';
import { ManModel } from './manModel';
import { FightMap } from './fightMap';
import { EffectManager } from '../framework/effectManager';
import { playerData } from '../framework/playerData';
import { poolManager } from '../framework/poolManager';
import { resourceUtil } from '../framework/resourceUtil';
import { localConfig } from '../framework/localConfig';

let v3_peopleEffect: Vec3 = new Vec3(0,0.5,0);//吃到小人特效播放位置
let v3_arriveEndLineTargetWorPos: Vec3 = new Vec3();//玩家超过终点线后自动调整的位置

const { ccclass, property } = _decorator;
//玩家控制组件
@ccclass('Player')
export class Player extends Component {
    @property(Node)
    public ndCharacter: Node = null!;

    @property(Material)
    public matGreen01: Material = null!;//绿色皮肤

    @property(Material)
    public matGreen02: Material = null!;//绿色高亮皮肤

    @property(Material)
    public matRed01: Material = null!;//红色皮肤

    @property(Material)
    public matRed02: Material = null!;//红色高亮皮肤

    @property(Material)
    public matYellow01: Material = null!;//黄色皮肤

    @property(Material)
    public matYellow02: Material = null!;//黄色高亮皮肤

    @property(Material)
    public matInvincible: Material = null!;//无敌效果彩虹皮肤

    @property(Material)
    public matGray: Material = null!;//吃到不同色的小人，变暗

    @property(RigidBodyComponent)
    public rigidBodyComPlayer: RigidBodyComponent = null!;//玩家刚体组件

    @property({type: ManModel})
    public scriptManModel: ManModel = null!;

    @property([Texture2D])
    public arrTextureHat: Texture2D[] = [];//帽子材质数组

    @property([Texture2D])
    public arrTextureShoes: Texture2D[] = [];//鞋子材质数组

    public isJumping: boolean = false;//当前是否正在跳跃
    public jumpPos: Vec3 = new Vec3();//跳跃的目标位置
    public hp: number = 0;//生命值 = 体积 - 10
    public volume: number = 0;//角色体积,	角色初始体积为11，最小为10，最大为35。
    public isInvincible: boolean = false;//是否无敌
    public moveInterval: number = 0;//移动间隔
    public isEnableMoveLeftOrRight: boolean = false;//是否玩家左右移动
    public isArriveEnd: boolean = false;//是否到达终点
    public preJumpPos: Vec3 = new Vec3();//上一个跳跃点
    public isDie: boolean = false;//玩家是否阵亡 
    public energyMax: number = 62.5;//能量最大值（必须达到该值80%才能无敌)
    public isStopMove: boolean = false;//是否停止移动
    public reviveInvincibleTime: number = 0;//复活无敌时间

    public set energy (value: number) {//设置能量
        this._energy = clamp(value, 0, this.energyMax);
        if (this._energy >= constant.INVINCIBLE_ENERGY){
            if (!this.isInvincible) {
                this.isInvincible = true;
                this._energyInterval = 0;
                clientEvent.dispatchEvent(constant.EVENT_TYPE.SHOW_INVINCIBLE);
                clientEvent.dispatchEvent(constant.EVENT_TYPE.CHECK_EFFECTIVE);
                clientEvent.dispatchEvent(constant.EVENT_TYPE.CHANGE_TO_INVINCIBLE_SPEED);
            } 
        } else if (this._energy <= 0) {
            if (this.isInvincible) {
                this.isInvincible = false;
                if (this._nextSkinType) {
                    this._skinType = this._nextSkinType;
                    this._nextSkinType = 0;
                }
                this._changeSkin(this._skinType);
                this._equipmentHat();
                this._equipmentShoes();
                clientEvent.dispatchEvent(constant.EVENT_TYPE.PEOPLE_RECOVERY_ORI_SKIN);
                clientEvent.dispatchEvent(constant.EVENT_TYPE.RECOVERY_ORI_SPEED);
                clientEvent.dispatchEvent(constant.EVENT_TYPE.RESET_PB_ENERGY);
                EffectManager.instance.removeEffect("flyLight", this.node);
            }
        }
    }

    public get energy () {//获取能量 
        return this._energy;
    }

    public get oppositeSidePos () {
        let idx = 0;
        idx = this._jumpIndex === 0 ? 2 : this._jumpIndex === 1 ? 3 : this._jumpIndex === 2 ? 0 : this._jumpIndex === 3 ? 1 : 0;
        return this._arrJumpPos[idx];
    }

    public get damageValue () {
        let handPowerItemInfo = localConfig.instance.queryByID("power", String(playerData.instance.playerInfo.handPowerLevel))
        return (this.volume + 20) * handPowerItemInfo.handPowerValue;
    }

    public static scaleRatio: number = 1;//当前相对初始大小的比例
    public static curScale: number = 0;//玩家当前缩放值

    private _skinType: number = 0;//皮肤类型
    private _timerPeopleLight: any;
    private _lightMaterial: any = null;//玩家皮肤高亮材质
    private _oriMaterial: any = null;//玩家皮肤材质
    private _bubbleType: string = "";//吃到小人后播放的泡泡特效类型
    private _energy: number = 0;//能量
    private _energyInterval: number = 0.2;//能量衰减时间间隔
    private _endCenterPos: Vec3 = new Vec3();//boss所在位置
    private _arrJumpPos: any[] = [];//跳跃的位置数组，逆时针方向
    private _jumpIndex: number = 0;//跳跃的位置索引
    private _jumpTime: number = 2;//跳跃过程所需几秒
    private _oppositeSidePos: Vec3 = new Vec3();//获取对面的坐标的值
    private _minVolume: number = 11;//最小体积
    private _maxVolume: number = 35;//最大体积
    private _oriVolume: number = 11;//初始体积
    private _rewardVolume: number = 20;//宝箱关卡中角色体积固定为20。
    private _targetScale: number = 0;//人物目标缩放大小
    private _isNeedChangeScale: boolean = false;//是否需要改变大小
    private _damageValue: number = 10//攻击力 = 体积*成长加成
    private _baseScale: number = 0.2;//玩家最小缩放倍数
    private _maxScale: number = 0.4;//玩家最大缩放倍数
    private _nextSkinType: number = 0;//玩家在无敌时候经过某种亮光，等无敌后恢复成该颜色
    private _isInit: boolean = false;//是否初始化
    private _isHitBig: boolean = false;//当前是否受到boss武器攻击
    
    onLoad () {
    }

    onEnable () {
        clientEvent.on(constant.EVENT_TYPE.CHANGE_SKIN, this._changeSkin, this);
        clientEvent.on(constant.EVENT_TYPE.ARRIVE_END, this._arriveEnd, this);
        clientEvent.on(constant.EVENT_TYPE.REFRESH_ATTACK_WOR_POS, this._refreshAttackWorPos, this);
        clientEvent.on(constant.EVENT_TYPE.SHOW_INVINCIBLE, this._showInvincible, this);
        clientEvent.on(constant.EVENT_TYPE.ON_REVIVE, this._onRevive, this);
        clientEvent.on(constant.EVENT_TYPE.EQUIPMENT_HAT, this._equipmentHat, this);
        clientEvent.on(constant.EVENT_TYPE.EQUIPMENT_SHOES, this._equipmentShoes, this);
    }

    onDisable () {
        clientEvent.off(constant.EVENT_TYPE.CHANGE_SKIN, this._changeSkin, this);
        clientEvent.off(constant.EVENT_TYPE.ARRIVE_END, this._arriveEnd, this);
        clientEvent.off(constant.EVENT_TYPE.REFRESH_ATTACK_WOR_POS, this._refreshAttackWorPos, this);
        clientEvent.off(constant.EVENT_TYPE.SHOW_INVINCIBLE, this._showInvincible, this);
        clientEvent.off(constant.EVENT_TYPE.ON_REVIVE, this._onRevive, this);
        clientEvent.off(constant.EVENT_TYPE.EQUIPMENT_HAT, this._equipmentHat, this);
        clientEvent.off(constant.EVENT_TYPE.EQUIPMENT_SHOES, this._equipmentShoes, this);
    }
   
    start () {
        // [3]
    }

    public initPlayer() {
        this.node.setWorldPosition(GameManager.oriPlayerWorPos);
        this.node.eulerAngles = new Vec3(0,0,0);
    
        this._oriMaterial = this.matGreen01
        this._lightMaterial = this.matGreen02;

        this.isEnableMoveLeftOrRight = true;
        this.isArriveEnd = false;
        this.isStopMove = false;

        this._changeSkin(ColliderItem.COLLIDER_NAME.COLOR_LIGHT_GREEN);
        this.scriptManModel.playAni(constant.ANI_TYPE.IDLE, true);

        this._arrJumpPos = [];
        this._jumpIndex = 0;
        this._nextSkinType = 0;
        this._isInit = false;

        this.isDie = false;
        this.energy = 0;

        if (GameManager.gameType === constant.GAME_TYPE.REWARD) {
            this.updateVolume(this._rewardVolume - this.volume);
        } else {
            this.updateVolume(this._oriVolume - this.volume);
        }

        // if (GameLogic.isTest) {
        //     this.updateVolume(20);
        // }

        this._equipmentHat();
        this._equipmentShoes();
    }

    /**
     * 监听玩家复活
     */
    private _onRevive () {
        this.isDie = false;

        //复活时候，如果体积小于15，则变为15
        if (this.volume < 15 && GameManager.gameStatus === constant.GAME_STATUS.RUN) {
            this.updateVolume(15);
        }

        //复活后有一定时间的无敌
        this.reviveInvincibleTime = constant.REVIVE_INVINCIBLE_TIME;

        //如果玩家撞墙失败则开启重力，防止玩家漂浮，复活之后再关闭
        if (this.rigidBodyComPlayer.useGravity) {
            this.rigidBodyComPlayer.useGravity = false;
        }

        if (GameManager.gameStatus === constant.GAME_STATUS.RUN) {
            this.isStopMove = false;

            this.scriptManModel.playAni(constant.ANI_TYPE.LIFE, false, ()=>{
                GameManager.isGameOver = false;
                
                this.scriptManModel.playAni(constant.ANI_TYPE.RUN, true);
            });
        } else if (GameManager.gameStatus === constant.GAME_STATUS.FIGHT) {
            this.isStopMove = true;

            this.scriptManModel.playAni(constant.ANI_TYPE.LIFE, false, ()=>{
                this.scriptManModel.playAni(constant.ANI_TYPE.FIGHT_IDLE, true, ()=>{}, 1);
            });

            let cameraMoveWorPos: Vec3;
            let cameraLookAtPos: Vec3;
            let playerWorPos = this.node.worldPosition.clone();

            if (GameManager.gameType === constant.GAME_TYPE.NORMAL) {
                //重新进入到战斗视角
                let enemyWorPos = FightMap.ndEnemy.worldPosition.clone();
                let averageZ = (enemyWorPos.z - playerWorPos.z) * 0.5;
                let cameraMoveWorPos = playerWorPos.clone().add3f(2.2, 0.9, averageZ);
                let cameraLookAtPos = playerWorPos.clone().add3f(0, 0.4, averageZ);
    
                GameManager.scriptGameCamera.moveCamera(cameraMoveWorPos, cameraLookAtPos, ()=>{
                    this.scriptManModel.playAni(constant.ANI_TYPE.KICK);
                });
            } else if (GameManager.gameType === constant.GAME_TYPE.BOSS) {
                //重新进入到战斗视角
                let offsetX: number = 0;
                let offsetZ: number = 0;
                
                switch (this._jumpIndex) {
                    case 0:
                        offsetX = 0;
                        offsetZ = 1.3;
                        break;
                    case 1:
                        offsetX = 1.3;
                        offsetZ = 0;
                        break;
                    case 2:
                        offsetX = 0;
                        offsetZ = -1.3;
                        break;
                    case 3:
                        offsetX = -1.3;
                        offsetZ = 0;
                }
                
                cameraMoveWorPos = new Vec3(this.jumpPos.x + offsetX, this.jumpPos.y + 1, this.jumpPos.z + offsetZ);
                cameraLookAtPos = new Vec3(this.jumpPos.x, this.jumpPos.y + 0.5, this.jumpPos.z);

                GameManager.scriptGameCamera.moveCamera(cameraMoveWorPos, cameraLookAtPos, ()=>{
                    this.scriptManModel.playAni(constant.ANI_TYPE.KICK);
                }, 2, true);
            }
        }
    }

    /**
     * 无敌效果
     */
    private _showInvincible () {    
        console.log("触发无敌效果");
        AudioManager.instance.playSound(constant.AUDIO_SOUND.INVINCIBLE);

        //改变皮肤为彩虹色
        let meshCom = this.ndCharacter.getComponent(MeshRenderer) as MeshRenderer;
        meshCom?.setMaterial(this.matInvincible, 0);
        
        //所有小人变成玩家变成彩色前的皮肤颜色
        GameManager.peopleInvincibleMaterial = this._oriMaterial;
        clientEvent.dispatchEvent(constant.EVENT_TYPE.PEOPLE_BECOME_SAME_SKIN);

        if (this._timerPeopleLight) {
            clearTimeout(this._timerPeopleLight);
            this._timerPeopleLight = null;
        }

        EffectManager.instance.playEffect(this.node, 'levelUp/levelUp', true, true, 2, 1.5);

        setTimeout(()=>{
            EffectManager.instance.playFlyLightEffect(this.node, new Vec3(0, 0.3, 0));
        }, 500)

        // AudioManager.instance.playSound("levelUp"); 

        this.scriptManModel.ndSocketHead.children.forEach((item: any)=>{
            poolManager.instance.putNode(item);
        })

        resourceUtil.getHat("crown").then((prefab: any)=>{
            let ndModel = poolManager.instance.getNode(prefab, this.scriptManModel.ndSocketHead) as Node;
        });
    }

    /**
     * 更新皮肤材质
     * @param skinType 
     * @param isShowLight 
     */
    private _changeSkin (skinType?: number) {
        let meshCom = this.ndCharacter.getComponent(MeshRenderer) as MeshRenderer;

        if (!skinType) {
            skinType = 0;
        }

        //钻石和钥匙不展示泡泡
        if (skinType === ColliderItem.COLLIDER_NAME.DIAMOND || skinType === ColliderItem.COLLIDER_NAME.KEY) {
            return;
        }

        if (this.isInvincible) {
            switch (this._skinType) {
                case ColliderItem.COLLIDER_NAME.PEOPLE_RED:
                    EffectManager.instance.playEffect(this.node, `bubble/${constant.BUBBLE.BUBBLE_RED}`, true, true, 1, 1.5, v3_peopleEffect);
                    break;
                case ColliderItem.COLLIDER_NAME.PEOPLE_YELLOW:
                    EffectManager.instance.playEffect(this.node, `bubble/${constant.BUBBLE.BUBBLE_YELLOW}`, true, true, 1, 1.5, v3_peopleEffect);
                    break;
                case ColliderItem.COLLIDER_NAME.PEOPLE_GREEN:
                    EffectManager.instance.playEffect(this.node, `bubble/${constant.BUBBLE.BUBBLE_GREEN}`, true, true, 1, 1.5, v3_peopleEffect);
                    break;
            }

            switch (skinType) {
                case ColliderItem.COLLIDER_NAME.COLOR_LIGHT_RED: 
                    this._nextSkinType = ColliderItem.COLLIDER_NAME.COLOR_LIGHT_RED;
                    break;
                case ColliderItem.COLLIDER_NAME.COLOR_LIGHT_YELLOW:
                    this._nextSkinType = ColliderItem.COLLIDER_NAME.COLOR_LIGHT_YELLOW;
                    break;
                case ColliderItem.COLLIDER_NAME.COLOR_LIGHT_GREEN:
                    this._nextSkinType = ColliderItem.COLLIDER_NAME.COLOR_LIGHT_GREEN;
                    break;
            }
        } else {
            //经过光效之后显示对应颜色，吃到小人后也展示对应颜色光效
            switch (skinType) {
                case ColliderItem.COLLIDER_NAME.COLOR_LIGHT_RED: 
                    meshCom?.setMaterial(this.matRed01, 0);
                    this._oriMaterial = this.matRed01;
                    this._lightMaterial = this.matRed02;
                    this._skinType = ColliderItem.COLLIDER_NAME.PEOPLE_RED;
                    this._bubbleType = constant.BUBBLE.BUBBLE_RED;
                    break;
                case ColliderItem.COLLIDER_NAME.PEOPLE_RED:
                    if (this._bubbleType === constant.BUBBLE.BUBBLE_RED) {
                        EffectManager.instance.playEffect(this.node, `bubble/${this._bubbleType}`, true, true, 0.5, 1.5, v3_peopleEffect);
                        meshCom?.setMaterial(this._lightMaterial, 0);
                    } else {
                        meshCom?.setMaterial(this.matGray, 0);
                    }
                    this._hidePeopleLight(meshCom, this._oriMaterial); 
                    break;
                case ColliderItem.COLLIDER_NAME.COLOR_LIGHT_YELLOW:
                    meshCom?.setMaterial(this.matYellow01, 0);
                    this._oriMaterial = this.matYellow01;
                    this._lightMaterial = this.matYellow02;
                    this._skinType = ColliderItem.COLLIDER_NAME.PEOPLE_YELLOW;
                    this._bubbleType = constant.BUBBLE.BUBBLE_YELLOW;
                    break;
                case ColliderItem.COLLIDER_NAME.PEOPLE_YELLOW:
                    if (this._bubbleType === constant.BUBBLE.BUBBLE_YELLOW) {
                        EffectManager.instance.playEffect(this.node, `bubble/${this._bubbleType}`, true, true, 0.5, 1.5, v3_peopleEffect);
                        meshCom?.setMaterial(this._lightMaterial, 0);
                    } else {
                        meshCom?.setMaterial(this.matGray, 0);
                    }
                    this._hidePeopleLight(meshCom, this._oriMaterial);     
                    break;
                case ColliderItem.COLLIDER_NAME.COLOR_LIGHT_GREEN:
                    meshCom?.setMaterial(this.matGreen01, 0);
                    this._oriMaterial = this.matGreen01;
                    this._lightMaterial = this.matGreen02;
                    this._skinType = ColliderItem.COLLIDER_NAME.PEOPLE_GREEN;
                    this._bubbleType = constant.BUBBLE.BUBBLE_GREEN;
                    break;
                case ColliderItem.COLLIDER_NAME.PEOPLE_GREEN:
                    if (this._bubbleType === constant.BUBBLE.BUBBLE_GREEN) {
                        EffectManager.instance.playEffect(this.node, `bubble/${this._bubbleType}`, true, true, 0.5, 1.5, v3_peopleEffect);
                        meshCom?.setMaterial(this._lightMaterial, 0);
                    } else {
                        meshCom?.setMaterial(this.matGray, 0);
                    }
                    this._hidePeopleLight(meshCom, this._oriMaterial);   
                    break;
                case ColliderItem.COLLIDER_NAME.DIAMOND:
                    meshCom?.setMaterial(this._lightMaterial, 0);
                    this._hidePeopleLight(meshCom, this._oriMaterial);   

                    if (GameManager.gameType === constant.GAME_TYPE.REWARD) {
                        this.energy += 1;
                    }
                    break;
                case ColliderItem.COLLIDER_NAME.KEY:
                    meshCom?.setMaterial(this._lightMaterial, 0);
                    this._hidePeopleLight(meshCom, this._oriMaterial);   
                    break;
                default:
                    this._skinType = 0;
                    break;
            }
        }
    }

    /**
     * 关闭人物光效
     */
    private _hidePeopleLight (meshCom: MeshRenderer, material: Material) {
        if (this._timerPeopleLight) {
            clearTimeout(this._timerPeopleLight);
            this._timerPeopleLight = null;
        }

        this._timerPeopleLight = setTimeout(()=>{
            meshCom?.setMaterial(material, 0);
        }, 100)
    }

    /**
     * 吃掉小人
     * @param skinType 
     */
    public hitPeople (skinType: number) {    
        let targetWorPos = this.scriptManModel.ndSocketHead.worldPosition.clone().add3f(0, 0.1, 0);
        let uiPoint = GameManager.mainCamera?.convertToUINode(targetWorPos, find('Canvas') as Node) as Vec3;

        //同颜色的加能量和加体积
        if (this._skinType === skinType || this.isInvincible) {
            //吃到同色
            AudioManager.instance.playSound(constant.AUDIO_SOUND.COLLECT_PEOPLE_RIGHT);

            uiManager.instance.showFightTips(constant.FIGHT_TIP_INDEX.SCORE_ADD, '1', uiPoint);
            
            //无敌的时候固定大小
            if (!this.isInvincible) {
                this.updateVolume(1, constant.UPDATE_VOLUME_TYPE.EAT_PEOPLE);
                this.energy += 1;
            }

            clientEvent.dispatchEvent(constant.EVENT_TYPE.REFRESH_PEOPLE);
        } else {            
            //吃到不同色
            AudioManager.instance.playSound(constant.AUDIO_SOUND.COLLECT_PEOPLE_WRONG);

            uiManager.instance.showFightTips(constant.FIGHT_TIP_INDEX.SCORE_MINUS, '1', uiPoint);

            if (!this.isInvincible) {
                this.updateVolume(-1, constant.UPDATE_VOLUME_TYPE.EAT_PEOPLE);
                this.energy -= 2;
            }
        }
    }

    /**
     * 玩家走在尖刺路上
     */
    public walkOnSpineRoad () {
        let moduleItemInfo = localConfig.instance.queryByID("module", "1301");
        this.updateVolume(-moduleItemInfo.reduceVolume, constant.UPDATE_VOLUME_TYPE.HIT_BY_COLLIDER);

        let targetWorPos = this.scriptManModel.ndSocketHead.worldPosition.clone();
        let uiPoint = GameManager.mainCamera?.convertToUINode(targetWorPos, find('Canvas') as Node) as Vec3;

        AudioManager.instance.playSound(constant.AUDIO_SOUND.COLLECT_PEOPLE_WRONG);
        uiManager.instance.showFightTips(constant.FIGHT_TIP_INDEX.SCORE_MINUS, '1', uiPoint);
    }

    public stopMove () {
        this.rigidBodyComPlayer.clearState();
        this.scriptManModel.playAni(constant.ANI_TYPE.FIGHT_IDLE, true, ()=>{}, 2);
        this.isStopMove = true;
    }

    public triggerDie () {
        //让人物停下来，避免继续前移
        this.rigidBodyComPlayer.clearState();
        this.isDie = true;
        this.isStopMove = true;
    }

    private _arriveEnd () {
        if (!this.isArriveEnd) {
            this.stopMove();
            if (GameManager.gameType === constant.GAME_TYPE.BOSS) {
                this.calculateJumpPos();
            }

            //到达终点结束无敌状态,直接能量为0
            this.energy = 0;
        }
    }

    /**
     * 跳跃
     *
     * @param {boolean} isClockWise 是否是顺时针
     * @returns
     * @memberof Player
     */
    public jump (isClockWise: boolean, callback?: Function) {
        if (this.isJumping || this._isHitBig) {
            return;
        }

        this.isJumping = true;
        this.preJumpPos = this._arrJumpPos[this._jumpIndex];

        AudioManager.instance.playSound(constant.AUDIO_SOUND.DODGE);

        if (!isClockWise) {
            this.scriptManModel.playAni(constant.ANI_TYPE.DODGE_RIGHT, false, ()=>{
                if (!this.isDie) {
                    this.scriptManModel.playAni(constant.ANI_TYPE.FIGHT_IDLE, true, ()=>{}, 3);
                }
            });
        } else {
            this.scriptManModel.playAni(constant.ANI_TYPE.DODGE_LEFT, false, ()=>{
                if (!this.isDie) {
                    this.scriptManModel.playAni(constant.ANI_TYPE.FIGHT_IDLE, true, ()=>{}, 4);
                }
            });
        }
       
        let moveEulerY = 90;

        if (!isClockWise) {//逆时针
            this._jumpIndex += 1;
            this._jumpIndex = this._jumpIndex > 3 ? 0 : this._jumpIndex;
        } else {//顺时针
            this._jumpIndex -= 1;
            this._jumpIndex = this._jumpIndex < 0 ? 3 : this._jumpIndex;
            moveEulerY = -90;
        }

        this.jumpPos = this._arrJumpPos[this._jumpIndex];

        //相机先拉高后低
        let offsetX: number = 0;
        let offsetZ: number = 0;
        
        switch (this._jumpIndex) {
            case 0:
                offsetX = 0;
                offsetZ = 2;
                break;
            case 1:
                offsetX = 2;
                offsetZ = 0;
                break;
            case 2:
                offsetX = 0;
                offsetZ = -2;
                break;
            case 3:
                offsetX = -2;
                offsetZ = 0;
        }
         
        //位置先拉高
        let cameraMoveWorPos1 = new Vec3(this.jumpPos.x + offsetX * 1.5, this.jumpPos.y + 1.7, this.jumpPos.z + offsetZ * 1.5);
        //看向目标
        let cameraLookAtPos1 = new Vec3(this.jumpPos.x - offsetX * 0.45, this.jumpPos.y, this.jumpPos.z - offsetZ * 0.45);

        //位置降低
        let cameraMoveWorPos2 = new Vec3(this.jumpPos.x + offsetX*0.85, this.jumpPos.y + 1, this.jumpPos.z + offsetZ * 0.85);
        let cameraLookAtPos2 = new Vec3(this.jumpPos.x, this.jumpPos.y + 0.5, this.jumpPos.z);

        GameManager.scriptGameCamera.moveCamera(cameraMoveWorPos1, cameraLookAtPos1, ()=>{
            GameManager.scriptGameCamera.moveCamera(cameraMoveWorPos2, cameraLookAtPos2, ()=>{
                this.isJumping = false;
                this.scriptManModel.playAni(constant.ANI_TYPE.FIGHT_IDLE, true, ()=>{}, 5);
            }, this._jumpTime*0.3, isClockWise)

            callback && callback();
        }, this._jumpTime * 0.9, isClockWise)

        let rigidCom = this.node.getComponent(RigidBodyComponent) as RigidBodyComponent;
        rigidCom.clearState();

        //移动玩家
        let targetEuler = new Vec3(0, this.node.eulerAngles.y + moveEulerY, 0);

        tween(this.node)
        .to(this._jumpTime * 0.5, {worldPosition: this.jumpPos, eulerAngles: targetEuler})
        .call(()=>{
        })
        .start();
    }

    public calculateJumpPos () {
        let bossWorPos = FightMap.ndBoss.worldPosition.clone();
        let playerWorPos = this.node.worldPosition.clone();
        let length = bossWorPos.clone().subtract(playerWorPos).length();
        // this._radius = length;

        //下面的Y值为0.99，跳跃的时候不会抖动？
        this._arrJumpPos[0] = new Vec3(playerWorPos.x, 0.99, playerWorPos.z);
        this._arrJumpPos[1] = new Vec3(bossWorPos.x + length, 0.99, bossWorPos.z);
        this._arrJumpPos[2] = new Vec3(bossWorPos.x, 0.99, bossWorPos.z - length);
        this._arrJumpPos[3] = new Vec3(bossWorPos.x - length, 0.99, bossWorPos.z);

        this.preJumpPos = this._arrJumpPos[0];
        this.jumpPos = this._arrJumpPos[0];

        console.log("arrJumpPos", this._arrJumpPos);

        this._endCenterPos = FightMap.ndBoss.worldPosition.clone();
    }

    /**
     * boss关卡 玩家被击飞效果
     */
    public hitFlyPlayer (callback: Function) {
        this.scriptManModel.playAni(constant.ANI_TYPE.DIE, false, ()=>{
            AudioManager.instance.playSound(constant.AUDIO_SOUND.FALL_DOWN_ON_GROUND);

            callback();
        });
        
        let offsetX: number = 0;
        let offsetZ: number = 0;
        
        switch (this._jumpIndex) {
            case 0:
                offsetX = 0.5;
                offsetZ = 2;
                break;
            case 1:
                offsetX = 2;
                offsetZ = -0.5;
                break;
            case 2:
                offsetX = -0.5;
                offsetZ = -2;
                break;
            case 3:
                offsetX = -2;
                offsetZ = 0.5;
        }
            
        this.jumpPos = this._arrJumpPos[this._jumpIndex];
        //慢镜头镜头往后右上方抬高
        let cameraMoveWorPos1 = new Vec3(this.jumpPos.x + offsetX * 0.8, this.jumpPos.y + 0.8, this.jumpPos.z + offsetZ * 0.8);
        let cameraLookAtPos1 = new Vec3(this.jumpPos.x, this.jumpPos.y + 0.3, this.jumpPos.z);
        
        let cameraMoveWorPos2 = new Vec3(this.jumpPos.x + offsetX, this.jumpPos.y + 1.6, this.jumpPos.z + offsetZ);
        let cameraLookAtPos2 = new Vec3(this.jumpPos.x, this.jumpPos.y + 0.3, this.jumpPos.z);

        //相机拉高
        GameManager.scriptGameCamera.moveCamera(cameraMoveWorPos1, cameraLookAtPos1, ()=>{
            GameManager.scriptGameCamera.moveCamera(cameraMoveWorPos2, cameraLookAtPos2, ()=>{
            }, 2)
        }, 3)
    }

    /**
     * 一开始boss要朝向的向量
     */
    public getOriLookAtPos () {
        return this._arrJumpPos[2].clone();
    }   

    private _refreshAttackWorPos (){
        this.preJumpPos = this.jumpPos.clone();
    }

    /**
     * boss血量为0，攻击boss镜头
     */
    public cameraMoveAttackBoss () {
        let centerPos = this.jumpPos.clone();
        let len = this.node.worldPosition.clone().subtract(FightMap.ndBoss.worldPosition.clone()).length() * 0.5;

        let offsetX: number = 0;
        let offsetZ: number = 0;
        switch (this._jumpIndex) {
            case 0:
                offsetX = 1;
                offsetZ = 1.5;
                centerPos.z -= len;
                break;
            case 1:
                offsetX = 1.5;
                offsetZ = -1;
                centerPos.x -= len;
                break;
            case 2:
                offsetX = -1;
                offsetZ = -1.5;
                centerPos.z += len;
                break;
            case 3:
                offsetX = -1.5;
                offsetZ = 1 ;
                centerPos.x += len;
        }

        let cameraMoveWorPos = new Vec3(centerPos.x + offsetX, centerPos.y + 0.8, centerPos.z + offsetZ);
        let cameraLookAtPos = new Vec3(centerPos.x, centerPos.y + 0.2, centerPos.z);
        GameManager.scriptGameCamera.moveCamera(cameraMoveWorPos, cameraLookAtPos);
    }

    /**
     * 击飞boss慢镜头
     */
    public cameraMoveHitFlyBoss () {
        let centerPos = this.jumpPos.clone();
        let len = this.node.worldPosition.clone().subtract(FightMap.ndBoss.worldPosition.clone()).length() * 0.5;

        let cameraOffsetX: number = 0;
        let cameraOffsetZ: number = 0;

        let centerOffsetX: number = 0;
        let centerOffsetZ: number = 0;

        switch (this._jumpIndex) {
            case 0:
                cameraOffsetX = -0.7;
                cameraOffsetZ = 1.5;

                centerOffsetX = 0;
                centerOffsetZ = -len;
                break;
            case 1:
                cameraOffsetX = 1.5;
                cameraOffsetZ = 0.7;

                centerOffsetX = -len;
                centerOffsetZ = 0;
                break;
            case 2:
                cameraOffsetX = 0.7;
                cameraOffsetZ = -1.5;

                centerOffsetX = 0;
                centerOffsetZ = len;
                break;
            case 3:
                cameraOffsetX = -1.5;
                cameraOffsetZ = -0.7;

                centerOffsetX = len;
                centerOffsetZ = 0;
        }

        //镜头看向两者的中心点
        let dirCenter = new Vec3(centerOffsetX, 0.5, centerOffsetZ);
        centerPos.add(dirCenter);
        let cameraMoveWorPos = new Vec3(centerPos.x + cameraOffsetX, centerPos.y + 0.6, centerPos.z + cameraOffsetZ);
        let cameraLookAtPos = new Vec3(centerPos.x, centerPos.y, centerPos.z);
        GameManager.scriptGameCamera.moveCamera(cameraMoveWorPos, cameraLookAtPos, ()=>{
        }, 2, true);
    }

    /**
     * boss关卡玩家胜利后展示烟花
     */
    public showFireworks () {
        let len = this.node.worldPosition.clone().subtract(FightMap.ndBoss.worldPosition.clone()).length() * 0.5;

        let colorBarOffsetX: number = 0;
        let colorBarOffsetZ: number = 0;

        let centerOffsetX: number = 0;
        let centerOffsetZ: number = 0;

        switch (this._jumpIndex) {
            case 0:
                colorBarOffsetX = -0.3;
                colorBarOffsetZ = 0;
                
                centerOffsetX = 0;
                centerOffsetZ = -len;
                break;
            case 1:
                colorBarOffsetX = 0;
                colorBarOffsetZ = 0.3;

                centerOffsetX = -len;
                centerOffsetZ = 0;
                break;
            case 2:
                colorBarOffsetX = 0.3;
                colorBarOffsetZ = 0;

                centerOffsetX = 0;
                centerOffsetZ = len;
                break;
            case 3:
                colorBarOffsetX = 0;
                colorBarOffsetZ = -0.3;

                centerOffsetX = len;
                centerOffsetZ = 0;
        }

        let playerWorPos = this.node.worldPosition.clone();
        //播放礼花效果
        EffectManager.instance.playParticle('colorBar/colorBar', playerWorPos.clone().add3f(centerOffsetX, 0, centerOffsetZ).add3f(colorBarOffsetX, 0, colorBarOffsetZ), 5, 1, null, null, true);
        EffectManager.instance.playParticle('colorBar/colorBar', playerWorPos.clone().add3f(centerOffsetX, 0, centerOffsetZ).add3f(0, 0, 0), 5, 1, null, null, true);
        EffectManager.instance.playParticle('colorBar/colorBar', playerWorPos.clone().add3f(centerOffsetX, 0, centerOffsetZ).add3f(-colorBarOffsetX, 0, -colorBarOffsetZ), 5, 1, null, null, true);

        AudioManager.instance.playSound(constant.AUDIO_SOUND.FIRE);
    }

    /**
     * 玩家撞墙
     */
    public hitWall () {
        let moduleItemInfo = localConfig.instance.queryByID("module", "9001");

        //是否顺利穿墙
        if (this.volume - moduleItemInfo.reduceVolume - 10 > 0 || this.isInvincible) {
            AudioManager.instance.playSound(constant.AUDIO_SOUND.WALL_THOUGH_SUCCESS);
        } else {
            AudioManager.instance.playSound(constant.AUDIO_SOUND.WALL_THOUGH_FAIL);
        }

        this.rigidBodyComPlayer.useGravity = true;

        this.updateVolume(-moduleItemInfo.reduceVolume, constant.UPDATE_VOLUME_TYPE.HIT_BY_COLLIDER);
    }

    /**
     * 玩家装备牛仔帽
     */
     private _equipmentHat () {
        let arrHat = playerData.instance.playerInfo.hat;

        let hat: any = arrHat.find((item: any)=>{
            return item.status === constant.SHOP_ITEM_STATUS.EQUIPMENT;
        })

        this.scriptManModel.ndSocketHead.children.forEach((item: any)=>{
            poolManager.instance.putNode(item);
        })

        if (hat) {
            resourceUtil.getHat("cowBoyHat").then((prefab: any)=>{
                let ndModel = poolManager.instance.getNode(prefab, this.scriptManModel.ndSocketHead) as Node;
                let meshCom = ndModel.getComponentInChildren(MeshRenderer) as MeshRenderer;
                let material = meshCom?.materials[0];
                let texture = material?.getProperty("mainTexture");
                let index = Number(hat.ID) - 1001;
                texture = this.arrTextureHat[index];
                material?.setProperty("mainTexture", texture);
            });
        }            
    }

    /**
     * 玩家装备鞋子
     */
    private _equipmentShoes () {
        let arrShoes = playerData.instance.playerInfo.shoes;

        let shoes: any = arrShoes.find((item: any)=>{
            return item.status === constant.SHOP_ITEM_STATUS.EQUIPMENT;
        })

        let next = (ndParent: Node, pb: Prefab)=>{
            ndParent.children.forEach((item: any)=>{
                poolManager.instance.putNode(item);
            })

            let ndModel = poolManager.instance.getNode(pb, ndParent) as Node;
            let meshCom = ndModel.getComponentInChildren(MeshRenderer) as MeshRenderer;
            let material = meshCom?.materials[0];
            let texture = material?.getProperty("mainTexture");
            let index = Number(shoes.ID) - 2001;
            texture = this.arrTextureShoes[index];
            material?.setProperty("mainTexture", texture);
        }

        if (shoes) {
            resourceUtil.getShoes("shoesL").then((prefab: any)=>{
                next(this.scriptManModel.ndSocketLeftFoot, prefab);
            });

            resourceUtil.getShoes("shoesR").then((prefab: any)=>{
                next(this.scriptManModel.ndSocketRightFoot, prefab);
            });
        }    
    }

    /**
     * 更新体积
     * @param value 加减体积值
     * @param type 通过什么方式增减体积
     */
    public updateVolume (value: number, type?: string) {
        let oldVolume = this.volume;
        let oldScale = this._targetScale;
        let ratio = (this._maxScale - this._baseScale) / (this._maxVolume - this._minVolume);// 每个体积单位对应的缩放值,0.2为节点最小缩放值
        let tempVolume = this.volume + value;

        //最终体积
        this.volume = clamp(tempVolume, this._minVolume, this._maxVolume);
        //目标缩放倍数
        this._targetScale = this._baseScale + (this.volume - this._minVolume) * ratio;
        
        if (type === constant.UPDATE_VOLUME_TYPE.EAT_PEOPLE) {
            //跑酷阶段吃到小人，最低生命为1;
            this.hp = this.volume - 10;
        } else if (type === constant.UPDATE_VOLUME_TYPE.HIT_BY_COLLIDER) {
            this.hp = tempVolume - 10;

            if (this.hp <= 0) {//死亡,不改变体积
                this.volume = oldVolume
                this.hp = this.volume - 10;
                this._targetScale = oldScale;
                
                AudioManager.instance.playSound(constant.AUDIO_SOUND.FALL_DOWN_ON_GROUND);

                GameManager.scriptPlayer.scriptManModel.playAni(constant.ANI_TYPE.DIE, false, ()=>{
                });

                GameManager.isWin = false;
            }
        } else {
            this.hp = this.volume - 10;
        }

        //初始化时不展示缩放过程
        if (!this._isInit) {
            this._isInit = true;
            this.node.setScale(this._targetScale, this._targetScale, this._targetScale);
            Player.curScale = this._targetScale;
            Player.scaleRatio = Player.curScale / 0.2;
        } else {
            this._isNeedChangeScale = this._targetScale !== this.node.getScale().x;
        }
    }
    
    public playAniHitBig (callback: Function) {
        this._isHitBig = true;
        this.scriptManModel.playAni(constant.ANI_TYPE.HIT_BIG, false, ()=>{
            this._isHitBig = false;
            callback && callback();
        });
    }

    update () {
        //给玩家缩放过程做个插值
        if (this._isNeedChangeScale) {
            Player.curScale = Player.curScale + (this._targetScale - Player.curScale) * 0.1;
            this.node.setScale(new Vec3(Player.curScale, Player.curScale, Player.curScale));
            Player.scaleRatio = Player.curScale / 0.2;

            if (Number(Player.curScale.toFixed(2)) === Number(this._targetScale.toFixed(2))) {
                this._isNeedChangeScale = false;
            }
        }
    }

    lateUpdate (deltaTime: number) {
        if (GameManager.isGameStart && !GameManager.isGameOver && !GameManager.isGamePause) {
            //到达终点线的时候不允许左右移动，x自动偏向0
            if (!this.isStopMove && !this.isEnableMoveLeftOrRight) {
                let playerWorPos = this.node.worldPosition.clone();
                v3_arriveEndLineTargetWorPos.set(0, playerWorPos.y, playerWorPos.z);
                let nextWorPos = playerWorPos.lerp(v3_arriveEndLineTargetWorPos, 0.05);
                this.node.setWorldPosition(nextWorPos);
            }

            if (this.isInvincible) {
                this._energyInterval += deltaTime;
                if (this._energyInterval >= 0.2) {
                    this.energy -= 1;
                    this._energyInterval = 0;
                }
            }

            if (this.reviveInvincibleTime > 0) {
                this.reviveInvincibleTime -= deltaTime;
            } 
        }
    }
}

