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
         * Dom element container
         * @access public
         * @var {Element}
         */
        this.container = false;

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
         * Bind dom events
         * @access protected
         */
        this.bindEvents = function () {
            var stage = this;
            window.addEventListener('orientationchange', function () {
                this.setViewResponsive.call(stage);
            });
        };

        /**
         * Create and initialize canvas element
         * @access public
         * @param {Element} container
         */
        Stage.prototype.init = function (container) {
            this.canvas = document.createElement('canvas');
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';

            this.container = container || document.body;
            this.container.appendChild(this.canvas);

            this.setViewResponsive();

            this.bindEvents();
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
         * Responsive view
         * @access public
         */
        Stage.prototype.setViewResponsive = function () {
            // TODO: Scale based upon orientation and available space
            var ori = window.orientation;
            this.canvas.width = (ori == 90 || ori == -90) ? screen.height : screen.width;
            this.canvas.height = (ori == 90 || ori == -90) ? screen.width : screen.height;
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