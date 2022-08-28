/**
 * Requires
 */
import { UiPlugin } from '@squirrel-forge/ui-core';
import { bindNodeList } from '@squirrel-forge/ui-util';

/**
 * Ui video plugin tracking
 * @class
 * @extends UiPlugin
 */
export class UiVideoPluginTracking extends UiPlugin {

    /**
     * Tracking helper
     * @private
     * @property
     * @type {null|Tracker}
     */
    #tracker = null;

    /**
     * Plugin name getter
     * @public
     * @static
     * @return {string} - Plugin name
     */
    static get pluginName() {
        return 'tracking';
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

            // Tracking options
            // @type {Object}
            tracking : {

                // Tracker instance
                // @type {null|Tracker|Object}
                tracker : null,

                // Clear once register on event names
                // @type {Object}
                clearon : {

                    // Video ended event
                    // @type {boolean}
                    ended : true,

                    // Component video.source.set event
                    // @type {boolean}
                    set : true,

                    // Component video.source.unset event
                    // @type {boolean}
                    unset : true,
                },

                // Timeupdate event trackers
                // @type {Array<TrackingDefinition>}
                timeupdate : [],
            },
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

        // Ensure a dataLayer is available
        if ( !window.dataLayer ) {
            window.dataLayer = [];
            if ( this.debug ) {
                this.debug.warn( this.constructor.name + '::initComponent Tracking window.dataLayer was created because it did not exist' );
            }
        }

        // Ensure a tracker is available to check and run events
        if ( !this.#get_tracker() ) {
            if ( this.debug ) {
                this.debug.error( this.constructor.name + '::initComponent Config tracking.tracker must be set to a valid tracking helper' );
            }
            return;
        }

        /**
         * Clear tracking on callback
         * @private
         * @param {Event} event - Trigger event
         * @return {void}
         */
        const clear_on_callback = ( event ) => {
            let config = 'tracking.clearon.' + event.type;
            if ( event.type === 'video.source.set' ) {
                config = 'tracking.clearon.set'
            } else if ( event.type === 'video.source.unset' ) {
                config = 'tracking.clearon.unset'
            }
            if ( this.context.config.get( config ) ) {
                this.#tracker.clearOnce();
            }
        };

        // Bind video events
        bindNodeList( [ this.context.video ], [
            [ 'timeupdate', () => {
                const trackers = this.context.config.get( 'tracking.timeupdate' );
                if ( !trackers || !trackers.length ) return;

                // Get current percent for trigger checks
                const percent = this.context.video.currentTime / this.context.video.duration * 100;

                // Only trigger if we have a valid percentage
                //  will never trigger if duration does not get defined
                if ( !Number.isNaN( percent ) ) {
                    this.#tracker.run( trackers, [ this, percent ] );
                }
            } ],
            [ 'ended', clear_on_callback ],
        ] );

        // Bind component events
        this.context.addEventList( [
            [ 'video.source.set', clear_on_callback ],
            [ 'video.source.unset', clear_on_callback ],
        ] );
    }

    /**
     * Get tracker from config
     * @private
     * @return {boolean} - Tracking helper available
     */
    #get_tracker() {
        this.#tracker = this.context.config.get( 'tracking.tracker' );
        return this.#tracker && typeof this.#tracker === 'object';
    }
}
