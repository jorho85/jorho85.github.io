import { queryAll } from 'js/util.js'
import { colorToRgb, colorBrightness } from 'js/color.js'
export default class Backgrounds {
	constructor( Reveal ) {
		this.Reveal = Reveal;
	}
	render() {
		this.element = document.createElement( 'div' );
		this.element.className = 'backgrounds';
		this.Reveal.getRevealElement().appendChild( this.element );
	}
	create() {
		this.element.innerHTML = '';
		this.element.classList.add( 'no-transition' );
		this.Reveal.getHorizontalSlides().forEach( slideh => {
			let backgroundStack = this.createBackground( slideh, this.element );
			queryAll( slideh, 'section' ).forEach( slidev => {
				this.createBackground( slidev, backgroundStack );
				backgroundStack.classList.add( 'stack' );
			} );
		} );
		if( this.Reveal.getConfig().parallaxBackgroundImage ) {
			this.element.style.backgroundImage = 'url("' + this.Reveal.getConfig().parallaxBackgroundImage + '")';
			this.element.style.backgroundSize = this.Reveal.getConfig().parallaxBackgroundSize;
			this.element.style.backgroundRepeat = this.Reveal.getConfig().parallaxBackgroundRepeat;
			this.element.style.backgroundPosition = this.Reveal.getConfig().parallaxBackgroundPosition;
			setTimeout( () => {
				this.Reveal.getRevealElement().classList.add( 'has-parallax-background' );
			}, 1 );
		}
		else {
			this.element.style.backgroundImage = '';
			this.Reveal.getRevealElement().classList.remove( 'has-parallax-background' );
		}
	}
	createBackground( slide, container ) {
		let element = document.createElement( 'div' );
		element.className = 'slide-background ' + slide.className.replace( /present|past|future/, '' );
		let contentElement = document.createElement( 'div' );
		contentElement.className = 'slide-background-content';
		element.appendChild( contentElement );
		container.appendChild( element );
		slide.slideBackgroundElement = element;
		slide.slideBackgroundContentElement = contentElement;
		this.sync( slide );
		return element;
	}
	sync( slide ) {
		const element = slide.slideBackgroundElement,
			contentElement = slide.slideBackgroundContentElement;
		const data = {background: slide.getAttribute( 'data-background' ),backgroundSize: slide.getAttribute( 'data-background-size' ),backgroundImage: slide.getAttribute( 'data-background-image' ),backgroundVideo: slide.getAttribute( 'data-background-video' ),backgroundIframe: slide.getAttribute( 'data-background-iframe' ),backgroundColor: slide.getAttribute( 'data-background-color' ),backgroundGradient: slide.getAttribute( 'data-background-gradient' ),backgroundRepeat: slide.getAttribute( 'data-background-repeat' ),backgroundPosition: slide.getAttribute( 'data-background-position' ),backgroundTransition: slide.getAttribute( 'data-background-transition' ),backgroundOpacity: slide.getAttribute( 'data-background-opacity' ),};
		const dataPreload = slide.hasAttribute( 'data-preload' );
		slide.classList.remove( 'has-dark-background' );
		slide.classList.remove( 'has-light-background' );
		element.removeAttribute( 'data-loaded' );
		element.removeAttribute( 'data-background-hash' );
		element.removeAttribute( 'data-background-size' );
		element.removeAttribute( 'data-background-transition' );
		element.style.backgroundColor = '';
		contentElement.style.backgroundSize = '';
		contentElement.style.backgroundRepeat = '';
		contentElement.style.backgroundPosition = '';
		contentElement.style.backgroundImage = '';
		contentElement.style.opacity = '';
		contentElement.innerHTML = '';
		if( data.background ) {
			if( /^(http|file|\/\/)/gi.test( data.background ) || /\.(svg|png|jpg|jpeg|gif|bmp|webp)([?#\s]|$)/gi.test( data.background ) ) {
				slide.setAttribute( 'data-background-image', data.background );
			}
			else {
				element.style.background = data.background;
			}
		}
		if( data.background || data.backgroundColor || data.backgroundGradient || data.backgroundImage || data.backgroundVideo || data.backgroundIframe ) {element.setAttribute( 'data-background-hash', data.background + data.backgroundSize + data.backgroundImage + data.backgroundVideo + data.backgroundIframe + data.backgroundColor + data.backgroundGradient + data.backgroundRepeat + data.backgroundPosition + data.backgroundTransition + data.backgroundOpacity );}
		if( data.backgroundSize ) element.setAttribute( 'data-background-size', data.backgroundSize );
		if( data.backgroundColor ) element.style.backgroundColor = data.backgroundColor;
		if( data.backgroundGradient ) element.style.backgroundImage = data.backgroundGradient;
		if( data.backgroundTransition ) element.setAttribute( 'data-background-transition', data.backgroundTransition );
		if( dataPreload ) element.setAttribute( 'data-preload', '' );
		if( data.backgroundSize ) contentElement.style.backgroundSize = data.backgroundSize;
		if( data.backgroundRepeat ) contentElement.style.backgroundRepeat = data.backgroundRepeat;
		if( data.backgroundPosition ) contentElement.style.backgroundPosition = data.backgroundPosition;
		if( data.backgroundOpacity ) contentElement.style.opacity = data.backgroundOpacity;
		let contrastColor = data.backgroundColor;
		if( !contrastColor || !colorToRgb( contrastColor ) ) {
			let computedBackgroundStyle = window.getComputedStyle( element );
			if( computedBackgroundStyle && computedBackgroundStyle.backgroundColor ) {
				contrastColor = computedBackgroundStyle.backgroundColor;
			}
		}
		if( contrastColor ) {
			const rgb = colorToRgb( contrastColor );
			if( rgb && rgb.a !== 0 ) {
				if( colorBrightness( contrastColor ) < 128 ) {
					slide.classList.add( 'has-dark-background' );
				}
				else {
					slide.classList.add( 'has-light-background' );
				}
			}
		}
	}
	update( includeAll = false ) {
		let currentSlide = this.Reveal.getCurrentSlide();
		let indices = this.Reveal.getIndices();
		let currentBackground = null;
		let horizontalPast = this.Reveal.getConfig().rtl ? 'future' : 'past',
			horizontalFuture = this.Reveal.getConfig().rtl ? 'past' : 'future';
		Array.from( this.element.childNodes ).forEach( ( backgroundh, h ) => {
			backgroundh.classList.remove( 'past', 'present', 'future' );
			if( h < indices.h ) {
				backgroundh.classList.add( horizontalPast );
			}
			else if ( h > indices.h ) {
				backgroundh.classList.add( horizontalFuture );
			}
			else {
				backgroundh.classList.add( 'present' );
				currentBackground = backgroundh;
			}
			if( includeAll || h === indices.h ) {
				queryAll( backgroundh, '.slide-background' ).forEach( ( backgroundv, v ) => {
					backgroundv.classList.remove( 'past', 'present', 'future' );
					if( v < indices.v ) {
						backgroundv.classList.add( 'past' );
					}
					else if ( v > indices.v ) {
						backgroundv.classList.add( 'future' );
					}
					else {
						backgroundv.classList.add( 'present' );
						if( h === indices.h ) currentBackground = backgroundv;
					}
				} );
			}
		} );
		if( this.previousBackground ) {
			this.Reveal.slideContent.stopEmbeddedContent( this.previousBackground, { unloadIframes: !this.Reveal.slideContent.shouldPreload( this.previousBackground ) } );
		}
		if( currentBackground ) {
			this.Reveal.slideContent.startEmbeddedContent( currentBackground );
			let currentBackgroundContent = currentBackground.querySelector( '.slide-background-content' );
			if( currentBackgroundContent ) {
				let backgroundImageURL = currentBackgroundContent.style.backgroundImage || '';
				if( /\.gif/i.test( backgroundImageURL ) ) {
					currentBackgroundContent.style.backgroundImage = '';
					window.getComputedStyle( currentBackgroundContent ).opacity;
					currentBackgroundContent.style.backgroundImage = backgroundImageURL;
				}
			}
			let previousBackgroundHash = this.previousBackground ? this.previousBackground.getAttribute( 'data-background-hash' ) : null;
			let currentBackgroundHash = currentBackground.getAttribute( 'data-background-hash' );
			if( currentBackgroundHash && currentBackgroundHash === previousBackgroundHash && currentBackground !== this.previousBackground ) {
				this.element.classList.add( 'no-transition' );
			}
			this.previousBackground = currentBackground;
		}
		if( currentSlide ) {
			[ 'has-light-background', 'has-dark-background' ].forEach( classToBubble => {
				if( currentSlide.classList.contains( classToBubble ) ) {
					this.Reveal.getRevealElement().classList.add( classToBubble );
				}
				else {
					this.Reveal.getRevealElement().classList.remove( classToBubble );
				}
			}, this );
		}
		setTimeout( () => {
			this.element.classList.remove( 'no-transition' );
		}, 1 );
	}
	updateParallax() {
		let indices = this.Reveal.getIndices();
		if( this.Reveal.getConfig().parallaxBackgroundImage ) {
			let horizontalSlides = this.Reveal.getHorizontalSlides(),
				verticalSlides = this.Reveal.getVerticalSlides();
			let backgroundSize = this.element.style.backgroundSize.split( ' ' ),
				backgroundWidth, backgroundHeight;
			if( backgroundSize.length === 1 ) {
				backgroundWidth = backgroundHeight = parseInt( backgroundSize[0], 10 );
			}
			else {
				backgroundWidth = parseInt( backgroundSize[0], 10 );
				backgroundHeight = parseInt( backgroundSize[1], 10 );
			}
			let slideWidth = this.element.offsetWidth,
				horizontalSlideCount = horizontalSlides.length,
				horizontalOffsetMultiplier,
				horizontalOffset;
			if( typeof this.Reveal.getConfig().parallaxBackgroundHorizontal === 'number' ) {
				horizontalOffsetMultiplier = this.Reveal.getConfig().parallaxBackgroundHorizontal;
			}
			else {
				horizontalOffsetMultiplier = horizontalSlideCount > 1 ? ( backgroundWidth - slideWidth ) / ( horizontalSlideCount-1 ) : 0;
			}
			horizontalOffset = horizontalOffsetMultiplier * indices.h * -1;
			let slideHeight = this.element.offsetHeight,
				verticalSlideCount = verticalSlides.length,verticalOffsetMultiplier,verticalOffset;
			if( typeof this.Reveal.getConfig().parallaxBackgroundVertical === 'number' ) {
				verticalOffsetMultiplier = this.Reveal.getConfig().parallaxBackgroundVertical;
			}
			else {
				verticalOffsetMultiplier = ( backgroundHeight - slideHeight ) / ( verticalSlideCount-1 );
			}
			verticalOffset = verticalSlideCount > 0 ?  verticalOffsetMultiplier * indices.v : 0;
			this.element.style.backgroundPosition = horizontalOffset + 'px ' + -verticalOffset + 'px';
		}
	}
	destroy() {
		this.element.remove();
	}
}