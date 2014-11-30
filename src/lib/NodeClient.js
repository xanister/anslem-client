/**
 * Node client
 *
 * @module NodeClient
 * @requires socket.io
 */
define(['lib/socket.io', 'lib/hammer'], function (io, Hammer) {
    /**
     * NodeClient
     *
     * @class NodeClient
     * @constructor
     * @param {String} serverAddress
     */
    function NodeClient(serverAddress) {
        /**
         * Touch distance required to register a swipe
         *
         * @property swipeDistance
         * @static
         * @type {Number}
         */
        NodeClient.swipeDistance = 50;

        /**
         * Touch time max for swipe in ms
         *
         * @property swipeTime
         * @static
         * @type {Number}
         */
        NodeClient.swipeTime = 500;

        /**
         * Hammer instance
         *
         * @property hammertime
         * @private
         * @type {Object}
         */
        var hammertime = new Hammer(document.body);

        /**
         * IO socket
         *
         * @property socket
         * @private
         * @type {Object}
         */
        var socket;

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
        this.data = {packet: []};

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
         * Server address
         *
         * @property serverAddress
         * @type {String}
         */
        this.serverAddress = serverAddress;

        /**
         * Connection callback
         *
         * @event connectCallback
         * @param {Object} response
         */
        this.connectCallback = function (response) {
            this.log("Connection opened:", response);
        };

        /**
         * Disconnect callback
         *
         * @event disconnectCallback
         */
        this.disconnectCallback = function () {
            this.log("Connection closed");
        };

        /**
         * Error callback
         *
         * @event errorCallback
         * @param {Object} response
         */
        this.errorCallback = function (response) {
            this.log("Error recieved:", response);
        };

        /**
         * Message recieved callback
         *
         * @event messageCallback
         * @param {String} response
         */
        this.messageCallback = function (response) {
            this.log("Message recieved:", response);
        };

        /**
         * Update data callback
         *
         * @event messageCallback
         */
        this.updateCallback = false;

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
            socket.emit("clientInput", inputs);
            this.inputs.events = this.getEmptyInputEvents();
            this.inputs.message = false;
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
         * Generate empty event object
         *
         * @method getEmptyInputEvents
         * @return {Object}
         */
        NodeClient.prototype.getEmptyInputEvents = function () {
            return {
                doubletap: false,
                keydown: {},
                keyup: {},
                touchstart: false,
                touchend: false
            };
        };

        /**
         * Client screen width
         *
         * @method getClientScreenWidth
         * @return {Number}
         */
        NodeClient.prototype.getClientScreenWidth = function () {
            return Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        };

        /**
         * Client screen height
         *
         * @method getClientScreenHeight
         * @return {Number}
         */
        NodeClient.prototype.getClientScreenHeight = function () {
            return Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        };

        /**
         * Open connection and bind server/input callback events
         *
         * @method start
         * @param {function} connectCallback
         */
        NodeClient.prototype.start = function (connectCallback) {
            // Reset input events
            this.inputs.events = this.getEmptyInputEvents();

            // Open connection
            this.connectCallback = connectCallback || this.connectCallback;
            socket = io.connect(this.serverAddress, {'sync disconnect on unload': true, query: "screenSize=" + this.getClientScreenWidth() + "," + this.getClientScreenHeight()});

            // Bind events
            var nodeClient = this;

            /**
             * On connect
             *
             * @event connection
             * @private
             * @param {Object} response expects {message: 'a message', clientId: 'aclientid', initialData: {someDataObject}}
             */
            socket.on("connection", function (response) {
                nodeClient.connected = true;
                nodeClient.id = response.clientId;
                nodeClient.initialData = response.initialData;
                if (nodeClient.connectCallback)
                    nodeClient.connectCallback.call(nodeClient, response);
            });

            /**
             * Connection error
             *
             * @event connect_error
             * @private
             * @param {Object} response
             */
            socket.on('connect_error', function (response) {
                nodeClient.connected = false;
                socket.disconnect();
                if (nodeClient.errorCallback)
                    nodeClient.errorCallback.call(nodeClient, response);
            });

            /**
             * On disconnect
             *
             * @event disconnect
             * @private
             */
            socket.on('disconnect', function () {
                nodeClient.connected = false;
                socket.disconnect();
                if (nodeClient.disconnectCallback)
                    nodeClient.disconnectCallback.call(nodeClient);
            });

            /**
             * On error
             *
             * @event error
             * @private
             * @param {Object} response
             */
            socket.on('error', function (response) {
                nodeClient.connected = false;
                socket.disconnect();
                if (nodeClient.errorCallback)
                    nodeClient.errorCallback.call(nodeClient, response);
            });

            /**
             * On message
             *
             * @event message
             * @private
             * @param {String} response
             */
            socket.on('message', function (response) {
                if (nodeClient.messageCallback)
                    nodeClient.messageCallback.call(nodeClient, response);
            });

            /**
             * On update
             *
             * @event update
             * @private
             * @param {Object} response
             */
            socket.on("update", function (response) {
                nodeClient.data.packet = response.packet;
                if (nodeClient.updateCallback)
                    nodeClient.updateCallback.call(nodeClient, response);
            });

            /**
             * Update server with new screen size on orientation change
             *
             * @event orientationchange
             * @private
             */
            window.addEventListener('orientationchange', function () {
                nodeClient.infoUpdate({screenWidth: nodeClient.getClientScreenWidth(), screenHeight: nodeClient.getClientScreenHeight()});
            });

            /**
             * Update server with new screen size on resize
             *
             * @event resize
             * @private
             */
            window.addEventListener('resize', function () {
                nodeClient.infoUpdate({screenWidth: nodeClient.getClientScreenWidth(), screenHeight: nodeClient.getClientScreenHeight()});
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
                if (nodeClient.inputs.keyboard[keyPressed])
                    return false;
                nodeClient.inputs.keyboard[keyPressed] = true;
                nodeClient.inputs.events.keydown[keyPressed] = true;
                nodeClient.inputUpdate.call(nodeClient, nodeClient.inputs);
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
                nodeClient.inputs.keyboard[keyPressed] = false;
                nodeClient.inputs.events.keyup[keyPressed] = true;
                nodeClient.inputUpdate.call(nodeClient, nodeClient.inputs);
            });

            /**
             * Hammer events
             *
             * @event doubletap panstart panend panmove pancancel
             * @private
             * @param {Event} event
             */
            hammertime.get('pan').set({direction: Hammer.DIRECTION_ALL});
            hammertime.on('doubletap panstart panend panmove pancancel', function (event) {
                nodeClient.inputs.touches[0] = false;
                switch (event.type) {
                    case 'doubletap':
                        nodeClient.inputs.events.doubletap = true;
                        document.dispatchEvent(new Event("doubletap"));
                        break;
                    case 'pancancel':
                        break;
                    case 'panend':
                        if (event.distance > NodeClient.swipeDistance && event.deltaTime < NodeClient.swipeTime) {
                            switch (event.direction) {
                                case Hammer.DIRECTION_RIGHT:
                                    nodeClient.inputs.events.swiperight = true;
                                    break;
                                case Hammer.DIRECTION_LEFT:
                                    nodeClient.inputs.events.swipeleft = true;
                                    break;
                                case Hammer.DIRECTION_UP:
                                    nodeClient.inputs.events.swipeup = true;
                                    break;
                                case Hammer.DIRECTION_DOWN:
                                    nodeClient.inputs.events.swipedown = true;
                                    break;
                            }
                        }

                        nodeClient.inputs.events.touchend = {
                            x: event.changedPointers[0].clientX,
                            y: event.changedPointers[0].clientX
                        };
                        break;
                    case 'panstart':
                        nodeClient.inputs.events.touchstart = {
                            x: event.changedPointers[0].clientX,
                            y: event.changedPointers[0].clientX
                        };
                    default:
                        nodeClient.inputs.touches[0] = {
                            x: event.changedPointers[0].clientX,
                            y: event.changedPointers[0].clientX
                        };
                }
                nodeClient.inputUpdate.call(nodeClient, nodeClient.inputs);
            });
        };
    }

    return NodeClient;
});