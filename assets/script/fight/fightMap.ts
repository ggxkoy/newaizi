import { ColliderItem } from './colliderItem';
import { constant } from './../framework/constant';
import { GameManager } from './gameManager';
import { _decorator, Component, Node, RigidBodyComponent, Color, MeshRenderer, Material, Animation, isValid } from "cc";
import { resourceUtil } from "../framework/resourceUtil";
import { poolManager } from "../framework/poolManager";
import { localConfig } from "../framework/localConfig";
import { Boss } from "./boss";
import { Enemy } from "./enemy";
import { clientEvent } from '../framework/clientEvent';
const { ccclass, property } = _decorator;

const BOARD_NUM = 25;//面板数量
@ccclass("FightMap")
export class FightMap extends Component {
    @property([Material])
    public arrNumItemMaterial: Material[] = [];//普通关分数文字材质
    public arrModuleData: any = {};//模块数据

    public static ndRoadEnd: Node;//终点的地块
    public static ndEnemy: Node; //普通关的敌人
    public static ndBoss: Node; //boss
    public static ndBox: Node;//宝箱
    public static ndRoadScore: Node;//道路模块里面的倍数跑道
    public static ndWall: Node; //墙
    public static scriptBoss: Boss;
    public static scriptEnemy: Enemy;
    public static arrEffective: number[] = [];//无敌时候依然有效的障碍

    private _dictModuleType: any;//待加载的模块种类
    private _arrItem: any = [];//存放各项模块节点信息, 除了道路,在玩家后面一定距离则进行回收
    private _arrRoad: Node[] = [];//道路节点
    private _arrMap: any = [];//当前关卡数据表
    private _completeListener: Function = () => { };//加载完成回调
    private _arrBoard: any = [];//普通关倍数面板
    private _loadResLength: number = 10;//玩家当前位置z值往后20的模块需要加载
    private _arrColor = [//倍数面板展示状态的色值
        new Color().fromHEX("#250DD6"),
        new Color().fromHEX("#350DD6"),
        new Color().fromHEX("#650DD6"),
        new Color().fromHEX("#9E0DD6"),
        new Color().fromHEX("#CC0F4A"),
        new Color().fromHEX("#E21B2B"),
        new Color().fromHEX("#E2331B"),
        new Color().fromHEX("#E25B1B"),
        new Color().fromHEX("#E2821B"),
        new Color().fromHEX("#E2AA1B"),
        new Color().fromHEX("#92E21B"),
        new Color().fromHEX("#4BE21B"),
        new Color().fromHEX("#1BE23B"),
        new Color().fromHEX("#1BE28A"),
        new Color().fromHEX("#129BDB"),
        new Color().fromHEX("#0F4BCC"),
        new Color().fromHEX("#0F2DCC"),
        new Color().fromHEX("#0F1ECC"),
        new Color().fromHEX("#1E0FCC"),
        new Color().fromHEX("#250DD6"),
        new Color().fromHEX("#350DD6"),
        new Color().fromHEX("#650DD6"),
        new Color().fromHEX("#CC0F4A"),
        new Color().fromHEX("#E21B2B"),
        new Color().fromHEX("#E2331B"),
    ];

    onEnable () {
        clientEvent.on(constant.EVENT_TYPE.REDUCE_OBSTACLE, this._reduceObstacle, this);
        clientEvent.on(constant.EVENT_TYPE.CHECK_EFFECTIVE, this._checkEffective, this);
        clientEvent.on(constant.EVENT_TYPE.SHOW_SCORE_LINE, this._showScoreLine, this);
        clientEvent.on(constant.EVENT_TYPE.ARRIVE_END_LINE, this._arriveEndLine, this);
    }

    onDisable () {
        clientEvent.off(constant.EVENT_TYPE.REDUCE_OBSTACLE, this._reduceObstacle, this);
        clientEvent.off(constant.EVENT_TYPE.CHECK_EFFECTIVE, this._checkEffective, this);
        clientEvent.off(constant.EVENT_TYPE.SHOW_SCORE_LINE, this._showScoreLine, this);
        clientEvent.off(constant.EVENT_TYPE.ARRIVE_END_LINE, this._arriveEndLine, this);
    }

    start () {
        // Your initialization goes here.
    }

    //构建地图
    public buildMap (mapName: string, progressCb: Function, completeCb: Function) {
        this._completeListener = completeCb;
        //构建地面
        this._dictModuleType = {};

        this._arrItem = [];
        this._arrMap = [];
        this._arrRoad = [];

        let moduleData = localConfig.instance.getTableArr('module');
        moduleData.forEach((item: any) => {
            if (!this._dictModuleType.hasOwnProperty(item.type)) {
                this._dictModuleType[item.type] = [];
            }
        });

        this._arrMap = localConfig.instance.getTableArr(mapName).concat();

        this._buildRoad(() => {
            this._buildWall(() => {
                //按照z值排序
                this._arrMap = this._arrMap.sort((a: any, b: any) => {
                    let aPosZ = Number(a.position.split(",")[2]);
                    let bPosZ = Number(b.position.split(",")[2]);

                    return bPosZ - aPosZ;
                })

                for (let i = this._arrMap.length - 1; i >= 0; i--) {
                    const item = this._arrMap[i];
                    let z = Number(item.position.split(",")[2]);
                    if (z > GameManager.oriPlayerWorPos.z - this._loadResLength) {
                        let moduleInfo = localConfig.instance.queryByID('module', item.name);
                        this._dictModuleType[moduleInfo.type].push(item);
                        this._arrMap.splice(i, 1);
                    }
                }

                let arrPromise = [];

                for (const i in this._dictModuleType) {
                    let item = this._dictModuleType[i];
                    if (item.length) {
                        arrPromise.push(this._buildModel(i));
                    }
                }

                Promise.all(arrPromise).then(() => {
                    this._completeListener && this._completeListener();
                }).catch((e) => {
                    console.log("load item module err", e);
                })
            })
        })
    }

    /**
     * 加载道路（考虑到道路模块不多，且动态加载道路可能导致卡顿，所以先加载全部道路，loading时间稍微多一丢丢）
     * @param callback 
     */
    private _buildRoad (callback: Function) {
        for (let i = this._arrMap.length - 1; i >= 0; i--) {
            let element = this._arrMap[i];
            let moduleInfo = localConfig.instance.queryByID("module", element.name);
            if (moduleInfo.type === "road") {
                this._dictModuleType["road"].push(element);
                this._arrMap.splice(i, 1);
            }
        }

        this._buildModel("road").then(() => {
            callback && callback();
        }).catch((e) => {
            console.log("load road module err", e);
        })
    }

    /**
     * 加载墙
     * @param callback 
     */
    private _buildWall (callback: Function) {
        for (let i = this._arrMap.length - 1; i >= 0; i--) {
            let element = this._arrMap[i];
            let moduleInfo = localConfig.instance.queryByID("module", element.name);
            if (moduleInfo.type === "wall") {
                this._dictModuleType["wall"].push(element);
                this._arrMap.splice(i, 1);
            }
        }

        this._buildModel("wall").then(() => {
            callback && callback();
        }).catch((e) => {
            console.log("load wall module err", e);
        })
    }

    private _buildModel (type: string) {
        return new Promise((resolve, reject) => {
            let arrPromise = [];

            let objItems = this._dictModuleType[type];//同类型的信息
            this._dictModuleType[type] = [];

            for (let idx = 0; idx < objItems.length; idx++) {
                let child = objItems[idx];
                let moduleInfo = localConfig.instance.queryByID("module", child.name);

                let modelPath = `${type}/${moduleInfo.name}`;
                let p = resourceUtil.loadMapModelRes(modelPath).then((prefab: any) => {
                    let parentName = type + 'Group';//先创建父节点
                    let ndParent = this.node.getChildByName(parentName);

                    if (!ndParent) {
                        ndParent = new Node(parentName);
                        ndParent.parent = this.node;
                    }

                    let ndChild = poolManager.instance.getNode(prefab, ndParent) as Node;
                    let position = child.position ? child.position.split(',') : moduleInfo.position.split(',');
                    let scale = child.scale ? child.scale.split(',') : moduleInfo.scale.split(',');
                    ndChild.setPosition(Number(position[0]), Number(position[1]), Number(position[2]));
                    ndChild.setScale(Number(scale[0]), Number(scale[1]), Number(scale[2]));

                    if (child.name == constant.MODULE_TYPE.ROAD_11) {
                        FightMap.ndRoadEnd = ndChild;
                        let ndFireGroup = FightMap.ndRoadEnd.getChildByName("fireGroup") as Node;
                        ndFireGroup.active = false;
                    } else if (child.name == constant.MODULE_TYPE.PEOPLE_ENEMY) {
                        FightMap.ndEnemy = ndChild;
                        FightMap.scriptEnemy = ndChild.getComponent(Enemy) as Enemy;
                        FightMap.scriptEnemy.init();
                    } else if (child.name == constant.MODULE_TYPE.PEOPLE_BOSS) {
                        FightMap.ndBoss = ndChild;
                        FightMap.scriptBoss = ndChild.getComponent(Boss) as Boss;
                        FightMap.scriptBoss.init();
                    } else if (child.name == constant.MODULE_TYPE.BOX) {
                        FightMap.ndBox = ndChild;
                        let aniComBox = ndChild.getChildByName("box")?.getComponent(Animation) as Animation;
                        //重置箱子动画为第1帧
                        aniComBox.getState("boxOpen").time = 0;
                        aniComBox.getState("boxHit").time = 0;
                        //重新采样生效
                        aniComBox.getState("boxOpen").sample();
                        aniComBox.getState("boxHit").sample();
                    } else if (child.name == constant.MODULE_TYPE.ROAD_13) {
                        FightMap.ndRoadScore = ndChild;
                        ndChild.active = false;
                    } else if (child.name == constant.MODULE_TYPE.WALL) {
                        FightMap.ndWall = ndChild;
                        let arrBrickGroup1 = ndChild.getChildByName("brick01Group")?.getComponentsInChildren(RigidBodyComponent) as any;
                        let arrBrickGroup2 = ndChild.getChildByName("brick02Group")?.getComponentsInChildren(RigidBodyComponent) as any;

                        let arrBrickGroup = arrBrickGroup1?.concat(arrBrickGroup2);

                        arrBrickGroup.forEach((item: RigidBodyComponent) => {
                            item.enabled = false;
                            item.useGravity = false;
                            item.sleep();
                        })
                    } else if (child.name === constant.MODULE_TYPE.PEOPLE_GREEN || child.name === constant.MODULE_TYPE.PEOPLE_RED || child.name === constant.MODULE_TYPE.PEOPLE_YELLOW) {
                        let scriptPeople = ndChild.getComponent(ColliderItem) as ColliderItem;
                        scriptPeople.init();
                    }

                    if (moduleInfo.type !== "road") {
                        this._arrItem.push(ndChild);
                    } else if (child.name !== constant.MODULE_TYPE.ROAD_13) {
                        this._arrRoad.push(ndChild);
                    }
                })

                arrPromise.push(p);
            }

            Promise.all(arrPromise).then(() => {
                let arr = this._arrItem.sort((a: any, b: any) => {
                    let aPosZ = a.worldPosition.z;
                    let bPosZ = b.worldPosition.z;
                    return bPosZ - aPosZ;
                })

                this._arrItem = arr;
                resolve(null);
            }).catch((e) => {
                console.log("e", e);
            })
        })
    }

    /**
     * 回收模块
     */
    public recycle () {
        for (let index = 0; index < this._arrItem.length; index++) {
            const element = this._arrItem[index];
            this._recycleModel(element);
        }

        for (let index = 0; index < this._arrRoad.length; index++) {
            const element = this._arrRoad[index];
            this._recycleModel(element);
        }

        //移除所有子节点，包括道路
        this.node.removeAllChildren();
    }

    /**
     * 回收子模块
     * @param ndItem 
     */
    private _recycleModel (ndItem: Node) {
        if (ndItem.name === "wall") {
            ndItem.destroy();
            //墙不好复用，直接干掉
            console.log("删掉墙");
        } else {
            poolManager.instance.putNode(ndItem);
        }
    }

    /**
     * 复活成功后删除玩家前方一定范围的障碍
     */
    private _reduceObstacle () {
        let dictModule = localConfig.instance.queryByCondition("module", { isEnableHide: 1 }) as any;

        if (!Object.keys(dictModule).length) {
            return;
        }

        let arrType: any = [];

        for (const key in dictModule) {
            if (Object.prototype.hasOwnProperty.call(dictModule, key)) {
                const element = dictModule[key];
                arrType.push(element.type);
            }
        }

        let playerWorPos = GameManager.scriptPlayer.node.worldPosition.clone();

        for (let i = 0; i < this.node.children.length; i++) {
            let ndGroup = this.node.children[i];
            let prefix = ndGroup.name.split("Group")[0];
            if (arrType.includes(prefix)) {
                for (let index = ndGroup.children.length - 1; index >= 0; index--) {
                    let ndChild = ndGroup.children[index];
                    let childWorPos = ndChild.worldPosition.clone();

                    //将距离玩家前方为5和距离玩家后方2的障碍清理掉
                    if (childWorPos.z >= playerWorPos.z - 5 && childWorPos.z <= playerWorPos.z + 2) {
                        // console.log("删除障碍", ndChild, "障碍当前z值", ndChild.worldPosition.z, "玩家当前z值", playerWorPos.z);
                        this._recycleModel(ndChild);
                    }
                }
            }
        }
    }

    /**
     * 无敌时候依然生效的障碍
     */
    private _checkEffective () {
        if (!FightMap.arrEffective.length) {
            let dictModule = localConfig.instance.queryByCondition("module", { isEffective: 1 }) as any;

            if (!Object.keys(dictModule).length) {
                return;
            }

            for (const key in dictModule) {
                if (Object.prototype.hasOwnProperty.call(dictModule, key)) {
                    const element = dictModule[key];
                    FightMap.arrEffective.push(element.ID);
                }
            }
        }
    }

    /**
     * 初始化普通关的终点的加倍分数值
     */
    private _initScoreLine () {
        if (GameManager.gameType === constant.GAME_TYPE.NORMAL) {
            let ndScoreLineColor = FightMap.ndRoadScore.getChildByName("scoreLineColor");

            let ndBoard = ndScoreLineColor?.getChildByName("board") as Node;
            ndBoard?.children.forEach((item: Node, idx: number, arr: any) => {
                this._arrBoard.push({ idx: idx, node: item });
                item.active = false;
            })

            let ndNumParent = ndScoreLineColor?.getChildByName("num") as Node;
            ndNumParent.removeAllChildren();

            resourceUtil.loadModelRes("roadScore/numItem").then((prefab: any) => {
                for (let i = 0; i < BOARD_NUM; i++) {
                    let numSingleDigit = i <= 4 ? Math.ceil((i + 1) / 4) : Math.ceil((i + 2) / 5);
                    let ndSingleDigitItem = poolManager.instance.getNode(prefab, ndNumParent) as Node;
                    ndSingleDigitItem.setPosition(-0.006, 1.007, -0.242 - i * 0.5);
                    ndSingleDigitItem.setScale(0.01332, 0.528, 0.01595);
                    let meshComSingleDigit = ndSingleDigitItem.getComponent(MeshRenderer) as MeshRenderer;
                    meshComSingleDigit?.setMaterial(this.arrNumItemMaterial[numSingleDigit], 0);
                }

                for (let i = 0; i < BOARD_NUM; i++) {
                    let numDecimal = Math.round(((i + 1) / 5 - Math.floor((i + 1) / 5)) * 10);
                    let ndDecimal = poolManager.instance.getNode(prefab, ndNumParent) as Node;
                    ndDecimal.setPosition(0.129, 1.007, -0.242 - i * 0.5);
                    ndDecimal.setScale(0.01332, 0.528, 0.01595);
                    let meshComDecimal = ndDecimal.getComponent(MeshRenderer) as MeshRenderer;
                    meshComDecimal?.setMaterial(this.arrNumItemMaterial[numDecimal], 0);
                }
            })
        }
    }

    /**
     * 普通关玩家击飞敌人后展示倍数道路
     */
    private _showScoreLine () {
        FightMap.ndRoadScore.active = true;
    }

    /**
     * 到达终点后展示火焰，并初始化倍数道路数据
     */
    private _arriveEndLine () {
        let ndFireGroup = FightMap.ndRoadEnd.getChildByName("fireGroup") as Node;
        ndFireGroup.active = true;

        this._initScoreLine();
    }

    update (deltaTime: number) {
        //普通关敌人击飞倍数块展示
        if (!GameManager.isGameOver && GameManager.gameType === constant.GAME_TYPE.NORMAL && Enemy.isHitFly) {
            for (var i = this._arrBoard.length - 1; i >= 0; i--) {
                let item = this._arrBoard[i] as any;
                if (item.node.worldPosition.z >= FightMap.ndEnemy.worldPosition.z - 0.5) {
                    item.node.active = true;
                    let ndBoard = item.node.getChildByName("RootNode")?.getChildByName("board") as Node;
                    let meshComBoard = ndBoard.getComponent(MeshRenderer) as MeshRenderer;
                    let materialBoard = meshComBoard.materials[0];
                    materialBoard?.setProperty("mainColor", new Color(this._arrColor[item.idx]));
                    this._arrBoard.splice(i, 1);
                }
            }
        }

        if (GameManager.scriptPlayer?.node && !GameManager.isArriveEndLine && !GameManager.scriptPlayer.isDie) {
            //距离玩家前方一定距离则生成道具和障碍
            if (this._arrMap.length) {
                let firstItem = this._arrMap[0];
                let z = Number(firstItem.position.split(",")[2]);
                if (z > GameManager.scriptPlayer.node.worldPosition.z - this._loadResLength) {
                    let moduleInfo = localConfig.instance.queryByID('module', firstItem.name);
                    this._dictModuleType[moduleInfo.type].push(firstItem);
                    this._buildModel(moduleInfo.type);
                    this._arrMap.splice(0, 1);
                }
            }

            //小于玩家一定距离的道路的active才设置为true,一开始设置为false
            this._arrRoad.forEach((ndRoad: Node) => {
                if (GameManager.ndPlayer) {
                    if (ndRoad.worldPosition.z > GameManager.ndPlayer.worldPosition.z - this._loadResLength) {
                        ndRoad.active = true;
                    } else if (ndRoad.worldPosition.z < GameManager.ndPlayer.worldPosition.z) {
                        ndRoad.active = false;
                    }
                }
            })

            if (this._arrItem.length) {
                const firstElement = this._arrItem[0] as Node;
                if (!firstElement.parent) {
                    if (firstElement.scale === null) {
                        //复活后被清除的障碍中的墙在_reduceObstacle函数被destroy了，所以到这里也destroy掉
                        firstElement.destroy();
                    } else {
                        //将碰到的障碍，吃到的小人、钻石、金币等节点回收
                        this._recycleModel(firstElement);
                    }
                    this._arrItem.splice(0, 1);
                } else {
                    let worPosZ: number = firstElement.worldPosition.z;
                    //将玩家身后距离为1.5的非道路节点回收
                    if (worPosZ > GameManager.scriptPlayer.node.worldPosition.z + 1.5) {
                        this._recycleModel(firstElement);
                        this._arrItem.splice(0, 1);
                        // console.log("将玩家身后距离为1.5的模块回收", "z: ", worPosZ, "name: ", firstElement.name, "玩家当前z值", GameManager.scriptPlayer.node.worldPosition.z);
                    }
                }
            }
        }
    }
}
