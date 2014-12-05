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
        var renderer = PIXI.autoDetectRenderer(this.clientScreenWidth, this.clientScreenHeight);

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
         * Ready?
         *
         * @property assetsLoaded
         * @type {Boolean}
         */
        this.assetsLoaded = false;

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
         * Stage zoom
         *
         * @property viewScale
         * @type {Number}
         */
        this.viewScale = 1;

        /**
         * Server has requested client to load some assets
         *
         * @event onassetupdate
         * @param {Object} response
         */
        this.onassetupdate = function (response) {
            var sprites = response.sprites;
            var imagePaths = [];
            for (var index in sprites) {
                for (var animation in sprites[index]) {
                    var s = sprites[index][animation];
                    imagePaths.push(AnslemClientConfig.assetsUrl + s.imagePath + ".png");
                }
            }
            // TODO
            var soundPaths = [];

            var assetLoader = new PIXI.AssetLoader(imagePaths, true);
            var assetCount = imagePaths.length;
            var assetsLoaded = 0;
            var loadingIndicator = document.getElementById("loading-indicator");
            var self = this;
            assetLoader.onProgress = function () {
                assetsLoaded++;
                loadingIndicator.value = Math.floor((assetsLoaded / assetCount) * 100);
                loadingIndicator.className = loadingIndicator.value === 100 ? '' : 'active';
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
                self.inputEnabled = true;
                self.assetsLoaded = true;
            };
            assetLoader.load();
        };

        /**
         * Connected to server callback
         *
         * @event ononnect
         * @param {Object} response
         */
        this.onconnect = function (response) {
            this.viewScale = response.initialData.viewScale;
            renderer.resize(this.clientScreenWidth * this.viewScale, this.clientScreenHeight * this.viewScale);
            document.body.appendChild(renderer.view);
        };

        /**
         * Server update callback, setup the sprites on the stage
         *
         * @event updateCallback
         * @protected
         * @param {Object} response
         */
        this.onupdate = function (response) {
            if (!this.assetsLoaded)
                return false;

            var maxWidth = (renderer.width > renderer.height ? renderer.width : renderer.height) + 250;
            for (var index in response.packet.inView) {
                var e = response.packet.inView[index];
                var actor;
                if (!this.actors[e.id]) {
                    actor = e.sprite.tileX ?
                            new PIXI.TilingSprite(this.sprites[e.sprite.name][e.sprite.animation][e.sprite.frame], maxWidth * this.viewScale, e.height) :
                            new PIXI.Sprite(this.sprites[e.sprite.name][e.sprite.animation][e.sprite.frame]);
                    actor.anchor.x = 0.5;
                    actor.anchor.y = 0.5;

                    this.actors[e.id] = actor;
                    stage.addChild(actor);
                } else {
                    actor = this.actors[e.id];
                }
                actor.src = e;
                actor.scale.x = actor.src.sprite.mirror ? -1 : 1;
                if (actor.src.sprite.tileX) {
                    actor.tilePosition.x = -(response.packet.viewX * actor.src.sprite.scrollSpeed) % actor.src.width;
                } else {
                    actor.position.x = actor.src.x - response.packet.viewX;
                    actor.setTexture(this.sprites[e.sprite.name][e.sprite.animation][e.sprite.frame]);
                    actor.onTextureUpdate();
                }
                actor.position.y = actor.src.y - response.packet.viewY;
            }

            if (this.debugging)
                document.body.setAttribute("fps", renderer.currentFps);
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
