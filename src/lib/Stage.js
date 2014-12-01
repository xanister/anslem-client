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
         * Create and initialize canvas element
         *
         * @method init
         * @param {Element} container
         * @param {Number} viewScale
         */
        Stage.prototype.init = function (container, viewScale) {
            this.canvas = document.createElement('canvas');
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';

            this.container = container || this.container;
            this.container.appendChild(this.canvas);

            this.viewScale = viewScale || this.viewScale;

            this.setViewResponsive();

            this.bindEvents();
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
    }

    return Stage;
});