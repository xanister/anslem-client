define(function () {
    /**
     * Basic stage for drawing to canvas
     * @returns {Stage}
     */
    function Stage() {
        /**
         * DOM canvas element to draw to
         * @access public
         * @type {Element}
         */
        this.canvas = false;

        /**
         * Current calculated fps
         * @access public
         * @type {Number}
         */
        this.fps = 0;

        /**
         * Debug mode flag
         * @access public
         * @type {Boolean}
         */
        this.debugMode = false;

        /**
         * Running flag
         * @access public
         * @type {Boolean}
         */
        this.running = false;

        /**
         * Available sounds
         * @access public
         * @type {Array}
         */
        this.sounds = [];

        /**
         * Available sprites
         * @access public
         * @type {Array}
         */
        this.sprites = [];

        /**
         * Create and initialize canvas element
         * @access public
         * @param {Element} container
         */
        Stage.prototype.init = function (container) {
            container = container || document.body;
            this.canvas = document.createElement('canvas');
            document.body.appendChild(this.canvas);

            this.canvas.width = window.innerWidth > 0 ? window.innerWidth : screen.width;
            this.canvas.height = window.innerHeight > 0 ? window.innerHeight : screen.height;
        };

        /**
         * Basic asyncronous project specific asset
         * loader with callback
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
         * Start render loop
         * @param {function} renderCallback
         * @access public
         */
        Stage.prototype.start = function (renderCallback) {
            this.running = true;
            var ctx = this.canvas.getContext("2d");
            var self = this;
            var startTime = 0;
            function step(timestamp) {
                ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);
                renderCallback(ctx);
                if (self.debugMode) {
                    var progress = timestamp - startTime;
                    startTime = timestamp;
                    self.fps = 1000 / progress;
                    ctx.fillText("FPS: " + Math.round(self.fps), 5, 5);
                }
                if (self.running)
                    window.requestAnimationFrame(step);
            }
            window.requestAnimationFrame(step);
        };

        /**
         * Stop the render loop
         * @access public
         */
        Stage.prototype.stop = function () {
            this.running = false;
        };
    }

    return Stage;
});