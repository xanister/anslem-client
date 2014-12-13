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
        var stage = new PIXI.Stage(0x111111, true);


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
        this.debugging = false;

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
            this.on("viewUpdate", function (view) {
                console.log("Recieved view update");
                self.setViewSize.call(self, view.width, view.height);
            });
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
            // Check if already exoits
            if (this.actors[e.id])
                return this.actors[e.id];

            var actor;
            if (e.sprite.tileX) {
                /* Tiling sprite */
                actor = new PIXI.TilingSprite(
                        this.sprites[e.sprite.name][e.sprite.animation][e.sprite.frame],
                        Math.max(this.clientScreenWidth, this.clientScreenHeight, e.width, this.sprites[e.sprite.name][e.sprite.animation][e.sprite.frame].width) * window.devicePixelRatio,
                        this.sprites[e.sprite.name][e.sprite.animation][e.sprite.frame].height
                        );
                actor.pivot.y = 0.5;

                // Scale far back layer TODO: Doesn't work
                if (e.z === 0) {
                    var scale = e.height / (this.sprites[e.sprite.name][e.sprite.animation][e.sprite.frame].height);
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
                actor.base = new PIXI.Sprite(this.sprites[e.sprite.name][e.sprite.animation][e.sprite.frame]);
                actor.addChild(actor.base);
                actor.base.anchor.x = 0.5;
                actor.base.anchor.y = 0.5;
                actor.base.srcId = e.id;
                //actor.hitArea = new PIXI.Rectangle(-actor.base.width / 2, actor.base.width / 2, -actor.base.height / 2, actor.base.height / 2);
                var self = this;

                actor.base.interactive = true;
                actor.base.touchstart = function (event) {
                    self.inputs.events.actortap = {
                        id: event.target.parent.src.id
                    };
                    self.inputUpdate(self.inputs);
                };
                actor.base.mousedown = function (event) {
                    self.inputs.events.actorclick = {
                        id: event.target.parent.src.id
                    };
                    self.inputUpdate(self.inputs);
                };


                // Add indicator
                actor.indicator = new PIXI.Sprite(this.sprites["star"]["default"][0]);
                actor.addChild(actor.indicator);
                actor.indicator.anchor.x = 0.5;
                actor.indicator.anchor.y = 0.5;
                actor.indicator.position.x = 0;
                actor.indicator.position.y = -(actor.base.height / 2) - (actor.indicator.height / 2);
                actor.indicator.visible = false;

            }

            actor.outOfView = 0;

            // Add the new actor to the stage
            this.actorsContainer.addChild(actor);

            return actor;
        };

        /**
         * Server has requested client to load some assets
         *
         * @event onassetupdate
         * @param {Object} response
         * @protected
         */
        this.onassetupdate = function (response) {
            console.log("Recieved asset update");
            this.setState("loading", true);

            var sprites = response.sprites;
            var imagePaths = [];
            for (var index in sprites) {
                for (var animation in sprites[index]) {
                    var s = sprites[index][animation];
                    if (!this.sprites[index] || !this.sprites[index][animation])
                        imagePaths.push(AnslemClientConfig.assetsUrl + s.imagePath + ".png");
                }
            }
            if (imagePaths.length === 0) {
                this.setState("ready", true);
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
                            self.sprites[name][animation][frame] = new PIXI.Texture(texture, new PIXI.Rectangle(frame * s.width, 0, s.width, s.height));
                        }
                    }
                }
                self.setState("ready", true);
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
            console.log("Connected");
            this.setState("requesting assets", true);
            this.bindEvents();
        };

        /**
         * Disconnected to server callback
         *
         * @event ondisonnect
         * @param {Object} response
         * @protected
         */
        this.ondisconnect = function (response) {
            console.log("Disconnected");
        };

        /**
         * State changed
         *
         * @event
         * @param {String} newstate
         * @protected
         */
        this.onstatechange = function (newstate) {
            console.log("State change: " + newstate);
            document.getElementById("state-indicator").innerHTML = newstate;
            document.body.setAttribute("data-state", newstate);

            switch (newstate) {
                case "disconnected":
                    break;
                case "ready":
                    break;
            }
        };

        /**
         * Server update callback, setup the sprites on
         * the stage, then deletes sprites that have
         * left the stage
         *
         * @event updateCallback
         * @param {Object} response
         * @protected
         */
        this.onupdate = function (response) {
            if (this.state !== "ready")
                return false;

            // Setup list of visible actors
            var actors = {};
            for (var index in response.packet.inView) {
                var e = response.packet.inView[index];
                var actor = this.getActor(e);

                // Move actor to new location
                actor.src = e;
                if (actor.src.sprite.tileX) {
                    actor.width = renderer.view.width / this.actorsContainer.scale.x;
                    actor.tilePosition.x = -Math.floor(response.packet.viewX * actor.src.sprite.scrollSpeed) % actor.src.width;
                    actor.position.y = Math.floor(e.y - response.packet.viewY - (e.height / 2)) - 1;
                } else {
                    actor.scale.x = e.sprite.mirror;
                    actor.position.x = Math.floor(actor.src.x - response.packet.viewX);
                    actor.position.y = Math.floor(actor.src.y - response.packet.viewY);
                    actor.base.setTexture(this.sprites[e.sprite.name][e.sprite.animation][e.sprite.frame]);
                    actor.base.onTextureUpdate();

                    actor.indicator.visible = e.bubble.star ? true : false;

                    if (actor.shadow) {
                        actor.shadow.position.y = actor.src.belowY - actor.src.y;
                    }
                }

                // Add to new list
                actor.outOfView = 0;
                actors[actor.src.id] = actor;
                delete this.actors[actor.src.id];
            }

            // Remove non visible actors
            for (var id in this.actors) {
                this.actors[id].outOfView++;
                if (this.actors[id].outOfView > 10)
                    this.actorsContainer.removeChild(this.actors[id]);
                else
                    actors[id] = this.actors[id];
            }
            this.actors = actors;

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
//            this.keyboard.onactivate = function () {
//                self.pause.call(self);
//            };
//            this.keyboard.ondeactivate = function () {
//                self.unpause.call(self);
//            };

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
            var width = this.clientScreenWidth;
            var height = this.clientScreenHeight;
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
         * Connect to server and start the stage
         *
         * @method init
         */
        AnslemClient.prototype.start = function () {
            NodeClient.prototype.start.call(this);

            this.initializeDom();

            var startTime = 1;
            var self = this;
            function render(timestamp) {
                renderer.currentFps = Math.round(1000 / (timestamp - startTime));
                startTime = timestamp;
                renderer.render(stage);
                requestAnimFrame(render);
                self.updateDom();
            }
            requestAnimFrame(render);
        };
    }
    AnslemClient.prototype = new NodeClient();
    AnslemClient.prototype.constructor = AnslemClient;

    return AnslemClient;
});
