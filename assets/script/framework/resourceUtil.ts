import { _decorator, Prefab, Node, Sprite, SpriteFrame, ImageAsset, resources, error, Texture2D, instantiate, isValid, find, Color } from "cc";
const { ccclass } = _decorator;

@ccclass("resourceUtil")
export class resourceUtil {
    /**
 * 加载资源
 * @param url   资源路径
 * @param type  资源类型
 * @param cb    回调
 * @method loadRes
 */
    public static loadRes (url: string, type: any, cb?: Function) {
        resources.load(url, (err: any, res: any) => {
            if (err) {
                error(err.message || err);
                cb && cb(err, res);
                return;
            }

            cb && cb(null, res);
        })
    }

    public static loadEffectRes (modulePath: string) {
        return new Promise((resolve, reject) => {
            this.loadRes(`prefab/effect/${modulePath}`, Prefab, (err: any, prefab: Prefab) => {
                if (err) {
                    console.error('effect load failed', modulePath);
                    reject && reject();
                    return;
                }

                resolve && resolve(prefab);
            })
        })
    }

    public static loadModelRes (modulePath: string) {
        return new Promise((resolve, reject) => {
            this.loadRes(`prefab/model/${modulePath}`, Prefab, (err: any, prefab: Prefab) => {
                if (err) {
                    console.error("model load failed", modulePath);
                    reject && reject();
                    return;
                }

                resolve && resolve(prefab);
            })
        })
    }

    public static loadMapModelRes (modulePath: string) {
        return new Promise((resolve, reject) => {
            this.loadRes(`map/${modulePath}`, Prefab, (err: any, prefab: Prefab) => {
                if (err) {
                    console.error("map model load failed", modulePath);
                    reject && reject();
                    return;
                }

                resolve && resolve(prefab);
            })
        })
    }

    public static loadModelResArr (path: string, arrName: Array<string>, progressCb: any, completeCb: any) {
        let arrUrls = arrName.map((item) => {
            return `${path}/${item}`;
        })

        resources.load(arrUrls, Prefab, progressCb, completeCb);
    }

    public static loadSpriteFrameRes (path: string) {
        return new Promise((resolve, reject) => {
            this.loadRes(path, SpriteFrame, (err: any, img: ImageAsset) => {
                if (err) {
                    console.error('spriteFrame load failed!', path, err);
                    reject && reject();
                    return;
                }

                let texture = new Texture2D();
                texture.image = img;

                let sf = new SpriteFrame();
                sf.texture = texture;

                resolve && resolve(sf);
            })
        })
    }

    public static setAvatarIcon (name: string, sprite: Sprite, cb?: Function) {
        this.loadSpriteFrameRes(`textures/avatar/${name}`).then((sf) => {
            if (sprite && isValid(sprite)) {
                sprite.spriteFrame = sf as SpriteFrame;
                cb && cb();
            } else {
                console.log("sprite is null");
            }
        })
    }

    public static getMap (level: number, cb: Function) {
        let levelStr = 'map';
        //前面补0
        if (level >= 100) {
            levelStr += level;
        } else if (level >= 10) {
            levelStr += '0' + level;
        } else {
            levelStr += '00' + level;
        }

        this.loadRes(`map/config/${levelStr}`, null, (err: any, txtAsset: any) => {
            if (err) {
                cb(err, txtAsset);
                return;
            }

            let content = '';
            if (txtAsset._file) {
                //@ts-ignore
                if (window['LZString']) {
                    //@ts-ignore
                    content = window['LZString'].decompressFromEncodedURIComponent(txtAsset._file);
                }
                var objJson = JSON.parse(content);
                cb(null, objJson);
            } else if (txtAsset.text) {
                //@ts-ignore
                if (window['LZString']) {
                    //@ts-ignore
                    content = window['LZString'].decompressFromEncodedURIComponent(txtAsset.text);
                }
                var objJson = JSON.parse(content);
                cb(null, objJson);
            } else if (txtAsset.json) {
                cb(null, txtAsset.json);
            } else {
                cb('failed');
            }
        });
    }

    public static getMapObj (type: string, arrName: Array<string>, progressCb?: any, completeCb?: any) {
        let arrUrls = [];
        for (let idx = 0; idx < arrName.length; idx++) {
            arrUrls.push(`map/${type}/${arrName[idx]}`)
        }

        resources.load(arrUrls, Prefab, progressCb, completeCb);
    }

    public static getUIPrefabRes (prefabPath: string, cb?: Function) {
        this.loadRes("prefab/ui/" + prefabPath, Prefab, cb);
    }

    public static createUI (path: string, cb?: Function, parent?: Node) {
        this.getUIPrefabRes(path, function (err: any, prefab: any) {
            if (err) return;
            var node = instantiate(prefab);
            node.setPosition(0, 0, 0);
            if (!parent) {
                parent = find("Canvas") as Node;
            }

            parent.addChild(node);
            cb && cb(null, node);
        });
    }

    public static getCarsBatch (arrName: Array<string>, progressCb?: any, completeCb?: any) {
        let arrUrls = [];
        for (let idx = 0; idx < arrName.length; idx++) {
            arrUrls.push(`prefab/car/car${arrName[idx]}`);
        }

        resources.load(arrUrls, Prefab, progressCb, completeCb);
    }

    public static getUICar (name: string, cb: Function) {
        this.loadRes(`prefab/ui/car/uiCar${name}`, Prefab, cb);
    }

    public static getCar (name: string, cb: Function) {
        this.loadRes(`prefab/car/car${name}`, Prefab, cb);
    }

    public static setCarIcon (name: string, sprite: Sprite, isBlack: boolean, cb: Function) {
        let path = `gamePackage/texture/car/car${name}`;
        if (isBlack) {
            path += 'Black';
        }

        this.setSpriteFrame(path, sprite, cb);
    }

    public static getJsonData (fileName: string, cb: Function) {
        resources.load("datas/" + fileName, function (err: any, content: any) {
            if (err) {
                console.error(err.message || err);
                return;
            }

            if (content.json) {
                cb(err, content.json);
            } else {
                cb('failed!!!');
            }
        });
    }

    public static getData (fileName: string, cb: Function) {
        resources.load("datas/" + fileName, function (err: any, content: any) {
            if (err) {
                console.error(err.message || err);
                return;
            }

            var text = content.text;
            if (!text) {
                resources.load(content.nativeUrl, function (err: any, content: any) {
                    text = content;
                    cb(err, text);
                });
                return;
            }

            cb(err, text);
        });
    }

    public static setSpriteFrame (path: string, sprite: Sprite, cb: Function) {
        sprite.node.active = false;

        this.loadRes(path + '/spriteFrame', SpriteFrame, (err: any, spriteFrame: SpriteFrame) => {
            if (err) {
                console.error('set sprite frame failed! err:', path, err);
                cb(err);
                return;
            }

            if (sprite && isValid(sprite)) {
                sprite.spriteFrame = spriteFrame;
                sprite.node.active = true;
                cb(null);
            }
        });
    }

    /**
     * 根据英雄的文件名获取头像
     */
    public static setRemoteImage (url: string, sprite: Sprite, cb: Function) {
        if (!url || !url.startsWith('http')) {
            return;
        }

        // let suffix = "png";
        // resources.load({ url : url, type : suffix }, function (err, tex: ImageAsset) {
        //     if (err) {
        //         console.error('set avatar failed! err:', url, err);
        //         cb(err);
        //         return;
        //     }

        //     let spriteFrame = new SpriteFrame();

        //     (spriteFrame.texture as Texture2D).image = tex;
        //     (spriteFrame.texture as Texture2D).initialize({
        //         originalSize: new Size(tex.width, tex.height),
        //         rect: new Rect(0, 0, tex.width, tex.height),
        //     });


        //     if (sprite && cc.isValid(sprite)) {
        //         sprite.spriteFrame = spriteFrame;
        //         cb(null);
        //     }
        // });

        // let suffix = "png";
        resources.load(url, null, (err, tex: any) => {
            if (err) {
                console.error('set avatar failed! err:', url, err);
                cb(err);
                return;
            }

            let texture = new Texture2D();
            texture.image = tex;

            let spriteFrame = new SpriteFrame();
            spriteFrame.texture = texture;
            cb && cb(null, spriteFrame);
        })
    }

    /**
     * 设置更多游戏的游戏图标
     */
    public static setGameIcon (game: string, sprite: Sprite, cb: Function) {
        if (game.startsWith('http')) {
            this.setRemoteImage(game, sprite, cb);
        } else {
            this.setSpriteFrame('gamePackage/textures/icons/games/' + game, sprite, cb);
        }
    }

    /**
     * 获取顾客预制体
     *
     * @static
     * @param {string} name
     * @param {Function} cb
     * @memberof resourceUtil
     */
    public static getCustomer (name: string, cb: Function) {
        this.loadRes(`gamePackage/map/customer/customer${name}`, Prefab, cb);
    }

    public static setCustomerIcon (name: string, sprite: Sprite, cb: Function) {
        let path = `gamePackage/texture/head/head${name}`;

        this.setSpriteFrame(path, sprite, cb);
    }

    public static getEffect (name: string, cb: Function) {
        this.loadRes(`prefab/effect/${name}`, Prefab, cb);
    }

    /**
 * sprite置灰或者复原
 *
 * @param {object} node
 * @param {boolean} flag
 */
    public static setGray (node: Node, flag: boolean) {
        var sprites = node.getComponentsInChildren(Sprite);
        for (var i = 0; i < sprites.length; ++i) {
            var sprite = sprites[i];
            if (flag) {
                sprite.color = new Color(255, 255, 255, 255);
            } else {
                sprite.color = new Color(124, 124, 124, 255);
            }
        }
    }

    /**
     * 获取帽子prefab
     * @param name 帽子名称
     * @param cb 
     * @returns 
     */
    public static getHat (name: string) {
        return new Promise((resolve, reject) => {
            this.loadRes(`prefab/model/hat/${name}`, Prefab, (err: any, prefab: Prefab) => {
                if (err) {
                    console.error('model load failed', name);
                    reject && reject();
                    return;
                }

                resolve && resolve(prefab);
            })
        })
    }

    /**
    * 获取鞋子prefab
    * @param name 鞋子名称
    * @param cb 
    * @returns 
    */
    public static getShoes (name: string) {
        return new Promise((resolve, reject) => {
            this.loadRes(`prefab/model/shoes/${name}`, Prefab, (err: any, prefab: Prefab) => {
                if (err) {
                    console.error('model load failed', name);
                    reject && reject();
                    return;
                }

                resolve && resolve(prefab);
            })
        })
    }
}
