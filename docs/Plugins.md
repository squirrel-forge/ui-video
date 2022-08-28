### @squirrel-forge/ui-video
> [Back to table of contents](../README.md#table-of-contents)

# Documentation
### Javascript / Plugins
> [Video](Video.md) <[ Plugins ]> [Table of contents](../README.md#table-of-contents)

## Table of contents
 - ? [UiVideoPluginAutopause](#uivideopluginautopause) // pause when outside of viewport or when another video starts playing
 - ? [UiVideoPluginPlaylist](#uivideopluginplaylist) // video selection and auto switch
 - ? [UiVideoPluginProgress](#uivideopluginprogress) // video progress control
 - ? [UiVideoPluginSound](#uivideopluginsound) // video sound control
 - ? [UiVideoPluginFullscreen](#uivideopluginfullscreen) // video fullscreen control
 - [UiVideoPluginResponsive](#uivideopluginresponsive)
 - [UiVideoPluginTracking](#uivideoplugintracking)

---

### UiVideoPluginResponsive
UiVideoPluginResponsive class - UiVideo plugin that enables responsive media query controlled sources.
The plugin extends [UiPlugin](https://github.com/squirrel-forge/ui-core/blob/main/docs/Abstracts.md#uiplugin) from [@squirrel-forge/ui-core](https://github.com/squirrel-forge/ui-core) module.
To run the plugin requires a media query handler compatible with *MediaQueryEvents* from [@squirrel-forge/mediaquery-events](https://github.com/squirrel-forge/mediaquery-events).

#### Component settings
Component settings are changed/extended as following.
```javascript
const extendConfig = {

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
```

#### Class overview
```javascript
class UiVideoPluginResponsive extends UiPlugin {
  static pluginName : String
  constructor( options, context, debug ) {}
}
```
For more details check the [UiVideoPluginResponsive source file](../src/es6/Plugins/UiVideoPluginResponsive.js).

#### Defining responsive sources
For details refer to type definitions in the [UiVideoPluginResponsive source file](../src/es6/Plugins/UiVideoPluginResponsive.js).
```javascript
const responsive_source = {
    src : 'video://source.url',
    type : 'mimetype', // Defaults to video/mp4 if not set
    poster : 'image://poster.url', // Optional poster image
    responsive : {
        '(max-width: 767px)' : { src : 'video://mobile.source.url' },
        '(min-width: 768px)' : { src : 'video://tablet-and-desktop.source.url' },
        '(min-width: 1600px)' : { src : 'video://large-screen.source.url' },
    }
};
```

---

> [Video](Video.md) <[ Plugins ]> [Table of contents](../README.md#table-of-contents)
