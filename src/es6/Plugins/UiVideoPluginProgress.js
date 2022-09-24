/**
 * Requires
 */
import { UiPlugin } from '@squirrel-forge/ui-core';
import { Exception, round } from '@squirrel-forge/ui-util';

/**
 * Ui video plugin progress exception
 * @class
 * @extends Exception
 */
class UiVideoPluginProgressException extends Exception {}

/**
 * Ui video plugin progress control
 * @class
 * @extends UiPlugin
 */
export class UiVideoPluginProgress extends UiPlugin {

    /**
     * Plugin name getter
     * @public
     * @static
     * @return {string} - Plugin name
     */
    static get pluginName() {
        return 'progress';
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


            // Progress control settings
            // @type {Object}
            progress : {

                // Allow timeline skipping, defined by readonly state of control if set to null
                // @type {null|boolean}
                interactive : null,

                // Add css custom properties with progress number and percentage
                // @type {boolean}
                cssprop : true,

                // Percent decimals
                // @type {Object}
                decimals : {

                    // Label percent decimals for display
                    // @type {null|number}
                    label : 0,

                    // Value percent decimals
                    // @type {null|number}
                    value : null,

                    // CSS custom property percent decimals
                    // @type {null|number}
                    cssprop : null,
                },
            },

            // Dom references
            // @type {Object}
            dom : {

                // Progress control references
                // @type {object}
                progress : {

                    // Progress control wrapper
                    // @type {string}
                    control : '.ui-video__progress',

                    // Input type range control
                    // @type {string}
                    input : '[data-video="ctrl:progress"]',

                    // Label percent display
                    // @type {string}
                    label : '[data-video="label:progress"]',
                },
            },
        };

        // Register events
        this.registerEvents = [
            [ 'video.source.set', () => { this.#event_timeupdate(); } ],
            [ 'video.source.unset', () => { this.#event_timeupdate( false ); } ],
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

        /**
         * Time update related actions are independent of the controls existance
         * @private
         * @return {void}
         */
        this.context.video.addEventListener( 'timeupdate', () => { this.#event_timeupdate(); } );

        // Get references for component related events
        const control = this.context.getDomRefs('progress.control', false);
        const progress = this.context.getDomRefs('progress.input', false);

        // No control no bindings
        if ( !control ) {
            if ( this.debug ) this.debug.error(this.constructor.name + '::initComponent No progress control available');
            return;
        }

        // Requires progress
        if ( !progress ) throw new UiVideoPluginProgressException( 'Progress dom.progress.input not available' );

        // Initial set/get non interactive/readonly mode
        const progress_interaction = this.context.config.get( 'progress.interactive' );
        if ( typeof progress_interaction === 'boolean' ) {
            this.interactive( progress_interaction );
        } else if ( progress_interaction === null ) {
            this.context.config.set( 'progress.interactive', !progress.readonly );
        }

        /**
         * Set video position after drag complete
         * @private
         * @return {void}
         */
        progress.addEventListener( 'change', () => {
            if ( !this.context.config.get( 'progress.interactive' ) ) return;
            this.context.video.currentTime = this.context.video.duration / 100 * parseFloat( progress.value );
        });

        /**
         * Set video position while dragging
         * @private
         * @return {void}
         */
        progress.addEventListener( 'input', () => {
            if ( !this.context.config.get( 'progress.interactive' ) ) return;
            this.context.video.currentTime = this.context.video.duration / 100 * parseFloat( progress.value );
        });
    }

    /**
     * Set interactive state
     * @public
     * @param {boolean} state - Interactive state
     * @return {void}
     */
    interactive( state ) {
        const progress = this.context.getDomRefs('progress.input', false);
        if ( progress ) {
            progress[ ( !state ? 'set' : 'remove' ) + 'Attribute' ]( 'readonly', '' );
            progress.readonly = !state;
        }
        this.context.config.set( 'progress.interactive', !state );
    }

    /**
     * Set CSS custom properties
     * @private
     * @param {number} percent - Percent played
     * @return {void}
     */
    #set_cssprop( percent ) {
        const decimals = this.context.config.get( 'progress.decimals.cssprop' );
        if ( decimals !== null ) percent = round( percent, decimals )
        this.context.dom.style.setProperty( '--ui-video-progress-percent', percent + '%' );
        this.context.dom.style.setProperty( '--ui-video-progress-number', percent );
    }

    /**
     * Set input range value
     * @private
     * @param {HTMLInputElement} progress - Input range element
     * @param {number} percent - Percent played
     * @return {void}
     */
    #set_progress( progress, percent ) {
        const decimals = this.context.config.get( 'progress.decimals.value' );
        if ( decimals !== null ) percent = round( percent, decimals )
        progress.setAttribute( 'value', percent );
        progress.value = percent;
    }

    /**
     * Set label text
     * @param {HTMLElement} label - Label element
     * @param {number} percent - Percent played
     * @return {void}
     */
    #set_label( label, percent ) {
        const decimals = this.context.config.get( 'progress.decimals.label' );
        if ( decimals !== null ) percent = round( percent, decimals )
        label.innerText = percent;
    }

    /**
     * Event video.source.unset video.source.set timeupdate
     * @private
     * @param {boolean} available - If a source is available
     * @return {void}
     */
    #event_timeupdate( available = true ) {
        const cssprop = this.context.config.get( 'progress.cssprop' );
        const progress = this.context.getDomRefs('progress.input', false);
        const label = this.context.getDomRefs('progress.label', false);

        // Update progress position
        if ( cssprop || progress || label ) {

            // Calculate percentage and ensure the value is a valid number
            let percent = available ? this.context.video.currentTime / this.context.video.duration * 100 : 0;
                percent = !Number.isNaN( percent ) ? percent : 0;

            // Set css custom property percentage values
            if ( cssprop ) this.#set_cssprop( percent );

            // Set progress element value state
            if ( progress ) this.#set_progress( progress, percent );

            // Set label percent number with rounded decimals
            if ( label ) this.#set_label( label, percent );
        }
    }
}
