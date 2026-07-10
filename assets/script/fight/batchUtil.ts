// Learn TypeScript:
//  - https://docs.cocos.com/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/manual/en/scripting/life-cycle-callbacks.html

import { _decorator, Component, Node, BatchingUtility, MeshRenderer } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BatchUtil')
export class BatchUtil extends Component {
    /* class member could be defined like this */
    // dummy = '';

    /* use `property` decorator if your want the member to be serializable */
    // @property
    // serializableDummy = 0;

    @property([Node])
    public arrBatching: Node[] = [];

    start () {
        // Your initialization goes here.
        // this.useBatch();
    }

    public useBatch () {
        let arrComMesh = [];

        this.arrBatching.forEach((item)=>{
            if (item.children.length) {
                arrComMesh = item.getComponentsInChildren(MeshRenderer);

                if (arrComMesh.length >= 2) {
                    let ndStatic = new Node();
                    let nodeName = item.name + 'Static';
                    
                    if (!this.node.getChildByName(nodeName)) {
                        ndStatic.name = nodeName;
                        ndStatic.parent = this.node;
                    } else {
                        ndStatic = this.node.getChildByName(nodeName) as Node;
                    }
                    
                    //将item下面所有字节点的mesh组件合并到与父节点同级下面
                    BatchingUtility.batchStaticModel(item, ndStatic);
                } else {
                    console.warn("该节点下的字节点的所有mesh组件少于2个", item.name);
                }
            }
        })
    }

    // update (deltaTime: number) {
    //     // Your update function goes here.
    // }
}
