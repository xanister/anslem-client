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
            loaderFunction(function () {
                assetCount--;
                if (assetCount === 0) {
                    assetsLoadedCallback();
                }
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
            function step(timestamp) {
                ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);
                renderCallback(ctx);
                var progress = timestamp - startTime;
                startTime = timestamp;
                self.currentFps = Math.round(1000 / progress);
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