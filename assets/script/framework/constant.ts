export class constant {

    public static GAME_NAME = 'attackOnTitan';

    public static GAME_VERSION = '1.0.1';

    public static GAME_FRAME = 60;      //游戏当前帧率
    public static GAME_INIT_FRAME = 60; //游戏开发基础帧率

    //本地缓存key值
    public static LOCAL_CACHE = {
        PLAYER: 'player',               //玩家基础数据缓存，如金币砖石等信息，暂时由客户端存储，后续改由服务端管理
        SETTINGS: 'settings',           //设置相关，所有杂项都丢里面进去
        DATA_VERSION: 'dataVersion',    //数据版本
        ACCOUNT: 'account',                 //玩家账号
        // TMP_DATA: 'tmpData',             //临时数据，不会存储到云盘
        HISTORY: "history",                   //关卡通关数据
        BAG: "bag",                         //玩家背包，即道具列表，字典类型
    }

    //资源文件下的文件名
    public static RESOURCES_FILE_NAME = {
        AUDIO: 'audio',//音频
        DATAS: 'datas',//配置表
        PREFAB: 'prefab',//预制体
        TEXTURE: 'texture',//图片资源
    }

    //音频文件下分类
    public static AUDIO_FILE_NAME = {
        MUSIC: 'music',//bgm
        SOUND: 'sound',//音效
    }

    //settings的本地缓存key值
    public static SETTINGS_KEY = {
        SHOP_RANDOM_SKIN_USE_TIMES: "shopRandomSkinUseTimes",//商店界面 获取随机皮肤 成功使用次数, 下次需使用更多钻石
        SHOP_RECEIVE_DIAMOND_USE_TIMES: "shopReceiveDiamondUseTimes",//商店界面 获取钻石 成功使用次数，下次需使用更多钻石
        LEVEL_HAT_PROGRESS: "levelHatProgress",//关卡解锁皮肤进度
        FIGHT_TIMES: "fightTimes", //过关次数
    }

    public static ZORDER = {
        NORMAL: 10, //正常
        DIALOG: 100, //弹窗的Z序
        REWARD: 900, //奖励的弹窗
        WAITING: 998, //等待界面弹窗
        TIPS: 999, //提示框
        TIPS_1: 1000,
    }

    public static MAX_LEVEL = 20;        //最高关卡数

    public static AUDIO_SOUND = {
        BACKGROUND: 'background',//背景音乐
        ATTACK: [
            "attack1", //打击1
            "attack1", //打击2
            "attack1", //打击3
            "attack1", //打击4
        ],
        BEST_REWARD: "bestReward", //最佳奖品
        BOSS_ANGRY: "bossAngry", //boss爆发怒气
        BOSS_ATTACK_GROUND: [
            "bossAttackGround1", //boss武器攻击地面1
            "bossAttackGround2", //boss武器攻击地面2
            "bossAttackGround3", //boss武器攻击地面3
            "bossAttackGround4", //boss武器攻击地面4
        ],
        BOSS_VERTIGO: "bossVertigo", //BOSS眩晕和昏迷
        BOSS_WEAPON_HIT: "bossWeaponHit", //BOSS武器攻击
        BOSS_WEAPON_WAVING: [
            "bossWeaponWaving1", //BOSS武器挥舞1
            "bossWeaponWaving2", //BOSS武器挥舞2
            "bossWeaponWaving3", //BOSS武器挥舞3
        ],
        CHANGE_COLOR: "changeColor", //经过亮光变色
        CLICK: "click", //按钮点击
        COLLECT_KEY: "collectKey",//收集钥匙 
        COLLECT_PEOPLE_RIGHT: "collectPeopleRight",//收集正确的小人
        COLLECT_PEOPLE_WRONG: "collectPeopleWrong",//收集错误的小人
        DIAMOND_COLLECT: "diamondCollect",//跑酷界面收集钻石
        DIAMOND_RECEIVE: "diamondReceive",//UI界面领取钻石
        DODGE: "dodge",//跳跃
        ENEMY_HIT_FLY: "enemyHitFly",//普通关敌人被击飞
        FAIL: "fail",//结算失败
        FALL_DOWN_ON_GROUND: "fallDownOnGround",//boss，普通关敌人，玩家落地
        FIRE: "fire",//烟花
        FOOT_STEP: [
            "footstep1",//脚步声1
            "footstep2",//脚步声2
            "footstep3",//脚步声3
            "footstep4",//脚步声4
            "footstep5",//脚步声5
        ],
        GET_SKIN: "getSkin",//获取皮肤
        INVINCIBLE: "invincible",//无敌
        LEVEL_UP: "levelUp",//主界面道具升级
        NUM_RAISE: "numRaise",//数据收集
        REVIVE: "revive",//复活
        REWARD_BIG_BOX: "rewardBigBox",//打开大宝箱， 奖励关卡
        REWARD_SMALL_BOX: "rewardSmallBox",//打开小宝箱， 结算界面和宝箱界面
        WALL_THOUGH_FAIL: "wallThoughFail",//穿墙成功
        WALL_THOUGH_SUCCESS: "wallThoughSuccess",//穿墙失败
        WIN: "win",//结算胜利,
        JUMP_LAND_GROUND: "jumpLandingGround",//落到地面上
    }

    //次按钮在主界面显示后3秒再显示
    public static NORMAL_SHOW_TIME = 3

    //新手认定关卡（即小于该关卡数认为是新手）
    public static NEWBEE_LEVEL = 2;

    //奖励类型
    public static REWARD_TYPE = {
        DIAMOND: 1, //钻石
        KEY: 2, //钥匙
        SKIN: 3, //皮肤

    }

    // public static ANALYTICS_TYPE = {
    //     WATCH_AD_BTN_SHOW_TIMES: '视频按钮展示次数',
    //     WATCH_AD_BTN_CLICK_TIMES: '视频按钮点击次数',
    //     WATCH_AD_BTN_SUCCESS_TIMES: '视频按钮成功点击次数',

    //     //界面曝光数量
    //     SHOW_LOADING_PANEL: "加载界面-曝光",
    //     SHOW_MAIN_PANEL: "主界面-曝光",
    //     SHOW_MAIN_SETTING_PANEL: "主界面-设置界面-曝光",
    //     SHOW_ONLINE_PANEL: "在线宝箱-曝光",
    //     SHOW_SIGNIN_PANEL: "7日登录界面-曝光",
    //     SHOW_DRAWER_PANEL: "抽屉页界面-曝光",
    //     SHOW_RANK_PANEL: "排行榜界面-曝光",
    //     SHOW_SHOP_PANEL: "商店界面-曝光",
    //     SHOW_GAME_PANEL: "游戏界面-曝光",
    //     SHOW_REVIVE_PANEL: "复活界面-曝光",
    //     SHOW_BALANCE_PANEL: "结算界面-曝光",
    //     SHOW_OFFLINE_PANEL: "离线奖励界面-曝光",
    //     SHOW_RED_PACKET_PANEL: "领红包界面-曝光",    
    //     SHOW_FULLSCREEN_GAME_PANEL: "全屏式导流条-曝光",    


    //     //按钮点击
    //     CLICK_MAIN_SETTING: "点击-主界面-设置按钮",
    //     CLICK_MAIN_ONLINE: "点击-主界面-在线宝箱",
    //     CLICK_MAIN_SIGNIN: "点击-主界面-7日登录按钮",
    //     CLICK_MAIN_RECOMMEND: "点击-主界面-主推按钮",
    //     CLICK_MAIN_START_GAME: "点击-主界面-开始游戏",
    //     CLICK_MAIN_SKIN_TRY: "点击-每个皮肤的试玩点击",
    //     CLICK_MAIN_LEFT_SWITCH: "点击-主界面-左切换",
    //     CLICK_MAIN_RIGHT_SWITCH: "点击-主界面-右切换",
    //     CLICK_MAIN_DRAWER: "点击-主界面-抽屉页按钮",
    //     CLICK_MAIN_RANK: "点击-主界面-排行榜",
    //     CLICK_MAIN_SHOP: "点击-主界面-商店按钮",
    //     CLICK_MAIN_LOTTERY: "点击-主界面-大转盘按钮",
    //     CLICK_SETTING_MUSIC_SWITCH: "点击-设置界面-音量开/关",
    //     CLICK_SETTING_SHAKE_SWITCH: "点击-设置界面-震动开/关",
    //     CLICK_SIGNIN_FILL_SIGN:"点击-7日登录每个奖励补领点击",
    //     CLICK_SIGNIN_DOUBLE_RECEIVE: "点击-7日登录-双倍领取按钮",
    //     CLICK_SIGNIN_NORMAL_RECEIVE: "点击-7日登录-普通领取按钮",
    //     CLICK_REVIVE_REVIVE: "点击-复活界面-复活按钮",
    //     CLICK_REVIVE_SKIP: "点击-复活界面-跳过按钮",
    //     CLICK_BALANCE_NORMAL: "点击-结算界面-普通领取",
    //     CLICK_BALANCE_DOUBLE: "点击-结算界面-3倍奖励",

    //     //数据，在增加的时候发，到时候会做区分
    //     GET_SKIN: "获得皮肤",
    //     ENTER_LEVEL: "进入关卡",
    //     SIGNIN_DOUBLE_RECEIVE: "7日登录双倍领取成功",
    //     REVIVE_SUCCESS: "复活成功"
    // }

    // public static SHARE_FUNCTION = {
    // BALANCE: 'balance',                 //结算分享 
    // RELIVE: 'relive',                   //复活
    // OFFLINE: 'offline',                 //离线奖励
    // RANK: 'rank',                       //排行榜
    // LOTTERY: 'lottery',                 //抽奖
    // LOTTERY_REWARD: 'lotteryReward',    //抽奖奖励，用于双倍分享
    // TRIAL: 'trial',                     //试用
    // CLICK_BOX: 'clickBox',              //点开宝箱
    // ONLINE: 'online',                   //在线奖励
    // SIGNIN: 'signIn',                   //签到
    // FILL_SIGNIN: 'fillSignIn',          //补签
    // INVINCIBLE: 'invincible',           //无敌
    // SHOP_SHARE: 'shopShare',                       //商店里头的分享触发的
    // SHOP_VIDEO: 'shopVideo',                       //商店里头的视频触发的
    // }

    //付费点(视频或者分享)ID
    public static SHARE_ID = {
        OFFLINE_REWARD: 1, //离线奖励
        SETTLEMENT_SUCCESS_DOUBLE: 2, //成功结算界面，钻石双倍领取
        SETTLEMENT_FAIL_REVIVE: 3,//失败结算界面，复活
        SETTLEMENT_FAIL_BEAT_ENEMY: 4,//失败结算界面，击败头目
        SHOP_RECEIVE_DIAMOND: 5,//商店界面,领取钻石按钮
        SHOP_SHOES: 6,
        SKIN: 7,//皮肤界面
        BOX_RECEIVE_KEY: 8,//宝箱界面领取钥匙
        BOX_RECEIVE_DOUBLE: 9,//宝箱界面双倍领取
        INVINCIBLE: 10,//无敌界面领取
        HOME_POWER_HAND: 11,//主界面手部力量升级
        HOME_POWER_KICK: 12,//主界面腿部力量升级
    }

    //打开奖励的方式
    public static OPEN_REWARD_TYPE = {
        AD: 0,
        SHARE: 1,
        NULL: 2
    }

    //大转盘相关变量
    public static LOTTERY = {
        MONEY: 2000,            //1000块钱抽1次
        EXCHANGE: 500           //抽到已有的车自动转换成钱数
    }

    //平台
    public static PLATFORM = {
        WX: 'wx',
        COCOSPLAY: 'cocosplay',
        ANDROID: 'android',
        APPSTORE: 'appstore'
    }

    public static TIP_TYPE = {
        GOLD: 'gold',
        HEART: 'heart',
        TXT: 'txt',
    }

    public static FIGHT_TIP_INDEX = {
        SCORE_ADD: 0,
        SCORE_MINUS: 1,
        REWARD_SCALE: 2,
    }

    public static GROUP_TYPE = {
        DEFAULT: 1,
        PLAYER: 2, //玩家
        COLLIDER_ITEM: 4, //碰撞器
    }

    //玩家动画类型
    public static ANI_TYPE = {
        IDLE: "idle",//待机
        RUN: "run",//向前跑
        RUN_HIT: "runHit",//撞墙动作（举起手臂护头胸）
        FIGHT_IDLE: "fightIdle",//格斗待机
        ATTACK_LEFT: "attackLeft",//左钩拳
        ATTACK_RIGHT: 'attackRight',//右钩拳
        HIT_BIG: "hitBig",//大：被武器砸中后退
        HIT_SMALL: 'hitSmall',//小：受击，头部受击后仰
        KICK: "kick",//身体后倾左脚上踢
        DODGE_LEFT: "dodgeLeft",//左闪避动画
        DIE: "die",//死亡动作，后仰倒地
        LIFE: "life",//复活
        WIN: "win",//胜利
        DODGE_RIGHT: "dodgeRight",//右闪避动画
        HIT_FLY_01: "hitFly01",//击飞开始
        HIT_FLY_02: "hitFly02",//击飞循环
        HIT_FLY_03: "hitFly03",//击飞结束
    }

    //boss动画类型
    public static BOSS_ANI_TYPE = {
        BOSS_FIGHT_IDLE: 'bossFightIdle',//战斗待机
        BOSS_ANGRY: "bossAngry",//怒气
        BOSS_ATTACK: "bossAttack",//攻击
        BOSS_SWOON: "bossSwoon",//站立弯腰晕眩
        BOSS_LOSE: "bossLose",//被击倒后昏迷
        BOSS_DIE: "bossDie",
        BOSS_WIN: "bossWin",
        BOSS_HIT: "bossHit",//受到击打
    }

    //关卡类型/模式
    public static GAME_TYPE = {
        NORMAL: 1,//普通
        REWARD: 2,//奖励
        BOSS: 3,
    }

    //关卡阶段
    public static GAME_STATUS = {
        RUN: "run", //跑酷
        FIGHT: "fight", //战斗
    }

    //奖励倒计时5秒
    public static COUNTDOWN_REWARD = 5;

    //刺激进度条衰减间隔
    public static INTERVAL_CRAZY_CLICK = 0.03;

    //boss的两个阶段
    public static BOSS_STATUS = {
        FIGHT: "fight",//战斗阶段，boss头上会有昏迷效果
        HIDE: "hide",//躲避阶段
        COMA: "coma",//boss血量为0，进入昏迷
    }

    //商店皮肤类型
    public static SKIN_TYPE = {
        HAT: 1,//帽子
        SHOES: 2,//鞋子
    }

    //商品状态
    public static SHOP_ITEM_STATUS = {
        LOCK: 0, //锁住
        UNLOCKED_NOT_OWNED: 1,//已经解锁,但未看视频拥有
        OWNED: 2, //已经拥有
        EQUIPMENT: 3,//当前装备
    }

    //拥有皮肤方式
    public static OWN_TYPE = {
        UNLOCK_BY_VIDEO: "unlockByVideo",//在关卡中解锁并看视频获得
        BOX: "box",//宝箱中获得
        SHOP: "shop",//在商店通过钻石购买
    }

    //帽子皮肤获取途径
    public static SKIN_HAT_CHANEL = {
        LEVEL: 1,//关卡，帽子状态从0切换到1
        BOX: 2,//宝箱界面，帽子状态从0切换到3
        BOX_SETTLEMENT: 3,//宝箱：结算界面翻倍盘宝箱概率开出皮肤状态从0到3
    }

    public static unlockHatSkinProgress = 25;//每次解锁帽子皮肤的进度为25

    //泡泡颜色类型
    public static BUBBLE = {
        BUBBLE_RED: "bubbleRed",
        BUBBLE_GREEN: "bubbleGreen",
        BUBBLE_YELLOW: "bubbleYellow",
    }

    public static INVINCIBLE_ENERGY = 50;//无敌所需能量

    //更新体积方式
    public static UPDATE_VOLUME_TYPE = {
        EAT_PEOPLE: "eatPeople",//吃小人
        HIT_BY_COLLIDER: "hitByCollider",//撞到障碍
    }

    //复活无敌时间
    public static REVIVE_INVINCIBLE_TIME = 0.5;//秒

    //模块类型,对应module.csv
    public static MODULE_TYPE = {
        ROAD_01: 1001,
        ROAD_02: 1002,
        ROAD_03: 1003,
        ROAD_04: 1004,
        ROAD_05: 1005,
        ROAD_06: 1006,
        ROAD_07: 1007,
        ROAD_08: 1008,
        ROAD_09: 1009,
        ROAD_10: 1010,
        ROAD_11: 1011,
        ROAD_12: 1012,
        ROAD_13: 1013,
        COLOR_LIGHT_GREEN: 2001,
        COLOR_LIGHT_RED: 2002,
        COLOR_LIGHT_YELLOW: 2003,
        PEOPLE_GREEN: 3001,
        PEOPLE_RED: 3002,
        PEOPLE_YELLOW: 3003,
        PEOPLE_ENEMY: 3004,
        PEOPLE_BOSS: 3005,
        ORGAN_DOOR: 4001,
        MACE_SECTOR: 5001,
        KEY: 6001,
        BOX: 7001,
        DIAMOND: 8001,
        WALL: 9001,
        ROTATING_BLADE: 1101,
        ROTATING_RING: 1201,
        SPINE_ROAD: 1301,
    }

    //事件枚举
    public static EVENT_TYPE = {
        ARRIVE_END: "arriveEnd",//到达终点，玩家暂停
        ARRIVE_END_LINE: "arriveEndLine",//到达终点线，玩家开始减速

        CHANGE_SKIN: "changeSkin",//改变皮肤
        CHANGE_TO_SPINE_SPEED: "changeToSpineSpeed",//玩家速度变为“踩尖刺路速度”
        CHANGE_TO_INVINCIBLE_SPEED: "changeToInvincibleSpeed",//无敌时速度为原来的1.5倍
        CHECK_EFFECTIVE: "checkEffective",//在尖刺路上的速度为原来的0.7倍
        CHECK_LEVEL_UNLOCK_HAT_SKIN: "checkLevelUnlockHatSkin",//检查关卡是否解锁皮肤
        CHANGE_OFFSET: "changeOffset",//更新相机和玩家间距

        EQUIPMENT_SHOES: "equipmentShoes",//装备鞋子
        EQUIPMENT_HAT: "equipmentHat",//装备帽子

        HIDE_LOADING_PANEL: "hideLoadingPanel",//隐藏加载界面
        HIT_FLY_ENEMY: "hitFlyEnemy",//击飞敌人
        HIDE_HAT_EQUIPMENT: "hideHatEquipment",//隐藏帽子装备状态
        HIDE_SHOES_EQUIPMENT: "hideShoesEquipment",//隐藏鞋子装备状态

        ON_INIT_GAME: "onInitGame",//初始化游戏
        ON_GAME_OVER: "onGameOver",//游戏结束
        ON_BOX_OPEN: "onBoxOpen",//打开宝箱
        ON_BOX_HIT: "onBoxHit",//打击宝箱
        ON_REVIVE: "onRevive",//游戏复活

        PEOPLE_RECOVERY_ORI_SKIN: "peopleRecoveryOriSkin",//小人恢复到之前的皮肤
        PEOPLE_BECOME_SAME_SKIN: "peopleBecomeSameSkin",//所有小人变为同样颜色

        REFRESH_ATTACK_WOR_POS: "refreshAttackWorPos",//更新boss攻击位置
        REFRESH_DIAMOND: "refreshDiamond",//更新钻石
        REFRESH_KEY: "refreshKey",//更新钥匙
        RECOVERY_ORI_SPEED: "recoveryOriSpeed",//玩家恢复初始速度
        REDUCE_OBSTACLE: "reduceObstacle",//玩家复活删掉周围一定范围的障碍
        REFRESH_PEOPLE: "refreshPeople",//更新UI界面上小人数量
        REFRESH_HAT_ITEM: "refreshHatItem",//更新帽子列表状态
        REFRESH_SHOES_ITEM: "refreshShoesItem",//更新鞋子列表状态
        REFRESH_LEVEL: "refreshLevel",//刷新等级
        RESET_PB_ENERGY: "_refreshPbEnergy",//重置能量进度条

        SHOW_INVINCIBLE: "showInvincible",//展示无敌效果
        SHOW_SCORE_LINE: 'showScoreLine',//展示普通关的终点的加倍分数节点
        SHOW_LOADING_PANEL: "hideLoadingPanel",//隐藏加载界面

        WEAPON_HIT_PLAYER: "weaponHitPlayer",//boss武器攻击到玩家

        INIT_SCORE_LINE: "initScoreLine",//初初倍数数值
        SHOW_ROAD_END_FIRE: "showRoadEndFire",//展示roadEnd节点里面的火焰
    }
}
