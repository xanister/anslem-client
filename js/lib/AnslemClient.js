define(['NodeClient', 'Stage', 'Sprite', 'howler'], function (NodeClient, Stage, Sprite) {
    /**
     * Anslem game client wrapper
     * @type Object
     */
    var AnslemClient = {
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
                                AnslemClient.stage.sprites[index] = new Sprite(s.imagePath, s.frameCount, s.frameSpeed, assetLoadedCallback, s.singleImage);
                            }
                            AnslemClient.stage.sounds = {};
                        },
                        function () {
                            AnslemClient.scene = AnslemClient.nodeClient.data;
                            AnslemClient.readyCallback();
                        }
                );
            }, AnslemClient.viewWidth + "," + AnslemClient.viewHeight);
        },
        nodeClient: new NodeClient("http://forest.anslemgalaxy.com:3000"),
        readyCallback: function () {
            console.log("Ready");
        },
        render: function (ctx) {
            var packet = AnslemClient.scene.packet;
            for (var index in packet.contents) {
                var e = packet.contents[index];
                var sprite = AnslemClient.stage.sprites[e.sprite.image];
                if (e.sprite.tileX) {
                    for (var xx = -Math.floor((packet.viewX * e.sprite.scrollSpeed) % e.width); xx < AnslemClient.viewWidth; xx = xx + e.width) {
                        sprite.draw(ctx, e.sprite.frame, xx, e.y - (e.height / 2) - packet.viewY);
                    }
                } else {
                    sprite.draw(ctx, e.sprite.frame, e.x - (e.width / 2) - packet.viewX, e.y - (e.height / 2) - packet.viewY);
                }
            }
        },
        renderDebug: function (ctx) {
            var packet = AnslemClient.scene.packet;
            for (var index in packet.contents) {
                var e = packet.contents[index];
                var sprite = AnslemClient.stage.sprites[e.sprite.image];
                if (e.sprite.tileX) {
                    for (var xx = -Math.floor((packet.viewX * e.sprite.scrollSpeed) % e.width); xx < AnslemClient.viewWidth; xx = xx + e.width) {
                        sprite.draw(ctx, e.sprite.frame, xx, e.y - (e.height / 2) - packet.viewY);
                    }
                } else {
                    sprite.draw(ctx, e.sprite.frame, e.x - (e.width / 2) - packet.viewX, e.y - (e.height / 2) - packet.viewY);
                }
                ctx.beginPath();
                ctx.arc(e.x - packet.viewX, e.y - packet.viewY, 5, 0, 2 * Math.PI, false);
                ctx.fillStyle = 'red';
                ctx.fill();

                ctx.rect(e.x - (e.width / 2) - packet.viewX, e.y - (e.height / 2) - packet.viewY, e.width, e.height);
                ctx.stroke();
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
        viewWidth: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
        viewHeight: Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
    };

    return AnslemClient;
});
