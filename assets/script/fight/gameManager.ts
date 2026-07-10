import { _decorator, Component, Node, Camera, view, Vec3, Animation, ParticleSystemComponent, SkeletalAnimationComponent, Quat, Material } from 'cc';
import { playerData } from './../framework/playerData';
import { constant } from './../framework/constant';
import { clientEvent } from './../framework/clientEvent';
import { poolManager } from './../framework/poolManager';
import { resourceUtil } from '../framework/resourceUtil';
import { GameCamera } from './gameCamera';
import { Player } from './player';
import { uiManager } from '../framework/uiManager';
import { FightMap } from './fightMap';
import { localConfig } from '../framework/localConfig';
import { AudioManager } from '../framework/audioManager';

let v3_offsetWorPosSkyBox: Vec3 = new Vec3();//天空盒节点和玩家位置之间向量差
let v3_offsetWorPosWater: Vec3 = new Vec3();//水节点和玩家位置之间的向量差
let v3_offsetWorPosMainLight: Vec3 = new Vec3();//主光源节点和玩家位置之间的向量差

//游戏管理类
const { ccclass, property } = _decorator;
@ccclass('GameManager')
export class GameManager extends Component {
    @property(GameCamera)
    public camera: GameCamera = null!;

    @property({ type: FightMap })
    public scriptMapManager: FightMap = null!;

    @property(Node)
    public ndSkyBox: Node = null!;//天空盒

    @property(Node)
    public ndWater: Node = null!;//水

    @property(Node)
    public ndLight: Node = null!; //主光源

    public mapInfo: any = null;
    public hitFlyEnemyPower: number = 0;//普通关击飞敌人的力量
    public basePower: number = 5;//基础力量
    public people: number = 0;//本关收集的小人数量
    public multiple: number = 0;//本关倍数
    public diamond: number = 0;//本关收集的钻石数量

    public get kickPowerItemInfo () {//根据等级获取对应的腿部力量数据
        this._kickPowerItemInfo = localConfig.instance.queryByID("power", String(playerData.instance.playerInfo.kickPowerLevel))
        return this._kickPowerItemInfo;
    }

    public get handPowerItemInfo () {//根据等级获取对应的手臂力量数据
        this._handPowerItemInfo = localConfig.instance.queryByID("power", String(playerData.instance.playerInfo.handPowerLevel))
        return this._handPowerItemInfo;
    }

    public get kickPowerValue () {
        return this._kickPowerValue = this.kickPowerItemInfo.kickPowerValue;
    }

    public get handPowerValue () {
        return this._handPowerValue = this.handPowerItemInfo.handPowerValue;
    }

    public static mainCamera: Camera | null = null;
    public static isGameStart: boolean = false;
    public static isGamePause: boolean = false;
    public static isGameOver: boolean = false;
    public static scriptPlayer: Player;
    public static scriptGameCamera: GameCamera;
    public static ndPlayer: Node | null;
    public static gameType: number = 1;//关卡类型
    public static gameStatus: string = '';//关卡阶段
    public static ndGameManager: Node;
    public static isRevive: boolean = false;//玩家是否复活
    public static isArriveEndLine: boolean = false;//是否达到终点线
    public static peopleInvincibleMaterial: Material = null!;//无敌时小人统一颜色
    public static oriPlayerWorPos: Vec3 = new Vec3(0, 1, -1);//玩家初始化位置

    public static set isWin (value: boolean) {
        this._isWin = value;

        if (GameManager.isGameStart) {
            clientEvent.dispatchEvent(constant.EVENT_TYPE.ON_GAME_OVER);
        }
    }

    public static get isWin () {
        return this._isWin;
    }

    public static set gameSpeed (value: number) {
        if (this._gameSpeed === value) {
            return;
        }

        this._gameSpeed = value;
        console.log("gameSpeed", value);

        GameManager.refreshEffectSpeed(GameManager.ndGameManager, this._gameSpeed);
        GameManager.refreshEffectSpeed(FightMap.ndEnemy, this._gameSpeed);
        GameManager.refreshEffectSpeed(FightMap.ndBoss, this._gameSpeed);
    };

    public static get gameSpeed () {
        return this._gameSpeed;
    }

    private _testInterval: number = 0;
    private _kickPowerItemInfo: any = null;
    private _handPowerItemInfo: any = null;
    private _kickPowerValue: number = 0;//腿部力量系数
    private _handPowerValue: number = 0;//手臂力量系数
    private _aniComSkyBox: Animation = null!;//天空盒动画
    private _skyBoxQuat: Quat = new Quat();//天空盒旋转角度
    private _oriWaterWorPos: Vec3 = null!;//水节点初始世界坐标
    private _oriSkyBoxWorPos: Vec3 = null!;//天空盒节点初始世界坐标
    private _oriMainLightWorPos: Vec3 = null!;//主光源节点初始世界坐标
    private _curWaterWorPos: Vec3 = new Vec3();//水节点当前世界坐标
    private _curSkyBoxWorPos: Vec3 = new Vec3();//天空盒节点当前世界坐标
    private _curMainLightWorPos: Vec3 = new Vec3();//主光源节点当前世界坐标

    private static _gameSpeed: number = 1;//游戏速度
    private static _isWin: boolean = false;//是否取得胜利


    onEnable () {
        clientEvent.on(constant.EVENT_TYPE.ON_INIT_GAME, this._onInitGame, this);
        clientEvent.on(constant.EVENT_TYPE.ON_GAME_OVER, this._onGameOver, this);
        clientEvent.on(constant.EVENT_TYPE.ON_REVIVE, this._onRevive, this);
        clientEvent.on(constant.EVENT_TYPE.REFRESH_LEVEL, this._refreshLevel, this);
        clientEvent.on(constant.EVENT_TYPE.CHECK_LEVEL_UNLOCK_HAT_SKIN, this._checkLevelUnlockHatSkin, this);
        clientEvent.on(constant.EVENT_TYPE.HIT_FLY_ENEMY, this._hitFlyEnemy, this);
    }

    onDisable () {
        clientEvent.off(constant.EVENT_TYPE.ON_INIT_GAME, this._onInitGame, this);
        clientEvent.off(constant.EVENT_TYPE.ON_GAME_OVER, this._onGameOver, this);
        clientEvent.off(constant.EVENT_TYPE.ON_REVIVE, this._onRevive, this);
        clientEvent.off(constant.EVENT_TYPE.REFRESH_LEVEL, this._refreshLevel, this);
        clientEvent.off(constant.EVENT_TYPE.CHECK_LEVEL_UNLOCK_HAT_SKIN, this._checkLevelUnlockHatSkin, this);
        clientEvent.off(constant.EVENT_TYPE.HIT_FLY_ENEMY, this._hitFlyEnemy, this);
    }

    start () {
        GameManager.mainCamera = this.camera?.getComponent(Camera) as Camera;
        GameManager.scriptGameCamera = this.camera?.getComponent(GameCamera) as GameCamera;
        GameManager.ndGameManager = this.node;

        this._oriWaterWorPos = this.ndWater.worldPosition.clone();
        this._oriSkyBoxWorPos = this.ndSkyBox.worldPosition.clone();
        this._oriMainLightWorPos = this.ndLight.worldPosition.clone();
    }

    /**
     * 初始化游戏
     */
    private _onInitGame () {
        AudioManager.instance.init();
        uiManager.instance.showDialog("loading/loadingPanel");

        GameManager.isGameStart = false;
        GameManager.isGamePause = false;
        GameManager.isGameOver = false;
        GameManager.gameSpeed = 1;
        GameManager.gameStatus = constant.GAME_STATUS.RUN;
        GameManager.scriptGameCamera.resetCamera();
        GameManager.isWin = false;
        GameManager.isRevive = false;
        GameManager.isArriveEndLine = false;
        GameManager.ndPlayer?.destroy();
        GameManager.ndPlayer = null;

        this.diamond = 0;
        this.people = 0;
        this.multiple = 0;
        this.hitFlyEnemyPower = 0;

        this.ndWater.setWorldPosition(this._oriWaterWorPos);
        this.ndSkyBox.setWorldPosition(this._oriSkyBoxWorPos);

        playerData.instance.addFightTimes();

        this._refreshLevel();
    }

    /**
     * 更新关卡地图
     */
    private _refreshLevel () {
        console.log("###refreshLevel");

        this.scriptMapManager.recycle();

        this._loadMap(() => {
            this._createPlayer();
        });
    }

    private _loadMap (cb: Function = () => { }) {
        console.log("###loadMap");
        let level = playerData.instance.playerInfo.level;

        this.mapInfo = localConfig.instance.queryByID("map", level);

        GameManager.gameType = Number(this.mapInfo.type);
        //采用表格方式加载
        this.scriptMapManager.buildMap(this.mapInfo.mapName, () => { }, () => {
            cb && cb();
        })
    }

    /**
     * 监听游戏结束
     * @returns 
     */
    private _onGameOver () {
        if (GameManager.isGameOver) {
            return;
        }

        console.log("game over!", "isWin ?", GameManager.isWin);
        GameManager.isGameOver = true;

        setTimeout(() => {
            if (GameManager.isWin) {
                uiManager.instance.hideDialog("parkour/parkourPanel");

                let curLevel = playerData.instance.playerInfo.level;
                let nextLevel = curLevel + 1;
                let totalLevel = localConfig.instance.getTableArr("map").length;
                nextLevel = nextLevel > totalLevel ? 1 : nextLevel;
                playerData.instance.playerInfo.level = nextLevel;
                uiManager.instance.showDialog("settlement/settlementSuccessPanel", [this]);
            } else {
                uiManager.instance.showDialog("settlement/settlementFailPanel", [this]);
            }
        }, 1000)
    }

    /**
     * 复活
     */
    private _onRevive () {
        AudioManager.instance.playSound(constant.AUDIO_SOUND.REVIVE);

        GameManager.gameSpeed = 1;
        GameManager.isRevive = true;

        if (GameManager.gameStatus === constant.GAME_STATUS.RUN) {
            //删除前方一定范围的关卡
            clientEvent.dispatchEvent(constant.EVENT_TYPE.REDUCE_OBSTACLE);
        } else if (GameManager.gameStatus === constant.GAME_STATUS.FIGHT) {
            GameManager.isGameOver = false;

            if (GameManager.gameType === constant.GAME_TYPE.NORMAL) {
                FightMap.scriptEnemy.scriptManModel.playAni(constant.ANI_TYPE.IDLE, true);
            } else if (GameManager.gameType === constant.GAME_TYPE.BOSS) {
                FightMap.scriptBoss.playAni(constant.BOSS_ANI_TYPE.BOSS_FIGHT_IDLE, true);
            }
        }
    }

    private _createPlayer () {
        console.log("###createPlayer");

        resourceUtil.loadModelRes("man/player").then((pf: any) => {
            GameManager.ndPlayer = poolManager.instance.getNode(pf, this.node) as Node;

            let scriptGameCamera = GameManager.mainCamera?.node.getComponent(GameCamera) as GameCamera;
            scriptGameCamera.ndFollowTarget = GameManager.ndPlayer;

            let scriptPlayer = GameManager.ndPlayer?.getComponent(Player) as Player;
            GameManager.scriptPlayer = scriptPlayer;
            scriptPlayer?.initPlayer();

            clientEvent.dispatchEvent(constant.EVENT_TYPE.HIDE_LOADING_PANEL);
        })
    }

    /**
     * 刷新自节点的动画、粒子播放速度
     * @param targetNode 
     * @param value 
     * @returns 
     */
    public static refreshEffectSpeed (targetNode: Node, value: number) {
        if (!targetNode) {
            return;
        }
        let arrAni = targetNode.getComponentsInChildren(Animation);
        arrAni.forEach((item: Animation) => {
            item.clips.forEach((clip: any) => {
                let aniName = clip?.name as string
                let aniState = item.getState(aniName);
                aniState.speed = value;
            })
        })

        let arrSkeletalAni = targetNode.getComponentsInChildren(SkeletalAnimationComponent);
        arrSkeletalAni.forEach((item: SkeletalAnimationComponent) => {
            item.clips.forEach((clip: any) => {
                let aniName = clip?.name as string
                let aniState = item.getState(aniName);
                aniState.speed = value;
            })
        })

        let arrParticle = targetNode.getComponentsInChildren(ParticleSystemComponent);
        arrParticle.forEach((item: ParticleSystemComponent) => {
            item.simulationSpeed = value;
        })
    }

    public static addDiamond (value: number = 1) {
        playerData.instance.updatePlayerInfo('diamond', Math.ceil(value));
        clientEvent.dispatchEvent(constant.EVENT_TYPE.REFRESH_DIAMOND);
    }

    public static addKey (value: number = 1) {
        playerData.instance.updatePlayerInfo('key', value);
        clientEvent.dispatchEvent(constant.EVENT_TYPE.REFRESH_KEY);
    }

    public static resetAniState (aniCom: Animation, aniName: string) {
        aniCom.play(aniName);
    }

    /**
     * 检查关卡是否解锁皮肤
     */
    private _checkLevelUnlockHatSkin () {
        //判断关卡是否解锁皮肤
        let hatProgress = playerData.instance.getSetting(constant.SETTINGS_KEY.LEVEL_HAT_PROGRESS);
        let hatStatus = playerData.instance.getHatStatus(hatProgress.ID);

        // console.log("判断关卡是否解锁皮肤", playerData.instance.isLevelHatUnlockOver());

        if (!playerData.instance.isLevelHatUnlockOver() && hatProgress.progress === 100) {
            uiManager.instance.showDialog("skin/skinPanel", [constant.SKIN_HAT_CHANEL.LEVEL, constant.SKIN_TYPE.HAT, hatStatus, () => {
                playerData.instance.refreshHatProgress();
                clientEvent.dispatchEvent(constant.EVENT_TYPE.ON_INIT_GAME);
            }]);
        } else {
            clientEvent.dispatchEvent(constant.EVENT_TYPE.ON_INIT_GAME);
        }
    }

    private _hitFlyEnemy () {
        // 飞行距离=1+1*踢腿力量成长系数。
        let enemyHitFlyDistance = 1 + this.kickPowerValue;
        //战斗阶段加倍数=战斗阶段加倍数=飞行距离*0.4 + 1
        this.multiple = Math.ceil(enemyHitFlyDistance / 0.5) * 0.2 + 1;
        FightMap.scriptEnemy.hitFly(enemyHitFlyDistance);
        console.log("敌人被击飞距离", enemyHitFlyDistance, "目标倍数", this.multiple);
    }

    public update (deltaTime: number) {

        // if (GameLogic.isTest) {
        //     this._testInterval += deltaTime;
        //     if (this._testInterval >= 0.5) {
        //         this._testInterval = 0;
        //         console.log("gameSpeed",GameManager.gameSpeed);
        //     }
        // }

        //天空盒、水、主光源跟随玩家人物移动
        if (GameManager.scriptPlayer && GameManager.scriptPlayer.node && !GameManager.isGameOver) {
            let playerWorPos = GameManager.scriptPlayer.node.worldPosition.clone();

            Vec3.subtract(v3_offsetWorPosSkyBox, playerWorPos, this._oriSkyBoxWorPos);
            this._curSkyBoxWorPos.set(this._oriSkyBoxWorPos);
            this.ndSkyBox.setWorldPosition(this._curSkyBoxWorPos.add3f(0, 0, v3_offsetWorPosSkyBox.z));

            this._curWaterWorPos.set(this._oriWaterWorPos);
            Vec3.subtract(v3_offsetWorPosWater, playerWorPos, this._oriWaterWorPos);
            this.ndWater.setWorldPosition(this._curWaterWorPos.add3f(0, 0, v3_offsetWorPosWater.z));

            this._curMainLightWorPos.set(this._oriMainLightWorPos);
            Vec3.subtract(v3_offsetWorPosMainLight, playerWorPos, this._oriMainLightWorPos);
            this.ndLight.setWorldPosition(this._curMainLightWorPos.add3f(0, 0, v3_offsetWorPosMainLight.z + 6));
        }

        //天空盒子旋转
        Quat.fromEuler(this._skyBoxQuat, 0, 0.5 * deltaTime, 0);
        this.ndSkyBox.rotate(this._skyBoxQuat);

        //玩家进入战斗阶段后，根据自身比例，调整和宝箱， 敌人，boss的距离
        if (GameManager.isArriveEndLine && !GameManager.scriptPlayer.isArriveEnd) {
            let minDistance = 0;
            let curDistance = 0;

            if (GameManager.gameType === constant.GAME_TYPE.NORMAL) {
                minDistance = 0.35 + (Player.scaleRatio - 1) * 0.14;
                curDistance = GameManager.scriptPlayer.node.worldPosition.z - FightMap.ndEnemy.worldPosition.z;
            } else if (GameManager.gameType === constant.GAME_TYPE.REWARD) {
                minDistance = 0.35 + (Player.scaleRatio - 1) * 0.14;
                curDistance = GameManager.scriptPlayer.node.worldPosition.z - FightMap.ndBox.worldPosition.z;
            } else if (GameManager.gameType === constant.GAME_TYPE.BOSS) {
                minDistance = 0.55 + (Player.scaleRatio - 1) * 0.14;
                curDistance = GameManager.scriptPlayer.node.worldPosition.z - FightMap.ndBoss.worldPosition.z;
            }

            if (curDistance <= minDistance && !GameManager.scriptPlayer.isStopMove) {
                clientEvent.dispatchEvent(constant.EVENT_TYPE.ARRIVE_END);
                GameManager.gameStatus = constant.GAME_STATUS.FIGHT;
            }
        }

    }
}
