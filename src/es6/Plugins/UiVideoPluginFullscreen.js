/**
 * Requires
 */
import { UiPlugin } from '@squirrel-forge/ui-core';
import { Exception } from '@squirrel-forge/ui-util';

/**
 * Ui video plugin full screen exception
 * @class
 * @extends Exception
 */
class UiVideoPluginFullscreenException extends Exception {}

/**
 * Ui video plugin fullscreen controls
 * @class
 * @extends UiPlugin
 */
export class UiVideoPluginFullscreen extends UiPlugin {

    /**
     * Plugin name getter
     * @public
     * @static
     * @return {string} - Plugin name
     */
    static get pluginName() {
        return 'fullscreen';
    }

    /**
     * Constructor
     * @constructor
     * @param {null|Object} options - Options object
     * @param {Object|UiVideoComponent} context - Plugin context
     * @param {null|console|Object} debug - Debug object
     */
    constructor( options, context, debug ) {
        super( options, context, debug );

        // Extend default config
        this.extendConfig = {

            // Full screen control options
            // @type {Object}
            fullscreen : {

                // Full screen enabled
                // @type {boolean}
                enabled : true,

                // Handle controls display with js
                // @type {boolean}
                display : false,
            },

            // Dom references
            // @type {Object}
            dom : {

                // Full screen button references
                // @type {object}
                fullscreen : {

                    // Full screen control wrapper
                    // @type {string}
                    control : '.ui-video__control--fullscreen',

                    // Open full screen button
                    // @type {string}
                    on : '[data-video="ctrl:fullscreen"]',

                    // Close full screen button
                    // @type {string}
                    off : '[data-video="ctrl:minimize"]',
                },
            },
        };

        // Extend component states
        this.extendStates = {
            fullscreen : { global: false, classOn : 'ui-video--fullscreen' },
        };
    }

    /**
     * Init component
     * @public
     * @param {Object|UiComponent} context - UiPlugin context
     * @return {void}
     */
    initComponent( context ) {
        super.initComponent( context );

        // Get references
        const controls = this.context.getDomRefs( 'controls', false );
        const control = this.context.getDomRefs( 'fullscreen.control', false );
        const fullscreen = this.context.getDomRefs( 'fullscreen.on', false );
        const minimize = this.context.getDomRefs( 'fullscreen.off', false );

        // Check API and control availability
        try {
            this.#check_availability( controls, control, fullscreen, minimize );
        } catch ( e ) {
            if ( this.debug ) this.debug.error( e );

            // Disable on error or not available
            this.disableFullscreen();
            return;
        }

        /**
         * Detect exit full screen handler
         * @private
         * @return {void}
         */
        const exit_handler = () => {
            if ( !document.fullScreenElement && !document.webkitIsFullScreen && !document.mozFullScreen && !document.msFullscreenElement ) {

                // Disable full screen mode and set states only
                if ( this.context.states.is( 'fullscreen' ) ) {
                    this.#exit_fullscreen( fullscreen, minimize, false, true );
                }
            }
        };
        document.addEventListener('fullscreenchange', exit_handler, false);
        document.addEventListener('mozfullscreenchange', exit_handler, false);
        document.addEventListener('MSFullscreenChange', exit_handler, false);
        document.addEventListener('webkitfullscreenchange', exit_handler, false);

        // Bind double click toggle
        this.#bind_dblclick( fullscreen, minimize );

        // Bind full screen/minimize toggle
        if ( control ) this.#bind_toggle( fullscreen, minimize );

        // Hide control if not enabled initially
        if ( !this.context.config.get( 'fullscreen.enabled' ) ) {
            this.disableFullscreen();
        }
    }

    /**
     * Is in full screen mode
     * @public
     * @return {boolean} - Full screen state
     */
    isFullscreen() {
        return this.context.states.is( 'fullscreen' );
    }

    /**
     * Enable full screen toggle control and dblclick handler
     * @public
     * @return {void}
     */
    enableFullscreen() {
        const control = this.context.getDomRefs( 'fullscreen.control', false );
        this.context.config.set( 'fullscreen.enabled', true );
        if ( control ) this.context.constructor.showControl( control, true );
    }

    /**
     * Disable full screen toggle control and dblclick handler
     * @public
     * @return {void}
     */
    disableFullscreen() {
        const control = this.context.getDomRefs( 'fullscreen.control', false );
        this.context.config.set( 'fullscreen.enabled', false );
        if ( control ) this.context.constructor.hideControl( control, true );
        if ( this.isFullscreen() ) this.exitFullscreen();
    }

    /**
     * Request full screen mode
     * @public
     * @return {void}
     */
    requestFullscreen() {
        const fullscreen = this.context.getDomRefs( 'fullscreen.on', false );
        const minimize = this.context.getDomRefs( 'fullscreen.off', false );
        this.#request_fullscreen( fullscreen, minimize );
    }

    /**
     * Exit full screen mode
     * @public
     * @return {void}
     */
    exitFullscreen() {
        const fullscreen = this.context.getDomRefs( 'fullscreen.on', false );
        const minimize = this.context.getDomRefs( 'fullscreen.off', false );
        this.#exit_fullscreen( fullscreen, minimize );
    }

    /**
     * Check API and element availability
     * @private
     * @param {HTMLElement} controls - Controls wrapper
     * @param {HTMLElement} control - Control wrapper
     * @param {HTMLButtonElement} fullscreen - Full screen button
     * @param {HTMLButtonElement} minimize - Minimize button
     * @return {void}
     */
    #check_availability( controls, control, fullscreen, minimize ) {

        // Always throw if api not available
        if ( !document.fullscreenEnabled ) {
            window.console.error( this.constructor.name + '::check_availability Fullscreen API not available' );
            throw new UiVideoPluginFullscreenException( 'Fullscreen API not available' );
        }

        // Break if there are no controls available
        if ( !controls ) throw new UiVideoPluginFullscreenException( 'Video dom.controls not available' );

        // Notify if toggle control not available
        if ( !control ) {
            if ( this.debug) this.debug.warn( this.constructor.name + '::check_availability Fullscreen dom.fullscreen.control not available' );
        } else {

            // Require both toggle button states
            if ( !fullscreen ) throw new UiVideoPluginFullscreenException( 'Fullscreen dom.fullscreen.on not available' );
            if ( !minimize ) throw new UiVideoPluginFullscreenException( 'Fullscreen dom.fullscreen.off not available' );
        }
    }

    /**
     * Request full screen mode
     * @private
     * @param {HTMLButtonElement} fullscreen - Full screen button
     * @param {HTMLButtonElement} minimize - Minimize button
     * @param {boolean} withfocus - Apply focus changes
     * @return {void}
     */
    #request_fullscreen( fullscreen, minimize, withfocus = false ) {
        this.context.dom.requestFullscreen().then( () => {
            this.context.states.set( 'fullscreen' );
            if ( fullscreen && minimize ) {
                const display = this.context.config.get( 'fullscreen.display' );
                this.context.constructor.hideControl( fullscreen, display );
                this.context.constructor.showControl( minimize, display );
                if ( withfocus ) {
                    fullscreen.blur();
                    if ( this.context.config.get( 'controls.refocus' ) ) minimize.focus();
                }
            }
        } ).catch( ( e ) => {
            window.console.error( this.constructor.name + '::requestFullscreen Failed:', e );
            throw new UiVideoPluginFullscreenException( 'Failed to open fullscreen mode' );
        } );
    }

    /**
     * Exit full screen mode
     * @private
     * @param {HTMLButtonElement} fullscreen - Full screen button
     * @param {HTMLButtonElement} minimize - Minimize button
     * @param {boolean} withfocus - Apply focus changes
     * @param {boolean} noexit - Only set state, do not run exit code
     * @return {void}
     */
    #exit_fullscreen( fullscreen, minimize, withfocus = false, noexit = false ) {
        this.context.states.unset( 'fullscreen' );
        if ( fullscreen && minimize ) {
            const display = this.context.config.get( 'fullscreen.display' );
            this.context.constructor.showControl( fullscreen, display );
            this.context.constructor.hideControl( minimize, display );
            if ( withfocus ) {
                minimize.blur();
                if ( this.context.config.get( 'controls.refocus' ) ) fullscreen.focus();
            }
        }
        if ( noexit ) return;
        try {
            document.exitFullscreen();
        } catch ( e ) {
            window.console.error( this.constructor.name + '::exitFullscreen Failed:', e );
            throw new UiVideoPluginFullscreenException( 'Failed to exit fullscreen mode' );
        }
    }

    /**
     * Bind double click toggle full screen mode
     * @private
     * @param {HTMLButtonElement} fullscreen - Full screen button
     * @param {HTMLButtonElement} minimize - Minimize button
     * @return {void}
     */
    #bind_dblclick( fullscreen, minimize ) {

        /**
         * Controls full screen double click listener
         *  used with native = false
         * @private
         * @return {void}
         */
        this.context.addEventListener( 'video.controls.dblclick', ( event ) => {
            if ( !this.context.config.get( 'fullscreen.enabled' ) ) return;

            // Ignore and prevent clicks bubbling if not playable
            if ( !this.context.states.is( 'playable' ) ) {
                event.stopPropagation();
                return;
            }

            // Toggle full screen mode
            if ( this.context.states.is( 'fullscreen' ) ) {
                this.#exit_fullscreen( fullscreen, minimize );
            } else {
                this.#request_fullscreen( fullscreen, minimize );
            }
        } );
    }

    /**
     * Bind full screen toggle
     * @private
     * @param {HTMLButtonElement} fullscreen - Full screen button
     * @param {HTMLButtonElement} minimize - Minimize button
     * @return {void}
     */
    #bind_toggle( fullscreen, minimize ) {
        fullscreen.addEventListener( 'click', ( event ) => {
            if ( !this.context.config.get( 'fullscreen.enabled' ) ) return;
            event.preventDefault();
            this.#request_fullscreen( fullscreen, minimize, true );
        } );
        minimize.addEventListener( 'click', ( event ) => {
            if ( !this.context.config.get( 'fullscreen.enabled' ) ) return;
            event.preventDefault();
            this.#exit_fullscreen( fullscreen, minimize, true );
        } );

        // Initial state
        const display = this.context.config.get( 'fullscreen.display' );
        this.context.constructor.hideControl( minimize, display );
        this.context.constructor.showControl( fullscreen, display );
    }
}
