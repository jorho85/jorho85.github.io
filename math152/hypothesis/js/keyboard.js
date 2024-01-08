import {enterFullscreen} from 'js/util.js';
export default class Keyboard {
	constructor(Reveal) {
		this.Reveal = Reveal;
		this.shortcuts = {};
		this.bindings = {};
		this.onDocumentKeyDown = this.onDocumentKeyDown.bind(this);
		this.onDocumentKeyPress = this.onDocumentKeyPress.bind(this);
	}
	configure( config, oldConfig ) {
		if( config.navigationMode === 'linear' ) {
			this.shortcuts['&#8594;  ,  &#8595;  ,  SPACE  ,  N  ,  L  ,  J'] = 'Next slide';
			this.shortcuts['&#8592;  ,  &#8593;  ,  P  ,  H  ,  K'] = 'Previous slide';
		}
		else {
			this.shortcuts['N  ,  SPACE']   = 'Next slide';
			this.shortcuts['P  ,  Shift SPACE'] = 'Previous slide';
			this.shortcuts['&#8592;  ,  H'] = 'Navigate left';
			this.shortcuts['&#8594;  ,  L'] = 'Navigate right';
			this.shortcuts['&#8593;  ,  K'] = 'Navigate up';
			this.shortcuts['&#8595;  ,  J'] = 'Navigate down';
		}
		this.shortcuts['Alt + &#8592;/&#8593/&#8594;/&#8595;'] = 'Navigate without fragments';
		this.shortcuts['Shift + &#8592;/&#8593/&#8594;/&#8595;'] = 'Jump to first/last slide';
		this.shortcuts['B  ,  .'] = 'Pause';
		this.shortcuts['F'] = 'Fullscreen';
		this.shortcuts['G'] = 'Jump to slide';
		this.shortcuts['ESC, O'] = 'Slide overview';
	}
	bind() {
		document.addEventListener('keydown', this.onDocumentKeyDown, false);
		document.addEventListener('keypress', this.onDocumentKeyPress, false);
	}
	unbind() {
		document.removeEventListener('keydown', this.onDocumentKeyDown, false);
		document.removeEventListener('keypress', this.onDocumentKeyPress, false);
	}
	addKeyBinding(binding, callback) {
		if(typeof binding === 'object' && binding.keyCode) {
			this.bindings[binding.keyCode] = {callback: callback,key: binding.key,description: binding.description};
		}
		else {
			this.bindings[binding] = {callback: callback,key: null,description: null};
		}
	}
	removeKeyBinding(keyCode) {
		delete this.bindings[keyCode];
	}
	triggerKey(keyCode) {
		this.onDocumentKeyDown({keyCode});
	}
	registerKeyboardShortcut(key, value) {
		this.shortcuts[key] = value;
	}
	getShortcuts() {
		return this.shortcuts;
	}
	getBindings() {
		return this.bindings;
	}
	onDocumentKeyPress(event) {
		if(event.shiftKey && event.charCode === 63) {
			this.Reveal.toggleHelp();
		}
	}
	onDocumentKeyDown(event) {
		let config = this.Reveal.getConfig();
		if(typeof config.keyboardCondition === 'function' && config.keyboardCondition(event) === false) {
			return true;
		}
		if(config.keyboardCondition === 'focused' && !this.Reveal.isFocused()) {
			return true;
		}
		let keyCode = event.keyCode;
		let autoSlideWasPaused =!this.Reveal.isAutoSliding();
		this.Reveal.onUserInput(event);
		let activeElementIsCE = document.activeElement && document.activeElement.isContentEditable === true;
		let activeElementIsInput = document.activeElement && document.activeElement.tagName && /input|textarea/i.test( document.activeElement.tagName;
		let activeElementIsNotes = document.activeElement && document.activeElement.className && /speaker-notes/i.test( document.activeElement.className;
		let isNavigationKey = [32, 37, 38, 39, 40, 78, 80].indexOf( event.keyCode ) !== -1;
		let unusedModifier =!(isNavigationKey && event.shiftKey || event.altKey) && (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey);
		if(activeElementIsCE || activeElementIsInput || activeElementIsNotes || unusedModifier) return;
		let resumeKeyCodes = [66,86,190,191];
		let key;
		if(typeof config.keyboard === 'object') {
			for(key in config.keyboard) {
				if(config.keyboard[key] === 'togglePause') {
					resumeKeyCodes.push(parseInt(key, 10));
				}
			}
		}
		if(this.Reveal.isPaused() && resumeKeyCodes.indexOf(keyCode) === -1) {
			return false;
		}
		let useLinearMode = config.navigationMode === 'linear' || !this.Reveal.hasHorizontalSlides() || !this.Reveal.hasVerticalSlides();
		let triggered = false;
		if(typeof config.keyboard === 'object') {
			for(key in config.keyboard) {
				if(parseInt(key, 10) === keyCode) {
					let value = config.keyboard[key];
					if(typeof value === 'function') {
						value.apply(null, [event]);
					}
					else if(typeof value === 'string' && typeof this.Reveal[ value ] === 'function') {
						this.Reveal[value].call();
					}
					triggered = true;
				}
			}
		}
		if(triggered === false) {
			for(key in this.bindings) {
				if(parseInt(key, 10) === keyCode) {
					let action = this.bindings[key].callback;
					if(typeof action === 'function') {
						action.apply(null, [event]);
					}
					else if(typeof action === 'string' && typeof this.Reveal[action] === 'function') {
						this.Reveal[action].call();
					}
					triggered = true;
				}
			}
		}
		if(triggered === false) {
			triggered = true;
			if(keyCode === 80 || keyCode === 33) {
				this.Reveal.prev({skipFragments: event.altKey});
			}
			else if(keyCode === 78 || keyCode === 34) {
				this.Reveal.next({skipFragments: event.altKey});
			}
			else if(keyCode === 72 || keyCode === 37) {
				if(event.shiftKey) {
					this.Reveal.slide( 0 );
				}
				else if(!this.Reveal.overview.isActive() && useLinearMode) {
					this.Reveal.prev({skipFragments: event.altKey});
				}
				else {
					this.Reveal.left({skipFragments: event.altKey});
				}
			}
			else if(keyCode === 76 || keyCode === 39) {
				if(event.shiftKey) {
					this.Reveal.slide(this.Reveal.getHorizontalSlides().length - 1);
				}
				else if(!this.Reveal.overview.isActive() && useLinearMode) {
					this.Reveal.next({skipFragments: event.altKey});
				}
				else {
					this.Reveal.right({skipFragments: event.altKey});
				}
			}
			else if(keyCode === 75 || keyCode === 38) {
				if(event.shiftKey) {
					this.Reveal.slide(undefined, 0);
				}
				else if(!this.Reveal.overview.isActive() && useLinearMode) {
					this.Reveal.prev({skipFragments: event.altKey});
				}
				else {
					this.Reveal.up({skipFragments: event.altKey});
				}
			}
			else if(keyCode === 74 || keyCode === 40) {
				if(event.shiftKey) {
					this.Reveal.slide(undefined, Number.MAX_VALUE);
				}
				else if(!this.Reveal.overview.isActive() && useLinearMode) {
					this.Reveal.next({skipFragments: event.altKey});
				}
				else {
					this.Reveal.down({skipFragments: event.altKey});
				}
			}
			else if(keyCode === 36) {
				this.Reveal.slide( 0 );
			}
			else if(keyCode === 35) {
				this.Reveal.slide( this.Reveal.getHorizontalSlides().length - 1 );
			}
			else if(keyCode === 32) {
				if(this.Reveal.overview.isActive()) {
					this.Reveal.overview.deactivate();
				}
				if(event.shiftKey) {
					this.Reveal.prev({skipFragments: event.altKey});
				}
				else {
					this.Reveal.next({skipFragments: event.altKey});
				}
			}
			else if(keyCode === 58 || keyCode === 59 || keyCode === 66 || keyCode === 86 || keyCode === 190 || keyCode === 191) {
                this.Reveal.togglePause();
			}
			else if(keyCode === 70) {
				enterFullscreen(config.embedded ? this.Reveal.getViewportElement() : document.documentElement);
			}
			else if(keyCode === 65) {
				if (config.autoSlideStoppable) {
					this.Reveal.toggleAutoSlide(autoSlideWasPaused);
				}
			}
			else if(keyCode === 71) {
				if (config.jumpToSlide) {
					this.Reveal.toggleJumpToSlide();
				}
			}
			else {
				triggered = false;
			}
		}
		if(triggered) {
			event.preventDefault && event.preventDefault();
		}
		else if(keyCode === 27 || keyCode === 79) {
			if(this.Reveal.closeOverlay() === false) {
				this.Reveal.overview.toggle();
			}
			event.preventDefault && event.preventDefault();
		}
		this.Reveal.cueAutoSlide();
	}
}