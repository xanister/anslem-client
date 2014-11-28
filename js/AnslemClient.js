define(['anslemClientConfig', 'lib/NodeClient', 'lib/Stage', 'lib/Sprite', 'lib/howler'], function (anslemClientConfig, NodeClient, Stage, Sprite) {
    /**
     * Anslem game client wrapper
     * @type Object
     */
    var AnslemClient = {
        data: {},
        debugging: false,
        updatePlayerView: function () {

        },
        init: function (readyCallback) {
            AnslemClient.readyCallback = readyCallback;
            AnslemClient.nodeClient.start(function (response) {
                var sprites = response.initialData.assets.sprites;
                AnslemClient.stage.init(document.body, response.initialData.viewScale);
                AnslemClient.viewWidth = AnslemClient.stage.canvas.width;
                AnslemClient.viewHeight = AnslemClient.stage.canvas.height;
                AnslemClient.stage.loadAssets(
                        Object.keys(sprites).length,
                        function (assetLoadedCallback) {
                            for (var index in sprites) {
                                var s = sprites[index];
                                AnslemClient.stage.sprites[index] = new Sprite(anslemClientConfig.assetsUrl + s.imagePath, s.frameCount, s.frameSpeed, assetLoadedCallback, s.singleImage);
                            }
                            AnslemClient.stage.sounds = {};
                        },
                        function () {
                            AnslemClient.data = AnslemClient.nodeClient.data;
                            AnslemClient.readyCallback();
                        }
                );
            });
        },
        nodeClient: new NodeClient(anslemClientConfig.serverUrl),
        readyCallback: function () {
            console.log("Ready");
        },
        render: function (ctx) {
            var packet = AnslemClient.data.packet;
            for (var index in packet.contents) {
                var e = packet.contents[index];
                var sprite = AnslemClient.stage.sprites[e.sprite.image];
                if (e.sprite.tileX) {
                    for (var xx = -Math.floor((packet.viewX * e.sprite.scrollSpeed) % e.width); xx < AnslemClient.stage.canvas.width; xx = xx + e.width) {
                        sprite.draw(ctx, e.sprite.frame, xx, e.y - (e.height / 2) - packet.viewY, e.sprite.mirror);
                    }
                } else {
                    sprite.draw(ctx, e.sprite.frame, e.x - (e.width / 2) - packet.viewX, e.y - (e.height / 2) - packet.viewY, e.sprite.mirror);
                }
            }
            if (AnslemClient.debugging)
                AnslemClient.renderDebug(ctx);
        },
        renderDebug: function (ctx) {
            var packet = AnslemClient.data.packet;
            for (var index in packet.contents) {
                var e = packet.contents[index];
                ctx.beginPath();
                ctx.fillStyle = 'red';
                ctx.arc(e.x - packet.viewX, e.y - packet.viewY, 5, 0, 2 * Math.PI, false);
                ctx.fill();
                ctx.rect(e.x - (e.width / 2) - packet.viewX, e.y - (e.height / 2) - packet.viewY, e.width, e.height);
                ctx.stroke();
            }
            ctx.font = (30 * AnslemClient.stage.viewScale) + "px Georgia";
            ctx.fillText("FPS: " + AnslemClient.stage.currentFps, 50, 50);
        },
        running: false,
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
        viewWidth: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
        viewHeight: Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
    };

    return AnslemClient;
});
