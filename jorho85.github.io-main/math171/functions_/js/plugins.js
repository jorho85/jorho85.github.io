import {loadScript} from 'js/loader.js'
export default class Plugins {
	constructor(reveal) {
		this.Reveal = reveal;
		this.state = 'idle';
		this.registeredPlugins = {};
		this.asyncDependencies = [];
	}
	load(plugins, dependencies) {
		this.state = 'loading';
		plugins.forEach(this.registerPlugin.bind(this));
		return new Promise(resolve => {
			let scripts = [],
				scriptsToLoad = 0;
			dependencies.forEach(s => {
				if(!s.condition || s.condition()) {
					if(s.async) {
						this.asyncDependencies.push(s);
					}
					else {
						scripts.push(s);
					}
				}
			} );
			if(scripts.length) {
				scriptsToLoad = scripts.length;
				const scriptLoadedCallback = (s) => {
					if(s && typeof s.callback === 'function') s.callback();

					if(--scriptsToLoad === 0) {
						this.initPlugins().then(resolve);
					}
				};
				scripts.forEach(s => {
					if(typeof s.id === 'string') {
						this.registerPlugin(s);
						scriptLoadedCallback(s);
					}
					else if(typeof s.src === 'string') {
						loadScript( s.src, () => scriptLoadedCallback(s) );
					}
					else {
						console.warn('Unrecognized plugin format', s);
						scriptLoadedCallback();
					}
				} );
			}
			else {
				this.initPlugins().then(resolve);
			}
		} );
	}
	initPlugins() {
		return new Promise(resolve => {
			let pluginValues = Object.values(this.registeredPlugins);
			let pluginsToInitialize = pluginValues.length;
			if(pluginsToInitialize === 0) {
				this.loadAsync().then(resolve);
			}
			else {
				let initNextPlugin;
				let afterPlugInitialized = () => {
					if(--pluginsToInitialize === 0) {
						this.loadAsync().then(resolve);
					}
					else {
						initNextPlugin();
					}
				};
				let i = 0;
				initNextPlugin = () => {
					let plugin = pluginValues[i++];
					if(typeof plugin.init === 'function') {
						let promise = plugin.init(this.Reveal);
						if(promise && typeof promise.then === 'function') {
							promise.then(afterPlugInitialized);
						}
						else {
							afterPlugInitialized();
						}
					}
					else {
						afterPlugInitialized();
					}
				}
				initNextPlugin();
			}
		} )
	}
	loadAsync() {
		this.state = 'loaded';
		if(this.asyncDependencies.length) {
			this.asyncDependencies.forEach(s => {
				loadScript(s.src, s.callback);
			} );
		}
		return Promise.resolve();
	}
	registerPlugin(plugin) {
		if(arguments.length === 2 && typeof arguments[0] === 'string') {
			plugin = arguments[1];
			plugin.id = arguments[0];
		}
		else if(typeof plugin === 'function') {
			plugin = plugin();
		}
		let id = plugin.id;
		if(typeof id !== 'string') {
			console.warn('Unrecognized plugin format; can\'t find plugin.id', plugin);
		}
		else if(this.registeredPlugins[id] === undefined) {
			this.registeredPlugins[id] = plugin;
			if(this.state === 'loaded' && typeof plugin.init === 'function') {
				plugin.init(this.Reveal);
			}
		}
		else {
			console.warn('reveal.js: "' + id + '" plugin has already been registered');
		}
	}
	hasPlugin(id) {
		return !!this.registeredPlugins[id];
	}
	getPlugin(id) {
		return this.registeredPlugins[id];
	}
	getRegisteredPlugins() {
		return this.registeredPlugins;
	}
	destroy() {
		Object.values(this.registeredPlugins).forEach(plugin => {
			if(typeof plugin.destroy === 'function') {
				plugin.destroy();
			}
		} );
		this.registeredPlugins = {};
		this.asyncDependencies = [];
	}
}