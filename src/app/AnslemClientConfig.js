/**
 * Global client config
 *
 * @module Anslem
 */
define(function () {
    /**
     * Basic client config
     *
     * @class AnslemClientConfig
     * @static
     */
    var AnslemClientConfig = {
        /**
         * Asset server url
         *
         * @property assetsUrl
         * @type {String}
         */
        assetsUrl: "http://assets.anslemgalaxy.com",
        /**
         * Client target fps
         *
         * @property clientFps
         * @type {Number}
         */
        clientFps: 60,
        /**
         * Environment
         *
         * @propert environment
         * @type {String}
         */
        environment: 'dev1',
        /**
         * Game server url
         *
         * @property serverUrl
         * @type {String}
         */
        serverUrl: "http://devserver1.anslemgalaxy.com:3011"
    };
    return AnslemClientConfig;
});
