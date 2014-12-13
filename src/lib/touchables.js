/**
 * Connects to server and draws to stage
 *
 * @module Touchables
 */
define(function () {
    var Touchables = {};

    function TouchKeyboard(element) {
        this.active = false;

        this.container = element || document.body;

        this.keyList = [
            "qwertyuiop",
            "asdfghjkl'",
            "zxcvbnm,+"
        ];

        this.keys = [];

        TouchKeyboard.prototype.activate = function () {
            this.active = true;
            this.keyboardValue.style.left = "0";
            this.container.classList.add("keyboard-active");
            for (var index in this.keys) {
                var keyElement = this.keys[index];
                keyElement.style.transform = "translate3d(0,0,0)";
                keyElement.style.webkitTransform = "translate3d(0,0,0)";
            }
            if (this.onactivate) {
                this.onactivate();
            }
        };

        TouchKeyboard.prototype.deactivate = function () {
            this.active = false;
            this.keyboardValue.style.left = "100vw";
            this.container.classList.remove("keyboard-active");
            for (var index in this.keys) {
                var keyElement = this.keys[index];
                keyElement.style.transform = "translate3d(100vw,100vh,0)";
                keyElement.style.webkitTransform = "translate3d(100vw,100vh,0)";
            }
            if (this.ondeactivate) {
                this.ondeactivate();
            }
        };

        TouchKeyboard.prototype.init = function () {
            var keyWidth = Math.floor(100 / this.keyList[0].length);
            var keyHeight = keyWidth;
            var tarY = keyHeight;
            var self = this;
            var keyCount = 0;
            for (var line in this.keyList) {
                var tarX = 0;
                for (var key in this.keyList[line]) {
                    keyCount++;
                    var keyElement = document.createElement("div");
                    var keyString = this.keyList[line][key];
                    keyElement.className = "keyboard-key";
                    keyElement.innerHTML = keyString;
                    keyElement.style.width = keyWidth + "vw";
                    keyElement.style.lineHeight = keyHeight + "vw";
                    keyElement.style.fontSize = (keyHeight * 0.8) + "vw";
                    keyElement.style.left = tarX + "vw";
                    keyElement.style.top = tarY + "vw";
                    keyElement.style.transform = "translate3d(100vw,100vh,0)";
                    keyElement.style.webkitTransform = "translate3d(100vw,100vh,0)";
                    keyElement.style.transition = "all " + keyCount * 20 + "ms ease-in-out";
                    keyElement.style.webkitTransition = "all " + keyCount * 20 + "ms ease-in-out";
                    keyElement.addEventListener("touchend", function () {
                        self.keyboardValue.innerHTML += keyString;
                    });
                    keyElement.addEventListener("mouseup", function () {
                        self.keyboardValue.innerHTML += this.innerHTML;
                    });
                    this.container.appendChild(keyElement);
                    this.keys.push(keyElement);
                    tarX += keyWidth;
                }
                tarY += keyHeight;
            }
            this.keyboardToggle = document.createElement("div");
            this.keyboardToggle.className = "keyboard-toggle";
            this.keyboardToggle.innerHTML = "!";
            this.keyboardToggle.style.width = keyWidth + "vw";
            this.keyboardToggle.style.lineHeight = keyHeight + "vw";
            this.keyboardToggle.style.fontSize = (keyHeight * 0.8) + "vw";
            this.keyboardToggle.style.right = 0;
            this.keyboardToggle.style.bottom = 0;
            this.keyboardToggle.addEventListener("touchend", function (e) {
                e.preventDefault();
                self.toggle.call(self);
                return false;
            });
            this.keyboardToggle.addEventListener("mouseup", function (e) {
                e.preventDefault();
                self.toggle.call(self);
                return false;
            });
            this.container.appendChild(this.keyboardToggle);

            this.keyboardValue = document.createElement("div");
            this.keyboardValue.className = "keyboard-value";
            this.keyboardValue.style.width = (100 - keyWidth) + "vw";
            this.keyboardValue.style.height = keyHeight + "vw";
            this.keyboardValue.style.lineHeight = keyHeight + "vw";
            this.keyboardValue.style.fontSize = (keyHeight * 0.8) + "vw";
            this.keyboardValue.style.left = "100vw";
            this.keyboardValue.style.bottom = 0;
            this.container.appendChild(this.keyboardValue);
        };

        TouchKeyboard.prototype.toggle = function () {
            if (this.active)
                this.deactivate();
            else
                this.activate();
        };

        this.init();
    }
    Touchables.TouchKeyboard = TouchKeyboard;

    function TouchJoystick() {

        TouchJoystick.prototype.init = function () {
            this.joystick = document.createElement("div");
            this.joystick.id = "joystick";
            this.joystick.className = "metal";
            this.joystick.knob = document.createElement("span");
            this.joystick.appendChild(this.joystick.knob);
            document.body.appendChild(this.joystick);
        };

        TouchJoystick.prototype.update = function (touches) {
            if (touches.length === 1) {
                var touch = touches[Object.keys(touches)[0]];
                var joyX1 = touch.startX;
                var joyY1 = touch.startY;
                var joyX2 = touch.x;
                var joyY2 = touch.y;
                var joyRadius = 100;

                if (joyX2 - joyX1 > joyRadius)
                    joyX2 = joyX1 + joyRadius;
                else if (joyX1 - joyX2 > joyRadius)
                    joyX2 = joyX1 - joyRadius;
                if (joyY2 - joyY1 > joyRadius)
                    joyY2 = joyY1 + joyRadius;
                else if (joyY1 - joyY2 > joyRadius)
                    joyY2 = joyY1 - joyRadius;

                this.joystick.setAttribute("data-active", "1");

                this.joystick.style.left = joyX1 + "px";
                this.joystick.style.top = joyY1 + "px";

                this.joystick.knob.style.left = (joyX2 - joyX1) + "px";
                this.joystick.knob.style.top = (joyY2 - joyY1) + "px";
            } else {
                this.joystick.setAttribute("data-active", "0");
            }
        };

        this.init();
    }
    Touchables.TouchJoystick = TouchJoystick;

    return Touchables;
});