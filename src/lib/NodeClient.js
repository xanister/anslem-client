/**
 * Node client
 *
 * @module NodeClient
 * @requires socket.io
 */
define(['socket.io', 'hammer.min'], function (io, Hammer) {
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
         * Hammer instance
         *
         * @property hammertime
         * @private
         * @type {Object}
         */
        var hammertime = new Hammer(document.body);

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
         * @param clientScreenHeight
         * @type {Number}
         */
        this.clientScreenHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

        /**
         * Client screen width
         *
         * @param clientScreenWidth
         * @type {Number}
         */
        this.clientScreenWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);

        /**
         * Connected flag
         *
         * @property connected
         * @type {Boolean}
         */
        this.connected = false;

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
         * Inform server of user input, enabled once connected
         * and ready
         *
         * @property inputEnabled
         * @type {Boolean}
         */
        this.inputEnabled = false;

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
         * @property onassetupdate
         * @type {Function}
         */
        this.onassetupdate = false;

        /**
         * Connection success callback
         *
         * @property onconnect
         * @type {Function}
         */
        this.onconnect = false;

        /**
         * Disconnect callback
         *
         * @property ondisconnect
         * @type {Function}
         */
        this.ondisconnect = false;

        /**
         * Error callback
         *
         * @property onerror
         * @type {Function}
         */
        this.onerror = false;

        /**
         * Update recieved callback
         *
         * @property onupdate
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
         * Bind server and input events
         *
         * @method bindEvents
         * @protected
         */
        this.bindEvents = function () {
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
                self.connected = true;
                self.initialData = response.initialData;
                self.id = response.clientId;
                self.inputs.events = self.getEmptyInputEvents();
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
                console.log("Socket connect error", response);
                self.connected = false;
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
                self.connected = false;
                socket.disconnect();
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
                console.log("Socket error", response);
                self.connected = false;
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
                if (self.paused)
                    return false;
                self.data.packet = response.packet;
                if (self.onupdate)
                    self.onupdate(response);
            });

            /**
             * Update server with new screen size on orientation change
             *
             * @event orientationchange
             * @private
             */
            window.addEventListener('orientationchange', function () {
                self.clientScreenHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
                self.clientScreenWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
                self.infoUpdate({screenWidth: self.clientScreenWidth, screenHeight: self.clientScreenHeight});
            });

            /**
             * Update server with new screen size on resize
             *
             * @event resize
             * @private
             */
            window.addEventListener('resize', function () {
                self.clientScreenHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
                self.clientScreenWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
                self.infoUpdate({screenWidth: self.clientScreenWidth, screenHeight: self.clientScreenHeight});
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
                self.inputs.events.keyup[keyPressed] = true;
                self.inputUpdate.call(self, self.inputs);
            });

            /**
             * Hammer events
             *
             * @event doubletap panstart panend panmove pancancel
             * @private
             * @param {Event} event
             */
            hammertime.get('pan').set({direction: Hammer.DIRECTION_ALL});
            hammertime.on('tap panstart panend panmove pancancel', function (event) {
                self.inputs.touches[0] = false;
                switch (event.type) {
                    case 'tap':
                        self.inputs.events["tap" + event.tapCount] = true;
                        break;
                    case 'pancancel':
                        break;
                    case 'panend':
                        if (Math.abs(event.velocity) > NodeClient.swipeVelocity) {
                            switch (event.direction) {
                                case Hammer.DIRECTION_RIGHT:
                                    self.inputs.events.swiperight = true;
                                    break;
                                case Hammer.DIRECTION_LEFT:
                                    self.inputs.events.swipeleft = true;
                                    break;
                                case Hammer.DIRECTION_UP:
                                    self.inputs.events.swipeup = true;
                                    break;
                                case Hammer.DIRECTION_DOWN:
                                    self.inputs.events.swipedown = true;
                                    document.dispatchEvent(new Event("swipedown"));
                                    break;
                            }
                        }

                        self.inputs.events.touchend = {
                            x: event.changedPointers[0].clientX,
                            y: event.changedPointers[0].clientX
                        };
                        break;
                    case 'panstart':
                        self.inputs.events.touchstart = {
                            x: event.changedPointers[0].clientX,
                            y: event.changedPointers[0].clientX
                        };
                    default:
                        self.inputs.touches[0] = {
                            x: event.changedPointers[0].clientX,
                            y: event.changedPointers[0].clientX
                        };
                }
                self.inputUpdate.call(self, self.inputs);
            });
        };

        /**
         * Generate empty event object
         *
         * @method getEmptyInputEvents
         * @protected
         * @return {Object}
         */
        this.getEmptyInputEvents = function () {
            return {
                doubletap: false,
                keydown: {},
                keyup: {},
                touchstart: false,
                touchend: false
            };
        };

        /**
         * Update server with client info
         *
         * @method infoUpdate
         * @protected
         * @param {Object} info
         */
        this.infoUpdate = function (info) {
            socket.emit("clientInfo", info);
        };

        /**
         * Update server with client inputs
         *
         * @method inputUpdate
         * @protected
         * @param {Object} inputs
         */
        this.inputUpdate = function (inputs) {
            if (this.inputEnabled && !this.paused)
                socket.emit("clientInput", inputs);
            this.inputs.events = this.getEmptyInputEvents();
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
            socket.on(eventName, callback);
        };

        /**
         * Open connection and bind server/input callback events
         *
         * @method start
         */
        NodeClient.prototype.start = function () {
            socket = io.connect(this.serverAddress, {
                'sync disconnect on unload': true,
                'query': "screenSize=" + this.clientScreenWidth + "," + this.clientScreenHeight
            });
            this.bindEvents();
        };

        /**
         * Emit event to server
         *
         * @method trigger
         * @param {String} eventName
         * @param {Object} packet
         */
        NodeClient.prototype.trigger = function (eventName, packet) {
            socket.emit(eventName, packet);
        };
    }

    return NodeClient;
});