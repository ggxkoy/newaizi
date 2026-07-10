import { constant } from './../framework/constant';
import { clientEvent } from './../framework/clientEvent';
import { GameManager } from './gameManager';
import { _decorator, Component, Node, Vec3, isValid, tween, Quat, cclegacy } from 'cc';

const { ccclass, property } = _decorator;

let q_0: Quat = new Quat();
let v_0: Vec3 = new Vec3();
let v3_upDirection: Vec3 = new Vec3(0, 1, 0);
let v3_nextAngle: Vec3 = new Vec3();//相机旋转到下一个目标角度
let v3_nextTargetPos: Vec3 = new Vec3();//相机的下个目标位置
let v3_nextLookAtPos: Vec3 = new Vec3();//相机的下个目标看向向量
let v3_flyLookAtPos: Vec3 = new Vec3();//玩家飞行过程中看向的向量
let v3_flyTargetPos: Vec3 = new Vec3();//玩家飞行过程中目标位置
let q_climbing: Quat = new Quat();//爬坡时候的玩家四元数属性

@ccclass('GameCamera')
export class GameCamera extends Component {
    @property(Vec3)
    public oriLookAtOffset = new Vec3(0.05, 0.3, 0);//初始 摄像机看向人物的角度

    @property(Vec3)
    public oriPosOffset = new Vec3(0.2, 0.7, 1.5);//初始 摄像机和目标之间的位置间距

    // @property(Vec3)
    // public maxLookAtOffset = new Vec3(0.05, 0.7, 0);//开始游戏之后 摄像机看向人物的最大角度

    // @property(Vec3)
    // public maxPosOffset = new Vec3(0.2, 1.1, 2);//开始游戏之后 摄像机和目标之间的位置最大间距

    @property(Vec3)
    public minPosOffset = new Vec3(0.2, 1.1, 2)//开始游戏之后 摄像机和目标之间的位置最小间距，用于下坡

    @property(Vec3)
    public minLookAtOffset = new Vec3(0.05, 0.5, 0);//开始游戏之后 摄像机看向人物的最小角度

    public ndFollowTarget: Node = null!;//相机跟随的目标节点
    public isPutUpHeight: boolean = false;//是否已经在点击开始的时候抬升高度
    public isMovingCamera: boolean = false;//当前是否正在移动相机
    public moveLookAtPos: Vec3 = new Vec3();//目标看向坐标
    public curLookAtPos: Vec3 = new Vec3();//目前当前看向的目标   

    private _oriPosTarget: Vec3 = new Vec3();//目标节点初始位置
    private _oriEuler: Vec3 = null!;//目标节点初始欧拉角
    private _oriRotationCamera: Quat = new Quat();//相机初始角度
    private _addY: number = 0;//附加的y值（点击开始和上坡会用到）
    private _addZ: number = 0;//附加的z值 
 
    private _isMovingCameraFollowTarget: boolean = false;//相机跟随目标移动
    private _isInit: boolean = false;//是否已经初始化
    private _isCameraReady: boolean = false;//相机准备完毕
    private _curLookAtOffSet: Vec3 = new Vec3(); //当前 摄像机看向人物的角度
    private _curPosOffset: Vec3 = new Vec3();//当前 摄像机和目标之间的位置间距
    private _isChangeOffset: boolean = false;//是否改变摄像机和人物之间的间距和角度
    private _targetPosOffset: Vec3 = new Vec3();//取最大或者最小的间距
    private _targetLookAtOffset: Vec3 = new Vec3();//取最大或者最小的角度
    private _curCameraWorPos: Vec3 = null!;//记录当前摄像机世界坐标
    private _tempPos: Vec3 = null!;//临时的三纬变量
    // private _hitColliderMovePos: Vec3 = new Vec3();//撞击到障碍后镜头移动的目标位置

    constructor() {
        super();
    }

    onLoad () {
       this.resetCamera();
    }

    onEnable () {
        clientEvent.on(constant.EVENT_TYPE.CHANGE_OFFSET, this._changeOffset, this);
    }

    onDisable () {
        clientEvent.on(constant.EVENT_TYPE.CHANGE_OFFSET, this._changeOffset, this);
    }

    start() {
        // Your initialization goes here.
      
    }

    /**
     * 更新相机和玩家间距
     */
    public _changeOffset () {
        this._isChangeOffset = true;
        this._targetPosOffset = this.minPosOffset.clone();
        this._targetLookAtOffset = this.minLookAtOffset.clone();
    }

    /**
     * 重置摄像机相关数据
     */
    public resetCamera () {
        this._curLookAtOffSet = this.oriLookAtOffset.clone();
        this._curPosOffset = this.oriPosOffset.clone();
        this._isChangeOffset = false;
        this.isMovingCamera = false;
        this._addY = 0;
        this._addZ = 0;
        this._isMovingCameraFollowTarget = false;
        this._curCameraWorPos = null!;
    }

    // /**
    //  * 移动相机
    //  *
    //  * @param {Vec3} worPos 相机的位置
    //  * @param {Vec3} lookAtPos 相机的朝向
    //  * @param {Function} [callback=()=>{}]
    //  * @param {number} [costTime=2]
    //  * @param {boolean} [isClockWise=false] 是否顺时针
    //  * @memberof GameCamera
    //  */
    // public moveCamera (worPos: Vec3, lookAtPos: Vec3, callback: Function = ()=>{} , costTime: number = 2, isClockWise: boolean = false) {
    //     this.moveLookAtPos = lookAtPos;       

    //     this.isMovingCamera = true;
    //     this._isMovingCameraFollowTarget = false;

    //     tween(this.node)
    //     .to(costTime, {worldPosition: worPos}, {easing: 'smooth'})
    //     .call(()=>{
    //         callback && callback()
    //     })
    //     .start();

    //     setInterval(()=>{
            
    //     }, 1000 / 60)
    // }

    /**
     * 移动相机
     *
     * @param {Vec3} worPos 目标位置
     * @param {Vec3} lookAtPos 看向位置
     * @param {Function} [callback=()=>{}] 移动完后回调函数 
     * @param {number} [costTime=2] 移动时间
     * @param {boolean} [isClockWise=false] 是否顺时针
     * @memberof GameCamera
     */
    public moveCamera (worPos: Vec3, lookAtPos: Vec3, callback: Function = ()=>{} , costTime: number = 2, isClockWise: boolean = false) {
        this.moveLookAtPos = lookAtPos;       
        Vec3.subtract(v_0, worPos, lookAtPos);
        Vec3.normalize(v_0, v_0);
        Quat.fromViewUp(q_0, v_0, v3_upDirection);

        this.isMovingCamera = true;
        this._isMovingCameraFollowTarget = false;
        //转向后的角度
        let targetAngle = q_0.getEulerAngles(new Vec3()) as Vec3;

        //转成正的角度
        targetAngle.y = targetAngle.y < 0 ? targetAngle.y + 360 : targetAngle.y;
        let curCameraAngleY = this.node.eulerAngles.clone().y;
        curCameraAngleY = curCameraAngleY < 0 ? curCameraAngleY + 360 : curCameraAngleY;

        //目标角度和当前相机角度的偏差
        let offsetAngleY = 0;
        let offset_0 = 0;
        let offset_1 = 0;
        if (Math.round(curCameraAngleY) % 360 === 0) {
            offset_0 = Math.abs(0 - targetAngle.y);
            offset_1 = Math.abs(360 - targetAngle.y);
        } else if (Math.round(targetAngle.y) % 360 === 0) {
            offset_0 = Math.abs(0 - curCameraAngleY);
            offset_1 = Math.abs(360 - curCameraAngleY);
        } else {
            offset_0 = Math.abs(targetAngle.y - curCameraAngleY);
            if (targetAngle.y >= curCameraAngleY) {
                offset_1 = curCameraAngleY + 360 - targetAngle.y;
            } else {
                offset_1 = targetAngle.y + 360 - curCameraAngleY;
            }
        }

        //取两个角度之间最小的角度差
        offsetAngleY = offset_0 < offset_1 ? offset_0 : offset_1;

        //顺时针减去，逆时针加上
        offsetAngleY = isClockWise ? - offsetAngleY : offsetAngleY;
        let angle = this.node.eulerAngles.clone();

        if (offsetAngleY !== 0) {
            if (Math.round(angle.y) === -180 && isClockWise) {
                angle.y = 180;
                this.node.eulerAngles = new Vec3(angle.x, 180, angle.z);
            } else if (Math.round(angle.y) === 180 && !isClockWise) {
                angle.y = -180;
                this.node.eulerAngles = new Vec3(angle.x, -180, angle.z);
            }

            angle.y = angle.y + offsetAngleY;
        } 

        // console.log("目标角度", targetAngle.y, "当前角度", curCameraAngleY, "是否是顺时针", isClockWise);
        v3_nextAngle.set(targetAngle.x, angle.y, targetAngle.z);

        tween(this.node)
        .to(costTime, {worldPosition: worPos, eulerAngles: v3_nextAngle}, {easing: 'smooth'})
        .call(()=>{
            callback && callback()
        })
        .start();
    }

    /**
     * 相机跟随目标移动
     * @param targetNode 
     */
    public moveCameraFollowTarget (targetNode: Node) {
        // return;
        this._isMovingCameraFollowTarget = true;
        this.isMovingCamera = false;
        this.ndFollowTarget = targetNode;
    }

    /**
     * 撞到障碍镜头移动: 镜头在一定时间内缓动到指定位置，然后镜头再回到原来的视角和高度
     */
    // public moveCameraHitCollider (targetOffset: Vec3) {
    //     this._hitColliderMovePos = targetOffset;
    //     //撞墙后视角往右前方移动
    //     let cameraWorPos = this.node.worldPosition.clone() as Vec3;
    //     let cameraMoveWorPos = new Vec3(cameraWorPos.x + targetOffset.x, cameraWorPos.y + targetOffset.y, cameraWorPos.z - targetOffset.z);

    //     this.moveCamera(cameraMoveWorPos, this.curLookAtPos, ()=>{
    //     //     cameraMoveWorPos = new Vec3(cameraWorPos.x, cameraWorPos.y, cameraWorPos.z - 2);
    //     //     this.moveCamera(cameraMoveWorPos, this.curLookAtPos, ()=>{
    //             this.isMovingCamera = false;
                
    //     //     }, 1)
    //     }, 1);
    // }

    lateUpdate(deltaTime: number) {
        if (this._isChangeOffset) {
            this.isPutUpHeight = true;
            
            if (this._addY > 0) {
                this._addY -= deltaTime;
            }

            this._curPosOffset = this._curPosOffset.lerp(this._targetPosOffset, 0.08);
            this._curLookAtOffSet = this._curLookAtOffSet.lerp(this._targetLookAtOffset, 0.08);

            let offset = this._curPosOffset.clone().subtract(this._targetPosOffset.clone());
            // console.log("offset", offset.length());
            if (offset.length() <= 0.01) {
                this._isChangeOffset = false;
                // console.log("达到最小高度");
                // this._targetPosOffset = this.minPosOffset;
            }
        }

        if (!this._isInit) {
            if (this.ndFollowTarget) {
                this._isInit = true;
                // this._oriRotationTarget = this.ndFollowTarget?.getRotation() as Quat;
                this._oriPosTarget = this.ndFollowTarget?.worldPosition.clone();
                this._tempPos = this.ndFollowTarget.worldPosition.clone();
            }

            return;
        }

        if (!this.isPutUpHeight && GameManager.isGameStart) {
            // this._addY += deltaTime * 0.5;
            // this._addZ -= deltaTime * 0.5;
        } else {
            if (this._addZ > 0) {
                this._addZ -= deltaTime;
            }
        }

        //移动相机时,相机看向目标
        if (this.isMovingCamera) {
            // this.curLookAtPos.lerp(this.moveLookAtPos, deltaTime * 3 * GameManager.gameSpeed);
            // this.node.lookAt(this.curLookAtPos, new Vec3(0, 1, 0));
            return;
        }

        //普通关敌人被击飞，相机跟随移动
        if (this._isMovingCameraFollowTarget) {  
            if (!this._curCameraWorPos) {
                this._curCameraWorPos = this.node.worldPosition.clone();
            }           

            let enemyWorPos = this.ndFollowTarget?.worldPosition.clone() as Vec3;
            v3_flyTargetPos.set(0.5, this._curCameraWorPos.y + 0.3, enemyWorPos.z + 2.5);
            let cameraPos = this.node.worldPosition.clone();

            cameraPos.lerp(v3_flyTargetPos, 0.2 * GameManager.gameSpeed);
            this.node.setWorldPosition(cameraPos);

            v3_flyLookAtPos.set(0,  0.7, enemyWorPos.z - 1);

            this.curLookAtPos.lerp(v3_flyLookAtPos, 0.3 * GameManager.gameSpeed);
            this.node.lookAt(this.curLookAtPos, v3_upDirection);
            return;
        }

        //跑酷阶段相机跟随
        if (isValid(this.ndFollowTarget) && isValid(this.node)) {

            let rotationPlayer = this.ndFollowTarget.getRotation();

            // 上坡和下坡
            if (this._isCameraReady) {
                let playerRotationX = Number(rotationPlayer.x.toFixed(3));
                // console.log("playerRotationX", playerRotationX);

                //得有一定角度才视为上坡或者下坡
                if (Math.abs(playerRotationX) >= 0.01) {
                    //如果玩家的角度分量x小于相机初始角度的x分量，则表示正在爬坡
                    if (playerRotationX > 0 && playerRotationX > this._oriRotationCamera.x) {
                        let rotationCamera = this.node.getRotation().clone();
                        q_climbing.set(-playerRotationX, rotationCamera.y, rotationCamera.z, rotationCamera.w);
                        this.node.setRotation(q_climbing);
                        this._addY +=  Math.abs(playerRotationX) * deltaTime * 5;
                        this._addY = this._addY >= 3 ? 3 : this._addY;
                    } else {
                        //水平移动或者向下俯冲则减小附加高度
                        if (playerRotationX <= 0) {
                            //坡度越平，降低速度越快
                            this._addY -= (0.002 - playerRotationX * 0.07);
                            this._addY = this._addY <= 0 ? 0 : this._addY;
                            
                            this._targetPosOffset = this.minPosOffset;
                            this._targetLookAtOffset = this.minLookAtOffset;
                            
                            if (!this._isChangeOffset) {
                                this._isChangeOffset = true;
                            }
                        }
                    }
                }
            }

            this._tempPos = this._tempPos.lerp(this.ndFollowTarget.worldPosition.clone(), 0.1);
            // this._tempPos = this.ndFollowTarget.worldPosition;
            
            v3_nextTargetPos.set(this._tempPos.x + this._curPosOffset.x, this.ndFollowTarget.worldPosition.y + this._curPosOffset.y + this._addY, this.ndFollowTarget.worldPosition.z + this._curPosOffset.z + this._addZ);
            this.node.setWorldPosition(v3_nextTargetPos);

            v3_nextLookAtPos.set(this._curLookAtOffSet.x, this.ndFollowTarget.worldPosition.y + this._curLookAtOffSet.y, this.ndFollowTarget.worldPosition.z + this._curLookAtOffSet.z);
            this.node.lookAt(v3_nextLookAtPos, v3_upDirection);
            this.curLookAtPos = v3_nextLookAtPos;

            //设置相机默认初始角度
            if (!this._oriEuler) {
                this._oriEuler = this.node?.eulerAngles.clone();
            }

            //相机跟随人物角度
            let angle = this.node.eulerAngles.clone();
            angle.y = this._oriEuler.y;
            this.node.eulerAngles = angle;
            
            //相机固定化好了之后获取初始的rotation
            if (!this._isCameraReady) {
                this._isCameraReady = true;
                this._oriRotationCamera = this.node.getRotation();
            }
        } 
    }
}
