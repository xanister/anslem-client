define(function () {
    /**
     * Basic animation object
     * @param {String} imagePath
     * @param {Number} frameCount
     * @param {Number} frameSpeed
     * @param {function} imagesLoadedCallback
     * @param {Boolean} singleImage
     * @returns {Sprite}
     */
    function Sprite(imagePath, frameCount, frameSpeed, imagesLoadedCallback, singleImage) {
        /**
         * Count of images currently loading
         * @access static
         * @var {Number}
         */
        Sprite.imagesLoading = 0;

        /**
         * Number of frames
         * @access public
         * @var {Number}
         */
        this.frameCount = frameCount || 0;

        /**
         * Default framespeed
         * @access public
         * @var {Number}
         */
        this.frameSpeed = frameSpeed || 0;

        /**
         * Height, read only
         * @access public
         * @var {Number}
         */
        this.height = 0;

        /**
         * Single sheet sprite flag
         * @access public
         * @var {Boolean}
         */
        this.singleImage = singleImage || false;

        /**
         * Width, read only
         * @access public
         * @var {Number}
         */
        this.width = 0;

        /**
         * Draw sprite at target location
         * @param {Canvas.context} ctx
         * @param {Number} frame
         * @param {Number} tarX
         * @param {Number} tarY
         */
        Sprite.prototype.draw = function (ctx, frame, tarX, tarY) {
            frame = Math.floor(frame || 0);
            var xOffset = this.singleImage ? Math.floor(srcX + (frame * this.width)) : 0;
            var img = this.singleImage ? this.images[0] : this.images[frame];
            ctx.drawImage(img, xOffset, 0, this.width, this.height, tarX, tarY, this.width, this.height);
        };

        /**
         * Draw sprite at target location with
         * extra options
         * @param {Canvas.context} ctx
         * @param {Number} frame
         * @param {Number} tarX
         * @param {Number} tarY
         * @param {Number} width
         * @param {Number} height
         * @param {Number} srcX
         * @param {Number} srcY
         * @param {Number} srcWidth
         * @param {Number} srcHeight
         */
        Sprite.prototype.drawExt = function (ctx, frame, tarX, tarY, width, height, srcX, srcY, srcWidth, srcHeight) {
            frame = Math.floor(frame || 0);
            width = width || this.width;
            height = height || this.height;
            srcX = srcX || 0;
            if (this.singleImage)
                srcX = Math.floor(srcX + (frame * this.width));
            srcY = srcY || 0;
            srcWidth = srcWidth || this.width;
            srcHeight = srcHeight || this.height;
            var img = this.singleImage ? this.images[0] : this.images[frame];
            ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, tarX, tarY, width, height);
        };

        /**
         * Tile sprite in given area
         * @param {Canvas.context} ctx
         * @param {Number} frame
         * @param {Number} tarX
         * @param {Number} tarY
         * @param {Number} tiledWidth
         * @param {Number} tiledHeight
         */
        Sprite.prototype.drawTiled = function (ctx, frame, tarX, tarY, tiledWidth, tiledHeight) {
            var img = this.singleImage ? this.images[0] : this.images[frame];
            for (var x = tarX; x < tiledWidth; x += this.width) {
                for (var y = tarY; y < tiledHeight; y += this.height) {
                    ctx.drawImage(img, 0, 0, this.width, this.height, x, y, this.width, this.height);
                }
            }
        };

        /**
         * Callback for when frame has loaded
         * @access protected
         */
        this.imageLoaded = function () {
            this.imageLoaded.count = this.imageLoaded.count ? this.imageLoaded.count + 1 : 1;
            if (this.imageLoaded.count === this.images.length)
                this.imagesLoaded();
        };

        /**
         * Callback when all images have loaded
         * @access protected
         */
        this.imagesLoaded = function () {
            this.width = this.singleImage ? this.images[0].width / this.frameCount : this.images[0].width;
            this.height = this.images[0].height;
            this.imagesLoadedCallback();
        };

        /**
         * Loads images for sprite
         * @access protected
         * @param {String} imagePath
         * @param {Number} imageCount
         * @param {function} imagesLoadedCallback
         * @returns {Array}
         */
        this.loadImages = function (imagePath, imageCount, imagesLoadedCallback) {
            var images = [];
            var self = this;
            for (var i = 0; i < imageCount; i++) {
                var img = new Image();
                img.src = imagePath + this.zeroPad(i, 3) + '.png';
                img.addEventListener("load", function () {
                    self.imageLoaded.call(self);
                });
                images.push(img);
            }
            this.imagesLoadedCallback = imagesLoadedCallback || this.imagesLoadedCallback;
            return images;
        };

        /**
         * Return zero padded number
         * @access protected
         * @param {String} subject
         * @param {Number} width
         * @param {Number} char
         * @returns {String}
         */
        this.zeroPad = function (subject, width, char) {
            char = char || '0';
            subject = subject + '';
            return subject.length >= width ? subject : new Array(width - subject.length + 1).join(char) + subject;
        };

        /**
         * Sprite images
         * @access public
         * @var {Array}
         */
        this.images = this.loadImages(imagePath, this.singleImage || !frameCount ? 1 : frameCount, imagesLoadedCallback || false);
    }

    return Sprite;
});