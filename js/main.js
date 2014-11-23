/**
 * Setup requirejs
 */
requirejs.config({
    baseUrl: 'js/lib',
    shim: {
        'socketio': {
            exports: 'io'
        }
    }
});

/**
 * Start it up
 * @param {AnslemClient} AnslemClient
 */
requirejs(
        ['AnslemClient'],
        function (AnslemClient) {
            // Attach to window for debugging
            window.ac = AnslemClient;

            // Initialize and go ahead and start when ready
            AnslemClient.init("http://forest.anslemgalaxy.com:3000",function () {
                AnslemClient.start();
            });
        }
);
