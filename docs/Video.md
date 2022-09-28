### @squirrel-forge/ui-video
> [Back to table of contents](../README.md#table-of-contents)

# Documentation
### Javascript / Video
> [Table of contents](../README.md#table-of-contents) <[ Video ]> [Plugins](Plugins.md)

## Table of contents
 - [UiVideoComponent](#uivideocomponent)

---

### UiVideoComponent
UiVideoComponent class - Video component with events and plugins support.
The component extends [UiComponent](https://github.com/squirrel-forge/ui-core/blob/main/docs/Abstracts.md#uicomponent) from [@squirrel-forge/ui-core](https://github.com/squirrel-forge/ui-core) module.

#### Component settings
Component settings might be changed or extended through plugins.
```javascript
const defaults = {

    // Allow native controls
    // @†ype {boolean}
    native : false,

    // Autoplay video
    // @†ype {boolean}
    autoplay : false,

    // Video sources
    // @type {Array<VideoSource>}
    sources : [],

    // Selected video source
    // @type {number}
    selected : 0,

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

        // Play button reference
        // @type {string}
        pause : '[data-video="ctrl:pause"]',

        // Play button reference
        // @type {string}
        replay : '[data-video="ctrl:replay"]',
    }
};
```

#### Class overview
```javascript
class UiVideoComponent extends UiComponent {
    static selector : String
    static hideControl( control ) {} // void
    static showControl( control ) {} // void
    constructor( element, settings = null, defaults = null, extend = null, states = null, plugins = null, parent = null, debug = null, init = true ) {}
    video : null|HTMLVideoElement
    selectSource( index = null ) {} // void
    setPoster( poster ) {} // void
    findSourceIndexProp( prop, value, ret = false ) {} // VideoSource|number|null
    getCurrentSource() {} // null|String
    getCurrentIndex() {} // null|Number
    setSource( source, setter = null ) {} // void
    unsetSource( poster = true, setter = null ) {} // void
}
```
For more details check the [UiVideoComponent source file](../src/es6/Video/UiVideoComponent.js).

#### Events
 - **video.source.none** - Fired after initialized when no source was selected.
 - **video.poster.set** - Fired after a new poster was set.
 - **video.poster.unset** - Fired after the current poster was removed.
 - **video.source.update** - Fired before a source is set or unset and can manipulate the source, can be prevented with event.preventDefault().
 - **video.source.before** - Fired before a new source is set.
 - **video.source.set** - Fired after a new source was set.
 - **video.source.unset** - Fired after the current source was removed.
 - **video.source.error** - Fired if a source could not be loaded for some reason.

#### Using the component
For details refer to the settings, class overview and code file mentioned above.
```javascript
import { UiVideoComponent } from '@squirrel-forge/ui-form';

// Will initialize a specific video
UiVideoComponent.make( document.querySelector( '.ui-video' ) );

// Will initialize all videos in the current document
UiVideoComponent.makeAll();
```

#### Defining sources
For details refer to type definitions in the [UiVideoComponent source file](../src/es6/Video/UiVideoComponent.js).
```javascript
const source = {
    src : 'video://source.url',
    type : 'mimetype', // Defaults to video/mp4 if not set
    poster : 'image://poster.url', // Optional poster image url
};
```

#### Source selection
If you have no sources or are using more than one source you must define which source if any should be selected initially.

Either via attribute on the component:
```html
<div data-selected="0">
```

Or by attaching to the **video.source.none** event:
```javascript
element.addEventListener( 'video.source.none', ( event ) => {
    event.detail.target.selectSource( 0 );
} );
```

#### Component markup
Following markup is required for a video.
```html
<div is="ui-video" class="ui-video" data-selected="0" data-sources='[{"src":"..."}]'>
    <div class="ui-video__wrap">
        <div class="ui-video__ratio" data-state-default="loading...">
            <div class="ui-video__controls">
                <button class="ui-video__button ui-video__button--main ui-video__button--play" type="button" data-video="ctrl:play">
                    <span class="ui-video__icon" data-icon="play"></span>
                    <span class="ui-video__label ui-video__a11yhide">Play</span>
                </button>
                <button class="ui-video__button ui-video__button--main ui-video__button--pause" type="button" data-video="ctrl:pause">
                    <span class="ui-video__icon" data-icon="pause"></span>
                    <span class="ui-video__label ui-video__a11yhide">Pause</span>
                </button>
                <button class="ui-video__button ui-video__button--main ui-video__button--replay" type="button" data-video="ctrl:replay">
                    <span class="ui-video__icon" data-icon="replay"></span>
                    <span class="ui-video__label ui-video__a11yhide">Replay</span>
                </button>
            </div>
            <video class="ui-video__player" preload="auto" playsinline></video>
        </div>
    </div>
</div>
```
Set a JSON config the following way:
```html
<div data-config='{"option":{"name":true},"optionName":true}'></div>
```
Set individual config options via following attribute syntax:
```html
<!-- Will resolve to: option.name & optionName = true -->
<div data-option-name="true"></div>
```
---

> [Table of contents](../README.md#table-of-contents) <[ Video ]> [Plugins](Plugins.md)
