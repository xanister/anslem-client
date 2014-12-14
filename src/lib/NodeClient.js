/**
 * Node client
 *
 * @module NodeClient
 * @requires socket.io
 */
define(['socket.io'], function (io) {
    /**
     * NodeClient
     *
     * @class NodeClient
     * @constructor
     * @param {String} serverAddress
     */
    function NodeClient(serverAddress) {
        /**
         * IO socket, send some basic data to server on connect
         *
         * @property socket
         * @private
         * @type {Object}
         */
        var socket = false;

        /**
         * Touch velocity required to register a swipe
         *
         * @property swipeVelocity
         * @static
         * @type {Number}
         */
        NodeClient.swipeVelocity = 0.3;

        /**
         * Client screen height
         *
         * @property clientScreenHeight
         * @type {Number}
         */
        this.clientScreenHeight = window.innerHeight;

        /**
         * Client screen width
         *
         * @property clientScreenWidth
         * @type {Number}
         */
        this.clientScreenWidth = window.innerWidth;

        /**
         * Is touch device
         *
         * @property clientTouchDevice
         * @type {Boolean}
         */
        this.clientTouchDevice = ("ontouchstart" in window || window.DocumentTouch && document instanceof DocumentTouch);

        /**
         * Data synced to server
         *
         * @property data
         * @type {Object}
         */
        this.data = {packet: {}};

        /**
         * Client id
         *
         * @property id
         * @type {String}
         */
        this.id = false;

        /**
         * Client inputs
         *
         * @property inputs
         * @type {Object}
         */
        this.inputs = {keyboard: {}, touches: {}, events: {}};

        /**
         * Asset list recieved
         *
         * @event onassetupdate
         * @type {Function}
         */
        this.onassetupdate = false;

        /**
         * Connection success callback
         *
         * @event onconnect
         * @type {Function}
         */
        this.onconnect = false;

        /**
         * Disconnect callback
         *
         * @event ondisconnect
         * @type {Function}
         */
        this.ondisconnect = false;

        /**
         * Error callback
         *
         * @event onerror
         * @type {Function}
         */
        this.onerror = false;

        /**
         * State changed
         *
         * @event
         * @param {String} newstate
         */
        this.onstatechange = false;

        /**
         * Update recieved callback
         *
         * @event onupdate
         * @type {Function}
         */
        this.onupdate = false;

        /**
         * Server address
         *
         * @property serverAddress
         * @type {String}
         */
        this.serverAddress = serverAddress;

        /**
         * Client state
         *
         * @property state
         * @type {String}
         */
        this.state = "disconnected";

        /**
         * Bind user input events
         *
         * @method bindClientEvents
         * @protected
         */
        this.bindClientEvents = function () {
            var self = this;
            var touchStartX = {};
            var touchStartY = {};
            var touchStartTime = {};

            /**
             * Update server with new screen size on orientation change
             *
             * @event orientationchange
             * @private
             */
            window.addEventListener('orientationchange', function () {
                var newScreenWidth = window.innerWidth;
                var newScreenHeight = window.innerHeight;

                if (newScreenWidth !== self.clientScreenWidth || newScreenHeight !== self.clientScreenHeight) {
                    self.clientScreenWidth = newScreenWidth;
                    self.clientScreenHeight = newScreenHeight;
                    self.infoUpdate({screenWidth: self.clientScreenWidth, screenHeight: self.clientScreenHeight, touchDevice: self.clientTouchDevice, orientaion: window.orientation});
                }
            });

            /**
             * Update server with new screen size on resize
             *
             * @event resize
             * @private
             */
            window.addEventListener('resize', function () {
                var newScreenWidth = window.innerWidth;
                var newScreenHeight = window.innerHeight;

                if (newScreenWidth !== self.clientScreenWidth || newScreenHeight !== self.clientScreenHeight) {
                    self.clientScreenWidth = newScreenWidth;
                    self.clientScreenHeight = newScreenHeight;
                    self.infoUpdate({screenWidth: self.clientScreenWidth, screenHeight: self.clientScreenHeight, touchDevice: self.clientTouchDevice, orientaion: window.orientation});
                }
            });

            /**
             * Client resumes
             *
             * @event focus
             * @private
             * @param {Event} event
             */
            window.addEventListener("focus", function (event) {
                self.unpause();
            });

            /**
             * Client leaves
             *
             * @event blur
             * @private
             * @param {Event} event
             */
            window.addEventListener("blur", function (event) {
                self.pause();
            });

            /**
             * Client keydown
             *
             * @event keydown
             * @private
             * @param {Event} event
             */
            document.addEventListener("keydown", function (event) {
                var keyPressed = String.fromCharCode(event.keyCode);
                if (self.inputs.keyboard[keyPressed])
                    return false;
                self.inputs.keyboard[keyPressed] = true;
                if (!self.inputs.events.keydown)
                    self.inputs.events.keydown = {};
                self.inputs.events.keydown[keyPressed] = true;
                self.inputUpdate.call(self, self.inputs);
            });

            /**
             * Client keyup
             *
             * @event keyup
             * @private
             * @param {Event} event
             */
            document.addEventListener("keyup", function (event) {
                var keyPressed = String.fromCharCode(event.keyCode);
                self.inputs.keyboard[keyPressed] = false;
                if (!self.inputs.events.keyup)
                    self.inputs.events.keyup = {};
                self.inputs.events.keyup[keyPressed] = true;
                self.inputUpdate.call(self, self.inputs);
            });

            /**
             * Mousedown
             *
             * @event mousedown
             * @private
             * @param {Event} event
             */
            document.addEventListener("mousedown", function (event) {
                if (!self.inputs.events.mousedown)
                    self.inputs.events.mousedown = {};
                self.inputs.events.mousedown[event.button] = {
                    x: event.clientX,
                    y: event.clientY
                };
                self.inputUpdate.call(self, self.inputs);
            });

            /**
             * Mousemove
             *
             * @event mousedown
             * @private
             * @param {Event} event
             */
            document.addEventListener("mousemove", function (event) {
                self.inputs.events.mousemove = {
                    x: event.clientX,
                    y: event.clientY
                };
                self.inputUpdate.call(self, self.inputs);
            });

            /**
             * Mouseup
             *
             * @event mousedown
             * @private
             * @param {Event} event
             */
            document.addEventListener("mouseup", function (event) {
                if (!self.inputs.events.mouseup)
                    self.inputs.events.mouseup = {};
                self.inputs.events.mouseup[event.button] = {
                    x: event.clientX,
                    y: event.clientY
                };
                self.inputUpdate.call(self, self.inputs);
            });

            /**
             * Client touchend
             *
             * @event touchend
             * @private
             * @param {Event} event
             */
            document.addEventListener("touchend", function (event) {
                for (var index = 0; index < event.changedTouches.length; index++) {
                    var touch = event.changedTouches[index];
                    self.inputs.events.touchend = {};
                    self.inputs.events.touchend[touch.identifier] = {
                        startTime: touchStartTime[touch.identifier],
                        startX: touchStartX[touch.identifier],
                        startY: touchStartY[touch.identifier],
                        x: touch.clientX,
                        y: touch.clientY
                    };
                    var touchTime = new Date().getTime() - touchStartTime[touch.identifier];
                    if (touchTime < 200) {
                        var xDist = touch.clientX - touchStartX[touch.identifier];
                        var yDist = touch.clientY - touchStartY[touch.identifier];
                        if (xDist > 50)
                            self.inputs.events.swiperight = {
                                xDist: xDist,
                                yDist: yDist
                            };
                        else if (xDist < -50)
                            self.inputs.events.swipeleft = {
                                xDist: xDist,
                                yDist: yDist
                            };
                        else if (yDist < -50)
                            self.inputs.events.swipeup = {
                                xDist: xDist,
                                yDist: yDist
                            };
                        else if (yDist > 50)
                            self.inputs.events.swipedown = {
                                xDist: xDist,
                                yDist: yDist
                            };
                    }
                    delete touchStartX[touch.identifier];
                    delete touchStartY[touch.identifier];
                    delete touchStartTime[touch.identifier];
                    delete self.inputs.touches[touch.identifier];
                    self.inputs.touches.length--;
                }
                self.inputUpdate.call(self, self.inputs);
            });

            /**
             * Client touchmove
             *
             * @event touchmove
             * @private
             * @param {Event} event
             */
            document.addEventListener("touchmove", function (event) {
                event.preventDefault();
                for (var index = 0; index < event.changedTouches.length; index++) {
                    var touch = event.changedTouches[index];
                    self.inputs.events.touchmove = {};
                    self.inputs.events.touchmove[touch.identifier] = {
                        startTime: touchStartTime[touch.identifier],
                        startX: touchStartX[touch.identifier],
                        startY: touchStartY[touch.identifier],
                        x: touch.clientX,
                        y: touch.clientY
                    };
                    self.inputs.touches[touch.identifier] = {
                        startTime: touchStartTime[touch.identifier],
                        startX: touchStartX[touch.identifier],
                        startY: touchStartY[touch.identifier],
                        x: touch.clientX,
                        y: touch.clientY
                    };
                }
                self.inputUpdate.call(self, self.inputs);
            });

            /**
             * Client touchstart
             *
             * @event touchstart
             * @private
             * @param {Event} event
             */
            document.addEventListener("touchstart", function (event) {
                for (var index = 0; index < event.changedTouches.length; index++) {
                    var touch = event.changedTouches[index];
                    touchStartX[touch.identifier] = touch.clientX;
                    touchStartY[touch.identifier] = touch.clientY;
                    touchStartTime[touch.identifier] = new Date().getTime();

                    self.inputs.events.touchstart = {};
                    self.inputs.events.touchmove = {};
                    self.inputs.events.touchstart[touch.identifier] = self.inputs.events.touchmove[touch.identifier] = {
                        startTime: touchStartTime[touch.identifier],
                        startX: touchStartX[touch.identifier],
                        startY: touchStartY[touch.identifier],
                        x: touchStartX[touch.identifier],
                        y: touchStartY[touch.identifier]
                    };
                    self.inputs.touches[touch.identifier] = {
                        startTime: touchStartTime[touch.identifier],
                        startX: touchStartX[touch.identifier],
                        startY: touchStartY[touch.identifier],
                        x: touchStartX[touch.identifier],
                        y: touchStartY[touch.identifier]
                    };
                    self.inputs.touches.length = self.inputs.touches.length ? self.inputs.touches.length + 1 : 1;
                }
                self.inputUpdate.call(self, self.inputs);
            });
        };

        /**
         * Bind server events
         *
         * @method bindServerEvents
         * @protected
         */
        this.bindServerEvents = function () {
            socket.removeAllListeners;
            var self = this;
            /**
             * On connect
             *
             * @event connection
             * @private
             * @param {Object} response expects {message: 'a message', clientId: 'aclientid', initialData: {someDataObject}}
             */
            socket.on("assetUpdate", function (response) {
                if (self.onassetupdate)
                    self.onassetupdate(response);
            });

            /**
             * On connect
             *
             * @event connection
             * @private
             * @param {Object} response expects {message: 'a message', clientId: 'aclientid', initialData: {someDataObject}}
             */
            socket.on("connection", function (response) {
                self.setState("connected");
                self.initialData = response.initialData;
                self.id = response.clientId;
                self.inputs.events = {};
                self.infoUpdate({
                    screenWidth: self.clientScreenWidth,
                    screenHeight: self.clientScreenHeight,
                    touchDevice: self.clientTouchDevice,
                    orientaion: window.orientaion,
                    pixelRatio: window.devicePixelRatio
                });
                if (self.onconnect)
                    self.onconnect(response);
            });

            /**
             * Connection error
             *
             * @event connect_error
             * @private
             * @param {Object} response
             */
            socket.on('connect_error', function (response) {
                self.setState("socket connect error");
                socket.disconnect();
                if (self.onerror)
                    self.onerror(response);
            });

            /**
             * On disconnect
             *
             * @event disconnect
             * @private
             */
            socket.on('disconnect', function () {
                self.setState("disconnected");
                socket.disconnect();
                socket = false;
                if (self.ondisconnect)
                    self.ondisconnect();
            });

            /**
             * On error
             *
             * @event error
             * @private
             * @param {Object} response
             */
            socket.on('error', function (response) {
                self.setState("socket error");
                socket.disconnect();
                if (self.onerror)
                    self.onerror(response);
            });

            /**
             * On update
             *
             * @event update
             * @private
             * @param {Object} response
             */
            socket.on("update", function (response) {
                if (self.state === "ready") {
                    self.data.packet = response.packet;
                    if (self.onupdate)
                        self.onupdate(response);
                    self.trigger("updateResponse");
                }
            });
        };

        /**
         * Open connection
         *
         * @method connect
         */
        NodeClient.prototype.connect = function () {
            this.setState("connecting");
            socket = io.connect(this.serverAddress, {
                'forceNew': true,
                'sync disconnect on unload': true,
                'query': "screenSize=" + this.clientScreenWidth + "," + this.clientScreenHeight
            });
            this.bindServerEvents();
        };

        /**
         * Close connection
         *
         * @method disconnect
         */
        NodeClient.prototype.disconnect = function () {
            this.setState("disconnecting", true);
            socket.disconnect();
        };

        /**
         * Update server with client info
         *
         * @method infoUpdate
         * @param {Object} info
         */
        NodeClient.prototype.infoUpdate = function (info) {
            socket.emit("clientInfo", info);
        };

        /**
         * Update server with client inputs
         *
         * @method inputUpdate
         * @param {Object} inputs
         */
        NodeClient.prototype.inputUpdate = function (inputs) {
            if (this.state === "ready")
                socket.emit("clientInput", inputs);
            this.inputs.events = {};
        };

        /**
         * Basic logging
         *
         * @method log
         * @param {String} message
         */
        NodeClient.prototype.log = function (message) {
            console.log(message);
        };

        /**
         * Add event listener for server event
         *
         * @method on
         * @param {String} eventName
         * @param {Function} callback
         */
        NodeClient.prototype.on = function (eventName, callback) {
            var self = this;
            socket.on(eventName, function (response) {
                callback.call(self, response);
            });
        };

        /**
         * Pause connection
         *
         * @method pause
         */
        NodeClient.prototype.pause = function () {
            if (this.state === "ready")
                this.setState("paused", true);
        };

        /**
         * Updates client state
         *
         * @method setState
         * @param {String} state
         * @param {Boolean} [updateServer=false]
         */
        NodeClient.prototype.setState = function (state, updateServer) {
            this.state = state;
            if (updateServer)
                socket.emit("clientStateChange", state);
            this.onstatechange(state);
        };

        /**
         * Open connection and bind server/input callback events
         *
         * @method start
         */
        NodeClient.prototype.start = function () {
            if (!socket) {
                this.connect();
                this.bindClientEvents();
            }
        };

        /**
         * Unpause connection
         *
         * @method unpause
         */
        NodeClient.prototype.unpause = function () {
            if (this.state === "paused")
                this.setState("ready", true);
        };

        /**
         * Emit event to server
         *
         * @method trigger
         * @param {String} eventName
         * @param {Object} packet
         */
        NodeClient.prototype.trigger = function (eventName, packet) {
            socket.emit(eventName, packet || false);
        };
    }

    return NodeClient;
});