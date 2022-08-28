/**
 * Requires
 */
import { UiPlugin } from '@squirrel-forge/ui-core';
import { isPojo } from '@squirrel-forge/ui-util';

/**
 * @typedef {Object} VideoResponsiveSources - Query bound source information
 * @property {VideoSource} mediaquery* - Property name is the media query, value the video source object
 */

/**
 * @typedef {Object} VideoSourceResponsive - Extends the normal VideoSource, nested sources may not have a responsive property
 * @extends VideoSource
 * @property {VideoResponsiveSources|Object} responsive - Query bound source information
 */

/**
 * Ui video plugin responsive sources
 * @class
 * @extends UiPlugin
 */
export class UiVideoPluginResponsive extends UiPlugin {

    /**
     * Video time position before last source set
     * @private
     * @property
     * @type {null|number}
     */
    #previous_currentTime = null;

    /**
     * Video paused state before last source set
     * @private
     * @property
     * @type {null|boolean}
     */
    #previous_paused = null;

    /**
     * Plugin name getter
     * @public
     * @static
     * @return {string} - Plugin name
     */
    static get pluginName() {
        return 'responsive';
    }

    /**
     * Constructor
     * @constructor
     * @param {null|Object} options - Options object
     * @param {UiVideoComponent|Object} context - Plugin context
     * @param {null|console|Object} debug - Debug object
     */
    constructor( options, context, debug ) {
        super( options, context, debug );

        // Extend default config
        this.extendConfig = {

            // Responsive options
            // @type {Object}
            responsive : {

                // Media query handler
                // @type {null|MediaQueryEvents|Object}
                media : null,

                // Remember play state and position on source switch
                // @type {boolean}
                rememberState : true,

                // Source responsive options property
                // @type {string}
                propertyName : 'responsive',
            },
        };

        // Register events
        this.registerEvents = [
            [ 'video.source.update', ( event ) => { this.#event_source_update( event ); } ],
            [ 'video.source.set', ( event ) => { this.#event_source_set( event ); } ],
        ];
    }

    /**
     * Init component
     * @public
     * @param {Object|UiComponent} context - UiPlugin context
     * @return {void}
     */
    initComponent( context ) {
        super.initComponent( context );

        // Verify media handler available
        const config = this.context.config.get( 'responsive' );
        if ( !config.media ) {
            if ( this.debug ) this.debug.error( this.constructor.name + '::initComponent Requires responsive.media to be a media query handler' );
            return;
        }

        // Setup media query switch source update events
        const sources = this.context.config.get( 'sources' );
        for ( let i = 0; i < sources.length; i++ ) {

            // Skip if the responsive property does not exist
            if ( !sources[ i ][ config.propertyName ] ) continue;

            // Get all queries
            const queries = Object.keys( sources[ i ][ config.propertyName ] );
            for ( let j = 0; j < queries.length; j++ ) {

                // Add query listener to update source
                config.media.addEventListener( queries[ j ], () => {
                    if ( this.debug ) this.debug.log( this.constructor.name + '::media_event', queries[ j ] );
                    this.context.selectSource( this.context.getCurrentIndex() );
                }, false, true );
            }
        }
    }

    /**
     * Event video.source.update
     * @private
     * @param {Event} event - Source update event
     * @return {void}
     */
    #event_source_update( event ) {

        // Remember last time position and paused state
        if ( this.context.config.get( 'responsive.rememberState' ) ) {
            this.#previous_currentTime = this.context.video.currentTime;
            this.#previous_paused = this.context.video.paused;
        }

        // Update source info with responsive info
        this.#responsive_update_source( event.detail.source );
    }

    /**
     * Update source with responsive data
     * @private
     * @param {VideoSource|VideoSourceResponsive} source - Source object
     * @return {void}
     */
    #responsive_update_source( source ) {
        const config = this.context.config.get( 'responsive' );

        // Only proceed with a source and responsive property
        if ( source && isPojo( source[ config.propertyName ] ) ) {
            const entries = Object.entries( source[ config.propertyName ] );
            for ( let i = 0; i < entries.length; i++ ) {
                const [ query, breakpoint ] = entries[ i ];

                // Only assign breakpoint data from matching queries
                //  note this always happens in definition order
                if ( config.media.matches( query ) ) {
                    if ( this.debug ) this.debug.log( this.constructor.name + '::responsive_update_source', query, breakpoint );
                    Object.assign( source, breakpoint );
                }
            }
        }
    }

    /**
     * Event video.source.set
     * @private
     * @param {Event} event - Source set event
     * @return {void}
     */
    #event_source_set( event ) {

        // Set previous time position and play state
        if ( this.context.config.get( 'responsive.rememberState' ) ) {
            if ( this.#previous_currentTime !== null ) this.context.video.currentTime = this.#previous_currentTime;
            if ( this.#previous_paused !== null && this.#previous_paused === false ) this.context.video.play();
        }
    }
}
