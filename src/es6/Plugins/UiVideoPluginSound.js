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
                    control : '.ui-video__control--sound',
                    on : '[data-video="ctrl:mute"]',
                    off : '[data-video="ctrl:unmute"]',
                    volume : '[data-video="ctrl:volume"]',
                    trigger : '[data-video="ctrl:volumetrig"]',
                    none : '[data-video="ctrl:nosound"]',
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
        // const volumetrig = this.context.getDomRefs( 'sound.volumetrig', false );

        // Detect audio state
        this.#bind_audiostate();

        // Detect volume change
        this.#bind_volume_change( volume );

        // Has no controls
        if ( !control ) {
            if ( this.debug ) this.debug.warn( this.constructor.name + '::initComponent No sound control available' );
            return;
        }

        const sound_available = () => {
            const display = this.context.config.get( 'sound.display' );
            this.context.constructor.showControl( mute, display );
            this.context.constructor.showControl( unmute, display );
            this.context.constructor.showControl( volume, display );

            // TODO: volume trigger only required when no mute/unmute controls are available
            // this.context.constructor.showControl( volumetrig, display );
            this.context.constructor.hideControl( none, display );
            this.#match_current_state( mute, unmute );
        };
        this.context.addEventListener( 'video.sound.unknown', sound_available );
        this.context.addEventListener( 'video.sound.available', sound_available );
        this.context.addEventListener( 'video.sound.none', () => {
            const display = this.context.config.get( 'sound.display' );
            this.context.constructor.hideControl( mute, display );
            this.context.constructor.hideControl( unmute, display );
            this.context.constructor.hideControl( volume, display );

            // TODO: volume trigger only required when no mute/unmute controls are available
            // this.context.constructor.hideControl( volumetrig, display );
            this.context.constructor.showControl( none, display );
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
     * @return {void}
     */
    #bind_volume_change( mute, unmute, volume ) {
        this.context.video.addEventListener( 'volumechange', () => {
            this.#set_cssprop( this.context.video.volume * 100 );
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

    #match_current_state( mute, unmute, volume ) {
        const below_muted_max = this.context.video.volume * 100 <= this.context.config.get( 'sound.mutedmax' );
        if ( below_muted_max || this.context.video.muted ) {
            this.#state_mute( mute, unmute, volume );
        } else {
            this.#state_unmute( mute, unmute, volume );
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

        /**
         * Prevent click events from bubbling to anywhere else
         *  to avoid conflicts with other underlying events
         * @private
         * @return {void}
         */
        volume.addEventListener( 'click', ( event ) => {
            event.stopPropagation();
        });

        // Set initial volume
        volume.value = this.context.video.muted ? 0 : this.context.video.volume * 100;

        // Let everyone know the volume was updated
        volume.dispatchEvent( new Event( 'change' ) );
    }

    /**
     * Mute sound state
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

    #state_unmute( mute, unmute ) {
        this.context.states.unset( 'muted' );
        if ( mute && unmute ) {
            const display = this.context.config.get( 'sound.display' );
            this.context.constructor.hideControl( unmute, display );
            this.context.constructor.showControl( mute, display );
        }
    }

    isMuted() {
        const below_muted_max = this.context.video.volume * 100 <= this.context.config.get( 'sound.mutedmax' );
        return below_muted_max || this.context.video.muted;
    }

    mute( saveLast = true ) {
        this.#sound_mute( saveLast );
    }

    unmute() {
        this.#sound_unmute();
    }

    volume( volume ) {
        this.context.video.volume = volume / 100;
    }

    #sound_mute( saveLast ) {
        if ( saveLast ) this.#last_volume = this.context.video.volume * 100;
        this.context.video.volume = 0;
        this.context.video.muted = true;
    }

    #sound_unmute() {
        this.context.video.muted = false;
        const below_muted_max = this.#last_volume <= this.context.config.get( 'sound.mutedmax' );
        if ( below_muted_max ) this.#last_volume = this.context.config.get( 'sound.volumemin' );
        if ( this.#first_unmute && this.#last_volume <= this.context.config.get( 'sound.mutedmax' ) ) {
            this.#last_volume = this.context.config.get( 'sound.firstunmute' )
            this.#first_unmute = false;
        }
        this.context.video.volume = this.#last_volume / 100;
    }
}
