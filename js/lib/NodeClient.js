define(['socket.io'], function (io) {
    /**
     * NodeClient
     * @param {String} serverAddress
     * @returns {NodeClient}
     */
    function NodeClient(serverAddress) {
        /**
         * IO socket
         * @access private
         * @var {Object}
         */
        var socket;

        /**
         * Connected flag
         * @access public
         * @var {Boolean}
         */
        this.connected = false;

        /**
         * Data synced to server
         * @access public
         * @var {Object}
         */
        this.data = {packet: []};

        /**
         * Client id
         * @access public
         * @var {String}
         */
        this.id = false;

        /**
         * Client inputs
         * @access public
         * @var {Object}
         */
        this.inputs = {
            keyboard: {},
            touches: {}
        };

        /**
         * Multitouch capable
         * @access public
         * @var {Boolean}
         */
        this.multitouch = false;

        /**
         * Server address
         * @access public
         * @var {String}
         */
        this.serverAddress = serverAddress;

        /**
         * Connection callback
         * @access public
         * @param {Object} response
         */
        this.connectCallback = function (response) {
            this.log("Connection opened:", response);
        };

        /**
         * Disconnect callback
         * @access public
         */
        this.disconnectCallback = function () {
            this.log("Connection closed");
        };

        /**
         * Error callback
         * @access public
         * @param {Object} response
         */
        this.errorCallback = function (response) {
            this.log("Error recieved:", response);
        };

        /**
         * Message recieved callback
         * @access public
         * @param {String} response
         */
        this.messageCallback = function (response) {
            this.log("Message recieved:", response);
        };

        /**
         * Update data callback
         * @access public
         */
        this.updateCallback = false;

        /**
         * Update server with client inputs
         * @access public
         * @param {Object} inputs
         */
        NodeClient.prototype.inputUpdate = function (inputs) {
            socket.emit("clientInput", inputs);
        };

        /**
         * Basic logging
         * @param {String} message
         */
        NodeClient.prototype.log = function (message) {
            console.log(message);
        };

        /**
         * Open connection and bind server/input callback events
         * @param {function} connectCallback
         * @param {String} initialData
         */
        NodeClient.prototype.start = function (connectCallback, initialData) {
            // Open connection
            this.connectCallback = connectCallback || this.connectCallback;
            socket = io.connect(this.serverAddress, {'sync disconnect on unload': true, query: "initialData=" + initialData});

            // Bind events
            var nodeClient = this;

            /**
             * On connection
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
             * On disconnect
             */
            socket.on('disconnect', function () {
                nodeClient.connected = false;
                socket.disconnect();
                if (nodeClient.disconnectCallback)
                    nodeClient.disconnectCallback.call(nodeClient);
            });

            /**
             * On error
             * @param {Object} response
             */
            socket.on('error', function (response) {
                if (nodeClient.errorCallback)
                    nodeClient.errorCallback.call(nodeClient, response);
            });

            /**
             * On message
             * @param {String} response
             */
            socket.on('message', function (response) {
                if (nodeClient.messageCallback)
                    nodeClient.messageCallback.call(nodeClient, response);
            });

            /**
             * On update
             * @param {Object} response
             */
            socket.on("update", function (response) {
                nodeClient.data.packet = response.packet;
                if (nodeClient.updateCallback)
                    nodeClient.updateCallback.call(nodeClient, response);
            });

            /**
             * Client keydown
             * @param {Event} event
             */
            document.onkeydown = function (event) {
                var keyPressed = String.fromCharCode(event.keyCode);
                nodeClient.inputs.keyboard[keyPressed] = true;
                nodeClient.inputs.keyboard[keyPressed + "Down"] = true;
                nodeClient.inputUpdate.call(nodeClient, nodeClient.inputs);
                nodeClient.inputs.keyboard[keyPressed + "Down"] = false;
            };

            /**
             * Client keyup
             * @param {Event} event
             */
            document.onkeyup = function (event) {
                var keyPressed = String.fromCharCode(event.keyCode);
                nodeClient.inputs.keyboard[keyPressed] = false;
                nodeClient.inputs.keyboard[keyPressed + "Up"] = true;
                nodeClient.inputUpdate.call(nodeClient, nodeClient.inputs);
                nodeClient.inputs.keyboard[keyPressed + "Up"] = false;
            };

            /**
             * Client touchstart
             * @param {Event} event
             */
            document.addEventListener("touchstart", function (event) {
                event.preventDefault();
                if (nodeClient.multitouch) {
                    for (var index in event.changedTouches) {
                        if (!nodeClient.inputs.touches[index])
                            nodeClient.inputs.touches[index] = {};
                        nodeClient.inputs.touches[index]["touchX"] = event.changedTouches[index].clientX;
                        nodeClient.inputs.touches[index]["touchY"] = event.changedTouches[index].clientY;
                        nodeClient.inputs.touches[index]["touchStart"] = true;
                    }
                    nodeClient.inputUpdate.call(nodeClient, nodeClient.inputs);
                    for (var index in event.changedTouches) {
                        nodeClient.inputs.touches[index]["touchStart"] = false;
                    }
                } else {
                    nodeClient.inputs.touches.x = event.changedTouches[0].clientX;
                    nodeClient.inputs.touches.y = event.changedTouches[0].clientY;
                    nodeClient.inputUpdate.call(nodeClient, nodeClient.inputs);
                }
            });

            /**
             * Client touchend
             * @param {Event} event
             */
            document.addEventListener("touchend", function (event) {
                event.preventDefault();
                if (nodeClient.multitouch) {
                    for (var index in event.changedTouches) {
                        if (!nodeClient.inputs.touches[index])
                            nodeClient.inputs.touches[index] = {};
                        nodeClient.inputs.touches[index]["touchX"] = event.changedTouches[index].clientX;
                        nodeClient.inputs.touches[index]["touchY"] = event.changedTouches[index].clientY;
                        nodeClient.inputs.touches[index]["touchEnd"] = true;
                    }
                    nodeClient.inputUpdate.call(nodeClient, nodeClient.inputs);
                    for (var index in event.changedTouches) {
                        delete nodeClient.inputs.touches[index];
                    }
                } else {
                    nodeClient.inputs.touches.x = false;
                    nodeClient.inputs.touches.y = false;
                    nodeClient.inputUpdate.call(nodeClient, nodeClient.inputs);
                }
            });
        };
    }

    return NodeClient;
});