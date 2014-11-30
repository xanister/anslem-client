/**
 * Image representation
 *
 * @module Stage
 */
define(function () {
    /**
     * Basic animation object
     *
     * @class Sprite
     * @constructor
     * @param {String} imagePath
     * @param {Number} frameCount
     * @param {Number} frameSpeed
     * @param {Function} imagesLoadedCallback
     * @param {Boolean} singleImage
     * @param {Number} xOffset
     * @param {Number} yOffset
     */
    function Sprite(imagePath, frameCount, frameSpeed, imagesLoadedCallback, singleImage, xOffset, yOffset) {
        /**
         * Count of images currently loading
         *
         * @property imagesLoading
         * @static
         * @type {Number}
         */
        Sprite.imagesLoading = 0;

        /**
         * Number of frames
         *
         * @property frameCount
         * @type {Number}
         */
        this.frameCount = frameCount || 0;

        /**
         * Default framespeed
         *
         * @property frameSpeed
         * @type {Number}
         */
        this.frameSpeed = frameSpeed || 0;

        /**
         * Height, read only
         *
         * @property height
         * @type {Number}
         */
        this.height = 0;

        /**
         * Single sheet sprite flag
         *
         * @property singleImage
         * @type {Boolean}
         */
        this.singleImage = singleImage || false;

        /**
         * Width, read only
         *
         * @property width
         * @type {Number}
         */
        this.width = 0;

        /**
         * Drawing offset from center
         *
         * @property xOffset
         * @type {Number}
         */
        this.xOffset = xOffset || 0;

        /**
         * Drawing offset from center
         *
         * @property xOffset
         * @type {Number}
         */
        this.yOffset = yOffset || 0;

        /**
         * Draw sprite at target location
         *
         * @method draw
         * @param {Object} ctx
         * @param {Number} frame
         * @param {Number} tarX
         * @param {Number} tarY
         * @param {Boolean} mirror
         */
        Sprite.prototype.draw = function (ctx, frame, tarX, tarY, mirror) {
            frame = Math.floor(frame || 0);
            var xOffset = this.singleImage ? (mirror ? (this.frameCount - 1) - frame : frame) * this.width : 0;
            var img;
            if (mirror)
                img = this.singleImage ? this.imagesMirror[0] : this.imagesMirror[frame];
            else
                img = this.singleImage ? this.images[0] : this.images[frame];
            ctx.drawImage(img, xOffset, 0, this.width, this.height, tarX + (mirror ? -this.xOffset : this.xOffset), tarY + this.yOffset, this.width, this.height);
        };

        /**
         * Draw sprite at target location with
         * extra options
         *
         * @method drawExt
         * @param {Object} ctx
         * @param {Number} frame
         * @param {Number} tarX
         * @param {Number} tarY
         * @param {Number} tarWidth
         * @param {Number} tarHeight
         * @param {Number} srcX
         * @param {Number} srcY
         * @param {Number} srcWidth
         * @param {Number} srcHeight
         * @param {Boolean} mirror
         */
        Sprite.prototype.drawExt = function (ctx, frame, tarX, tarY, tarWidth, tarHeight, srcX, srcY, srcWidth, srcHeight, mirror) {
            frame = Math.floor(frame || 0);
            var xOffset = this.singleImage ? srcX + (frame * this.width) : 0;
            var img;
            if (mirror)
                img = this.singleImage ? this.imagesMirror[0] : this.imagesMirror[frame];
            else
                img = this.singleImage ? this.images[0] : this.images[frame];
            ctx.drawImage(img, xOffset, srcY, srcWidth, srcHeight, tarX, tarY, tarWidth, tarHeight);
        };

        /**
         * Callback for when frame has loaded
         *
         * @event imageLoaded
         */
        this.imageLoaded = function () {
            this.imageLoaded.count = this.imageLoaded.count ? this.imageLoaded.count + 1 : 1;
            if (this.imageLoaded.count === this.images.length)
                this.imagesLoaded();
        };

        /**
         * Callback when all images have loaded
         *
         * @event imagesLoaded
         */
        this.imagesLoaded = function () {
            this.width = this.singleImage ? this.images[0].width / this.frameCount : this.images[0].width;
            this.height = this.images[0].height;
            this.imagesLoadedCallback();
        };

        /**
         * Loads images for sprite
         *
         * @method loadImages
         * @param {String} imagePath
         * @param {Number} imageCount
         * @param {Function} imagesLoadedCallback
         */
        this.loadImages = function (imagePath, imageCount, imagesLoadedCallback) {
            var self = this;
            for (var i = 0; i < imageCount; i++) {
                var img = new Image();
                img.setAttribute('crossOrigin', 'anonymous');
                img.src = imagePath + (self.singleImage ? "" : this.zeroPad(i, 3)) + '.png';
                img.addEventListener("load", function () {
                    var c = document.createElement('canvas');
                    c.width = this.width;
                    c.height = this.height;

                    var ctx = c.getContext('2d');
                    ctx.scale(-1, 1);
                    ctx.drawImage(this, -this.width, 0);
                    ctx.restore();

                    var imgMirror = new Image();
                    imgMirror.src = c.toDataURL();

                    self.imagesMirror.push(imgMirror);
                    self.imageLoaded.call(self);
                });
                this.images.push(img);
            }
            this.imagesLoadedCallback = imagesLoadedCallback || this.imagesLoadedCallback;
        };


        /**
         * Return zero padded number
         *
         * @method zeroPad
         * @param {String} subject
         * @param {Number} width
         * @param {Number} char
         * @return {String}
         */
        this.zeroPad = function (subject, width, char) {
            char = char || '0';
            subject = subject + '';
            return subject.length >= width ? subject : new Array(width - subject.length + 1).join(char) + subject;
        };

        /**
         * Sprite images
         *
         * @property images
         * @type {Array}
         */
        this.images = [];

        /**
         * Mirrored images
         *
         * @property imagesMirror
         * @type {Array}
         */
        this.imagesMirror = [];

        /*
         * Initialize the images
         */
        this.loadImages(imagePath, this.singleImage || !frameCount ? 1 : frameCount, imagesLoadedCallback || false);
    }

    return Sprite;
});