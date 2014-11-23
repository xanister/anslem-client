define(['NodeClient', 'Stage', 'Sprite', 'howler'], function (NodeClient, Stage, Sprite) {
    /**
     * Anslem game client wrapper
     * @type Object
     */
    var AnslemClient = {
        nodeClient: new NodeClient(),
        player: {},
        running: false,
        scene: {},
        stage: new Stage(),
        targetFps: 30,
        render: function (ctx) {
            for (var index in AnslemClient.scene.contents) {
                var e = AnslemClient.scene.contents[index];
                AnslemClient.stage.sprites[e.sprite].draw(ctx, e.spriteFrame, e.x, e.y);
            }
        },
        init: function (readyCallback) {
            AnslemClient.readyCallback = readyCallback;
            AnslemClient.stage.init();
            AnslemClient.nodeClient.start("http://universeio.anslemgalaxy.com:3000", function (response) {
                var sprites = response.assets.sprites;
                AnslemClient.stage.loadAssets(
                        Object.keys(sprites).length,
                        function (assetLoadedCallback) {
                            for (var index in sprites) {
                                var s = sprites[index];
                                AnslemClient.stage.sprites[index] = new Sprite(s.imagePath, s.frameCount, 0, assetLoadedCallback, s.singleImage);
                            }
                            AnslemClient.stage.sounds = {};
                        },
                        function () {
                            AnslemClient.nodeClient.updateCallback = AnslemClient.update;
                            AnslemClient.readyCallback();
                        }
                );
            });
        },
        start: function () {
            AnslemClient.running = true;
            AnslemClient.stage.start(AnslemClient.render);
        },
        stop: function () {
            AnslemClient.running = false;
            AnslemClient.stage.stop();
        },
        update: function (data) {
            AnslemClient.scene = data;
        }
    };

    return AnslemClient;
});
