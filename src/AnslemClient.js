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
     * @constructor
     * @param {String} serverAddress
     */
    function AnslemClient(serverAddress) {
        NodeClient.call(this);
        var self = this;
        /**
         * Debugging flag
         *
         * @property debugging
         * @type {Boolean}
         */
        this.debugging = false;

        /**
         * Server address
         *
         * @property serverAddress
         * @type {String}
         */
        this.serverAddress = serverAddress;

        /**
         * Stage object
         *
         * @property stage
         * @type {Stage}
         */
        this.stage = new Stage();

        /**
         * Error callback
         *
         * @event errorCallback
         * @param {Object} response
         */
        this.errorCallback = function (response) {
            this.showMessage(response.message);
        };
        /**
         * Render the scene
         *
         * @method render
         * @param {Object} ctx
         */
        this.render = function (ctx) {
            for (var index in self.data.packet.contents) {
                var e = self.data.packet.contents[index];
                var sprite = self.stage.sprites[e.sprite.image];
                if (e.sprite.tileX) {
                    for (var xx = -Math.floor((self.data.packet.viewX * e.sprite.scrollSpeed) % e.width); xx < self.stage.canvas.width; xx = xx + e.width) {
                        sprite.draw(ctx, e.sprite.frame, xx, e.y - (e.height / 2) - self.data.packet.viewY, e.sprite.mirror);
                    }
                } else {
                    sprite.draw(ctx, e.sprite.frame, e.x - (e.width / 2) - self.data.packet.viewX, e.y - (e.height / 2) - self.data.packet.viewY, e.sprite.mirror);
                }
            }
        };

        /**
         * Show message to client
         *
         * @method showMessage
         * @param {String} message
         */
        AnslemClient.prototype.showMessage = function (message) {
            var m = document.createElement("div");
            m.className = "client-message";
            m.innerHTML = message;
            this.stage.container.appendChild(m);
        };

        /**
         * Start it up
         *
         * @method start
         */
        AnslemClient.prototype.start = function () {
            NodeClient.prototype.start.call(this, function (response) {
                var sprites = response.initialData.assets.sprites;
                self.stage.init(document.body, response.initialData.viewScale);
                self.stage.loadAssets(
                        Object.keys(sprites).length,
                        function (assetLoadedCallback) {
                            for (var index in sprites) {
                                var s = sprites[index];
                                self.stage.sprites[index] = new Sprite(AnslemClientConfig.assetsUrl + s.imagePath, s.frameCount, s.frameSpeed, assetLoadedCallback, s.singleImage);
                            }
                            self.stage.sounds = {};
                        },
                        function () {
                            self.stage.start(self.render);
                        }
                );
            });
        };

        /**
         * Stop drawing
         *
         * @method stop
         */
        AnslemClient.prototype.stop = function () {
            this.stage.stop();
        };
    }
    AnslemClient.prototype = new NodeClient();
    AnslemClient.prototype.constructor = AnslemClient;

    return AnslemClient;
});
