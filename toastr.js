/*
 * Toastr
 * Copyright 2012-2015
 * Authors: John Papa, Hans Fjällemark, and Tim Ferrell.
 * All Rights Reserved.
 * Use, reproduction, distribution, and modification of this code is subject to the terms and
 * conditions of the MIT license, available at http://www.opensource.org/licenses/mit-license.php
 *
 * ARIA Support: Greta Krafsig
 *
 * Project: https://github.com/CodeSeven/toastr
 */
/* global define */
// Create Element.remove() function if not exist
if (!('remove' in Element.prototype)) {
    Element.prototype.remove = function() {
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
    };
}

(function (define) {
    define([], function () {
        return (function () {
            var container;
            var listener;
            var toastId = 0;
            var toastType = {
                error: 'error',
                info: 'info',
                success: 'success',
                warning: 'warning'
            };

            var toastr = {
                clear: clear,
                remove: remove,
                error: error,
                getContainer: getContainer,
                info: info,
                options: {},
                subscribe: subscribe,
                success: success,
                version: '2.1.4',
                warning: warning
            };

            var previousToast;

            return toastr;

            ////////////////

            function error(message, title, optionsOverride) {
                return notify({
                    type: toastType.error,
                    iconClass: getOptions().iconClasses.error,
                    message: message,
                    optionsOverride: optionsOverride,
                    title: title
                });
            }

            function getContainer(options, create) {
                if (!options) { options = getOptions(); }
                container = document.getElementById(options.containerId);
                if (container) {
                    return container;
                }
                if (create) {
                    container = createContainer(options);
                }
                return container;
            }

            function info(message, title, optionsOverride) {
                return notify({
                    type: toastType.info,
                    iconClass: getOptions().iconClasses.info,
                    message: message,
                    optionsOverride: optionsOverride,
                    title: title
                });
            }

            function subscribe(callback) {
                listener = callback;
            }

            function success(message, title, optionsOverride) {
                return notify({
                    type: toastType.success,
                    iconClass: getOptions().iconClasses.success,
                    message: message,
                    optionsOverride: optionsOverride,
                    title: title
                });
            }

            function warning(message, title, optionsOverride) {
                return notify({
                    type: toastType.warning,
                    iconClass: getOptions().iconClasses.warning,
                    message: message,
                    optionsOverride: optionsOverride,
                    title: title
                });
            }

            function clear(toastElement, clearOptions) {
                var options = getOptions();
                if (!container) { getContainer(options); }
                if (!clearToast(toastElement, options, clearOptions)) {
                    clearContainer(options);
                }
            }

            function remove(toastElement) {
                var options = getOptions();
                if (!container) { getContainer(options); }
                if (toastElement && document.activeElement === toastElement) {
                    removeToast(toastElement);
                    return;
                }
                if (container.children.length) {
                    container.remove();
                }
            }

            // internal functions

            function clearContainer (options) {
                if(container){
                    var toastsToClear = container.children;
                    for (var i = toastsToClear.length - 1; i >= 0; i--) {
                        clearToast(toastsToClear[i], options);
                    }
                }
            }

            function clearToast (toastElement, options, clearOptions) {
                var force = clearOptions && clearOptions.force ? clearOptions.force : false;
                if (toastElement && !force) {

                    toastElement.classList.add('toast-hide')
                    setTimeout(function () {
                        removeToast(toastElement);
                    }, options.hideDuration)
                    return true;
                }
                return false;
            }

            function createContainer(options) {
                var containerHTML = '<div id="'+options.containerId+'" class="'+(options.positionClass||'')+'"></div>'
                options.target.insertAdjacentHTML('beforeend', containerHTML)
                return document.getElementById(options.containerId);
            }

            function getDefaults() {
                return {
                    tapToDismiss: true,
                    toastClass: 'toast',
                    containerId: 'toast-container',
                    debug: false,

                    showDuration: 300,
                    onShown: undefined,
                    hideDuration: 1000,
                    onHidden: undefined,
                    closeMethod: false,
                    closeDuration: false,
                    closeEasing: false,
                    closeOnHover: true,

                    extendedTimeOut: 1000,
                    iconClasses: {
                        error: 'toast-error',
                        info: 'toast-info',
                        success: 'toast-success',
                        warning: 'toast-warning'
                    },
                    iconClass: 'toast-info',
                    positionClass: 'toast-top-right',
                    timeOut: 5000, // Set timeOut and extendedTimeOut to 0 to make it sticky
                    titleClass: 'toast-title',
                    messageClass: 'toast-message',
                    escapeHtml: false,
                    target: document.body,
                    closeHtml: '<button type="button">&times;</button>',
                    closeClass: 'toast-close-button',
                    newestOnTop: true,
                    preventDuplicates: false,
                    progressBar: false,
                    progressClass: 'toast-progress',
                    rtl: false
                };
            }

            function publish(args) {
                if (!listener) { return; }
                listener(args);
            }

            function notify(map) {
                var options = getOptions();
                var iconClass = map.iconClass || options.iconClass;

                if (typeof (map.optionsOverride) !== 'undefined') {
                    options = Object.assign(options, map.optionsOverride);
                    iconClass = map.optionsOverride.iconClass || iconClass;
                }

                if (shouldExit(options, map)) { return; }

                toastId++;

                container = getContainer(options, true);

                var intervalId = null;
                var toastElement = document.createElement('div');
                var titleElement = document.createElement('div');
                var messageElement = document.createElement('div');
                var progressElement = document.createElement('div');
                var closeElement = document.createElement('div');
                closeElement.insertAdjacentHTML('beforeend', options.closeHtml)
                /**
                 * TODO: Debug
                 */
                closeElement = closeElement.children[0];

                toastElement.setAttribute('tabindex', '0');

                var progressBar = {
                    intervalId: null,
                    hideEta: null,
                    maxHideTime: null
                };
                var response = {
                    toastId: toastId,
                    state: 'visible',
                    startTime: new Date(),
                    options: options,
                    map: map
                };

                personalizeToast();

                displayToast();

                handleEvents();

                publish(response);

                if (options.debug && console) {
                    console.log(response);
                }

                return toastElement;

                function escapeHtml(source) {
                    if (source == null) {
                        source = '';
                    }

                    return source
                      .replace(/&/g, '&amp;')
                      .replace(/"/g, '&quot;')
                      .replace(/'/g, '&#39;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;');
                }

                function personalizeToast() {
                    setIcon();
                    setTitle();
                    setMessage();
                    setCloseButton();
                    setProgressBar();
                    setRTL();
                    setSequence();
                    setAria();
                }

                function setAria() {
                    var ariaValue = '';
                    switch (map.iconClass) {
                        case 'toast-success':
                        case 'toast-info':
                            ariaValue =  'polite';
                            break;
                        default:
                            ariaValue = 'assertive';
                    }
                    toastElement.setAttribute('aria-live', ariaValue);
                }

                function handleEvents() {
                    if (options.closeOnHover) {
                        toastElement.removeEventListener('mouseenter', stickAround);
                        toastElement.addEventListener('mouseenter', stickAround);
                        toastElement.removeEventListener('mouseleave', delayedHideToast);
                        toastElement.addEventListener('mouseleave', delayedHideToast);
                    }

                    if (!options.onclick && options.tapToDismiss) {
                        toastElement.removeEventListener('click', hideToast);
                        toastElement.addEventListener('click', hideToast);
                    }

                    if (options.closeButton && closeElement) {
                        closeElement.addEventListener('click', function (event) {
                            if (event.stopPropagation) {
                                event.stopPropagation();
                            } else if (event.cancelBubble !== undefined && event.cancelBubble !== true) {
                                event.cancelBubble = true;
                            }

                            if (options.onCloseClick) {
                                options.onCloseClick(event);
                            }

                            hideToast(true);
                        });
                    }

                    if (options.onclick) {
                        toastElement.addEventListener('click', function (event) {
                            options.onclick(event);
                            hideToast();
                        });
                    }
                }

                function displayToast() {
                    /**
                     * TODO: Debug
                     */
                    toastElement.classList.add('toast-show');
                    if(options.onShown){
                        setTimeout(function () {
                            options.onShown();
                        }, options.showDuration)
                    }

                    if (options.timeOut > 0) {
                        intervalId = setTimeout(hideToast, options.timeOut);
                        progressBar.maxHideTime = parseFloat(options.timeOut);
                        progressBar.hideEta = new Date().getTime() + progressBar.maxHideTime;
                        if (options.progressBar) {
                            progressBar.intervalId = setInterval(updateProgress, 10);
                        }
                    }
                }

                function setIcon() {
                    if (map.iconClass) {
                        toastElement.classList.add(options.toastClass);
                        toastElement.classList.add(iconClass);
                    }
                }

                function setSequence() {
                    if (options.newestOnTop) {
                        if(container.children[0]){
                            container.insertBefore(toastElement, container.children[0]);
                        } else {
                            container.appendChild(toastElement);
                        }
                    } else {
                        container.appendChild(toastElement);
                    }
                }

                function setTitle() {
                    if (map.title) {
                        var suffix = map.title;
                        if (options.escapeHtml) {
                            suffix = escapeHtml(map.title);
                        }
                        titleElement.innerHTML = suffix;
                        titleElement.classList.add(options.titleClass);
                        toastElement.appendChild(titleElement);
                    }
                }

                function setMessage() {
                    if (map.message) {
                        var suffix = map.message;
                        if (options.escapeHtml) {
                            suffix = escapeHtml(map.message);
                        }
                        messageElement.innerHTML = suffix;
                        messageElement.classList.add(options.messageClass);
                        toastElement.appendChild(messageElement);
                    }
                }

                function setCloseButton() {
                    if (options.closeButton) {
                        closeElement.classList.add(options.closeClass);
                        closeElement.setAttribute('role', 'button');
                        if(toastElement.children[0]){
                            toastElement.insertBefore(closeElement, toastElement.children[0]);
                        } else {
                            toastElement.appendChild(closeElement);
                        }
                    }
                }

                function setProgressBar() {
                    if (options.progressBar) {
                        progressElement.classList.add(options.progressClass);
                        if(toastElement.children[0]){
                            toastElement.insertBefore(progressElement, toastElement.children[0]);
                        } else {
                            toastElement.appendChild(progressElement);
                        }
                    }
                }

                function setRTL() {
                    if (options.rtl) {
                        toastElement.classList.add('rtl');
                    }
                }

                function shouldExit(options, map) {
                    if (options.preventDuplicates) {
                        if (map.message === previousToast) {
                            return true;
                        } else {
                            previousToast = map.message;
                        }
                    }
                    return false;
                }

                function hideToast(override) {
                    var duration = override && options.closeDuration !== false ?
                      options.closeDuration : options.hideDuration;
                    clearTimeout(progressBar.intervalId);

                    toastElement.classList.add('toast-hide')
                    setTimeout(function () {
                        removeToast(toastElement);
                        clearTimeout(intervalId);
                        if (options.onHidden && response.state !== 'hidden') {
                            options.onHidden();
                        }
                        response.state = 'hidden';
                        response.endTime = new Date();
                        publish(response);
                    }, duration)
                    return toastElement;
                }

                function delayedHideToast() {
                    if (options.timeOut > 0 || options.extendedTimeOut > 0) {
                        intervalId = setTimeout(hideToast, options.extendedTimeOut);
                        progressBar.maxHideTime = parseFloat(options.extendedTimeOut);
                        progressBar.hideEta = new Date().getTime() + progressBar.maxHideTime;
                    }
                }

                function stickAround() {
                    clearTimeout(intervalId);
                    progressBar.hideEta = 0;
                    /**
                     * TODO: Debug
                     */
                    toastElement.classList.add('toast-show');
                }

                function updateProgress() {
                    var percentage = ((progressBar.hideEta - (new Date().getTime())) / progressBar.maxHideTime) * 100;
                    progressElement.style.width = percentage + '%';
                }
            }

            function getOptions() {
                return Object.assign(getDefaults(), toastr.options);
            }

            function removeToast(toastElement) {
                if (!container) { container = getContainer(); }
                toastElement.remove();
                toastElement = null;
                if (container.children.length === 0) {
                    container.remove();
                    previousToast = undefined;
                }
            }

        })();
    });
}(typeof define === 'function' && define.amd ? define : function (deps, factory) {
    if (typeof module !== 'undefined' && module.exports) { //Node
        module.exports = factory();
    } else {
        window.toastr = factory();
    }
}));
