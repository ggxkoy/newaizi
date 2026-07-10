import { _decorator, Node, AudioClip, AudioSource, game, director, assetManager } from "cc";
import { StorageManager } from "./storageManager";
import { constant } from "./constant";
import { resourceUtil } from "./resourceUtil";


export class AudioManager {
    public mainVolume: number = 1;      // 主音量
    public environmentalVolume: number = 1;   // 环境音音量

    //背景音乐音量
    private _musicVolume: number = 1;
    //音效音量
    private _soundVolume: number = 1;

    //音乐开关
    private _musicSwitch: number = 1;
    //音效开关
    private _soundSwitch: number = 1;
    //所有的音效
    private _sounds: Map<string, Array<AudioSource>> = new Map;
    //所有的音乐
    private _musics: Map<string, AudioSource> = new Map;

    private _normols: Map<string, AudioSource> = new Map; //转换clip资源的普通音频池

    private _curSounds: Array<AudioSource> = [];


    public dictWeaponSoundIndex: any = {};

    private static _instance: AudioManager;
    public static get instance () {
        if (this._instance) {
            return this._instance;
        }

        this._instance = new AudioManager();
        return this._instance;
    }

    private _persistRootNode: Node = null!;


    private _musicSource: AudioSource = null!;


    public get musicSource (): AudioSource {
        return this._musicSource;
    }

    set musicSwitch (val: number) {
        this._musicSwitch = val;
    }
    get musicSwitch () {
        return this._musicSwitch;
    }


    public get musicVolume (): number {
        return this._musicVolume * this._musicSwitch;;
    }

    public set musicVolume (v: number) {
        this._musicVolume = v;
        this._setCurMusicVolume();
    }

    public get soundVolume (): number {
        return this._soundVolume * this._soundSwitch;
    }

    public set soundVolume (v: number) {
        this._soundVolume = v;
        this._setCurSoundVolume();
    }

    /**
     * 初始化
     * @returns 
     */
    public init () {
        if (this._persistRootNode) return; //避免切换场景初始化报错
        this._persistRootNode = new Node('audio');
        director.getScene()!.addChild(this._persistRootNode);

        director.addPersistRootNode(this._persistRootNode)

        this._musicSwitch = this.getAudioSetting(true) ? 1 : 0;
        this._soundSwitch = this.getAudioSetting(false) ? 1 : 0;
    }


    /**
     * 设置当前音乐音量
     */
    private _setCurMusicVolume () {
        for (let name in this._musics) {
            let music = this._musics.get(name)!;
            music.volume = this.musicVolume;
        }
    }

    /**
     * 设置当前音效音量
     */
    private _setCurSoundVolume () {
        for (let name in this._sounds) {
            let arrSound = this._sounds.get(name)!;
            arrSound.forEach((source: AudioSource) => {
                source.volume = this.soundVolume;
            })
        }
    }
    /**
       * 获取音频设置
       * @param isMusic 
       * @returns 
       */
    public getAudioSetting (isMusic: boolean) {
        let state;
        if (isMusic) {
            state = StorageManager.instance.getGlobalData('music');
        } else {
            state = StorageManager.instance.getGlobalData('sound');
        }
        return !state || state === 'true' ? true : false;
    }

    /**
    * 获取音效
    * @param clip 
    * @returns 
    */
    private _getAudioSource (clip: AudioClip) {
        let result: AudioSource | undefined;

        for (let name in this._sounds) {
            const sounds = this._sounds.get(name)!;
            if (clip.name == name) {
                if (sounds.length > 0) {
                    const source = sounds.pop();
                    result = source;
                    this._sounds.set(name, sounds);
                }
                break;
            }

        }

        if (!result) {
            result = this._persistRootNode.addComponent(AudioSource);
        }

        result.clip = clip;
        result.currentTime = 0;
        return result;
    }

    /**
     * 初始化音乐
     * @param name 
     * @param loop 
     */
    public async initMusic (name: string, loop: boolean) {
        let path = `${constant.RESOURCES_FILE_NAME.AUDIO}/${constant.AUDIO_FILE_NAME.MUSIC}/` + name;
        let source = this._musicSource;
        source && source.stop();
        if (source && source.clip!.name == name) {
        } else if (this._musics.get(name)) {
            if (source) {
                this._musics.set(source.clip!.name, source)
            }
            source = this._musics.get(name)!;
            this._musics.delete(name);
        } else {
            resourceUtil.loadRes(path, AudioClip, (err: any, clip: any) => {
                const musicSource = this._persistRootNode.addComponent(AudioSource);
                musicSource.clip = clip;
                source = musicSource;
                this._musics.set(source.clip!.name, source)
            })
        }
        source.currentTime = 0;

        source.volume = this.musicVolume;
        source.loop = loop;
        source.playOnAwake = false;

        this._musicSource = source;
        if (this._musicSwitch) {
            source.play();
        }
    }

    /**
    * 播放音乐
    * @param {String} name 音乐名称可通过Constant.AUDIO_MUSIC 获取
    * @param {Boolean} loop 是否循环播放
    * @param {Function} cb 播放开始时回调
    */
    public async playMusic (name: string, loop: boolean, cb?: Function) {
        if (this._musicSource && this._musicSource?.clip?.name === name) {
            this._musicSource.volume = this.musicVolume;
            this._musicSource.play();
        } else {
            let path = `${constant.RESOURCES_FILE_NAME.AUDIO}/${constant.AUDIO_FILE_NAME.MUSIC}/` + name;

            let source = this._musicSource;
            source && source.stop();


            if (source && source.clip!.name == name) {
            } else if (this._musics.get(name)) {
                if (source) {
                    this._musics.set(source.clip!.name, source)
                }
                source = this._musics.get(name)!;
                this._musics.delete(name);
            } else {
                resourceUtil.loadRes(path, AudioClip, (err: any, clip: any) => {
                    const musicSource = this._persistRootNode.addComponent(AudioSource);
                    musicSource.clip = clip;
                    source = musicSource;
                    this._musics.set(source.clip!.name, source)
                })
            }
            source.currentTime = 0;


            source.volume = this.musicVolume;
            source.loop = loop;
            source.playOnAwake = false;

            this._musicSource = source;
            if (this._musicSwitch) {
                source.play();
            }
        }
        cb && cb();
    }
    /**
     * 播放音效
     * @param {String} name 音效名称可通过Constant.AUDIO_SOUND 获取
     * @param {Boolean} loop 是否循环播放
     */
    public async playSound (name: string, loop: boolean = false) {


        let path = `${constant.RESOURCES_FILE_NAME.AUDIO}/${constant.AUDIO_FILE_NAME.SOUND}/` + name;

        resourceUtil.loadRes(path, AudioClip, (err: any, clip: any) => {
            let source = this._getAudioSource(clip);

            source.volume = this.soundVolume;
            source.loop = loop;
            source.playOnAwake = false;

            this._curSounds.push(source);
            if (this._soundSwitch) {
                source.play();
                setTimeout(() => {
                    if (this._curSounds.indexOf(source) >= 0) {
                        this._curSounds.splice(this._curSounds.indexOf(source), 1);
                    }

                    if (!this._sounds.get(name)) {
                        this._sounds.set(name, [source]);
                    } else {
                        const sounds = this._sounds.get(name)!;
                        sounds.push(source);

                        this._sounds.set(name, sounds);
                    }
                }, source.duration * 1000);
            }
        })
    }


    /**
     * 预加载音乐
     * @param musics 
     */
    public async preLoadMusics (musics: Array<string>) {
        for (let i = 0; i < musics.length; i++) {
            const name = musics[i];
            let path = `${constant.RESOURCES_FILE_NAME.AUDIO}/${constant.AUDIO_FILE_NAME.MUSIC}/` + name;
            resourceUtil.loadRes(path, AudioClip, (err: any, clip: any) => {
                const musicSource = this._persistRootNode.addComponent(AudioSource);
                musicSource.clip = clip as AudioClip;
                this._musics.set(name, musicSource);
            })
        }
    }


    /**
     * 开关音乐
     * @param open 
     */
    public switchMusic (open: boolean) {
        if (open) {
            this.resumeMusic();
        } else {
            this.stopMusic();
        }
        StorageManager.instance.setGlobalData('music', `${open}`);
    }

    /**
     * 开关音效
     * @param open 
     */
    public switchSound (open: boolean) {
        if (open) {
            this.resumeSound();
        } else {
            this.stopSound();
        }
        StorageManager.instance.setGlobalData('sound', `${open}`);
    }

    /**
     * 暂停所有
     */
    public stopAll () {
        this.stopMusic();
        this.stopSound();
    }

    /**
     * 暂停音乐
     */
    public stopMusic () {
        this._musicSwitch = 0;
        this._musicSource && this._musicSource.pause();
    }


    /**
     * 暂停音效
     */
    public stopSound () {
        this._soundSwitch = 0;
        for (let i in this._curSounds) {
            let source = this._curSounds[i];
            if (source.playing) {
                source.pause();
            }
        }
    }
    /**
      * 继续所有
      */
    public resumeAll () {
        this.resumeMusic();
        this.resumeSound();
    }

    /**
     * 恢复音乐
     */
    public resumeMusic () {
        this._musicSwitch = 1;
        if (this._musicSource) {
            this._musicSource.volume = this.musicVolume;
            this._musicSource.play();
        }
    }

    /**
     * 恢复音乐
     */
    public resumeSound () {
        this._soundSwitch = 1;
        for (let i in this._curSounds) {
            let source = this._curSounds[i];
            if (source.state == AudioSource.AudioState.PAUSED) {
                source.volume = this.soundVolume;
                source.play();
            }
        }
    }


    /**
     * 移除不需要的音乐
     * @param musics 
     */
    public removeMusic (musics: Array<string>) {
        for (let i = 0; i < musics.length; i++) {
            const name = musics[i];
            const audioSource = this._musics.get(name);
            this._musics.delete(name);
            if (audioSource) {
                //@ts-ignore
                assetManager.releaseAsset(audioSource.clip);
                audioSource.destroy();
                //@ts-ignore
                this._musics[name] = null;
            }
        }
    }
}