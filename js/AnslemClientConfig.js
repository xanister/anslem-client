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
         * Game server url
         *
         * @property serverUrl
         * @type {String}
         */
        serverUrl: "http://forest.anslemgalaxy.com:3000"
    };
    return AnslemClientConfig;
});