/**
 * Connects to server and draws to stage
 *
 * @module Anslem
 * @requires AnslemClientConfig, NodeRoomClient, pixi
 */
define(['AnslemClientConfig', 'NodeRoomClient', 'pixi', 'touchables'], function (AnslemClientConfig, NodeRoomClient, PIXI, Touchables) {
    /**
     * Anslem game client wrapper
     *
     * @class AnslemClient
     * @constructor
     * @param {String} serverAddress
     */
    function AnslemClient(serverAddress) {
        NodeRoomClient.call(this, serverAddress);

        /**
         * Pixi renderer
         *
         * @property renderer
         * @private
         * @type {Object}
         */
        var renderer = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight, {
            resolution: 1,
            transparent: true
        });
        renderer.view.id = "primary-canvas";
        document.body.appendChild(renderer.view);

        /**
         * Stage object
         *
         * @property stage
         * @private
         * @type {Stage}
         */
        var stage = new PIXI.Stage(0x111111);


        /**
         * Actors on stage
         *
         * @property actors
         * @type {Object}
         */
        this.actors = {};

        /**
         * Actors container for scaling
         *
         * @property actorsContainer
         * @type {Object}
         */
        this.actorsContainer = new PIXI.DisplayObjectContainer();
        stage.addChild(this.actorsContainer);

        /**
         * Debugging flag
         *
         * @property debugging
         * @type {Boolean}
         */
        this.debugging = true;

        /**
         * Pause rendering flag
         *
         * @property pauseRender
         * @type {Boolean}
         */
        this.pauseRender = false;

        /**
         * Universe player id
         *
         * @property playerId
         * @type {Number}
         */
        this.playerId = false;

        /**
         * Available sprites
         *
         * @property sprites
         * @type {Object}
         */
        this.sprites = {};

        /**
         * Bind events
         *
         * @method bindEvents
         * @protected
         */
        this.bindEvents = function () {
            var self = this;

            // Client succesfully attached
            this.on("attached", function (event) {
                self.log("attached to player " + event.playerId);
                self.playerId = event.playerId;

                self.setState("loading", true);
                self.loadAssets.call(self, event.assets, function () {
                    self.setViewSize.call(self, event.view.width, event.view.height);
                    self.setState("running", true);
                    self.log("ready");
                    self.trigger("ready");
                });
            });

            // Forward recieved
            this.on("forward", function (serverAddress) {
                self.log("received forward");
                self.setState("forwarding");
                self.ondisconnect = function () {
                    self.serverAddress = serverAddress;
                    self.connect();
                };
                self.disconnect();

                self.log("removing all actors");
                self.actorsContainer.removeChildren();
                self.actors = {};
            });

            // Frame update recieved
            this.on("frameUpdate", function (packet) {
                self.updateStage(packet);
                self.lastPacket = packet;
            });

            // Headline recieved
            this.on("headline", function (headline) {
                self.log("recieved headline");
                self.headline.innerHTML = headline.message;
                self.headline.className = "active";
                setTimeout(function () {
                    self.headline.className = "";
                }, headline.time || 3000);
            });

            // Transition recieved
            this.on("transition", function (transition) {
                self.log("recieved transition");
                self.pauseRender = transition.pauseRender || false;
                renderer.view.className = transition.class;
                if (self.pauseRender) {
                    setTimeout(function () {
                        requestAnimFrame(function () {
                            renderer.render(stage);
                            self.pauseRender = false;
                        });
                    }, transition.pauseRender);
                }
            });

            // View update recieved
            this.on("viewUpdate", function (view) {
                self.log("recieved view update");
                self.setViewSize.call(self, view.width, view.height);
            });

            // Reconnect
            document.getElementById("state-indicator").addEventListener("click", function () {
                self.connect.call(self);
            });

            // Hotkeys
            document.addEventListener("keydown", function (event) {
                if (event.keyCode === 13) {
                    if (event.altKey) {
                        // Fullscreen request
                        if (document.fullScreen) {
                            document.exitFullscreen();

                        } else {
                            document.body.webkitRequestFullScreen ? document.body.webkitRequestFullscreen() : document.body.mozRequestFullscreen();
                        }
                    } else {
                        // Keyboard message popup
                        var message = prompt("Message:");
                        if (message) {
                            self.inputs.events.message = message;
                        }
                    }
                }
            });
        };

        /**
         * Get actor object
         *
         * @method getActor
         * @param {Object} e
         * @returns {Object}
         */
        this.getActor = function (e) {
            var actor;
            if (e.sprite.tileX) {
                /* Tiling sprite */
                actor = new PIXI.TilingSprite(
                        this.sprites[e.sprite.name][e.sprite.animation || "default"][e.sprite.frame || 0],
                        Math.max(window.innerWidth, window.innerHeight, e.width, this.sprites[e.sprite.name][e.sprite.animation || "default"][e.sprite.frame || 0].width) * window.devicePixelRatio,
                        this.sprites[e.sprite.name][e.sprite.animation || "default"][e.sprite.frame || 0].height
                        );
                actor.pivot.y = 0.5;

                // Scale far back layer TODO: Doesn't work
                if (e.z === 0) {
                    var scale = e.height / (this.sprites[e.sprite.name][e.sprite.animation || "default"][e.sprite.frame || 0].height);
                    actor.scale.x = actor.scale.y = scale;
                }
            } else {
                /* Normal sprite */
                actor = new PIXI.DisplayObjectContainer();

                // Add a shadow
                if (e.shadow) {
                    actor.shadow = new PIXI.Sprite(this.sprites["shadow"]["default"][0]);
                    actor.addChild(actor.shadow);
                    actor.shadow.anchor.x = 0.5;
                    actor.shadow.anchor.y = 0.5;
                    actor.shadow.position.x = 0;
                    actor.shadow.position.y = e.height / 2;
                }

                // Add the base
                actor.base = new PIXI.Sprite(this.sprites[e.sprite.name][e.sprite.animation || "default"][e.sprite.frame || 0]);
                actor.addChild(actor.base);
                actor.base.anchor.x = 0.5;
                actor.base.anchor.y = 0.5;
                actor.base.srcId = e.id;

                // Add indicator
                actor.indicator = new PIXI.Sprite(this.sprites["star01"]["default"][0]);
                actor.addChild(actor.indicator);
                actor.indicator.anchor.x = 0.5;
                actor.indicator.anchor.y = 0.5;
                actor.indicator.position.x = 0;
                actor.indicator.position.y = -(actor.base.height / 2) - (actor.indicator.height / 2);
                actor.indicator.visible = false;

                // Add bubble
                actor.bubble = new PIXI.Text("", {font: "50px Arial", fill: "white"});
                actor.bubble.anchor.x = 0.5;
                actor.bubble.anchor.y = 0.5;
                actor.bubble.position.y = 0;
                actor.bubble.position.y = -(actor.base.height / 2) - (actor.bubble.height / 2);
                actor.addChild(actor.bubble);
            }

            // Attach src
            actor.src = e;

            this.actorsContainer.addChild(actor);
            this.actors[actor.src.id] = actor;

            return actor;
        };

        /**
         * Load requested assets
         *
         * @event loadAssets
         * @param {Object} assetList
         * @param {Function} [callback=false]
         * @protected
         */
        this.loadAssets = function (assetList, callback) {
            var sprites = assetList.sprites;
            var imagePaths = [];
            for (var index in sprites) {
                for (var animation in sprites[index]) {
                    var s = sprites[index][animation];
                    if (!this.sprites[index] || !this.sprites[index][animation])
                        imagePaths.push(AnslemClientConfig.assetsUrl + s.imagePath + ".png");
                }
            }
            if (imagePaths.length === 0) {
                if (callback)
                    callback();
                return true;
            }

            this.loadingIndicator.max = imagePaths.length;

            var assetLoader = new PIXI.AssetLoader(imagePaths, true);
            var self = this;
            assetLoader.onProgress = function () {
                self.loadingIndicator.value++;
            };
            assetLoader.onComplete = function () {
                for (var name in sprites) {
                    self.sprites[name] = {};
                    for (var animation in sprites[name]) {
                        self.sprites[name][animation] = {};
                        var s = sprites[name][animation];
                        var texture = new PIXI.Texture.fromImage(AnslemClientConfig.assetsUrl + s.imagePath + ".png");
                        for (var frame = 0; frame < s.frameCount; frame++) {
                            self.sprites[name][animation][frame] = new PIXI.Texture(texture, new PIXI.Rectangle(frame * s.width, s.verticalIndex * s.height, s.width, s.height));
                        }
                    }
                }
                if (callback)
                    callback();
            };
            assetLoader.load();
        };

        /**
         * Connected to server callback
         *
         * @event ononnect
         * @param {Object} response
         * @protected
         */
        this.onconnect = function (response) {
            // Bind client events
            this.bindEvents();

            // Join the server
            this.log("joining the server");
            this.trigger("playerjoin", {playerId: this.playerId});
        };

        /**
         * State changed
         *
         * @event
         * @param {String} newState
         * @protected
         */
        this.onstatechange = function (newState) {
            document.getElementById("state-indicator").innerHTML = newState;
            document.body.setAttribute("data-state", newState);
        };

        /**
         * Creates required dom elements
         *
         * @method initializeDom
         */
        this.initializeDom = function () {
            var self = this;

            // Joystick
            this.joystick = new Touchables.TouchJoystick();

            // keyboard
            this.keyboard = new Touchables.TouchKeyboard();
            this.keyboard.ondeactivate = function (text) {
                self.inputs.events.message = text;
                //self.sendInputUpdate();
                self.keyboard.keyboardValue.innerHTML = "";
            };

            // Loading indicator
            this.loadingIndicator = document.createElement("progress");
            this.loadingIndicator.id = "loading-indicator";
            document.body.appendChild(this.loadingIndicator);

            // Headline
            this.headline = document.createElement("h2");
            this.headline.id = "headline";
            document.body.appendChild(this.headline);
        };

        /**
         * Resizes the view to match dimensions
         *
         * @method setViewSize
         * @param {type} targetWidth
         * @param {type} targetHeight
         */
        this.setViewSize = function (targetWidth, targetHeight) {
            var width = window.innerWidth;
            var height = window.innerHeight;
            var canvas = renderer.view;
            var scene = this.actorsContainer;

            canvas.width = width;
            canvas.height = height;
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';

            renderer.resize(canvas.width, canvas.height);

            if (height / targetHeight < width / targetWidth) {
                scene.scale.x = scene.scale.y = height / targetHeight;
            } else {
                scene.scale.x = scene.scale.y = width / targetWidth;
            }

            scene.pivot.y = 0.5;
            scene.pivot.x = 0.5;
        };

        /**
         * Update misc dom elements
         *
         * @method updateDom
         */
        this.updateDom = function () {
            // Joystick
            this.joystick.update(this.inputs.touches);

            // Debugging
            if (this.debugging)
                document.body.setAttribute("currentFps", renderer.currentFps);
        };

        /**
         * Server update callback, setup the sprites on
         * the stage, then deletes sprites that have
         * left the stage
         *
         * @event updateStage
         * @param {Object} packet
         * @protected
         */
        this.updateStage = function (packet) {
            // Remove actors
            for (var index in packet.inViewRemoved) {
                var a = packet.inViewRemoved[index];
                this.actorsContainer.removeChild(this.actors[a.id]);
                delete this.actors[a.id];
                if (this.debugging)
                    this.log("removed actor " + a.sprite.name);
            }

            // Add Actors
            for (var index in packet.inViewAdded) {
                var a = packet.inViewAdded[index];
                var actor = this.getActor(a);
                if (this.debugging)
                    this.log("added actor " + a.sprite.name);
            }

            // Update changed actors
            for (var index in packet.inViewChanged) {
                var a = packet.inViewChanged[index];
                this.actors[a.id].src = a;
            }

            // Move actors
            for (var id in this.actors) {
                var actor = this.actors[id];
                if (actor.src.sprite.tileX) {
                    actor.width = renderer.view.width / this.actorsContainer.scale.x;
                    actor.tilePosition.x = -Math.floor(packet.viewX * actor.src.sprite.scrollSpeed) % actor.src.width;
                    actor.position.y = Math.floor(actor.src.y - packet.viewY - (actor.src.height / 2)) - 1;
                } else {
                    actor.scale.x = actor.src.sprite.mirror ? -1 : 1;
                    actor.position.x = Math.floor(actor.src.x - packet.viewX);
                    actor.position.y = Math.floor(actor.src.y - packet.viewY);
                    actor.base.setTexture(this.sprites[actor.src.sprite.name][actor.src.sprite.animation || "default"][actor.src.sprite.frame || 0]);
                    actor.base.tint = actor.src.sprite.tint || 0xFFFFFF;
                    actor.base.onTextureUpdate();

                    // Indicator
                    actor.indicator.visible = actor.src.bubble.star ? true : false;

                    // Shadow
                    if (actor.shadow) {
                        actor.shadow.position.y = actor.src.belowY - actor.src.y;
                    }

                    // Bubble
                    if (actor.src.bubble.message) {
                        actor.bubble.setText(actor.src.bubble.message);
                        actor.bubble.scale.x = actor.scale.x;
                    } else {
                        actor.bubble.setText("");
                    }
                }
            }

            // Sort by z
            this.actorsContainer.children.sort(function (a, b) {
                if (a.src.z < b.src.z)
                    return -1;
                else if (a.src.z > b.src.z)
                    return 1;
                else if (a.src.x < b.src.x)
                    return -1;
                else if (a.src.x > b.src.x)
                    return 1;
                return 0;
            });

            // Update view
            var self = this;
            requestAnimFrame(function () {
                if (!self.pauseRender) {
                    renderer.render(stage);
                    self.updateDom();
                }
                return false;
            });
        };

        /**
         * Connect to server and start the stage
         *
         * @method init
         */
        AnslemClient.prototype.start = function () {
            NodeRoomClient.prototype.start.call(this);
            this.initializeDom();
        };
    }
    AnslemClient.prototype = new NodeRoomClient();
    AnslemClient.prototype.constructor = AnslemClient;

    return AnslemClient;
});
