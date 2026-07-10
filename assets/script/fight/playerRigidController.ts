import { _decorator, Component, Node, Vec3, Quat, clamp, ColliderComponent, EventTouch } from 'cc';
import { constant } from './../framework/constant';
import { GameManager } from './gameManager';
import { PlayerRigid } from './playerRigid';
import { clientEvent } from '../framework/clientEvent';
const { ccclass, property } = _decorator;
const v3_0 = new Vec3();
const q_0 = new Quat();

@ccclass('PlayerRigidController')
export class PlayerRigidController extends Component {
    @property({ type: Node })
    public currentOrient: Node = null!;//当前朝向

    @property({ type: Node })
    public targetOrient: Node = null!;//目标朝向

    @property
    public rotateFactor = 0.1;//扭转角度

    @property({ type: Vec3 })
    public speed: Vec3 = new Vec3(1, 0, 1);//玩家速度

    protected _stateX: number = 0;  // 1 positive, 0 static, -1 negative
    protected _stateZ: number = 0;
    protected _speed = 0;

    private _collider: ColliderComponent = null!;
    private _character: PlayerRigid = null!;
    private _oriCurrentRotation: Quat = null!;//模型初始旋转角度
    private _oriTargetRotation: Quat = null!;//目标初始旋转角度
    private _oldX: number = 0;

    onEnable () {
        clientEvent.on(constant.EVENT_TYPE.ON_REVIVE, this._onRevive, this);

    }

    onDestroy () {
        clientEvent.off(constant.EVENT_TYPE.ON_REVIVE, this._onRevive, this);
    }

    start () {
        this._collider = this.getComponent(ColliderComponent)!;
        this._character = this.node.getComponent(PlayerRigid) as PlayerRigid;

        if (!this._oriCurrentRotation) {
            this._oriCurrentRotation = this.currentOrient.getRotation();
            this._oriTargetRotation = this.targetOrient.getRotation();
        }
    }

    /**
     * 人物复活时候转向前面
     */
    private _onRevive () {
        this.currentOrient.setRotation(this._oriCurrentRotation);
        this.targetOrient.setRotation(this._oriTargetRotation);
        this._stateX = 0;
    }

    public touchStart (touch: EventTouch) {
        this._stateX = 0;
    }

    public touchMove (touch: EventTouch) {
        let x = touch.getUIDelta().x;
        if (x > 0) {
            this._stateX = this.speed.x;
        } else if (x < 0) {
            this._stateX = -this.speed.x;
        } else {
            this._stateX = 0;
        }

        //前后移动间距为3才视为移动，避免太灵敏
        if (Math.abs(x - this._oldX) <= 3) {
            this._stateX = 0;
            this._oldX = 0;
        } else {
            this._oldX = x;
        }
    }

    public touchEnd (touch: EventTouch) {
        this._stateX = 0;
    }

    public touchCancel (touch: EventTouch) {
        this._stateX = 0;
    }

    private _updateCharacter (dt: number) {
        if (GameManager.isGameStart && !GameManager.isGameOver && !GameManager.isGamePause) {
            this._character.updateFunction(dt);

            if (GameManager.scriptPlayer.isStopMove) {
                return;
            }

            // rotate
            const qm = this.currentOrient.rotation;
            const qf = this.targetOrient.rotation;
            if (!Quat.equals(qm, qf)) {
                Quat.slerp(q_0, qm, qf, this.rotateFactor);
                this.currentOrient.worldRotation = q_0;
            }

            //超过终点线之后不能左右移动
            if (GameManager.isArriveEndLine) {
                this.speed.x = 0;
            }

            // move
            this._stateZ = this.speed.z;
            if (!this._character.onGround) return;
            if (this._stateX || this._stateZ) {
                v3_0.set(this._stateX, 0, this._stateZ);
                v3_0.normalize();
                v3_0.negative();
                this.targetOrient.forward = v3_0;
                v3_0.set(this.currentOrient.forward);
                v3_0.negative();
                const qm = this.currentOrient.rotation;
                const qf = this.targetOrient.rotation;
                const rs = clamp(this._rotationScalar(qm, qf), 0, 1);
                v3_0.x = Math.abs(v3_0.x) < 1e-7 ? 0 : v3_0.x;
                this._character.move(v3_0, 1);
            }
        }
    }

    private _rotationScalar (a: Quat, b: Quat) {
        const cosom = Math.abs(a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w);
        return cosom;
    }

    update (dtS: number) {
        const dt = 1000 / constant.GAME_FRAME;
        this._updateCharacter(dt);
    }
}