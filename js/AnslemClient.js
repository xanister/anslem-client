/**
 * Connects to server and draws to stage
 *
 * @module Anslem
 * @requires AnslemClientConfig, NodeClient, Sprite, Stage, howler
 */
define(['AnslemClientConfig', 'lib/NodeClient', 'lib/Sprite', 'lib/Stage', 'lib/howler'], function (AnslemClientConfig, NodeClient, Sprite, Stage) {
    /**
     * Anslem game client wrapper
     *
     * @class AnslemClient
     * @static
     */
    var AnslemClient = {
        /**
         * Data synced from server
         *
         * @property data
         * @type {Object}
         */
        data: {},
        /**
         * Debugging flag
         *
         * @property debugging
         * @type {Boolean}
         */
        debugging: false,
        /**
         * Error callback
         *
         * @event errorCallback
         * @param {Object} response
         */
        errorCallback: function (response) {
            AnslemClient.showMessage(response.message);
        },
        /**
         * Initialize the stage and server
         *
         * @method init
         * @param {Function} readyCallback
         */
        init: function (readyCallback) {
            AnslemClient.readyCallback = readyCallback;
            AnslemClient.nodeClient.errorCallback = AnslemClient.errorCallback;
            AnslemClient.nodeClient.start(function (response) {
                var sprites = response.initialData.assets.sprites;
                AnslemClient.stage.init(document.body, response.initialData.viewScale);
                AnslemClient.stage.loadAssets(
                        Object.keys(sprites).length,
                        function (assetLoadedCallback) {
                            for (var index in sprites) {
                                var s = sprites[index];
                                AnslemClient.stage.sprites[index] = new Sprite(AnslemClientConfig.assetsUrl + s.imagePath, s.frameCount, s.frameSpeed, assetLoadedCallback, s.singleImage);
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
        /**
         * Node client object
         *
         * @property nodeClient
         * @type {NodeClient}
         */
        nodeClient: new NodeClient(AnslemClientConfig.serverUrl),
        /**
         * Callback when ready
         *
         * @event readyCallback
         */
        readyCallback: function () {
            console.log("Ready");
        },
        /**
         * Render the scene
         *
         * @method render
         * @param {Object} ctx
         */
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
        },
        /**
         * Running flag
         *
         * @property running
         * @type {Boolean}
         */
        running: false,
        /**
         * Show message to client
         *
         * @method showMessage
         * @param {String} message
         */
        showMessage: function (message) {
            var m = document.createElement("div");
            m.className = "client-message";
            m.innerHTML = message;
            AnslemClient.stage.container.appendChild(m);
            console.log(message);
        },
        /**
         * Stage object
         *
         * @property stage
         * @type {Stage}
         */
        stage: new Stage(),
        /**
         * Start it up
         *
         * @method start
         */
        start: function () {
            AnslemClient.running = true;
            AnslemClient.stage.start(AnslemClient.render);
        },
        /**
         * Stop drawing
         *
         * @method stop
         */
        stop: function () {
            AnslemClient.running = false;
            AnslemClient.stage.stop();
        }
    };

    return AnslemClient;
});
