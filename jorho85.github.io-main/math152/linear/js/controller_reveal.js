import SlideContent from 'js/slidecontent.js'
import SlideNumber from 'js/slidenumber.js'
import JumpToSlide from 'js/jumptoslide.js'
import Backgrounds from 'js/backgrounds.js'
import AutoAnimate from 'js/autoanimate.js'
import Fragments from 'js/fragments.js'
import Overview from 'js/overview.js'
import Keyboard from 'js/keyboard.js'
import Location from 'js/location.js'
import Controls from 'js/controls.js'
import Progress from 'js/progress.js'
import Pointer from 'js/pointer.js'
import Plugins from 'js/plugins.js'
import Print from 'js/print.js'
import Touch from 'js/touch.js'
import Focus from 'js/focus.js'
import Notes from 'js/controller_notes.js'
import Playback from 'js/playback.js'
import defaultConfig from 'js/config.js'
import * as Util from 'js/util.js'
import * as Device from 'js/device.js'
import {SLIDES_SELECTOR,HORIZONTAL_SLIDES_SELECTOR,VERTICAL_SLIDES_SELECTOR,POST_MESSAGE_METHOD_BLACKLIST} from 'js/constants.js'
export const VERSION = '4.5.0';
export default function( revealElement, options ) {
	if(arguments.length < 2) {
		options = arguments[0];
		revealElement = document.querySelector( '.reveal' );
	}
	const Reveal = {};
	let config = {},
		ready = false,
		indexh,
		indexv,
		previousSlide,
		currentSlide,
		navigationHistory = {hasNavigatedHorizontally: false,hasNavigatedVertically: false},
		state = [],
		scale = 1,
		slidesTransform = { layout: '', overview: '' },
		dom = {},
		eventsAreBound = false,
		transition = 'idle',
		autoSlide = 0,
		autoSlidePlayer,
		autoSlideTimeout = 0,
		autoSlideStartTime = -1,
		autoSlidePaused = false,
		slideContent = new SlideContent( Reveal ),
		slideNumber = new SlideNumber( Reveal ),
		jumpToSlide = new JumpToSlide( Reveal ),
		autoAnimate = new AutoAnimate( Reveal ),
		backgrounds = new Backgrounds( Reveal ),
		fragments = new Fragments( Reveal ),
		overview = new Overview( Reveal ),
		keyboard = new Keyboard( Reveal ),
		location = new Location( Reveal ),
		controls = new Controls( Reveal ),
		progress = new Progress( Reveal ),
		pointer = new Pointer( Reveal ),
		plugins = new Plugins( Reveal ),
		print = new Print( Reveal ),
		focus = new Focus( Reveal ),
		touch = new Touch( Reveal ),
		notes = new Notes( Reveal );
	function initialize( initOptions ) {
		if( !revealElement ) throw 'Unable to find presentation root (<div class="reveal">).';
		dom.wrapper = revealElement;
		dom.slides = revealElement.querySelector( '.slides' );
		if( !dom.slides ) throw 'Unable to find slides container (<div class="slides">).';
		config = { ...defaultConfig, ...config, ...options, ...initOptions, ...Util.getQueryHash() };
		setViewport();
		window.addEventListener( 'load', layout, false );
		plugins.load( config.plugins, config.dependencies ).then( start );
		return new Promise( resolve => Reveal.on( 'ready', resolve ) );
	}
	function setViewport() {
		if( config.embedded === true ) {
			dom.viewport = Util.closest( revealElement, '.reveal-viewport' ) || revealElement;
		}
		else {
			dom.viewport = document.body;
			document.documentElement.classList.add( 'reveal-full-page' );
		}
		dom.viewport.classList.add( 'reveal-viewport' );
	}
	function start() {
		ready = true;
		removeHiddenSlides();
		setupDOM();
		setupPostMessage();
		setupScrollPrevention();
		setupFullscreen();
		resetVerticalSlides();
		configure();
		location.readURL();
		backgrounds.update( true );
		setTimeout( () => {
			dom.slides.classList.remove( 'no-transition' );
			dom.wrapper.classList.add( 'ready' );
			dispatchEvent({
				type: 'ready',
				data: {indexh,indexv,currentSlide}
			});
		}, 1 );
		if( print.isPrintingPDF() ) {
			removeEventListeners();
			if( document.readyState === 'complete' ) {
				print.setupPDF();
			}
			else {
				window.addEventListener( 'load', () => {
					print.setupPDF();
				} );
			}
		}
	}
	function removeHiddenSlides() {
		if( !config.showHiddenSlides ) {
			Util.queryAll( dom.wrapper, 'section[data-visibility="hidden"]' ).forEach( slide => {
				slide.parentNode.removeChild( slide );
			} );
		}
	}
	function setupDOM() {
		dom.slides.classList.add( 'no-transition' );
		if( Device.isMobile ) {
			dom.wrapper.classList.add( 'no-hover' );
		}
		else {
			dom.wrapper.classList.remove( 'no-hover' );
		}
		backgrounds.render();
		slideNumber.render();
		jumpToSlide.render();
		controls.render();
		progress.render();
		notes.render();
		dom.pauseOverlay = Util.createSingletonNode( dom.wrapper, 'div', 'pause-overlay', config.controls ? '<button class="resume-button">Resume presentation</button>' : null );
		dom.statusElement = createStatusElement();
		dom.wrapper.setAttribute( 'role', 'application' );
	}
	function createStatusElement() {
		let statusElement = dom.wrapper.querySelector( '.aria-status' );
		if( !statusElement ) {
			statusElement = document.createElement( 'div' );
			statusElement.style.position = 'absolute';
			statusElement.style.height = '1px';
			statusElement.style.width = '1px';
			statusElement.style.overflow = 'hidden';
			statusElement.style.clip = 'rect( 1px, 1px, 1px, 1px )';
			statusElement.classList.add( 'aria-status' );
			statusElement.setAttribute( 'aria-live', 'polite' );
			statusElement.setAttribute( 'aria-atomic','true' );
			dom.wrapper.appendChild( statusElement );
		}
		return statusElement;
	}
	function announceStatus( value ) {
		dom.statusElement.textContent = value;
	}
	function getStatusText( node ) {
		let text = '';
		if( node.nodeType === 3 ) {
			text += node.textContent;
		}
		else if( node.nodeType === 1 ) {
			let isAriaHidden = node.getAttribute( 'aria-hidden' );
			let isDisplayHidden = window.getComputedStyle( node )['display'] === 'none';
			if( isAriaHidden !== 'true' && !isDisplayHidden ) {
				Array.from( node.childNodes ).forEach( child => {
					text += getStatusText( child );
				} );
			}
		}
		text = text.trim();
		return text === '' ? '' : text + ' ';
	}
	function setupScrollPrevention() {
		setInterval( () => {
			if( dom.wrapper.scrollTop !== 0 || dom.wrapper.scrollLeft !== 0 ) {
				dom.wrapper.scrollTop = 0;
				dom.wrapper.scrollLeft = 0;
			}
		}, 1000 );
	}
	function setupFullscreen() {
		document.addEventListener( 'fullscreenchange', onFullscreenChange );
		document.addEventListener( 'webkitfullscreenchange', onFullscreenChange );
	}
	function setupPostMessage() {
		if( config.postMessage ) {
			window.addEventListener( 'message', onPostMessage, false );
		}
	}
	function configure( options ) {
		const oldConfig = { ...config }
		if( typeof options === 'object' ) Util.extend( config, options );
		if( Reveal.isReady() ===  false ) return;
		const numberOfSlides = dom.wrapper.querySelectorAll( SLIDES_SELECTOR ).length;
		dom.wrapper.classList.remove( oldConfig.transition );
		dom.wrapper.classList.add( config.transition );
		dom.wrapper.setAttribute( 'data-transition-speed', config.transitionSpeed );
		dom.wrapper.setAttribute( 'data-background-transition', config.backgroundTransition );
		dom.viewport.style.setProperty( '--slide-width', config.width + 'px' );
		dom.viewport.style.setProperty( '--slide-height', config.height + 'px' );
		if( config.shuffle ) {
			shuffle();
		}
		Util.toggleClass( dom.wrapper, 'embedded', config.embedded );
		Util.toggleClass( dom.wrapper, 'rtl', config.rtl );
		Util.toggleClass( dom.wrapper, 'center', config.center );
		if( config.pause === false ) {
			resume();
		}
		if( config.previewLinks ) {
			enablePreviewLinks();
			disablePreviewLinks( '[data-preview-link=false]' );
		}
		else {
			disablePreviewLinks();
			enablePreviewLinks( '[data-preview-link]:not([data-preview-link=false])' );
		}
		autoAnimate.reset();
		if( autoSlidePlayer ) {
			autoSlidePlayer.destroy();
			autoSlidePlayer = null;
		}
		if( numberOfSlides > 1 && config.autoSlide && config.autoSlideStoppable ) {
			autoSlidePlayer = new Playback( dom.wrapper, () => {
				return Math.min( Math.max( ( Date.now() - autoSlideStartTime ) / autoSlide, 0 ), 1 );
			} );
			autoSlidePlayer.on( 'click', onAutoSlidePlayerClick );
			autoSlidePaused = false;
		}
		if( config.navigationMode !== 'default' ) {
			dom.wrapper.setAttribute( 'data-navigation-mode', config.navigationMode );
		}
		else {
			dom.wrapper.removeAttribute( 'data-navigation-mode' );
		}
		notes.configure( config, oldConfig );
		focus.configure( config, oldConfig );
		pointer.configure( config, oldConfig );
		controls.configure( config, oldConfig );
		progress.configure( config, oldConfig );
		keyboard.configure( config, oldConfig );
		fragments.configure( config, oldConfig );
		slideNumber.configure( config, oldConfig );
		sync();
	}
	function addEventListeners() {
		eventsAreBound = true;
		window.addEventListener( 'resize', onWindowResize, false );
		if( config.touch ) touch.bind();
		if( config.keyboard ) keyboard.bind();
		if( config.progress ) progress.bind();
		if( config.respondToHashChanges ) location.bind();
		controls.bind();
		focus.bind();
		dom.slides.addEventListener( 'click', onSlidesClicked, false );
		dom.slides.addEventListener( 'transitionend', onTransitionEnd, false );
		dom.pauseOverlay.addEventListener( 'click', resume, false );
		if( config.focusBodyOnPageVisibilityChange ) {
			document.addEventListener( 'visibilitychange', onPageVisibilityChange, false );
		}
	}
	function removeEventListeners() {
		eventsAreBound = false;
		touch.unbind();
		focus.unbind();
		keyboard.unbind();
		controls.unbind();
		progress.unbind();
		location.unbind();
		window.removeEventListener( 'resize', onWindowResize, false );
		dom.slides.removeEventListener( 'click', onSlidesClicked, false );
		dom.slides.removeEventListener( 'transitionend', onTransitionEnd, false );
		dom.pauseOverlay.removeEventListener( 'click', resume, false );
	}
	function destroy() {
		removeEventListeners();
		cancelAutoSlide();
		disablePreviewLinks();
		notes.destroy();
		focus.destroy();
		plugins.destroy();
		pointer.destroy();
		controls.destroy();
		progress.destroy();
		backgrounds.destroy();
		slideNumber.destroy();
		jumpToSlide.destroy();
		document.removeEventListener( 'fullscreenchange', onFullscreenChange );
		document.removeEventListener( 'webkitfullscreenchange', onFullscreenChange );
		document.removeEventListener( 'visibilitychange', onPageVisibilityChange, false );
		window.removeEventListener( 'message', onPostMessage, false );
		window.removeEventListener( 'load', layout, false );
		if( dom.pauseOverlay ) dom.pauseOverlay.remove();
		if( dom.statusElement ) dom.statusElement.remove();
		document.documentElement.classList.remove( 'reveal-full-page' );
		dom.wrapper.classList.remove( 'ready', 'center', 'has-horizontal-slides', 'has-vertical-slides' );
		dom.wrapper.removeAttribute( 'data-transition-speed' );
		dom.wrapper.removeAttribute( 'data-background-transition' );
		dom.viewport.classList.remove( 'reveal-viewport' );
		dom.viewport.style.removeProperty( '--slide-width' );
		dom.viewport.style.removeProperty( '--slide-height' );
		dom.slides.style.removeProperty( 'width' );
		dom.slides.style.removeProperty( 'height' );
		dom.slides.style.removeProperty( 'zoom' );
		dom.slides.style.removeProperty( 'left' );
		dom.slides.style.removeProperty( 'top' );
		dom.slides.style.removeProperty( 'bottom' );
		dom.slides.style.removeProperty( 'right' );
		dom.slides.style.removeProperty( 'transform' );
		Array.from( dom.wrapper.querySelectorAll( SLIDES_SELECTOR ) ).forEach( slide => {
			slide.style.removeProperty( 'display' );
			slide.style.removeProperty( 'top' );
			slide.removeAttribute( 'hidden' );
			slide.removeAttribute( 'aria-hidden' );
		} );
	}
	function on( type, listener, useCapture ) {
		revealElement.addEventListener( type, listener, useCapture );
	}
	function off( type, listener, useCapture ) {
		revealElement.removeEventListener( type, listener, useCapture );
	}
	function transformSlides( transforms ) {
		if( typeof transforms.layout === 'string' ) slidesTransform.layout = transforms.layout;
		if( typeof transforms.overview === 'string' ) slidesTransform.overview = transforms.overview;
		if( slidesTransform.layout ) {
			Util.transformElement( dom.slides, slidesTransform.layout + ' ' + slidesTransform.overview );
		}
		else {
			Util.transformElement( dom.slides, slidesTransform.overview );
		}
	}
	function dispatchEvent({ target=dom.wrapper, type, data, bubbles=true }) {
		let event = document.createEvent( 'HTMLEvents', 1, 2 );
		event.initEvent( type, bubbles, true );
		Util.extend( event, data );
		target.dispatchEvent( event );
		if( target === dom.wrapper ) {
			dispatchPostMessage( type );
		}
		return event;
	}
	function dispatchPostMessage( type, data ) {
		if( config.postMessageEvents && window.parent !== window.self ) {
			let message = {namespace: 'reveal',eventName: type,state: getState()};
            Util.extend( message, data );
			window.parent.postMessage( JSON.stringify( message ), '*' );
		}
	}
	function enablePreviewLinks( selector = 'a' ) {
		Array.from( dom.wrapper.querySelectorAll( selector ) ).forEach( element => {
			if( /^(http|www)/gi.test( element.getAttribute( 'href' ) ) ) {
				element.addEventListener( 'click', onPreviewLinkClicked, false );
			}
		} );
	}
	function disablePreviewLinks( selector = 'a' ) {
		Array.from( dom.wrapper.querySelectorAll( selector ) ).forEach( element => {
			if( /^(http|www)/gi.test( element.getAttribute( 'href' ) ) ) {
				element.removeEventListener( 'click', onPreviewLinkClicked, false );
			}
		} );
	}
	function showPreview( url ) {
		closeOverlay();
		dom.overlay = document.createElement( 'div' );
		dom.overlay.classList.add( 'overlay' );
		dom.overlay.classList.add( 'overlay-preview' );
		dom.wrapper.appendChild( dom.overlay );
		dom.overlay.innerHTML =
			`<header>
				<a class="close" href="#"><span class="icon"></span></a>
				<a class="external" href="${url}" target="_blank"><span class="icon"></span></a>
			</header>
			<div class="spinner"></div>
			<div class="viewport">
				<iframe src="${url}"></iframe>
				<small class="viewport-inner">
					<span class="x-frame-error">Unable to load iframe. This is likely due to the site's policy (x-frame-options).</span>
				</small>
			</div>`;
		dom.overlay.querySelector( 'iframe' ).addEventListener( 'load', event => {
			dom.overlay.classList.add( 'loaded' );
		}, false );
		dom.overlay.querySelector( '.close' ).addEventListener( 'click', event => {
			closeOverlay();
			event.preventDefault();
		}, false );
		dom.overlay.querySelector( '.external' ).addEventListener( 'click', event => {
			closeOverlay();
		}, false );
	}
	function toggleHelp( override ){
		if( typeof override === 'boolean' ) {
			override ? showHelp() : closeOverlay();
		}
		else {
			if( dom.overlay ) {
				closeOverlay();
			}
			else {
				showHelp();
			}
		}
	}
	function showHelp() {
		if( config.help ) {
			closeOverlay();
			dom.overlay = document.createElement( 'div' );
			dom.overlay.classList.add( 'overlay' );
			dom.overlay.classList.add( 'overlay-help' );
			dom.wrapper.appendChild( dom.overlay );
			let html = '<p class="title">Keyboard Shortcuts</p><br/>';
			let shortcuts = keyboard.getShortcuts(),
				bindings = keyboard.getBindings();
			html += '<table><th>KEY</th><th>ACTION</th>';
			for( let key in shortcuts ) {
				html += `<tr><td>${key}</td><td>${shortcuts[ key ]}</td></tr>`;
			}
			for( let binding in bindings ) {
				if( bindings[binding].key && bindings[binding].description ) {
					html += `<tr><td>${bindings[binding].key}</td><td>${bindings[binding].description}</td></tr>`;
				}
			}
			html += '</table>';
			dom.overlay.innerHTML = `
				<header>
					<a class="close" href="#"><span class="icon"></span></a>
				</header>
				<div class="viewport">
					<div class="viewport-inner">${html}</div>
				</div>
			`;
			dom.overlay.querySelector( '.close' ).addEventListener( 'click', event => {
				closeOverlay();
				event.preventDefault();
			}, false );
		}
	}
	function closeOverlay() {
		if( dom.overlay ) {
			dom.overlay.parentNode.removeChild( dom.overlay );
			dom.overlay = null;
			return true;
		}
		return false;
	}
	function layout() {
		if( dom.wrapper && !print.isPrintingPDF() ) {
			if( !config.disableLayout ) {
				if( Device.isMobile && !config.embedded ) {
					document.documentElement.style.setProperty( '--vh', ( window.innerHeight * 0.01 ) + 'px' );
				}
				const size = getComputedSlideSize();
				const oldScale = scale;
				layoutSlideContents( config.width, config.height );
				dom.slides.style.width = size.width + 'px';
				dom.slides.style.height = size.height + 'px';
				scale = Math.min( size.presentationWidth / size.width, size.presentationHeight / size.height );
				scale = Math.max( scale, config.minScale );
				scale = Math.min( scale, config.maxScale );
				if( scale === 1 ) {
					dom.slides.style.zoom = '';
					dom.slides.style.left = '';
					dom.slides.style.top = '';
					dom.slides.style.bottom = '';
					dom.slides.style.right = '';
					transformSlides( { layout: '' } );
				}
				else {
					dom.slides.style.zoom = '';
					dom.slides.style.left = '50%';
					dom.slides.style.top = '50%';
					dom.slides.style.bottom = 'auto';
					dom.slides.style.right = 'auto';
					transformSlides( { layout: 'translate(-50%, -50%) scale('+ scale +')' } );
				}
				const slides = Array.from( dom.wrapper.querySelectorAll( SLIDES_SELECTOR ) );
				for( let i = 0, len = slides.length; i < len; i++ ) {
					const slide = slides[ i ];
					if( slide.style.display === 'none' ) {
						continue;
					}
					if( config.center || slide.classList.contains( 'center' ) ) {
						if( slide.classList.contains( 'stack' ) ) {
							slide.style.top = 0;
						}
						else {
							slide.style.top = Math.max( ( size.height - slide.scrollHeight ) / 2, 0 ) + 'px';
						}
					}
					else {
						slide.style.top = '';
					}
				}
				if( oldScale !== scale ) {
					dispatchEvent({
						type: 'resize',
						data: {oldScale,scale,size}
					});
				}
			}
			dom.viewport.style.setProperty( '--slide-scale', scale );
			progress.update();
			backgrounds.updateParallax();
			if( overview.isActive() ) {
				overview.update();
			}
		}
	}
	function layoutSlideContents( width, height ) {
		Util.queryAll( dom.slides, 'section > .stretch, section > .r-stretch' ).forEach( element => {
			let remainingHeight = Util.getRemainingHeight( element, height );
			if( /(img|video)/gi.test( element.nodeName ) ) {
				const nw = element.naturalWidth || element.videoWidth,
					  nh = element.naturalHeight || element.videoHeight;
				const es = Math.min( width / nw, remainingHeight / nh );
				element.style.width = ( nw * es ) + 'px';
				element.style.height = ( nh * es ) + 'px';
			}
			else {
				element.style.width = width + 'px';
				element.style.height = remainingHeight + 'px';
			}
		} );
	}
	function getComputedSlideSize( presentationWidth, presentationHeight ) {
		let width = config.width;
		let height = config.height;
		if( config.disableLayout ) {
			width = dom.slides.offsetWidth;
			height = dom.slides.offsetHeight;
		}
		const size = {width: width,height: height,presentationWidth: presentationWidth || dom.wrapper.offsetWidth,presentationHeight: presentationHeight || dom.wrapper.offsetHeight};
		size.presentationWidth -= ( size.presentationWidth * config.margin );
		size.presentationHeight -= ( size.presentationHeight * config.margin );
		if( typeof size.width === 'string' && /%$/.test( size.width ) ) {
			size.width = parseInt( size.width, 10 ) / 100 * size.presentationWidth;
		}
		if( typeof size.height === 'string' && /%$/.test( size.height ) ) {
			size.height = parseInt( size.height, 10 ) / 100 * size.presentationHeight;
		}
		return size;
	}
	function setPreviousVerticalIndex( stack, v ) {
		if( typeof stack === 'object' && typeof stack.setAttribute === 'function' ) {
			stack.setAttribute( 'data-previous-indexv', v || 0 );
		}
	}
	function getPreviousVerticalIndex( stack ) {
		if( typeof stack === 'object' && typeof stack.setAttribute === 'function' && stack.classList.contains( 'stack' ) ) {
			const attributeName = stack.hasAttribute( 'data-start-indexv' ) ? 'data-start-indexv' : 'data-previous-indexv';
			return parseInt( stack.getAttribute( attributeName ) || 0, 10 );
		}
		return 0;
	}
	function isVerticalSlide( slide = currentSlide ) {
		return slide && slide.parentNode && !!slide.parentNode.nodeName.match( /section/i );
	}
	function isLastVerticalSlide() {
		if( currentSlide && isVerticalSlide( currentSlide ) ) {
			if( currentSlide.nextElementSibling ) return false;
			return true;
		}
		return false;
	}
	function isFirstSlide() {
		return indexh === 0 && indexv === 0;
	}
	function isLastSlide() {
		if( currentSlide ) {
			if( currentSlide.nextElementSibling ) return false;
			if( isVerticalSlide( currentSlide ) && currentSlide.parentNode.nextElementSibling ) return false;
			return true;
		}
		return false;
	}
	function pause() {
		if( config.pause ) {
			const wasPaused = dom.wrapper.classList.contains( 'paused' );
			cancelAutoSlide();
			dom.wrapper.classList.add( 'paused' );
			if( wasPaused === false ) {
				dispatchEvent({ type: 'paused' });
			}
		}
	}
	function resume() {
		const wasPaused = dom.wrapper.classList.contains( 'paused' );
		dom.wrapper.classList.remove( 'paused' );
		cueAutoSlide();
		if( wasPaused ) {
			dispatchEvent({ type: 'resumed' });
		}
	}
	function togglePause( override ) {
		if( typeof override === 'boolean' ) {
			override ? pause() : resume();
		}
		else {
			isPaused() ? resume() : pause();
		}
	}
	function isPaused() {
		return dom.wrapper.classList.contains( 'paused' );
	}
	function toggleJumpToSlide( override ) {
		if( typeof override === 'boolean' ) {
			override ? jumpToSlide.show() : jumpToSlide.hide();
		}
		else {
			jumpToSlide.isVisible() ? jumpToSlide.hide() : jumpToSlide.show();
		}
	}
	function toggleAutoSlide( override ) {
		if( typeof override === 'boolean' ) {
			override ? resumeAutoSlide() : pauseAutoSlide();
		}
		else {
			autoSlidePaused ? resumeAutoSlide() : pauseAutoSlide();
		}
	}
	function isAutoSliding() {
		return !!( autoSlide && !autoSlidePaused );
	}
	function slide( h, v, f, origin ) {
		const slidechange = dispatchEvent({
			type: 'beforeslidechange',
			data: {indexh: h === undefined ? indexh : h,indexv: v === undefined ? indexv : v,origin}
		});
		if( slidechange.defaultPrevented ) return;
		previousSlide = currentSlide;
		const horizontalSlides = dom.wrapper.querySelectorAll( HORIZONTAL_SLIDES_SELECTOR );
		if( horizontalSlides.length === 0 ) return;
		if( v === undefined && !overview.isActive() ) {
			v = getPreviousVerticalIndex( horizontalSlides[ h ] );
		}
		if( previousSlide && previousSlide.parentNode && previousSlide.parentNode.classList.contains( 'stack' ) ) {
			setPreviousVerticalIndex( previousSlide.parentNode, indexv );
		}
		const stateBefore = state.concat();
		state.length = 0;
		let indexhBefore = indexh || 0,
			indexvBefore = indexv || 0;
		indexh = updateSlides( HORIZONTAL_SLIDES_SELECTOR, h === undefined ? indexh : h );
		indexv = updateSlides( VERTICAL_SLIDES_SELECTOR, v === undefined ? indexv : v );
		let slideChanged = ( indexh !== indexhBefore || indexv !== indexvBefore );
		if( !slideChanged ) previousSlide = null;
		let currentHorizontalSlide = horizontalSlides[ indexh ],
			currentVerticalSlides = currentHorizontalSlide.querySelectorAll( 'section' );
		currentSlide = currentVerticalSlides[ indexv ] || currentHorizontalSlide;
		let autoAnimateTransition = false;
		if( slideChanged && previousSlide && currentSlide && !overview.isActive() ) {
			if( previousSlide.hasAttribute( 'data-auto-animate' ) && currentSlide.hasAttribute( 'data-auto-animate' )
					&& previousSlide.getAttribute( 'data-auto-animate-id' ) === currentSlide.getAttribute( 'data-auto-animate-id' )
					&& !( ( indexh > indexhBefore || indexv > indexvBefore ) ? currentSlide : previousSlide ).hasAttribute( 'data-auto-animate-restart' ) ) {
				autoAnimateTransition = true;
				dom.slides.classList.add( 'disable-slide-transitions' );
			}
			transition = 'running';
		}
		updateSlidesVisibility();
		layout();
		if( overview.isActive() ) {
			overview.update();
		}
		if( typeof f !== 'undefined' ) {
			fragments.goto( f );
		}
		if( previousSlide && previousSlide !== currentSlide ) {
			previousSlide.classList.remove( 'present' );
			previousSlide.setAttribute( 'aria-hidden', 'true' );
			if( isFirstSlide() ) {
				setTimeout( () => {
					getVerticalStacks().forEach( slide => {
						setPreviousVerticalIndex( slide, 0 );
					} );
				}, 0 );
			}
		}
		stateLoop: for( let i = 0, len = state.length; i < len; i++ ) {
			for( let j = 0; j < stateBefore.length; j++ ) {
				if( stateBefore[j] === state[i] ) {
					stateBefore.splice( j, 1 );
					continue stateLoop;
				}
			}
			dom.viewport.classList.add( state[i] );
			dispatchEvent({ type: state[i] });
		}
		while( stateBefore.length ) {
			dom.viewport.classList.remove( stateBefore.pop() );
		}
		if( slideChanged ) {
			dispatchEvent({
				type: 'slidechanged',
				data: {indexh,indexv,previousSlide,currentSlide,origin}
			});
		}
		if( slideChanged || !previousSlide ) {
			slideContent.stopEmbeddedContent( previousSlide );
			slideContent.startEmbeddedContent( currentSlide );
		}
		requestAnimationFrame( () => {
			announceStatus( getStatusText( currentSlide ) );
		});
		progress.update();
		controls.update();
		notes.update();
		backgrounds.update();
		backgrounds.updateParallax();
		slideNumber.update();
		fragments.update();
		location.writeURL();
		cueAutoSlide();
		if( autoAnimateTransition ) {
			setTimeout( () => {
				dom.slides.classList.remove( 'disable-slide-transitions' );
			}, 0 );
			if( config.autoAnimate ) {
				autoAnimate.run( previousSlide, currentSlide );
			}
		}
	}
	function sync() {
		removeEventListeners();
		addEventListeners();
		layout();
		autoSlide = config.autoSlide;
		cueAutoSlide();
		backgrounds.create();
		location.writeURL();
		if( config.sortFragmentsOnSync === true ) {
			fragments.sortAll();
		}
		controls.update();
		progress.update();
		updateSlidesVisibility();
		notes.update();
		notes.updateVisibility();
		backgrounds.update( true );
		slideNumber.update();
		slideContent.formatEmbeddedContent();
		if( config.autoPlayMedia === false ) {
			slideContent.stopEmbeddedContent( currentSlide, { unloadIframes: false } );
		}
		else {
			slideContent.startEmbeddedContent( currentSlide );
		}
		if( overview.isActive() ) {
			overview.layout();
		}
	}
	function syncSlide( slide = currentSlide ) {
		backgrounds.sync( slide );
		fragments.sync( slide );
		slideContent.load( slide );
		backgrounds.update();
		notes.update();
	}
	function resetVerticalSlides() {
		getHorizontalSlides().forEach( horizontalSlide => {
			Util.queryAll( horizontalSlide, 'section' ).forEach( ( verticalSlide, y ) => {
				if( y > 0 ) {
				    verticalSlide.classList.remove( 'present' );
					verticalSlide.classList.remove( 'past' );
					verticalSlide.classList.add( 'future' );
					verticalSlide.setAttribute( 'aria-hidden', 'true' );
				}
			} );
		} );
	}
	function shuffle( slides = getHorizontalSlides() ) {
		slides.forEach( ( slide, i ) => {
			let beforeSlide = slides[ Math.floor( Math.random() * slides.length ) ];
			if( beforeSlide.parentNode === slide.parentNode ) {
				slide.parentNode.insertBefore( slide, beforeSlide );
			}
			let verticalSlides = slide.querySelectorAll( 'section' );
			if( verticalSlides.length ) {
				shuffle( verticalSlides );
			}
		} );
	}
	function updateSlides( selector, index ) {
		let slides = Util.queryAll( dom.wrapper, selector ),
			slidesLength = slides.length;
		let printMode = print.isPrintingPDF();
		let loopedForwards = false;
		let loopedBackwards = false;
		if( slidesLength ) {
			if( config.loop ) {
				if( index >= slidesLength ) loopedForwards = true;
				index %= slidesLength;
				if( index < 0 ) {
					index = slidesLength + index;
					loopedBackwards = true;
				}
			}
			index = Math.max( Math.min( index, slidesLength - 1 ), 0 );
			for( let i = 0; i < slidesLength; i++ ) {
				let element = slides[i];
				let reverse = config.rtl && !isVerticalSlide( element );
				element.classList.remove( 'past' );
				element.classList.remove( 'present' );
				element.classList.remove( 'future' );
				element.setAttribute( 'hidden', '' );
				element.setAttribute( 'aria-hidden', 'true' );
				if( element.querySelector( 'section' ) ) {
					element.classList.add( 'stack' );
				}
				if( printMode ) {
					element.classList.add( 'present' );
					continue;
				}
				if( i < index ) {
					element.classList.add( reverse ? 'future' : 'past' );
					if( config.fragments ) {
						showFragmentsIn( element );
					}
				}
				else if( i > index ) {
					element.classList.add( reverse ? 'past' : 'future' );
					if( config.fragments ) {
						hideFragmentsIn( element );
					}
				}
				else if( i === index && config.fragments ) {
					if( loopedForwards ) {
						hideFragmentsIn( element );
					}
					else if( loopedBackwards ) {
						showFragmentsIn( element );
					}
				}
			}
			let slide = slides[index];
			let wasPresent = slide.classList.contains( 'present' );
			slide.classList.add( 'present' );
			slide.removeAttribute( 'hidden' );
			slide.removeAttribute( 'aria-hidden' );
			if( !wasPresent ) {
				dispatchEvent({
					target: slide,
					type: 'visible',
					bubbles: false
				});
			}
			let slideState = slide.getAttribute( 'data-state' );
			if( slideState ) {
				state = state.concat( slideState.split( ' ' ) );
			}
		}
		else {
			index = 0;
		}
		return index;
	}
	function showFragmentsIn( container ) {
		Util.queryAll( container, '.fragment' ).forEach( fragment => {
			fragment.classList.add( 'visible' );
			fragment.classList.remove( 'current-fragment' );
		} );
	}
	function hideFragmentsIn( container ) {
		Util.queryAll( container, '.fragment.visible' ).forEach( fragment => {
			fragment.classList.remove( 'visible', 'current-fragment' );
		} );
	}
	function updateSlidesVisibility() {
		let horizontalSlides = getHorizontalSlides(),
			horizontalSlidesLength = horizontalSlides.length,
			distanceX,
			distanceY;
		if( horizontalSlidesLength && typeof indexh !== 'undefined' ) {
			let viewDistance = overview.isActive() ? 10 : config.viewDistance;
			if( Device.isMobile ) {
				viewDistance = overview.isActive() ? 6 : config.mobileViewDistance;
			}
			if( print.isPrintingPDF() ) {
				viewDistance = Number.MAX_VALUE;
			}
			for( let x = 0; x < horizontalSlidesLength; x++ ) {
				let horizontalSlide = horizontalSlides[x];
				let verticalSlides = Util.queryAll( horizontalSlide, 'section' ),
					verticalSlidesLength = verticalSlides.length;
				distanceX = Math.abs( ( indexh || 0 ) - x ) || 0;
				if( config.loop ) {
					distanceX = Math.abs( ( ( indexh || 0 ) - x ) % ( horizontalSlidesLength - viewDistance ) ) || 0;
				}
				if( distanceX < viewDistance ) {
					slideContent.load( horizontalSlide );
				}
				else {
					slideContent.unload( horizontalSlide );
				}
				if( verticalSlidesLength ) {
					let oy = getPreviousVerticalIndex( horizontalSlide );
					for( let y = 0; y < verticalSlidesLength; y++ ) {
						let verticalSlide = verticalSlides[y];
						distanceY = x === ( indexh || 0 ) ? Math.abs( ( indexv || 0 ) - y ) : Math.abs( y - oy );
						if( distanceX + distanceY < viewDistance ) {
							slideContent.load( verticalSlide );
						}
						else {
							slideContent.unload( verticalSlide );
						}
					}
				}
			}
			if( hasVerticalSlides() ) {
				dom.wrapper.classList.add( 'has-vertical-slides' );
			}
			else {
				dom.wrapper.classList.remove( 'has-vertical-slides' );
			}
			if( hasHorizontalSlides() ) {
				dom.wrapper.classList.add( 'has-horizontal-slides' );
			}
			else {
				dom.wrapper.classList.remove( 'has-horizontal-slides' );
			}
		}
	}
	function availableRoutes({ includeFragments = false } = {}) {
		let horizontalSlides = dom.wrapper.querySelectorAll( HORIZONTAL_SLIDES_SELECTOR ),
			verticalSlides = dom.wrapper.querySelectorAll( VERTICAL_SLIDES_SELECTOR );
		let routes = {
			left: indexh > 0,
			right: indexh < horizontalSlides.length - 1,
			up: indexv > 0,
			down: indexv < verticalSlides.length - 1
		};
		if( config.loop ) {
			if( horizontalSlides.length > 1 ) {
				routes.left = true;
				routes.right = true;
			}
			if( verticalSlides.length > 1 ) {
				routes.up = true;
				routes.down = true;
			}
		}
		if ( horizontalSlides.length > 1 && config.navigationMode === 'linear' ) {
			routes.right = routes.right || routes.down;
			routes.left = routes.left || routes.up;
		}
		if( includeFragments === true ) {
			let fragmentRoutes = fragments.availableRoutes();
			routes.left = routes.left || fragmentRoutes.prev;
			routes.up = routes.up || fragmentRoutes.prev;
			routes.down = routes.down || fragmentRoutes.next;
			routes.right = routes.right || fragmentRoutes.next;
		}
		if( config.rtl ) {
			let left = routes.left;
			routes.left = routes.right;
			routes.right = left;
		}
		return routes;
	}
	function getSlidePastCount( slide = currentSlide ) {
		let horizontalSlides = getHorizontalSlides();
		let pastCount = 0;
		mainLoop: for( let i = 0; i < horizontalSlides.length; i++ ) {
			let horizontalSlide = horizontalSlides[i];
			let verticalSlides = horizontalSlide.querySelectorAll( 'section' );
			for( let j = 0; j < verticalSlides.length; j++ ) {
				if( verticalSlides[j] === slide ) {
					break mainLoop;
				}
				if( verticalSlides[j].dataset.visibility !== 'uncounted' ) {
					pastCount++;
				}
			}
			if( horizontalSlide === slide ) {
				break;
			}
			if( horizontalSlide.classList.contains( 'stack' ) === false && horizontalSlide.dataset.visibility !== 'uncounted' ) {
				pastCount++;
			}
		}
		return pastCount;
	}
	function getProgress() {
		let totalCount = getTotalSlides();
		let pastCount = getSlidePastCount();
		if( currentSlide ) {
			let allFragments = currentSlide.querySelectorAll( '.fragment' );
			if( allFragments.length > 0 ) {
				let visibleFragments = currentSlide.querySelectorAll( '.fragment.visible' );
				let fragmentWeight = 0.9;
				pastCount += ( visibleFragments.length / allFragments.length ) * fragmentWeight;
			}
		}
		return Math.min( pastCount / ( totalCount - 1 ), 1 );
	}
	function getIndices( slide ) {
		let h = indexh,
			v = indexv,
            f;
		if( slide ) {
			let isVertical = isVerticalSlide( slide );
			let slideh = isVertical ? slide.parentNode : slide;
			let horizontalSlides = getHorizontalSlides();
			h = Math.max( horizontalSlides.indexOf( slideh ), 0 );
			v = undefined;
			if( isVertical ) {
				v = Math.max( Util.queryAll( slide.parentNode, 'section' ).indexOf( slide ), 0 );
			}
		}
		if( !slide && currentSlide ) {
			let hasFragments = currentSlide.querySelectorAll( '.fragment' ).length > 0;
			if( hasFragments ) {
				let currentFragment = currentSlide.querySelector( '.current-fragment' );
				if( currentFragment && currentFragment.hasAttribute( 'data-fragment-index' ) ) {
					f = parseInt( currentFragment.getAttribute( 'data-fragment-index' ), 10 );
				}
				else {
					f = currentSlide.querySelectorAll( '.fragment.visible' ).length - 1;
				}
			}
		}
		return { h, v, f };
	}
	function getSlides() {
		return Util.queryAll( dom.wrapper, SLIDES_SELECTOR + ':not(.stack):not([data-visibility="uncounted"])' );

	}
	function getHorizontalSlides() {
		return Util.queryAll( dom.wrapper, HORIZONTAL_SLIDES_SELECTOR );
	}
	function getVerticalSlides() {
		return Util.queryAll( dom.wrapper, '.slides>section>section' );
	}
	function getVerticalStacks() {
		return Util.queryAll( dom.wrapper, HORIZONTAL_SLIDES_SELECTOR + '.stack');
	}
	function hasHorizontalSlides() {
		return getHorizontalSlides().length > 1;
	}
	function hasVerticalSlides() {
		return getVerticalSlides().length > 1;
	}
	function getSlidesAttributes() {
		return getSlides().map( slide => {
			let attributes = {};
			for( let i = 0; i < slide.attributes.length; i++ ) {
				let attribute = slide.attributes[ i ];
				attributes[ attribute.name ] = attribute.value;
			}
			return attributes;
		} );
	}
	function getTotalSlides() {
		return getSlides().length;
	}
	function getSlide( x, y ) {
		let horizontalSlide = getHorizontalSlides()[ x ];
		let verticalSlides = horizontalSlide && horizontalSlide.querySelectorAll( 'section' );
		if( verticalSlides && verticalSlides.length && typeof y === 'number' ) {
			return verticalSlides ? verticalSlides[ y ] : undefined;
		}
		return horizontalSlide;
	}
	function getSlideBackground( x, y ) {
		let slide = typeof x === 'number' ? getSlide( x, y ) : x;
		if( slide ) {
			return slide.slideBackgroundElement;
		}
		return undefined;
	}
	function getState() {
		let indices = getIndices();
		return {indexh: indices.h,indexv: indices.v,indexf: indices.f,paused: isPaused(),overview: overview.isActive()};
	}
	function setState( state ) {
		if( typeof state === 'object' ) {
			slide( Util.deserialize( state.indexh ), Util.deserialize( state.indexv ), Util.deserialize( state.indexf ) );
			let pausedFlag = Util.deserialize( state.paused ),
				overviewFlag = Util.deserialize( state.overview );
			if( typeof pausedFlag === 'boolean' && pausedFlag !== isPaused() ) {
				togglePause( pausedFlag );
			}
			if( typeof overviewFlag === 'boolean' && overviewFlag !== overview.isActive() ) {
				overview.toggle( overviewFlag );
			}
		}
	}
	function cueAutoSlide() {
		cancelAutoSlide();
		if( currentSlide && config.autoSlide !== false ) {
			let fragment = currentSlide.querySelector( '.current-fragment' );
			if( !fragment ) fragment = currentSlide.querySelector( '.fragment' );
			let fragmentAutoSlide = fragment ? fragment.getAttribute( 'data-autoslide' ) : null;
			let parentAutoSlide = currentSlide.parentNode ? currentSlide.parentNode.getAttribute( 'data-autoslide' ) : null;
			let slideAutoSlide = currentSlide.getAttribute( 'data-autoslide' );
			if( fragmentAutoSlide ) {
				autoSlide = parseInt( fragmentAutoSlide, 10 );
			}
			else if( slideAutoSlide ) {
				autoSlide = parseInt( slideAutoSlide, 10 );
			}
			else if( parentAutoSlide ) {
				autoSlide = parseInt( parentAutoSlide, 10 );
			}
			else {
				autoSlide = config.autoSlide;
				if( currentSlide.querySelectorAll( '.fragment' ).length === 0 ) {
					Util.queryAll( currentSlide, 'video, audio' ).forEach( el => {
						if( el.hasAttribute( 'data-autoplay' ) ) {
							if( autoSlide && (el.duration * 1000 / el.playbackRate ) > autoSlide ) {
								autoSlide = ( el.duration * 1000 / el.playbackRate ) + 1000;
							}
						}
					} );
				}
			}
			if( autoSlide && !autoSlidePaused && !isPaused() && !overview.isActive() && ( !isLastSlide() || fragments.availableRoutes().next || config.loop === true ) ) {
				autoSlideTimeout = setTimeout( () => {
					if( typeof config.autoSlideMethod === 'function' ) {
						config.autoSlideMethod()
					}
					else {
						navigateNext();
					}
					cueAutoSlide();
				}, autoSlide );
				autoSlideStartTime = Date.now();
			}
			if( autoSlidePlayer ) {
				autoSlidePlayer.setPlaying( autoSlideTimeout !== -1 );
			}
		}
	}
	function cancelAutoSlide() {
		clearTimeout( autoSlideTimeout );
		autoSlideTimeout = -1;
	}
	function pauseAutoSlide() {
		if( autoSlide && !autoSlidePaused ) {
			autoSlidePaused = true;
			dispatchEvent({ type: 'autoslidepaused' });
			clearTimeout( autoSlideTimeout );

			if( autoSlidePlayer ) {
				autoSlidePlayer.setPlaying( false );
			}
		}
	}
	function resumeAutoSlide() {
		if( autoSlide && autoSlidePaused ) {
			autoSlidePaused = false;
			dispatchEvent({ type: 'autoslideresumed' });
			cueAutoSlide();
		}
	}
	function navigateLeft({skipFragments=false}={}) {
		navigationHistory.hasNavigatedHorizontally = true;
		if( config.rtl ) {
			if( ( overview.isActive() || skipFragments || fragments.next() === false ) && availableRoutes().left ) {
				slide( indexh + 1, config.navigationMode === 'grid' ? indexv : undefined );
			}
		}
		else if( ( overview.isActive() || skipFragments || fragments.prev() === false ) && availableRoutes().left ) {
			slide( indexh - 1, config.navigationMode === 'grid' ? indexv : undefined );
		}
	}
	function navigateRight({skipFragments=false}={}) {
		navigationHistory.hasNavigatedHorizontally = true;
		if( config.rtl ) {
			if( ( overview.isActive() || skipFragments || fragments.prev() === false ) && availableRoutes().right ) {
				slide( indexh - 1, config.navigationMode === 'grid' ? indexv : undefined );
			}
		}
		else if( ( overview.isActive() || skipFragments || fragments.next() === false ) && availableRoutes().right ) {
			slide( indexh + 1, config.navigationMode === 'grid' ? indexv : undefined );
		}
	}
	function navigateUp({skipFragments=false}={}) {
		if( ( overview.isActive() || skipFragments || fragments.prev() === false ) && availableRoutes().up ) {
			slide( indexh, indexv - 1 );
		}
	}
	function navigateDown({skipFragments=false}={}) {
		navigationHistory.hasNavigatedVertically = true;
		if( ( overview.isActive() || skipFragments || fragments.next() === false ) && availableRoutes().down ) {
			slide( indexh, indexv + 1 );
		}
	}
	function navigatePrev({skipFragments=false}={}) {
		if( skipFragments || fragments.prev() === false ) {
			if( availableRoutes().up ) {
				navigateUp({skipFragments});
			}
			else {
				let previousSlide;
				if( config.rtl ) {
					previousSlide = Util.queryAll( dom.wrapper, HORIZONTAL_SLIDES_SELECTOR + '.future' ).pop();
				}
				else {
					previousSlide = Util.queryAll( dom.wrapper, HORIZONTAL_SLIDES_SELECTOR + '.past' ).pop();
				}
				if( previousSlide && previousSlide.classList.contains( 'stack' ) ) {
					let v = ( previousSlide.querySelectorAll( 'section' ).length - 1 ) || undefined;
					let h = indexh - 1;
					slide( h, v );
				}
				else {
					navigateLeft({skipFragments});
				}
			}
		}
	}
	function navigateNext({skipFragments=false}={}) {
		navigationHistory.hasNavigatedHorizontally = true;
		navigationHistory.hasNavigatedVertically = true;
		if( skipFragments || fragments.next() === false ) {
			let routes = availableRoutes();
			if( routes.down && routes.right && config.loop && isLastVerticalSlide() ) {
				routes.down = false;
			}
			if( routes.down ) {
				navigateDown({skipFragments});
			}
			else if( config.rtl ) {
				navigateLeft({skipFragments});
			}
			else {
				navigateRight({skipFragments});
			}
		}
	}
	function onUserInput( event ) {
		if( config.autoSlideStoppable ) {
			pauseAutoSlide();
		}
	}
	function onPostMessage( event ) {
		let data = event.data;
		if( typeof data === 'string' && data.charAt( 0 ) === '{' && data.charAt( data.length - 1 ) === '}' ) {
			data = JSON.parse( data );
			if( data.method && typeof Reveal[data.method] === 'function' ) {
				if( POST_MESSAGE_METHOD_BLACKLIST.test( data.method ) === false ) {
					const result = Reveal[data.method].apply( Reveal, data.args );
					dispatchPostMessage( 'callback', { method: data.method, result: result } );
				}
				else {
					console.warn( 'reveal.js: "'+ data.method +'" is is blacklisted from the postMessage API' );
				}
			}
		}
	}
	function onTransitionEnd( event ) {
		if( transition === 'running' && /section/gi.test( event.target.nodeName ) ) {
			transition = 'idle';
			dispatchEvent({type: 'slidetransitionend',data: {indexh, indexv, previousSlide, currentSlide}});
		}
	}
	function onSlidesClicked( event ) {
		const anchor = Util.closest( event.target, 'a[href^="#"]' );
		if( anchor ) {
			const hash = anchor.getAttribute( 'href' );
			const indices = location.getIndicesFromHash( hash );
			if( indices ) {
				Reveal.slide( indices.h, indices.v, indices.f );
				event.preventDefault();
			}
		}
	}
	function onWindowResize( event ) {
		layout();
	}
	function onPageVisibilityChange( event ) {
		if( document.hidden === false && document.activeElement !== document.body ) {
			if( typeof document.activeElement.blur === 'function' ) {
				document.activeElement.blur();
			}
			document.body.focus();
		}
	}
	function onFullscreenChange( event ) {
		let element = document.fullscreenElement || document.webkitFullscreenElement;
		if( element === dom.wrapper ) {
			event.stopImmediatePropagation();
			setTimeout( () => {
				Reveal.layout();
				Reveal.focus.focus(); // focus.focus :'(
			}, 1 );
		}
	}
	function onPreviewLinkClicked( event ) {
		if( event.currentTarget && event.currentTarget.hasAttribute( 'href' ) ) {
			let url = event.currentTarget.getAttribute( 'href' );
			if( url ) {
				showPreview( url );
				event.preventDefault();
			}
		}
	}
	function onAutoSlidePlayerClick( event ) {
		if( isLastSlide() && config.loop === false ) {
			slide( 0, 0 );
			resumeAutoSlide();
		}
		else if( autoSlidePaused ) {
			resumeAutoSlide();
		}
		else {
			pauseAutoSlide();
		}
	}
	const API = {VERSION,initialize,configure,destroy,sync,syncSlide,syncFragments: fragments.sync.bind( fragments ),slide,left: navigateLeft,right: navigateRight,up: navigateUp,down: navigateDown,prev: navigatePrev,next: navigateNext,navigateLeft, navigateRight, navigateUp, navigateDown, navigatePrev, navigateNext,navigateFragment: fragments.goto.bind( fragments ),prevFragment: fragments.prev.bind( fragments ),nextFragment: fragments.next.bind( fragments ),on,off,addEventListener: on,removeEventListener: off,layout,shuffle,availableRoutes,availableFragments: fragments.availableRoutes.bind( fragments ),toggleHelp,toggleOverview: overview.toggle.bind( overview ),togglePause,toggleAutoSlide,toggleJumpToSlide,isFirstSlide,isLastSlide,isLastVerticalSlide,isVerticalSlide,isPaused,isAutoSliding,isSpeakerNotes: notes.isSpeakerNotesWindow.bind( notes ),isOverview: overview.isActive.bind( overview ),isFocused: focus.isFocused.bind( focus ),isPrintingPDF: print.isPrintingPDF.bind( print ),isReady: () => ready,loadSlide: slideContent.load.bind( slideContent ),unloadSlide: slideContent.unload.bind( slideContent ),showPreview,hidePreview: closeOverlay,addEventListeners,removeEventListeners,dispatchEvent,getState,setState,getProgress,getIndices,getSlidesAttributes,getSlidePastCount,getTotalSlides,getSlide,getPreviousSlide: () => previousSlide,getCurrentSlide: () => currentSlide,getSlideBackground,getSlideNotes: notes.getSlideNotes.bind( notes ),getSlides,getHorizontalSlides,getVerticalSlides,hasHorizontalSlides,hasVerticalSlides,hasNavigatedHorizontally: () => navigationHistory.hasNavigatedHorizontally,hasNavigatedVertically: () => navigationHistory.hasNavigatedVertically,addKeyBinding: keyboard.addKeyBinding.bind( keyboard ),removeKeyBinding: keyboard.removeKeyBinding.bind( keyboard ),triggerKey: keyboard.triggerKey.bind( keyboard ),registerKeyboardShortcut: keyboard.registerKeyboardShortcut.bind( keyboard ),getComputedSlideSize,getScale: () => scale,getConfig: () => config,getQueryHash: Util.getQueryHash,getSlidePath: location.getHash.bind( location ),getRevealElement: () => revealElement,getSlidesElement: () => dom.slides,getViewportElement: () => dom.viewport,getBackgroundsElement: () => backgrounds.element,registerPlugin: plugins.registerPlugin.bind( plugins ),hasPlugin: plugins.hasPlugin.bind( plugins ),getPlugin: plugins.getPlugin.bind( plugins ),getPlugins: plugins.getRegisteredPlugins.bind( plugins )};
	Util.extend( Reveal, {
		...API,
		announceStatus,
		getStatusText,
		print,
		focus,
		progress,
		controls,
		location,
		overview,
		fragments,
		slideContent,
		slideNumber,
		onUserInput,
		closeOverlay,
		updateSlidesVisibility,
		layoutSlideContents,
		transformSlides,
		cueAutoSlide,
		cancelAutoSlide
	} );
	return API;
};