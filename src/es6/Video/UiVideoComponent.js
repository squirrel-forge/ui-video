/**
 * Requires
 */
import { UiComponent } from '@squirrel-forge/ui-core';
import { Exception, cloneObject, bindNodeList, isPojo } from '@squirrel-forge/ui-util';

/**
 * Ui video component exception
 * @class
 * @extends Exception
 */
class UiVideoComponentException extends Exception {}

/**
 * @typedef {Object} VideoSource
 * @property {string} src - Video source url
 * @property {string} type - Video mimetype, default: video/mp4
 * @property {string} poster - Video poster url
 */

/**
 * Ui video component
 * @class
 * @extends UiComponent
 */
export class UiVideoComponent extends UiComponent {

    /**
     * Current selected index
     * @private
     * @property
     * @type {null|number}
     */
    #current_index = null;

    /**
     * Current selected source
     * @private
     * @property
     * @type {null|HTMLSourceElement}
     */
    #current_source = null;

    /**
     * Element selector getter
     * @public
     * @return {string} - Element selector
     */
    static get selector() {
        return '[is="ui-video"]:not([data-state])';
    }

    /**
     * Constructor
     * @constructor
     * @param {HTMLElement|HTMLOListElement} element - List element
     * @param {null|Object} settings - Config object
     * @param {Object} defaults - Default config
     * @param {Array<Object>} extend - Extend default config
     * @param {Object} states - States definition
     * @param {Array<Function|Array<Function,*>>} plugins - Plugins to load
     * @param {null|UiComponent} parent - Parent object
     * @param {null|console|Object} debug - Debug object
     * @param {boolean} init - Run init method
     */
    constructor(
        element,
        settings = null,
        defaults = null,
        extend = null,
        states = null,
        plugins = null,
        parent = null,
        debug = null,
        init = true
    ) {

        /**
         * Default config
         * @type {Object}
         */
        defaults = defaults || {

            // Allow native controls
            // @†ype {boolean}
            native : false,

            // Autoplay video
            // @†ype {boolean}
            autoplay : false,

            // Video sources
            // @type {Array<VideoSource>}
            sources : [],

            // Default source mimetype
            // @type {string}
            defaulttype : 'video/mp4',

            // Initially selected video source
            // @type {null|number}
            selected : null,

            // Control settings
            // @type {Object}
            controls : {

                // Blur clicks on main control after a delay
                // @type {null|number}
                blur : 500,
            },

            // Dom references
            // @type {Object}
            dom : {

                // Video element reference
                // @type {string}
                video : 'video',

                // Video controls reference
                // @type {string}
                controls : '.ui-video__controls',

                // Play button reference
                // @type {string}
                play : '[data-video="ctrl:play"]',

                // Pause button reference
                // @type {string}
                pause : '[data-video="ctrl:pause"]',

                // Replay button reference
                // @type {string}
                replay : '[data-video="ctrl:replay"]',
            }
        };

        /**
         * Default states
         * @type {Object}
         */
        states = states || {
            initialized : { classOn : 'ui-video--initialized' },
            loading : { classOn : 'ui-video--loading', unsets : [ 'paused', 'playing', 'playable', 'error' ] },
            playable : { global : false, classOn : 'ui-video--playable', unsets : [ 'loading' ] },
            playing : { classOn : 'ui-video--playing', unsets : [ 'paused' ] },
            paused : { classOn : 'ui-video--paused', unsets : [ 'playing' ] },
            ended : { classOn : 'ui-video--ended', unsets : [ 'playing' ] },
            error : { classOn : 'ui-video--error', unsets : [ 'paused', 'playing', 'playable', 'loading' ] },
            controlsDefault : { global : false, classOn : 'ui-video--default-controls', unsets : [ 'controlsNative' ] },
            controlsNative : { global : false, classOn : 'ui-video--native-controls', unsets : [ 'controlsDefault' ] },
        };

        // Initialize parent
        super( element, settings, defaults, extend, states, plugins, parent, debug, init );
    }

    /**
     * Initialize component
     * @public
     * @return {void}
     */
    init() {

        // Require video and correct element type
        this.requireDomRefs( [ [ 'video', false ] ] );
        if ( !( this.getDomRefs( 'video', false ) instanceof HTMLVideoElement ) ) {
            throw new UiVideoComponentException( 'Dom reference "video" must be a HTMLVideoElement' );
        }

        // Bind events
        this.bind();

        // Complete init
        super.init( () => {

            // Set controls mode
            if ( this.config.get( 'native' ) ) {
                this.states.set( 'controlsNative' );
            } else {
                this.states.set( 'controlsDefault' );
            }

            // Set autoplay
            const autoplay = this.config.get( 'autoplay' );
            this.video.autoplay = autoplay;
            if ( autoplay ) this.video.muted = true;

            // Select a source if available
            const default_selected = this.config.get( 'selected' );
            if ( typeof default_selected === 'number' ) {
                this.selectSource( default_selected );
            }
        } );
    }

    /**
     * Hide control
     * @public
     * @static
     * @param {HTMLElement} control - Interactive control element
     * @return {void}
     */
    static hideControl( control ) {
        control.setAttribute( 'aria-hidden', 'true' );
        control.setAttribute( 'tabindex', -1 );
        control.style.display = 'none';
    }

    /**
     * Show control
     * @public
     * @static
     * @param {HTMLElement} control - Interactive control element
     * @return {void}
     */
    static showControl( control ) {
        control.removeAttribute( 'aria-hidden' );
        control.removeAttribute( 'tabindex' );
        control.style.display = '';
    }

    /**
     * Bind component related events
     * @public
     * @return {void}
     */
    bind() {

        // Bind video events
        bindNodeList( [ this.video ], [
            [ 'canplay', () => {
                if ( this.states.is( 'loading' ) ) {
                    this.states.set( 'playable' );
                    this.states.set( 'paused' );
                }
            } ],
            [ 'play', () => {
                this.states.set( 'playing' );
                if ( this.config.get( 'native' ) ) this.video.controls = true;
            } ],
            [ 'playing', () => {
                this.states.set( 'playing' );
                if ( this.config.get( 'native' ) ) this.video.controls = true;
            } ],
            [ 'pause', () => {
                this.states.set( 'paused' );
                if ( this.config.get( 'native' ) ) this.video.controls = false;
            } ],
            [ 'ended', () => {
                this.states.set( 'ended' );
                if ( this.config.get( 'native' ) ) this.video.controls = false;
            } ],
        ] );

        // Bind controls if available
        const controls = this.getDomRefs( 'controls', false );
        if ( controls ) {

            /**
             * Controls play/pause/replay click listener
             *  used with native = false
             * @private
             * @return {void}
             */
            controls.addEventListener( 'click', ( event ) => {

                // Ignore and prevent clicks bubbling if not playable
                if ( !this.states.is( 'playable' ) ) {
                    event.stopPropagation();
                    return;
                }

                // Play video if paused
                if ( this.video.paused ) {
                    this.video.play();

                    // Blur click focus after interaction to allow controls fadeout
                    const blur = this.config.get( 'controls.blur' );
                    if ( blur !== null ) {
                        window.setTimeout( () => { document.activeElement.blur(); }, blur );
                    }
                } else {

                    // Pause video if playing ;)
                    this.video.pause();
                }
            } );

        } else if ( this.debug ) {
            this.debug.warn( this.constructor.name + '::bind Controls not available, could not bind any events' );
        }
    }

    /**
     * Select source by index
     * @public
     * @param {null|number} index - Index to select
     * @return {void}
     */
    selectSource( index = null ) {

        // Unset if no index
        if ( index === null ) return this.unsetSource();

        // Requires a valid number
        if ( typeof index !== 'number' ) {
            throw new UiVideoComponentException( 'Argument index must be a number or null' );
        }

        // Sources not an array
        const sources = this.config.get( 'sources' );
        if ( !( sources instanceof Array ) ) {
            throw new UiVideoComponentException( 'Invalid video sources, must be an array' );
        }

        // Target index does not exist
        const source = sources[ index ] || null;
        if ( !source ) throw new UiVideoComponentException( 'Source index #' + index + ' not found' );

        // Allow plugin interception
        const data = { index, source };
        this.plugins?.run( 'selectSource', [ data ] );

        // Target or source relation was broken
        if ( !data.source || typeof data.index !== 'number' || !sources[ data.index ] ) {
            throw new UiVideoComponentException( 'Source index #' + data.index + ' not found' );
        }

        // Set selected index and source
        this.#current_index = data.index;
        this.setSource( data.source, this.constructor.name + '::selectSource' );
    }

    /**
     * Set video poster
     * @public
     * @param {null|string} poster - Video poster url
     * @return {void}
     */
    setPoster( poster = null ) {

        // Poster must be null to remove or a non empty string
        if ( !( poster === null || typeof poster === 'string' ) ) {
            throw new UiVideoComponentException( 'Argument poster must be a non empty string' );
        }
        poster = poster && !poster.length ? null : poster;

        // Set poster via attribute
        this.video[ poster ? 'setAttribute' : 'removeAttribute']( 'poster', poster );

        // Allow for any actions after a new poster was set or removed
        this.dispatchEvent( 'video.poster.' + ( poster ? 'set' : 'unset' ), { poster } );
    }

    /**
     * Get current video src attribute
     * @public
     * @return {string|null} - Current source attribute
     */
    getCurrentSource() {
        if ( this.#current_source ) return this.#current_source.getAttribute( 'src' );
        return null;
    }

    /**
     * Set video source
     * @public
     * @param {VideoSource|Object} source - Video source object
     * @param {string} setter - Optional setter origin, passed on to source.* events
     * @return {void}
     */
    setSource( source, setter = null ) {
        if ( !isPojo( source ) ) throw new UiVideoComponentException( 'Argument source must be a plain Object' );
        source = cloneObject( source, true );

        // Allow for actions, modifications or prevent setting of a new source
        if ( !this.dispatchEvent( 'video.source.update', { source, setter }, true, true ) ) return;

        // Must have a source
        if ( typeof source.src !== 'string' || !source.src.length ) {
            throw new UiVideoComponentException( 'Argument source.src must be a non empty string' );
        }

        // Prevent update if no change would be applied
        if ( source.src === this.getCurrentSource() ) return;

        // Set loading state and clear current source
        this.states.set( 'loading' );
        this.video.innerHTML = '';
        this.video.pause();

        // Set or remove poster
        this.setPoster( source.poster );

        // Create new source
        const src = document.createElement( 'source' );
        src.addEventListener( 'error', ( event ) => { this.#event_source_error( event ); } );
        src.type = source.type || this.config.get( 'defaulttype' );
        src.src = source.src;

        // Add new source and begin loading
        this.#current_source = src;
        this.video.appendChild( src );
        this.video.load();

        // Allow for any actions after a new source was set
        this.dispatchEvent( 'video.source.set', { source, setter } );
    }

    /**
     * Unset video source
     * @public
     * @param {boolean} poster - Remove poster and source
     * @param {string} setter - Optional setter origin, passed on to source.* events
     * @return {void}
     */
    unsetSource( poster = true, setter = null ) {

        // Allow for actions, modifications or prevent unsetting of the current source
        const source = null;
        if ( !this.dispatchEvent( 'video.source.update', { source, setter }, true, true ) ) return;

        // Set loading state and clear current source
        this.states.set( 'loading' );
        this.video.innerHTML = '';
        this.video.pause();

        // Remove poster if required
        if ( poster ) this.setPoster();

        // Remove index and source reference
        this.#current_index = null;
        this.#current_source = null;

        // Allow for any actions after the current source was unset
        this.dispatchEvent( 'video.source.unset', { source, setter } );
    }

    /**
     * Get video element
     * @public
     * @return {HTMLVideoElement|null}
     */
    get video() {
        return this.getDomRefs( 'video', false );
    }

    /**
     * Source error
     * @private
     * @param {Event} event - Error event
     * @return {void}
     */
    #event_source_error( event ) {
        this.states.set( 'error' );

        // Allow for any actions after source error and before exception is thrown
        this.dispatchEvent( 'video.source.error', { event } );

        // Throwing an exception has no real effect here, but is done out of principle and for notification purposes
        throw new UiVideoComponentException( 'Failed to load source: ' + this.getCurrentSource() );
    }
}
