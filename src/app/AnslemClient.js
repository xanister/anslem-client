/**
 * Connects to server and draws to stage
 *
 * @module Anslem
 * @requires AnslemClientConfig, NodeClient, pixi
 */
define(['AnslemClientConfig', 'NodeClient', 'pixi', 'touchables'], function (AnslemClientConfig, NodeClient, PIXI, Touchables) {
    /**
     * Anslem game client wrapper
     *
     * @class AnslemClient
     * @constructor
     * @param {String} serverAddress
     */
    function AnslemClient(serverAddress) {
        NodeClient.call(this, serverAddress);
        /**
         * Pixi renderer
         *
         * @property renderer
         * @private
         * @type {Object}
         */
        var renderer = PIXI.autoDetectRenderer(this.clientScreenWidth, this.clientScreenHeight, {
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
         * Attached to player
         *
         * @property attached
         * @type {Boolean}
         */
        this.attached = false;

        /**
         * Debugging flag
         *
         * @property debugging
         * @type {Boolean}
         */
        this.debugging = false;

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
            this.on("attached", function (playerId) {
                console.log("successfully attached to player " + playerId);
                self.attached = true;
                self.playerId = playerId;
            });

            // Asset update recieved
            this.on("assetUpdate", function (assetList) {
                console.log("received asset update");
                self.loadAssets.call(self, assetList);
            });

            // Forward recieved
            this.on("forward", function (serverAddress) {
                console.log("received forward");
                //                self.ondisconnect = function () {
                //                    self.serverAddress = serverAddress;
                //                    self.connect();
                //                };
                self.attached = false;
                self.disconnect();
                self.serverAddress = serverAddress;
                self.connect();
            });

            // Frame update recieved
            this.on("frameUpdate", function (packet) {
                self.updateStage(packet);
                self.lastPacket = packet;
            });

            // View update recieved
            this.on("viewUpdate", function (view) {
                console.log("recieved view update");
                self.setViewSize.call(self, view.width, view.height);
            });

            // Transition recieved
            this.on("transition", function (transition) {
                console.log("recieved transition");
                self.setState("transitioning");
                renderer.view.className = transition.start;
                setTimeout(function () {
                    renderer.view.className = transition.end;
                    self.setState("running", true);
                    requestAnimFrame(function () {
                        renderer.render(stage);
                    });
                }, transition.duration);
            });

            // Reconnect
            document.getElementById("state-indicator").addEventListener("click", function () {
                self.connect.call(self);
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
            if (!this.sprites[e.sprite.name]) {
                console.log("Missing animation");
                console.log(e.sprite);
            }
            if (e.sprite.tileX) {
                /* Tiling sprite */
                actor = new PIXI.TilingSprite(
                        this.sprites[e.sprite.name][e.sprite.animation || "default"][e.sprite.frame || 0],
                        Math.max(this.clientScreenWidth, this.clientScreenHeight, e.width, this.sprites[e.sprite.name][e.sprite.animation || "default"][e.sprite.frame || 0].width) * window.devicePixelRatio,
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
         * @protected
         */
        this.loadAssets = function (assetList) {
            this.setState("loading", true);

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
                this.setState("running", true);
                return true;
            }

            this.loadingIndicator.max = imagePaths.length;

            var assetLoader = new PIXI.AssetLoader(imagePaths, true);
            var self = this;
            assetLoader.onProgress = function () {
                self.loadingIndicator.value++;
                self.setState("loading (" + self.loadingIndicator.value + "/" + self.loadingIndicator.max + ")");
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
                self.setState("running", true);
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
            console.log("Connected");
            this.bindEvents();

            // Ask for assets
            console.log("triggering assetRequest");
            this.trigger("assetRequest");

            // Clear actors on stage when connecting
            this.actorsContainer.removeChildren();
            for (var i; i < this.actorsContainer.length; i++) {
                this.actorsContainer.removeChild(this.actorsContainer[i]);
            }
            this.actors = {};
        };

        /**
         * Disconnected to server callback
         *
         * @event ondisonnect
         * @protected
         */
        this.ondisconnect = function () {
            console.log("Disconnected");
            this.attached = false;
        };

        /**
         * State changed
         *
         * @event
         * @param {String} newState
         * @protected
         */
        this.onstatechange = function (newState) {
            console.log("State changed: " + newState);
            document.getElementById("state-indicator").innerHTML = newState;
            document.body.setAttribute("data-state", newState);

            switch (newState) {
                case "disconnected":
                    break;
                case "running":
                    if (!this.attached)
                        this.trigger("playerjoin", {playerId: this.playerId});
                    break;
            }
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

            document.addEventListener("keydown", function (event) {
                if (event.keyCode === 13) {
                    var message = prompt("Message:");
                    if (message) {
                        self.inputs.events.message = message;
                    }
                }
            });

            // Loading indicator
            this.loadingIndicator = document.createElement("progress");
            this.loadingIndicator.id = "loading-indicator";
            document.body.appendChild(this.loadingIndicator);
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
            // Special
            if (packet.transition)
                renderer.view.className = packet.transition;

            // Remove actors
            for (var index in packet.inViewRemoved) {
                var a = packet.inViewRemoved[index];
                this.actorsContainer.removeChild(this.actors[a.id]);
                delete this.actors[a.id];
            }

            // Add Actors
            for (var index in packet.inViewAdded) {
                var a = packet.inViewAdded[index];
                var actor = this.getActor(a);
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
                if (self.state === "running") {
                    renderer.render(stage);
                    self.updateDom();
                }
            });
        };

        /**
         * Connect to server and start the stage
         *
         * @method init
         */
        AnslemClient.prototype.start = function () {
            NodeClient.prototype.start.call(this);
            this.initializeDom();

            /*
             var startTime = 1;
             var self = this;
             function render(timestamp) {
             renderer.currentFps = Math.round(1000 / (timestamp - startTime));
             startTime = timestamp;

             // Render on loop
             if (self.state === "running") {
             renderer.render(stage);
             self.updateDom();
             }
             requestAnimFrame(render);
             }
             requestAnimFrame(render);
             */
        };
    }
    AnslemClient.prototype = new NodeClient();
    AnslemClient.prototype.constructor = AnslemClient;

    return AnslemClient;
});
