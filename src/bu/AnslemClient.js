/**
 * Connects to server and draws to stage
 *
 * @module Anslem
 * @requires AnslemClientConfig, NodeClient, Sprite, Stage, howler
 */
define(['AnslemClientConfig', 'jquery', 'jquery.keyboard', 'NodeClient', 'Sprite', 'Stage', 'howler'], function (AnslemClientConfig, $, keyboard, NodeClient, Sprite, Stage) {
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
            document.addEventListener("keyup", function (e) {
                var code = e.keyCode || e.which;
                if (code === 13) {
                    if (self.textInput.className === "") {
                        self.textInput.blur();
                    } else {
                        self.textInput.style.left = (self.data.packet.x - self.data.packet.viewX) / self.stage.viewScale + "px";
                        self.textInput.style.top = (self.data.packet.y - self.data.packet.viewY - self.data.packet.height) / self.stage.viewScale + "px";
                        self.textInput.className = "";
                        self.textInput.value = 'Say...';
                        self.textInput.selectionStart = 0;
                        self.textInput.selectionEnd = 6;

                        self.inputs.events = self.getEmptyInputEvents();
                        self.inputs.keyboard = {};
                        self.inputs.touches = {};
                        self.inputUpdate.call(self, self.inputs);
                        self.inputEnabled = false;

                        self.textInput.focus();
                        return false;
                    }
                }
            });

            document.addEventListener("swipedown", function () {
                self.textInput.style.left = (self.data.packet.x - self.data.packet.viewX) / self.stage.viewScale + "px";
                self.textInput.style.top = (self.data.packet.y - self.data.packet.viewY - self.data.packet.height) / self.stage.viewScale + "px";
                self.textInput.className = "";
                self.textInput.value = '';
            });

            this.textInput.addEventListener("keydown", function () {
                if (this.value.length > 32)
                    this.value = this.value.substr(0, 32);
            });

            this.textInput.addEventListener("focus", function () {
                self.inputs.events = self.getEmptyInputEvents();
                self.inputs.keyboard = {};
                self.inputs.touches = {};
                self.inputUpdate.call(self, self.inputs);
                self.inputEnabled = false;
            });

            this.textInput.addEventListener("blur", function () {
                self.inputEnabled = true;
                this.className = "hidden";
                if (this.value.length > 0) {
                    self.inputs.message = this.value;
                    self.inputUpdate.call(self, self.inputs);
                }
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
         * Render the scene
         *
         * @method render
         * @param {Object} ctx
         */
        this.render = function (ctx) {
            self.data.packet.inView.sort(function (a, b) {
                var diff = a.z - b.z;
                return diff === 0 ? a.x - b.x : diff;
            });
            for (var index in self.data.packet.inView) {
                var e = self.data.packet.inView[index];
                var sprite = self.stage.sprites[e.sprite.name][e.sprite.animation];
                if (e.sprite.tileX)
                    for (var xx = -Math.floor((self.data.packet.viewX * e.sprite.scrollSpeed) % e.width); xx < self.stage.canvas.width; xx = xx + e.width) {
                        sprite.draw(ctx, e.sprite.frame, xx, e.y - (e.height / 2) - self.data.packet.viewY, e.sprite.mirror);
                    }
                else
                    sprite.draw(ctx, e.sprite.frame, e.x - (sprite.width / 2) - self.data.packet.viewX, e.y - (sprite.height / 2) - self.data.packet.viewY, e.sprite.mirror);
                if (e.bubble)
                    self.stage.drawBubble(e.bubble.message, e.x - self.data.packet.viewX, e.y - sprite.height - self.data.packet.viewY);
            }
            if (self.debugging)
                self.stage.drawText(self.stage.currentFps, 50, 100, "bold 100px arial", "red");
        };

        /**
         * Preload assets, connect to server and get everything ready
         *
         * @method init
         * @param {Function} readyCallback
         */
        AnslemClient.prototype.init = function (readyCallback) {
            // Setup the loading indicator
            var loadingIndicator = document.createElement("progress");
            loadingIndicator.id = "loading-indicator";
            loadingIndicator.max = 100;
            loadingIndicator.value = 0
            this.stage.container.appendChild(loadingIndicator);
            self.stage.loadingTickCallback = function (percent) {
                loadingIndicator.value = Math.floor(percent * 100);
                loadingIndicator.className = percent === 1 ? 'done' : '';
            };

            // Create the virtual keyboard
            this.textInput = document.createElement("textarea");
            this.textInput.id = "text-input";
            this.textInput.className = "hidden";
            this.textInput.rows = 2;
            document.body.appendChild(this.textInput);

            // Connect to server and get list of required assets
            NodeClient.prototype.start.call(this, function (response) {
                // Preload all needed images
                var sprites = response.initialData.assets.sprites;
                var imagePaths = [];
                for (var index in sprites) {
                    for (var animation in sprites[index]) {
                        var s = sprites[index][animation];
                        if (s.frameCount > 0 && !s.singleImage) {
                            for (var i = 0; i < s.frameCount; i++)
                                imagePaths.push(AnslemClientConfig.assetsUrl + s.imagePath + "__" + zeroPad(i, 3) + '.png');
                        } else {
                            imagePaths.push(AnslemClientConfig.assetsUrl + s.imagePath + ".png");
                        }
                    }
                }

                // Load sounds
                var soundPaths = [];

                // Start up the stage
                self.stage.targetFps = AnslemClientConfig.clientFps;
                self.stage.init(imagePaths, soundPaths, document.body, response.initialData.viewScale, function () {
                    // Create the sprites
                    for (var index in sprites) {
                        self.stage.sprites[index] = {};
                        for (var animation in sprites[index]) {
                            var s = sprites[index][animation];
                            var spr = new Sprite();
                            var path = AnslemClientConfig.assetsUrl + sprites[index][animation].imagePath;
                            var images = [];
                            if (s.singleImage) {
                                images.push(self.stage.assetStore.images[path + ".png"]);
                            } else {
                                for (var i = 0; i < s.frameCount; i++)
                                    images.push(self.stage.assetStore[images][path + "__" + zeroPad(i, 3) + '.png']);
                            }
                            spr.setImages(images, s.frameCount, s.frameSpeed, s.xOffset, s.yOffset);
                            self.stage.sprites[index][animation] = spr;
                        }
                    }
                    // Good to go
                    if (readyCallback)
                        readyCallback.call(self);
                });
            });
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
            this.bindEvents();
            this.stage.start(self.render);
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

    /**
     * Return zero padded number
     *
     * @method zeroPad
     * @param {String} subject
     * @param {Number} width
     * @param {Number} char
     * @return {String}
     */
    this.zeroPad = function (subject, width, char) {
        char = char || '0';
        subject = subject + '';
        return subject.length >= width ? subject : new Array(width - subject.length + 1).join(char) + subject;
    };

    AnslemClient.prototype = new NodeClient();
    AnslemClient.prototype.constructor = AnslemClient;

    return AnslemClient;
});
