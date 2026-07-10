import { _decorator, Component, Node, Vec3, RigidBodyComponent, EPSILON, ColliderComponent, ICollisionEvent, IContactEquation, Collider, RigidBody, PhysicsSystem } from 'cc';
import { constant } from './../framework/constant';
import { clientEvent } from '../framework/clientEvent';
import { util } from '../framework/util';
import { GameManager } from './gameManager';

const { ccclass, property } = _decorator;
const _v3_0 = new Vec3();

class ContactPoint {
    point = new Vec3();
    normal = new Vec3();
    collider!: Collider;
    assign (ce: IContactEquation, c: Collider) {
        if (ce.isBodyA) {
            ce.getWorldNormalOnB(this.normal);
            ce.getWorldPointOnA(this.point);
        } else {
            (ce as any).getWorldNormalOnA(this.normal);
            ce.getWorldPointOnB(this.point);
        }
        this.collider = c;
        return this;
    }
}

const _ctPool: ContactPoint[] = [];
class ContactPool {
    static getContacts (ces: IContactEquation[], c: Collider, cps: ContactPoint[]) {
        for (let i = 0; i < ces.length; i++) {
            cps.push(this.getContact(ces[i], c));
        }
    }
    static getContact (ce: IContactEquation, c: Collider): ContactPoint {
        const cp = _ctPool.length > 0 ? _ctPool.pop()! : new ContactPoint();
        return cp.assign(ce, c);
    }
    static recyContacts (cps: ContactPoint[]) {
        Array.prototype.push.call(_ctPool, ...cps);
        cps.length = 0;
    }
}

@ccclass('PlayerRigid')
export class PlayerRigid extends Component {
    @property
    public maxSpeed = 5;//最大速度

    @property
    public damping = 0.5;//阻尼

    @property
    public slopeLimit = 30;//坡度限制

    @property
    public gravity = -20;//重力

    private _rigidBody: RigidBodyComponent = null!;
    private _collider: ColliderComponent = null!;
    private _grounded = true;
    private _toSteep = false;
    private _contacts: ContactPoint[] = [];
    private _groundContact: ContactPoint = null!;
    private _groundNormal = Vec3.UP.clone();
    private _initTargetPosition: Vec3 = new Vec3();
    private _initCameraPosition: Vec3 = new Vec3();
    private _altitudeDiff: number = 0;
    private _velocity = new Vec3();
    private _curMaxSpeed: number = 0;//当前最大速度
    private _invincibleSpeed: number = 0;//无敌状态的速度
    private _spineRoadSpeed: number = 0;//走在尖刺路上的最大速度

    get velocity () { return this._velocity; }
    get onGround () { return this._grounded; }

    onEnable () {
        clientEvent.on(constant.EVENT_TYPE.CHANGE_TO_INVINCIBLE_SPEED, this._changeToInvincibleSpeed, this);
        clientEvent.on(constant.EVENT_TYPE.RECOVERY_ORI_SPEED, this._recoveryOriSpeed, this);
        clientEvent.on(constant.EVENT_TYPE.CHANGE_TO_SPINE_SPEED, this._changeToSpineSpeed, this);
    }

    onDisable () {
        clientEvent.off(constant.EVENT_TYPE.CHANGE_TO_INVINCIBLE_SPEED, this._changeToInvincibleSpeed, this);
        clientEvent.off(constant.EVENT_TYPE.RECOVERY_ORI_SPEED, this._recoveryOriSpeed, this);
        clientEvent.off(constant.EVENT_TYPE.CHANGE_TO_SPINE_SPEED, this._changeToSpineSpeed, this);
    }

    start () {
        // [3]
        this._rigidBody = this.getComponent(RigidBodyComponent)!;
        this._collider = this.getComponent(ColliderComponent)!;
        this._collider.on('onCollisionEnter', this._onCollision, this);
        this._collider.on('onCollisionStay', this._onCollision, this);
        this._collider.on('onCollisionExit', this._onCollision, this);
        // this._initCameraPosition = this.camera.node.getPosition();
        this._initTargetPosition = this.node.getPosition();

        this._curMaxSpeed = this.maxSpeed;
        this._invincibleSpeed = this.maxSpeed * 1.3;
        this._spineRoadSpeed = this.maxSpeed * 0.7;
    }

    public move (dir: Vec3, speed: number) {
        //越过终点线减速
        if (GameManager.isArriveEndLine) {
            let curMaxSpeed = util.lerp(1, this._curMaxSpeed, 0.015);
            curMaxSpeed = Number(curMaxSpeed.toFixed(3));
            this._curMaxSpeed = curMaxSpeed;
        }

        this._rigidBody.getLinearVelocity(_v3_0);
        // console.log('getLinearVelocity1' + _v3_0);
        Vec3.scaleAndAdd(_v3_0, _v3_0, dir, speed);

        const ms = this._curMaxSpeed;
        const len = _v3_0.lengthSqr();
        if (len > ms) {
            _v3_0.normalize();
            _v3_0.multiplyScalar(ms);
        }
        this._rigidBody.setLinearVelocity(_v3_0);
    }

    public updateFunction (dt: number) {
        if (GameManager.isGameStart && !GameManager.isGameOver && !GameManager.isGamePause) {
            this._updateContactInfo();
            this._applyGravity();
            this._applyDamping();
            this._saveState();
        }
    }

    private _applyDamping (dt = 1 / constant.GAME_FRAME) {
        this._rigidBody.getLinearVelocity(_v3_0);
        // console.log('getLinearVelocity2' + _v3_0);
        // let y = _v3_0.y;
        // _v3_0.y = 0;
        if (_v3_0.lengthSqr() > EPSILON) {
            _v3_0.multiplyScalar(Math.pow(1.0 - this.damping, dt));
            this._rigidBody.setLinearVelocity(_v3_0);
        }
    }

    private _applyGravity () {
        const g = this.gravity;
        const m = this._rigidBody.mass;
        _v3_0.set(0, m * g, 0);
        this._rigidBody.applyForce(_v3_0)
    }

    private _saveState () {
        this._rigidBody.getLinearVelocity(this._velocity);
        // console.log('getLinearVelocity3' + this._velocity  + ":" + this._grounded);
    }

    private _updateContactInfo () {
        this._grounded = false;
        this._groundContact = null!;
        const wp = this.node.worldPosition;
        let maxY = -0.001;
        for (let i = 0; i < this._contacts.length; i++) {
            const c = this._contacts[i];
            const n = c.normal, p = c.point;
            if (n.y <= 0.0001) continue;
            else {
                if (n.y > maxY && p.y > wp.y - 0.1) {
                    this._grounded = true;
                    maxY = n.y;
                    this._groundContact = c;
                }
            }
        }
        if (this._grounded) {
            Vec3.copy(this._groundNormal, this._groundContact.normal);
            this._toSteep = this._groundContact.normal.y <= Math.cos(this.slopeLimit * Math.PI / 180);
        } else {
            Vec3.copy(this._groundNormal, Vec3.UP);
            this._toSteep = false;
        }
        ContactPool.recyContacts(this._contacts);
    }

    private _onCollision (event: ICollisionEvent) {
        // console.log('onCollision' + event.selfCollider.node.getPosition());
        let currentTargetPosition = event.selfCollider.node.getPosition();
        let y = currentTargetPosition.y - this._initTargetPosition.y;
        this._altitudeDiff = y;
        // console.log('this._altitudeDiff' + this._altitudeDiff + ': ' + this.node.getPosition());
        y = this._initCameraPosition.y + Math.sin(y) * 3;
        let z = this._initCameraPosition.z - Math.cos(y) * 3;

        // y = Math.round(y * 10)/10;
        // z = Math.round(z * 10)/10;
        // let pos = this.camera.node.getPosition();
        // this.camera.node.setPosition(this._initCameraPosition.x, y, z);
        // this.camera.node.lookAt(this.node.getPosition());
        // console.log('camera' + this.camera.node.getPosition());
        ContactPool.getContacts(event.contacts, event.selfCollider, this._contacts);
    }

    /**
     * 恢复到原来的速度
     */
    private _recoveryOriSpeed () {
        this._curMaxSpeed = this.maxSpeed;
    }

    /**
     * 无敌时速度为原来的1.5倍
     */
    private _changeToInvincibleSpeed () {
        this._curMaxSpeed = this._invincibleSpeed;
    }

    /**
     * 在尖刺路上的速度为原来的0.7倍
     */
    private _changeToSpineSpeed () {
        this._curMaxSpeed = this._spineRoadSpeed;
    }

    // update (deltaTime: number) {
    //     // [4]
    // }
}

function useCCD (rb: RigidBody, ms = 0.001, sr = 0.05) {
    if (rb) {
        if (PhysicsSystem.PHYSICS_AMMO) {
            const Ammo = (globalThis as any)['Ammo'];
            const impl = rb.body!.impl;
            impl['useCCD'] = true;
            const co = Ammo.castObject(impl, Ammo.btCollisionObject) as any;
            co['wrapped'] = rb.body;
            co['useCCD'] = true;
            impl.setCcdMotionThreshold(ms);
            impl.setCcdSweptSphereRadius(sr);
        } else if (PhysicsSystem.PHYSICS_PHYSX) {
            (rb.body as any).useCCD(sr > 0);
        }
    }
}
