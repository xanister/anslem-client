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
     * @param {Number} frameCount
     * @param {Number} frameSpeed
     * @param {Function} imagesLoadedCallback
     * @param {Boolean} singleImage
     * @param {Number} xOffset
     * @param {Number} yOffset
     */
    function Sprite(frameCount, frameSpeed, imagesLoadedCallback, singleImage, xOffset, yOffset) {
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
        this.frameCount = frameCount || 1;

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

        /**
         * Callback when all images for sprite are loaded
         *
         * @property imagesLoadedCallback
         * @type {Function}
         */
        this.imagesLoadedCallback = false;

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
            tarX = Math.floor(tarX);
            tarY = Math.floor(tarY);
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
                img.crossOrigin = "anonymous";
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
                    imgMirror.crossOrigin = "anonymous";
                    imgMirror.src = c.toDataURL();

                    self.imagesMirror.push(imgMirror);
                    self.imageLoaded.call(self);
                });
                this.images.push(img);
            }
            this.imagesLoadedCallback = imagesLoadedCallback || this.imagesLoadedCallback;
        };

        /**
         * Sets images for sprite from existing image objects
         *
         * @method setImages
         * @param {Array} images
         * @param {Number} frameCount
         * @param {Number} frameSpeed
         * @param {Number} xOffset
         * @param {Number} yOffset
         */
        Sprite.prototype.setImages = function (images, frameCount, frameSpeed, xOffset, yOffset) {
            this.frameSpeed = frameSpeed;
            this.singleImage = images.length === 1;
            this.frameCount = frameCount;
            this.width = this.singleImage ? images[0].width / frameCount : images[0].width;
            this.height = images[0].height;
            this.xOffset = xOffset;
            this.yOffset = yOffset;
            for (var index = 0; index < images.length; index++) {
                var img = images[index];
                this.images.push(img);

                var imgMirror = document.createElement('canvas');
                imgMirror.width = img.width;
                imgMirror.height = img.height;

                var ctx = imgMirror.getContext('2d');
                ctx.scale(-1, 1);
                ctx.drawImage(img, -img.width, 0);
                ctx.restore();

                this.imagesMirror.push(imgMirror);
            }
        };
    }

    return Sprite;
});