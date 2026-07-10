import { _decorator, Component, game, PhysicsSystem, profiler } from 'cc';
import { constant } from './framework/constant';
import { DefenseBridgePrototype } from './defense/DefenseBridgePrototype';

const { ccclass } = _decorator;

@ccclass('Main')
export class Main extends Component {
    protected start(): void {
        game.frameRate = constant.GAME_FRAME;
        PhysicsSystem.instance.fixedTimeStep = 1 / constant.GAME_FRAME;
        profiler.hideStats();
        this.node.addComponent(DefenseBridgePrototype);
    }
}
