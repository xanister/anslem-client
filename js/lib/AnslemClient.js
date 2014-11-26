define(['NodeClient', 'Stage', 'Sprite', 'howler'], function (NodeClient, Stage, Sprite) {
    /**
     * Anslem game client wrapper
     * @type Object
     */
    var AnslemClient = {
        init: function (readyCallback) {
            AnslemClient.readyCallback = readyCallback;
            AnslemClient.stage.init();
            AnslemClient.nodeClient.start(function (response) {
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
                            AnslemClient.scene = AnslemClient.nodeClient.data;
                            AnslemClient.readyCallback();
                        }
                );
            });
        },
        nodeClient: new NodeClient("http://forest.anslemgalaxy.com:3000"),
        readyCallback: function () {
            console.log("Ready");
        },
        render: function (ctx) {
            var packet = AnslemClient.scene.packet;
            for (var index in packet.contents) {
                var e = packet.contents[index];
                AnslemClient.stage.sprites[e.sprite.image].draw(
                        ctx,
                        e.sprite.frame,
                        (e.x - (packet.player.x - (AnslemClient.viewWidth / 2))) * e.sprite.scrollSpeed,
                        (e.y - (packet.player.y - (AnslemClient.viewHeight / 2)))
                        );
            }
        },
        running: false,
        scene: {},
        stage: new Stage(),
        start: function () {
            AnslemClient.running = true;
            AnslemClient.stage.start(AnslemClient.render);
        },
        stop: function () {
            AnslemClient.running = false;
            AnslemClient.stage.stop();
        },
        targetFps: 30,
        viewHeight: window.innerHeight,
        viewWidth: window.innerWidth
    };

    return AnslemClient;
});
