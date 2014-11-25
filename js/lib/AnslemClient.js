define(['NodeClient', 'Stage', 'Sprite', 'howler'], function (NodeClient, Stage, Sprite) {
    /**
     * Anslem game client wrapper
     * @type Object
     */
    var AnslemClient = {
        nodeClient: new NodeClient(),
        running: false,
        scene: {},
        stage: new Stage(),
        targetFps: 30,
        viewWidth: window.innerWidth,
        viewHeight: window.innerHeight,
        render: function (ctx) {
            for (var index in AnslemClient.scene.contents) {
                var e = AnslemClient.scene.contents[index];
                AnslemClient.stage.sprites[e.sprite.image].draw(
                        ctx,
                        e.sprite.frame,
                        (e.x - (AnslemClient.scene.player.x - (AnslemClient.viewWidth / 2))) * e.sprite.scrollSpeed,
                        (e.y - (AnslemClient.scene.player.y - (AnslemClient.viewHeight / 2)))
                        );
            }
        },
        init: function (serverAddress, readyCallback) {
            AnslemClient.readyCallback = readyCallback;
            AnslemClient.stage.init();
            AnslemClient.nodeClient.start(serverAddress, function (response) {
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
        update: function (packet) {
            AnslemClient.scene = packet;
        }
    };

    return AnslemClient;
});
