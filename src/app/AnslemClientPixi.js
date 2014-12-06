/**
 * Connects to server and draws to stage
 *
 * @module Anslem
 * @requires AnslemClientConfig, NodeClient, pixi
 */
define(['AnslemClientConfig', 'NodeClient', 'pixi'], function (AnslemClientConfig, NodeClient, PIXI) {
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
            view: document.getElementById("primary-canvas"),
            resolution: 1 / window.devicePixelRatio
        });

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
                renderer.resize(view.width, view.height);
            });
            document.getElementById("client-state").addEventListener("click", function () {
                self.connect.call(self);
            });
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

            var loadingIndicator = document.getElementById("loading-indicator");
            loadingIndicator.max = imagePaths.length;

            var assetLoader = new PIXI.AssetLoader(imagePaths, true);
            var self = this;
            assetLoader.onProgress = function () {
                loadingIndicator.value++;
                loadingIndicator.className = loadingIndicator.value === loadingIndicator.max ? '' : 'active';
                self.setState("loading (" + loadingIndicator.value + "/" + loadingIndicator.max + ")");
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
            this.infoUpdate({screenWidth: this.clientScreenWidth, screenHeight: this.clientScreenHeight});
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
            document.getElementById('client-state').innerHTML = newstate;
            document.body.setAttribute("data-state", newstate);

            switch (newstate) {
                case "disconnected":
                    break;
                case "ready":
                    break;
            }
        };

        /**
         * Server update callback, setup the sprites on the stage
         *
         * @event updateCallback
         * @param {Object} response
         * @protected
         */
        this.onupdate = function (response) {
            if (this.state !== "ready")
                return false;

            var actors = {};
            for (var index in response.packet.inView) {
                var e = response.packet.inView[index];
                var actor;
                if (!this.actors[e.id]) {
                    var maxWidth = e.width * (renderer.resolution * 2), actor;
                    if (e.sprite.tileX) {
                        actor = new PIXI.TilingSprite(this.sprites[e.sprite.name][e.sprite.animation][e.sprite.frame], maxWidth, e.height);
                    } else {
                        actor = new PIXI.Sprite(this.sprites[e.sprite.name][e.sprite.animation][e.sprite.frame]);
                        actor.anchor.x = 0.5;
                        actor.anchor.y = 0.5;
                    }
                    stage.addChild(actor);
                } else {
                    actor = this.actors[e.id];
                }
                actor.src = e;
                actor.scale.x = actor.src.sprite.mirror ? -1 : 1;
                if (actor.src.sprite.tileX) {
                    actor.tilePosition.x = -(response.packet.viewX * actor.src.sprite.scrollSpeed) % actor.src.width;
                    actor.position.y = actor.src.y - response.packet.viewY - (actor.src.height / 2);
                } else {
                    actor.position.x = actor.src.x - response.packet.viewX;
                    actor.position.y = actor.src.y - response.packet.viewY;
                    actor.setTexture(this.sprites[e.sprite.name][e.sprite.animation][e.sprite.frame]);
                    actor.onTextureUpdate();
                }
                actors[actor.src.id] = actor;
                delete this.actors[actor.src.id];
            }
            for (var index in this.actors) {
                stage.removeChild(this.actors[index]);
            }
            this.actors = actors;
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

            var startTime = 1;
            function render(timestamp) {
                renderer.currentFps = Math.round(1000 / (timestamp - startTime));
                startTime = timestamp;
                renderer.render(stage);
                requestAnimFrame(render);
            }
            requestAnimFrame(render);
        };
    }
    AnslemClient.prototype = new NodeClient();
    AnslemClient.prototype.constructor = AnslemClient;

    return AnslemClient;
});
