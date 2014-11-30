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
         * Bind events
         *
         * @method bindEvents
         */
        this.bindEvents = function () {
            document.addEventListener("keydown", function (e) {
                var code = e.keyCode || e.which;
                if (code === 13)
                    self.messageInput();
            });

            document.addEventListener("swipedown", function (e) {
                self.messageInput();
            });
        };

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
         * Get message from client and send to server
         *
         * @method messageInput
         */
        this.messageInput = function () {
            this.stage.stop();
            var message = prompt("Say:");
            this.stage.start(this.render);
            self.inputs.message = message;
            self.inputUpdate.call(self, self.inputs);
        };

        /**
         * Render the scene
         *
         * @method render
         * @param {Object} ctx
         */
        this.render = function (ctx) {
            self.data.packet.contents.sort(function (a, b) {
                var diff = a.z - b.z;
                return diff === 0 ? a.x - b.x : diff;
            });
            for (var index in self.data.packet.contents) {
                var e = self.data.packet.contents[index];
                var sprite = self.stage.sprites[e.sprite.name][e.sprite.animation];
                if (e.sprite.tileX)
                    for (var xx = -Math.floor((self.data.packet.viewX * e.sprite.scrollSpeed) % e.width); xx < self.stage.canvas.width; xx = xx + e.width) {
                        sprite.draw(ctx, e.sprite.frame, xx, e.y - (e.height / 2) - self.data.packet.viewY, e.sprite.mirror);
                    }
                else
                    sprite.draw(ctx, e.sprite.frame, e.x - (sprite.width / 2) - self.data.packet.viewX, e.y - (sprite.height / 2) - self.data.packet.viewY, e.sprite.mirror);
                if (e.bubble)
                    self.stage.drawBubble(e.bubble.message, e.x - self.data.packet.viewX, e.y - (sprite.height / 2) - self.data.packet.viewY);
            }
            if (self.debugging)
                self.stage.drawText(self.stage.currentFps, 50, 100, "bold 100px Arial", "red");
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
            document.getElementById('client-messages').appendChild(m);
        };

        /**
         * Start it up
         *
         * @method start
         */
        AnslemClient.prototype.start = function () {
            NodeClient.prototype.start.call(this, function (response) {
                var sprites = response.initialData.assets.sprites;
                var spriteCount = 0;
                for (var index in sprites) {
                    spriteCount += Object.keys(sprites[index]).length;
                }
                self.stage.init(document.body, response.initialData.viewScale);
                self.stage.loadAssets(
                        spriteCount,
                        function (assetLoadedCallback) {
                            for (var index in sprites) {
                                self.stage.sprites[index] = {};
                                for (var animation in sprites[index]) {
                                    var s = sprites[index][animation];
                                    self.stage.sprites[index][animation] = new Sprite(AnslemClientConfig.assetsUrl + s.imagePath, s.frameCount, s.frameSpeed, assetLoadedCallback, s.singleImage, s.xOffset, s.yOffset);
                                }
                            }
                            self.stage.sounds = {};
                        },
                        function () {
                            self.stage.targetFps = AnslemClientConfig.clientFps;
                            self.stage.start(self.render);
                            self.bindEvents();
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
