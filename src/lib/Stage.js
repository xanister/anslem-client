/**
 * Canvas game drawing engine
 *
 * @module Stage
 */
define(function () {
    /**
     * Basic stage for drawing to canvas
     *
     * @class Stage
     * @constructor
     */
    function Stage() {
        /**
         * Access to local store indexedDB
         *
         * @property assetDB
         * @type {Object}
         */
        this.assetDB = false;

        /**
         * Assets db version
         *
         * @property imageDBVersion
         * @static
         * @type {Number}
         */
        this.assetDBVersion = 1;

        /**
         * Local assets stored
         *
         * @property assetStore
         * @static
         * @type {Object}
         */
        this.assetStore = {images: {}, sounds: {}};

        /**
         * DOM canvas element to draw to
         *
         * @property canvas
         * @type {Element}
         */
        this.canvas = false;

        /**
         * Dom element container
         *
         * @property container
         * @type {Element}
         */
        this.container = document.body;

        /**
         * Current calculated fps
         *
         * @property currentFps
         * @type {Number}
         */
        this.currentFps = 0;

        /**
         * Default font
         *
         * @property defaultFont
         * @type {String}
         */
        this.defaultFont = "bold 80px Arial";

        /**
         * Tick callback for loading indicator
         *
         * @property loadingTickCallback
         * @type {Function}
         */
        this.loadingTickCallback = false;

        /**
         * Running flag
         *
         * @property running
         * @type {Boolean}
         */
        this.running = false;

        /**
         * Available sounds
         *
         * @property sounds
         * @type {Array}
         */
        this.sounds = [];

        /**
         * Available sprites
         *
         * @property sprites
         * @type {Array}
         */
        this.sprites = [];

        /**
         * Attempt to keep standard framerate
         *
         * @property targetFps
         * @type {Number}
         */
        this.targetFps = 30;

        /**
         * Percent to scale the stage
         *
         * @property viewScale
         * @type {Number}
         */
        this.viewScale = 1;

        /**
         * Bind dom events
         *
         * @method bindEvents
         */
        this.bindEvents = function () {
            var stage = this;
            window.addEventListener('orientationchange', function () {
                stage.setViewResponsive.call(stage);
            });
            window.addEventListener('resize', function () {
                stage.setViewResponsive.call(stage);
            });
        };

        /**
         * Draw fancy message bubble
         *
         * @method drawBubble
         * @param {String} message
         * @param {Number} tarX
         * @param {Number} tarY
         * @param {String} [font="bold 50px Arial"]
         * @param {String} [fillStyle="black"]
         */
        Stage.prototype.drawBubble = function (message, tarX, tarY, font, fillStyle) {
            var ctx = this.canvas.getContext("2d");
            ctx.font = font || this.defaultFont;
            var messageWidth = ctx.measureText(message).width;

            this.drawText(message, tarX - (messageWidth / 2), tarY, font, fillStyle);
        };

        /**
         * Draws a rounded rectangle using the current state of the canvas.
         * If you omit the last three params, it will draw a rectangle
         * outline with a 5 pixel border radius
         *
         * @method drawRoundRect
         * @param {Number} x The top left x coordinate
         * @param {Number} y The top left y coordinate
         * @param {Number} width The width of the rectangle
         * @param {Number} height The height of the rectangle
         * @param {Number} radius The corner radius. Defaults to 5;
         * @param {Boolean} fillStyle Whether to fill the rectangle. Defaults to false.
         * @param {Boolean} stroke Whether to stroke the rectangle. Defaults to true.
         */
        Stage.prototype.drawRoundRect = function (x, y, width, height, radius, fillStyle, stroke) {
            var ctx = this.canvas.getContext("2d");
            radius = radius || 5;

            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();

            if (stroke)
                ctx.stroke();
            if (fillStyle) {
                ctx.fillStyle = fillStyle;
                ctx.fill();
            }
        };

        /**
         * Draws text to canvas
         *
         * @method drawText
         * @param {String} text
         * @param {Number} tarX
         * @param {Number} tarY
         * @param {String} [font="bold 50px Arial"]
         * @param {String} [fillStyle="black"]
         */
        Stage.prototype.drawText = function (text, tarX, tarY, font, fillStyle) {
            var ctx = this.canvas.getContext("2d");
            ctx.font = font || this.defaultFont;
            ctx.fillStyle = fillStyle || "black";
            ctx.fillText(text, tarX, tarY);
        };

        /**
         * Create and initialize canvas element and get
         * access to local store/indexdb for image cache
         *
         * @method init
         * @param {Array} imagePaths
         * @param {Array} soundPaths
         * @param {Element} container
         * @param {Number} viewScale
         * @param {Function} readyCallback
         */
        Stage.prototype.init = function (imagePaths, soundPaths, container, viewScale, readyCallback) {
            console.log("Initializing the stage");
            this.canvas = document.createElement('canvas');
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';
            this.container = container || this.container;
            this.container.appendChild(this.canvas);
            this.viewScale = viewScale || this.viewScale;
            this.setViewResponsive();

            this.initializeAssetStore(function () {
                this.preloadAssets(imagePaths, soundPaths, function () {
                    this.bindEvents();
                    if (readyCallback)
                        readyCallback();
                });
            });
        };

        /**
         * Initialize the local storage
         *
         * @method initializeAssetStore
         * @param {Function} readyCallback
         */
        Stage.prototype.initializeAssetStore = function (readyCallback) {
            var request = indexedDB.open("assetDB", this.assetDBVersion);
            if (!request) {
                if (readyCallback)
                    readyCallback.call(this);
                return false;
            }

            console.log("Initializing AssetStore");
            var self = this;
            request.onerror = function (event) {
                self.assetDB = request.result;
                window.indexedDB = false;
                console.log("IndexedDB error", event);
            };
            request.onsuccess = function () {
                console.log("Initializing AssetDB");
                self.assetDB = request.result;
                self.assetDB.onerror = function (event) {
                    self.assetDB = false;
                    window.indexedDB = false;
                    console.log("AssetDB error", event);
                };
                var assetType = "images";
                var objectStore = self.assetDB.transaction(assetType).objectStore(assetType);
                objectStore.count().onsuccess = function (event) {
                    var assetCount = event.target.result;
                    if (assetCount > 0) {
                        var assetsLoaded = 0;
                        objectStore.openCursor().onsuccess = function (event) {
                            assetsLoaded++;
                            if (self.loadingTickCallback)
                                self.loadingTickCallback((assetsLoaded / assetCount) / 2);
                            var cursor = event.target.result;
                            if (cursor) {
                                var asset = assetType === 'images' ? new Image() : new Audio();
                                asset.crossOrigin = 'anonymous';
                                asset.onerror = function () {
                                    delete self.assetStore[assetType][cursor.key];
                                };
                                asset.src = 'data:image/png;base64,' + cursor.value.data;
                                self.assetStore[assetType][cursor.key] = asset;
                                cursor.continue();
                            } else {
                                if (readyCallback)
                                    readyCallback.call(self);
                            }
                        };
                    } else {
                        //self.assetDB.transaction(["images"], "readwrite").objectStore("images").clear();
                        //self.assetDB = false;
                        if (readyCallback)
                            readyCallback.call(self);
                    }
                };
            };
            request.onupgradeneeded = function (event) {
                console.log("Initializing empty AssetDB");
                event.target.result.createObjectStore("images", {keyPath: "path"});
                event.target.result.createObjectStore("sounds", {keyPath: "path"});
            };
        };

        /**
         * Basic asyncronous project specific asset
         * loader with callback
         *
         * @method loadAssets
         * @param {Number} assetCount
         * @param {Function} loaderFunction
         * @param {Function} assetsLoadedCallback
         */
        Stage.prototype.loadAssets = function (assetCount, loaderFunction, assetsLoadedCallback) {
            var self = this;
            var assetsToLoad = assetCount;
            loaderFunction(function () {
                assetsToLoad--;
                if (self.loadingTickCallback)
                    self.loadingTickCallback(1 - (assetsToLoad / assetCount));
                if (assetsToLoad === 0)
                    assetsLoadedCallback();
            });
        };

        /**
         * Preload assets
         *
         * @method preloadAssets
         * @param {Array} imagePaths
         * @param {Array} soundPaths
         * @param {Function} readyCallback
         */
        Stage.prototype.preloadAssets = function (imagePaths, soundPaths, readyCallback) {
            var self = this;
            var assetCount = imagePaths.length + soundPaths.length;
            var assetsLoaded = 0;
            function assetLoaded() {
                assetsLoaded++;
                if (self.loadingTickCallback)
                    self.loadingTickCallback(0.5 + ((assetsLoaded / assetCount) / 2));
                if (assetsLoaded === assetCount && readyCallback)
                    readyCallback.call(self);
            }
            for (var index in imagePaths) {
                var path = imagePaths[index];
                if (!this.assetStore['images'][path]) {
                    if (this.assetDB) {
                        this.writeToAssetDB('images', path, assetLoaded);
                    } else {
                        this.assetStore['images'][path] = new Image();
                        this.assetStore['images'][path].addEventListener("load", assetLoaded);
                        this.assetStore['images'][path].crossOrigin = 'anonymous';
                        this.assetStore['images'][path].src = path;
                    }
                } else {
                    assetLoaded();
                }
            }
        };

        /**
         * Responsive view
         *
         * @method setViewResponsive
         */
        Stage.prototype.setViewResponsive = function () {
            this.canvas.width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0) * this.viewScale;
            this.canvas.height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) * this.viewScale;
        };

        /**
         * Start render loop
         *
         * @method start
         * @param {Function} renderCallback
         */
        Stage.prototype.start = function (renderCallback) {
            this.running = true;
            var ctx = this.canvas.getContext("2d");
            var self = this;
            var startTime = 0;
            var frameSkip = Math.floor(60 / self.targetFps);
            var framesSkipped = 1;
            function step(timestamp) {
                if (--framesSkipped <= 0) {
                    framesSkipped = frameSkip;
                    ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);
                    renderCallback(ctx);
                    self.currentFps = Math.round(1000 / (timestamp - startTime));
                    startTime = timestamp;
                }
                if (self.running)
                    window.requestAnimationFrame(step);
            }
            window.requestAnimationFrame(step);
        };

        /**
         * Stop the render loop
         *
         * @method stop
         */
        Stage.prototype.stop = function () {
            this.running = false;
        };

        /**
         * Save image to local storage
         *
         * @method writeToImageDB
         * @param {String} list
         * @param {String} path
         * @param {Function} readyCallback
         */
        Stage.prototype.writeToAssetDB = function (list, path, readyCallback) {
            var self = this;
            var asset = list === 'sounds' ? new Audio() : new Image();
            asset.crossOrigin = 'anonymous';
            asset.addEventListener("load", function () {
                var data = list === 'sounds' ? asset : getBase64Image(asset);
                self.assetDB.transaction([list], "readwrite")
                        .objectStore(list)
                        .put({path: path, data: data});
                self.assetStore[list][path] = asset;
                if (readyCallback)
                    readyCallback.call(self);
            });
            asset.src = path;
        };

        /**
         * HTML IndexedDB hook
         *
         * @property indexedDB
         * @static
         * @type {Object}
         */
        window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    }

    function getBase64Image(img) {
        var canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        var dataURL = canvas.toDataURL("image/png");

        return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
    }

    return Stage;
});