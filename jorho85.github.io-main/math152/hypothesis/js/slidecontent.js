import { extend, queryAll, closest, getMimeTypeFromFile, encodeRFC3986URI } from 'js/util.js'
import { isMobile } from 'js/device.js'
import fitty from 'fitty';
export default class SlideContent {
	constructor( Reveal ) {
		this.Reveal = Reveal;
		this.startEmbeddedIframe = this.startEmbeddedIframe.bind( this );
	}
	shouldPreload( element ) {
		let preload = this.Reveal.getConfig().preloadIframes;
		if( typeof preload !== 'boolean' ) {
			preload = element.hasAttribute( 'data-preload' );
		}
		return preload;
	}
	load( slide, options = {} ) {
		slide.style.display = this.Reveal.getConfig().display;
		queryAll( slide, 'img[data-src], video[data-src], audio[data-src], iframe[data-src]' ).forEach( element => {
			if( element.tagName !== 'IFRAME' || this.shouldPreload( element ) ) {
				element.setAttribute( 'src', element.getAttribute( 'data-src' ) );
				element.setAttribute( 'data-lazy-loaded', '' );
				element.removeAttribute( 'data-src' );
			}
		} );
		queryAll( slide, 'video, audio' ).forEach( media => {
			let sources = 0;
			queryAll( media, 'source[data-src]' ).forEach( source => {
				source.setAttribute( 'src', source.getAttribute( 'data-src' ) );
				source.removeAttribute( 'data-src' );
				source.setAttribute( 'data-lazy-loaded', '' );
				sources += 1;
			} );
			if( isMobile && media.tagName === 'VIDEO' ) {
				media.setAttribute( 'playsinline', '' );
			}
			if( sources > 0 ) {
				media.load();
			}
		} );
		let background = slide.slideBackgroundElement;
		if( background ) {
			background.style.display = 'block';
			let backgroundContent = slide.slideBackgroundContentElement;
			let backgroundIframe = slide.getAttribute( 'data-background-iframe' );
			if( background.hasAttribute( 'data-loaded' ) === false ) {
				background.setAttribute( 'data-loaded', 'true' );
				let backgroundImage = slide.getAttribute( 'data-background-image' ),
					backgroundVideo = slide.getAttribute( 'data-background-video' ),
					backgroundVideoLoop = slide.hasAttribute( 'data-background-video-loop' ),
					backgroundVideoMuted = slide.hasAttribute( 'data-background-video-muted' );
				if( backgroundImage ) {
					if(  /^data:/.test( backgroundImage.trim() ) ) {
						backgroundContent.style.backgroundImage = `url(${backgroundImage.trim()})`;
					}
					else {
						backgroundContent.style.backgroundImage = backgroundImage.split( ',' ).map( background => {
							let decoded = decodeURI(background.trim());
							return `url(${encodeRFC3986URI(decoded)})`;
						}).join( ',' );
					}
				}
				else if ( backgroundVideo && !this.Reveal.isSpeakerNotes() ) {
					let video = document.createElement( 'video' );
					if( backgroundVideoLoop ) {
						video.setAttribute( 'loop', '' );
					}
					if( backgroundVideoMuted ) {
						video.muted = true;
					}
					if( isMobile ) {
						video.muted = true;
						video.setAttribute( 'playsinline', '' );
					}
					backgroundVideo.split( ',' ).forEach( source => {
						let type = getMimeTypeFromFile( source );
						if( type ) {
							video.innerHTML += `<source src="${source}" type="${type}">`;
						}
						else {
							video.innerHTML += `<source src="${source}">`;
						}
					} );
					backgroundContent.appendChild( video );
				}
				else if( backgroundIframe && options.excludeIframes !== true ) {
					let iframe = document.createElement( 'iframe' );
					iframe.setAttribute( 'allowfullscreen', '' );
					iframe.setAttribute( 'mozallowfullscreen', '' );
					iframe.setAttribute( 'webkitallowfullscreen', '' );
					iframe.setAttribute( 'allow', 'autoplay' );
					iframe.setAttribute( 'data-src', backgroundIframe );
					iframe.style.width  = '100%';
					iframe.style.height = '100%';
					iframe.style.maxHeight = '100%';
					iframe.style.maxWidth = '100%';
					backgroundContent.appendChild( iframe );
				}
			}
			let backgroundIframeElement = backgroundContent.querySelector( 'iframe[data-src]' );
			if( backgroundIframeElement ) {
				if( this.shouldPreload( background ) && !/autoplay=(1|true|yes)/gi.test( backgroundIframe ) ) {
					if( backgroundIframeElement.getAttribute( 'src' ) !== backgroundIframe ) {
						backgroundIframeElement.setAttribute( 'src', backgroundIframe );
					}
				}
			}
		}
		this.layout( slide );
	}
	layout( scopeElement ) {
		Array.from( scopeElement.querySelectorAll( '.r-fit-text' ) ).forEach( element => {
			fitty( element, {minSize: 24,maxSize: this.Reveal.getConfig().height * 0.8,observeMutations: false,observeWindow: false} );
		} );
	}
	unload( slide ) {
		slide.style.display = 'none';
		let background = this.Reveal.getSlideBackground( slide );
		if( background ) {
			background.style.display = 'none';
			queryAll( background, 'iframe[src]' ).forEach( element => {
				element.removeAttribute( 'src' );
			} );
		}
		queryAll( slide, 'video[data-lazy-loaded][src], audio[data-lazy-loaded][src], iframe[data-lazy-loaded][src]' ).forEach( element => {
			element.setAttribute( 'data-src', element.getAttribute( 'src' ) );
			element.removeAttribute( 'src' );
		} );
		queryAll( slide, 'video[data-lazy-loaded] source[src], audio source[src]' ).forEach( source => {
			source.setAttribute( 'data-src', source.getAttribute( 'src' ) );
			source.removeAttribute( 'src' );
		} );
	}
	formatEmbeddedContent() {
		let _appendParamToIframeSource = ( sourceAttribute, sourceURL, param ) => {
			queryAll( this.Reveal.getSlidesElement(), 'iframe['+ sourceAttribute +'*="'+ sourceURL +'"]' ).forEach( el => {
				let src = el.getAttribute( sourceAttribute );
				if( src && src.indexOf( param ) === -1 ) {
					el.setAttribute( sourceAttribute, src + ( !/\?/.test( src ) ? '?' : '&' ) + param );
				}
			});
		};
		_appendParamToIframeSource( 'src', 'youtube.com/embed/', 'enablejsapi=1' );
		_appendParamToIframeSource( 'data-src', 'youtube.com/embed/', 'enablejsapi=1' );
		_appendParamToIframeSource( 'src', 'player.vimeo.com/', 'api=1' );
		_appendParamToIframeSource( 'data-src', 'player.vimeo.com/', 'api=1' );
	}
	startEmbeddedContent( element ) {
		if( element && !this.Reveal.isSpeakerNotes() ) {
			queryAll( element, 'img[src$=".gif"]' ).forEach( el => {
				el.setAttribute( 'src', el.getAttribute( 'src' ) );
			} );
			queryAll( element, 'video, audio' ).forEach( el => {
				if( closest( el, '.fragment' ) && !closest( el, '.fragment.visible' ) ) {
					return;
				}
				let autoplay = this.Reveal.getConfig().autoPlayMedia;
				if( typeof autoplay !== 'boolean' ) {
					autoplay = el.hasAttribute( 'data-autoplay' ) || !!closest( el, '.slide-background' );
				}
				if( autoplay && typeof el.play === 'function' ) {
					if( el.readyState > 1 ) {
						this.startEmbeddedMedia( { target: el } );
					}
					else if( isMobile ) {
						let promise = el.play();
						if( promise && typeof promise.catch === 'function' && el.controls === false ) {
							promise.catch( () => {
								el.controls = true;
								el.addEventListener( 'play', () => {
									el.controls = false;
								} );
							} );
						}
					}
					else {
						el.removeEventListener( 'loadeddata', this.startEmbeddedMedia ); // remove first to avoid dupes
						el.addEventListener( 'loadeddata', this.startEmbeddedMedia );
					}
				}
			} );
			queryAll( element, 'iframe[src]' ).forEach( el => {
				if( closest( el, '.fragment' ) && !closest( el, '.fragment.visible' ) ) {
					return;
				}
				this.startEmbeddedIframe( { target: el } );
			} );
			queryAll( element, 'iframe[data-src]' ).forEach( el => {
				if( closest( el, '.fragment' ) && !closest( el, '.fragment.visible' ) ) {
					return;
				}
				if( el.getAttribute( 'src' ) !== el.getAttribute( 'data-src' ) ) {
					el.removeEventListener( 'load', this.startEmbeddedIframe ); // remove first to avoid dupes
					el.addEventListener( 'load', this.startEmbeddedIframe );
					el.setAttribute( 'src', el.getAttribute( 'data-src' ) );
				}
			} );
		}
	}
	startEmbeddedMedia( event ) {
		let isAttachedToDOM = !!closest( event.target, 'html' ),
			isVisible  		= !!closest( event.target, '.present' );
		if( isAttachedToDOM && isVisible ) {
			event.target.currentTime = 0;
			event.target.play();
		}
		event.target.removeEventListener( 'loadeddata', this.startEmbeddedMedia );
	}
	startEmbeddedIframe( event ) {
		let iframe = event.target;
		if( iframe && iframe.contentWindow ) {
			let isAttachedToDOM = !!closest( event.target, 'html' ),
				isVisible  		= !!closest( event.target, '.present' );
			if( isAttachedToDOM && isVisible ) {
				let autoplay = this.Reveal.getConfig().autoPlayMedia;
				if( typeof autoplay !== 'boolean' ) {
					autoplay = iframe.hasAttribute( 'data-autoplay' ) || !!closest( iframe, '.slide-background' );
				}
				if( /youtube\.com\/embed\//.test( iframe.getAttribute( 'src' ) ) && autoplay ) {
					iframe.contentWindow.postMessage( '{"event":"command","func":"playVideo","args":""}', '*' );
				}
				else if( /player\.vimeo\.com\//.test( iframe.getAttribute( 'src' ) ) && autoplay ) {
					iframe.contentWindow.postMessage( '{"method":"play"}', '*' );
				}
				else {
					iframe.contentWindow.postMessage( 'slide:start', '*' );
				}
			}
		}
	}
	stopEmbeddedContent( element, options = {} ) {
		options = extend( {
			unloadIframes: true
		}, options );
		if( element && element.parentNode ) {
			queryAll( element, 'video, audio' ).forEach( el => {
				if( !el.hasAttribute( 'data-ignore' ) && typeof el.pause === 'function' ) {
					el.setAttribute('data-paused-by-reveal', '');
					el.pause();
				}
			} );
			queryAll( element, 'iframe' ).forEach( el => {
				if( el.contentWindow ) el.contentWindow.postMessage( 'slide:stop', '*' );
				el.removeEventListener( 'load', this.startEmbeddedIframe );
			});
			queryAll( element, 'iframe[src*="youtube.com/embed/"]' ).forEach( el => {
				if( !el.hasAttribute( 'data-ignore' ) && el.contentWindow && typeof el.contentWindow.postMessage === 'function' ) {
					el.contentWindow.postMessage( '{"event":"command","func":"pauseVideo","args":""}', '*' );
				}
			});
			queryAll( element, 'iframe[src*="player.vimeo.com/"]' ).forEach( el => {
				if( !el.hasAttribute( 'data-ignore' ) && el.contentWindow && typeof el.contentWindow.postMessage === 'function' ) {
					el.contentWindow.postMessage( '{"method":"pause"}', '*' );
				}
			});
			if( options.unloadIframes === true ) {
				queryAll( element, 'iframe[data-src]' ).forEach( el => {
					el.setAttribute( 'src', 'about:blank' );
					el.removeAttribute( 'src' );
				} );
			}
		}
	}
}