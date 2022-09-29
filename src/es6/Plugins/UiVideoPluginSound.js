/**
 * Requires
 */
import { UiPlugin } from '@squirrel-forge/ui-core';
import {Exception, round, ucfirst} from '@squirrel-forge/ui-util';

/**
 * Ui video plugin sound exception
 * @class
 * @extends Exception
 */
class UiVideoPluginSoundException extends Exception {}

/**
 * Ui video plugin sound controls
 * @class
 * @extends UiPlugin
 */
export class UiVideoPluginSound extends UiPlugin {

    /**
     * Current sound audio state
     * @private
     * @type {null|boolean}
     */
    #state = null;

    /**
     * Might have sound state
     * @private
     * @type {null|boolean}
     */
    #has_sound = null;

    /**
     * Remember last volume setting
     * @private
     * @type {number}
     */
    #last_volume = 0;

    /**
     * Marker for first unmute action
     * @private
     * @type {boolean}
     */
    #first_unmute = true;

    /**
     * Plugin name getter
     * @public
     * @static
     * @return {string} - Plugin name
     */
    static get pluginName() {
        return 'sound';
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

            // Sound control options
            // @type {Object}
            sound : {

                // Handle controls display with js
                // @type {boolean}
                display : false,

                // Max volume as muted
                // @type {number}
                mutedmax : 0,

                // Min volume to set when unmuting and previous volume is below or equal to mutemax
                // @type {number}
                volumemin : 0,

                // Update last volume on range change event
                // @type {boolean}
                lastvolume : true,

                // Volume to set after first unmute, if muted initially
                // @type {number}
                firstunmute : 65,

                // Add css custom properties with volume number and percentage
                // @type {boolean}
                cssprop : true,

                // Percent decimals
                // @type {Object}
                decimals : {

                    // Label percent decimals for display
                    // @type {null|number}
                    label : 0,

                    // CSS custom property percent decimals
                    // @type {null|number}
                    cssprop : null,
                },
            },

            // Dom references
            // @type {Object}
            dom : {

                // Sound button references
                // @type {object}
                sound : {

                    // Sound control wrapper
                    // @type {string}
                    control : '.ui-video__control--sound',

                    // Mute toggle button
                    // @type {string}
                    on : '[data-video="ctrl:mute"]',

                    // Unmute toggle button
                    // @type {string}
                    off : '[data-video="ctrl:unmute"]',

                    // Volume input range control
                    // @type {string}
                    volume : '[data-video="ctrl:volume"]',

                    // Icon no sound available
                    // @type {string}
                    none : '[data-video="ctrl:nosound"]',

                    // Label percent display
                    // @type {string}
                    label : '[data-video="label:volume"]',
                },
            },
        };

        // Extend component states
        this.extendStates = {
            muted : { global: false, classOn : 'ui-video--muted' },
            soundUnknown : { global: false, classOn : 'ui-video--sound-unknown', unsets : [ 'soundAvailable', 'soundNone' ] },
            soundAvailable : { global: false, classOn : 'ui-video--sound-available', unsets : [ 'soundUnknown', 'soundNone' ] },
            soundNone : { global: false, classOn : 'ui-video--sound-none', unsets : [ 'soundUnknown', 'soundAvailable' ] },
        };

        // Register events
        this.registerEvents = [
            [ 'video.source.before', ( event ) => { this.#event_source_before( event ); } ],
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

        // Validate options
        const smin = this.context.config.get( 'sound.mutedmax' );
        const vmax = this.context.config.get( 'sound.volumemin' );
        if ( typeof smin !== 'number' || typeof vmax !== 'number' ) {
            throw new UiVideoPluginSoundException( 'Options sound.mutedmax and sound.volumemin must be numbers from 0 to 100' );
        }
        if ( smin > vmax ) {
            throw new UiVideoPluginSoundException( 'Options sound.mutedmax must be smaller or equal to sound.volumemin' );
        }

        // If not muted initially prevent the first unmute from setting the volume
        if ( !this.context.video.muted ) {
            this.#first_unmute = false;
        }

        // Get binding references
        const control = this.context.getDomRefs( 'sound.control', false );
        const none = this.context.getDomRefs( 'sound.none', false );
        const mute = this.context.getDomRefs( 'sound.on', false );
        const unmute = this.context.getDomRefs( 'sound.off', false );
        const volume = this.context.getDomRefs( 'sound.volume', false );
        const label = this.context.getDomRefs( 'sound.label', false );

        // Detect audio state
        this.#bind_audiostate();

        // Detect volume change
        this.#bind_volume_change( mute, unmute, volume, label );

        // Has no controls
        if ( !control ) {
            if ( this.debug ) this.debug.warn( this.constructor.name + '::initComponent No sound control available' );
            return;
        }

        /**
         * Set sound available state
         * @private
         * @return {void}
         */
        const sound_available = () => {
            const display = this.context.config.get( 'sound.display' );
            if ( mute ) this.context.constructor.showControl( mute, display );
            if ( unmute ) this.context.constructor.showControl( unmute, display );
            if ( volume ) this.context.constructor.showControl( volume, display );
            if ( none ) this.context.constructor.hideControl( none, display );
            this.#match_current_state( mute, unmute );
        };

        // Treat unknown sound availability as if sound is available
        this.context.addEventListener( 'video.sound.unknown', sound_available );
        this.context.addEventListener( 'video.sound.available', sound_available );

        /**
         * Set no sound available state
         * @private
         * @return {void}
         */
        this.context.addEventListener( 'video.sound.none', () => {
            const display = this.context.config.get( 'sound.display' );
            if ( mute ) this.context.constructor.hideControl( mute, display );
            if ( unmute ) this.context.constructor.hideControl( unmute, display );
            if ( volume ) this.context.constructor.hideControl( volume, display );
            if ( none ) this.context.constructor.showControl( none, display );
        } );

        // Bind mute/unmute toggle
        if ( mute && unmute ) {
            this.#bind_toggle( mute, unmute, volume );
        } else if ( this.debug ) {
            this.debug.warn( this.constructor.name + '::bind No mute/unmute control available' );
        }

        // Bind volume control
        if ( volume ) {
            this.#bind_volume( volume );
        } else if ( this.debug ) {
            this.debug.warn( this.constructor.name + '::bind No volume control available' );
        }
    }

    /**
     * Event video.source.before
     * @private
     * @param {Event} event - Source before event
     * @return {void}
     */
    #event_source_before( event ) {

        // Clear sound state
        this.#state = null;
        this.#has_sound = null;
    }

    /**
     * Bind audio state event dispatcher
     * @private
     * @return {void}
     */
    #bind_audiostate() {
        this.context.video.addEventListener( 'loadeddata', () => {
            let name = 'unknown';

            // Attempt to detect if there is an audio track in this source
            if ( typeof this.context.video.webkitAudioDecodedByteCount !== 'undefined' ) {
                name = this.context.video.webkitAudioDecodedByteCount > 0 ? 'available' : 'none';
            } else if ( typeof this.context.video.mozHasAudio !== 'undefined' ) {
                name = this.context.video.mozHasAudio ? 'available' : 'none';
            } else if ( typeof this.context.video.audioTracks !== 'undefined' && this.context.video.audioTracks.length ) {
                name = 'available';
            }

            // Set state
            this.#state = name;
            this.#has_sound = name !== 'none';
            this.context.states.set( 'sound' + ucfirst( name ) );

            // Dispatch sound state event
            this.context.dispatchEvent( 'video.sound.' + name );
        });
    }

    /**
     * Bind volume change event dispatcher
     * @private
     * @param {HTMLButtonElement} mute - Mute button
     * @param {HTMLButtonElement} unmute - Unmute button
     * @param {HTMLInputElement} volume - Input range control
     * @param {HTMLElement} label - Volume label
     * @return {void}
     */
    #bind_volume_change( mute, unmute, volume, label ) {
        this.context.video.addEventListener( 'volumechange', () => {
            if ( this.context.config.get( 'sound.cssprop' ) ) this.#set_cssprop( this.context.video.volume * 100 );
            if ( label ) this.#set_label( label, this.context.video.volume * 100 );
            if ( volume ) volume.value = this.context.video.volume * 100;
            const below_muted_max = this.context.video.volume * 100 <= this.context.config.get( 'sound.mutedmax' );
            if ( below_muted_max ) {
                this.context.video.muted = true;
                this.#state_mute( mute, unmute );
            } else {
                this.context.video.muted = false;
                this.#state_unmute( mute, unmute );
            }
        } );
    }

    /**
     * Set CSS custom properties
     * @private
     * @param {number} percent - Percent volume
     * @return {void}
     */
    #set_cssprop( percent ) {
        const decimals = this.context.config.get( 'sound.decimals.cssprop' );
        if ( decimals !== null ) percent = round( percent, decimals )
        this.context.dom.style.setProperty( '--ui-video-volume-percent', percent + '%' );
        this.context.dom.style.setProperty( '--ui-video-volume-number', percent );
    }

    /**
     * Set label text
     * @param {HTMLElement} label - Label element
     * @param {number} percent - Percent volume
     * @return {void}
     */
    #set_label( label, percent ) {
        const decimals = this.context.config.get( 'sound.decimals.label' );
        if ( decimals !== null ) percent = round( percent, decimals )
        label.innerText = percent;
    }

    /**
     * Match controls to current state
     * @private
     * @param {HTMLButtonElement} mute - Mute button
     * @param {HTMLButtonElement} unmute - Unmute button
     * @return {void}
     */
    #match_current_state( mute, unmute ) {
        const below_muted_max = this.context.video.volume * 100 <= this.context.config.get( 'sound.mutedmax' );
        if ( below_muted_max || this.context.video.muted ) {
            this.#state_mute( mute, unmute );
        } else {
            this.#state_unmute( mute, unmute );
        }
    }

    /**
     * Bind sound toggle
     * @private
     * @param {HTMLButtonElement} mute - Mute button
     * @param {HTMLButtonElement} unmute - Unmute button
     * @param {HTMLInputElement} volume - Input range control
     * @return {void}
     */
    #bind_toggle( mute, unmute, volume ) {
        mute.addEventListener( 'click', ( event ) => {
            event.preventDefault();
            this.#sound_mute( true );
            if ( volume ) volume.value = 0;
            mute.blur();
            if ( this.context.config.get( 'controls.refocus' ) ) unmute.focus();
        } );
        unmute.addEventListener( 'click', ( event ) => {
            event.preventDefault();
            this.#sound_unmute();
            if ( volume ) volume.value = this.context.video.volume * 100;
            unmute.blur();
            if ( this.context.config.get( 'controls.refocus' ) ) mute.focus();
        } );

        // Initial state
        this.#match_current_state( mute, unmute );
    }

    /**
     * Bind volume slider
     * @private
     * @param {HTMLInputElement} volume - Input range control
     * @return {void}
     */
    #bind_volume( volume ) {

        /**
         * Set video position after drag complete
         * @private
         * @return {void}
         */
        volume.addEventListener( 'change', () => {
            this.context.video.volume = parseFloat( volume.value ) / 100;
            if ( this.context.config.get( 'sound.lastvolume' ) ) {
                this.#last_volume = this.context.video.volume * 100;
            }
        });

        /**
         * Set video position while dragging
         * @private
         * @return {void}
         */
        volume.addEventListener( 'input', () => {
            this.context.video.volume = parseFloat( volume.value ) / 100;
        });

        // Set initial volume
        volume.value = this.context.video.muted ? 0 : this.context.video.volume * 100;

        // Let everyone know the volume was updated
        volume.dispatchEvent( new Event( 'change' ) );
    }

    /**
     * set muted state
     * @private
     * @param {HTMLButtonElement} mute - Mute button
     * @param {HTMLButtonElement} unmute - Unmute button
     * @return {void}
     */
    #state_mute( mute, unmute ) {
        this.context.states.set( 'muted' );
        if ( mute && unmute ) {
            const display = this.context.config.get( 'sound.display' );
            this.context.constructor.hideControl( mute, display );
            this.context.constructor.showControl( unmute, display );
        }
    }

    /**
     * Set unmuted state
     * @private
     * @param {HTMLButtonElement} mute - Mute button
     * @param {HTMLButtonElement} unmute - Unmute button
     * @return {void}
     */
    #state_unmute( mute, unmute ) {
        this.context.states.unset( 'muted' );
        if ( mute && unmute ) {
            const display = this.context.config.get( 'sound.display' );
            this.context.constructor.hideControl( unmute, display );
            this.context.constructor.showControl( mute, display );
        }
    }

    /**
     * Get is muted state
     * @public
     * @return {boolean} - True if muted
     */
    isMuted() {
        const below_muted_max = this.context.video.volume * 100 <= this.context.config.get( 'sound.mutedmax' );
        return below_muted_max || this.context.video.muted;
    }

    /**
     * Mute sound
     * @public
     * @param {boolean} saveLast - Update last volume saved
     * @return {void}
     */
    mute( saveLast = true ) {
        this.#sound_mute( saveLast );
    }

    /**
     * Unmute sound
     * @public
     * @return {void}
     */
    unmute() {
        this.#sound_unmute();
    }

    /**
     * Get/set volume
     * @public
     * @param {null|number} volume - Volume from 0-100
     * @return {number|void} - Returns current volume without an argument
     */
    volume( volume = null ) {

        // Return current volume if no argument is set
        if ( volume === null ) return this.context.video.volume * 100;

        // Require valid volume value
        if ( typeof volume !== 'number' || Number.isNaN( volume ) || volume < 0 || volume > 100 ) {
            throw new UiVideoPluginSoundException( 'Invalid volume value, must be a number from 0 to 100' );
        }

        // Set new volume
        this.context.video.volume = volume / 100;
    }

    /**
     * Mute sound and remember volume
     * @private
     * @param {boolean} saveLast - Update last volume saved
     * @return {void}
     */
    #sound_mute( saveLast ) {

        // Update the last volume saved
        if ( saveLast ) this.#last_volume = this.context.video.volume * 100;

        // Kill volume and set to muted
        this.context.video.volume = 0;
        this.context.video.muted = true;
    }

    /**
     * Unmute sound and set first/last volume
     * @private
     * @return {void}
     */
    #sound_unmute() {
        this.context.video.muted = false;

        // Last volume is below muted limit
        const below_muted_max = this.#last_volume <= this.context.config.get( 'sound.mutedmax' );

        // Set the min volume, by default this is 0
        if ( below_muted_max ) this.#last_volume = this.context.config.get( 'sound.volumemin' );

        // If this is the first unmute action and last volume is still in a muted state
        if ( this.#first_unmute && this.#last_volume <= this.context.config.get( 'sound.mutedmax' ) ) {

            // Set an initial unmute volume, this only happens on the first unmute for the given instance
            this.#last_volume = this.context.config.get( 'sound.firstunmute' )
            this.#first_unmute = false;
        }

        // Set the actual volume
        this.context.video.volume = this.#last_volume / 100;
    }
}
