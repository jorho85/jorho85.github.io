import { queryAll } from 'js/util.js'
import { isAndroid } from 'js/device.js'
export default class Controls {
	constructor( Reveal ) {
		this.Reveal = Reveal;
		this.onNavigateLeftClicked = this.onNavigateLeftClicked.bind( this );
		this.onNavigateRightClicked = this.onNavigateRightClicked.bind( this );
		this.onNavigateUpClicked = this.onNavigateUpClicked.bind( this );
		this.onNavigateDownClicked = this.onNavigateDownClicked.bind( this );
		this.onNavigatePrevClicked = this.onNavigatePrevClicked.bind( this );
		this.onNavigateNextClicked = this.onNavigateNextClicked.bind( this );
	}
	render() {
		const rtl = this.Reveal.getConfig().rtl;
		const revealElement = this.Reveal.getRevealElement();
		this.element = document.createElement( 'aside' );
		this.element.className = 'controls';
		this.element.innerHTML =
			`<button class="navigate-left" aria-label="${ rtl ? 'next slide' : 'previous slide' }"><div class="controls-arrow"></div></button>
			<button class="navigate-right" aria-label="${ rtl ? 'previous slide' : 'next slide' }"><div class="controls-arrow"></div></button>
			<button class="navigate-up" aria-label="above slide"><div class="controls-arrow"></div></button>
			<button class="navigate-down" aria-label="below slide"><div class="controls-arrow"></div></button>`;
		this.Reveal.getRevealElement().appendChild( this.element );
		this.controlsLeft = queryAll( revealElement, '.navigate-left' );
		this.controlsRight = queryAll( revealElement, '.navigate-right' );
		this.controlsUp = queryAll( revealElement, '.navigate-up' );
		this.controlsDown = queryAll( revealElement, '.navigate-down' );
		this.controlsPrev = queryAll( revealElement, '.navigate-prev' );
		this.controlsNext = queryAll( revealElement, '.navigate-next' );
		this.controlsRightArrow = this.element.querySelector( '.navigate-right' );
		this.controlsLeftArrow = this.element.querySelector( '.navigate-left' );
		this.controlsDownArrow = this.element.querySelector( '.navigate-down' );
	}
	configure( config, oldConfig ) {
		this.element.style.display = config.controls ? 'block' : 'none';
		this.element.setAttribute( 'data-controls-layout', config.controlsLayout );
		this.element.setAttribute( 'data-controls-back-arrows', config.controlsBackArrows );
	}
	bind() {
		let pointerEvents = [ 'touchstart', 'click' ];
		if( isAndroid ) {
			pointerEvents = [ 'touchstart' ];
		}
		pointerEvents.forEach( eventName => {
			this.controlsLeft.forEach( el => el.addEventListener( eventName, this.onNavigateLeftClicked, false ) );
			this.controlsRight.forEach( el => el.addEventListener( eventName, this.onNavigateRightClicked, false ) );
			this.controlsUp.forEach( el => el.addEventListener( eventName, this.onNavigateUpClicked, false ) );
			this.controlsDown.forEach( el => el.addEventListener( eventName, this.onNavigateDownClicked, false ) );
			this.controlsPrev.forEach( el => el.addEventListener( eventName, this.onNavigatePrevClicked, false ) );
			this.controlsNext.forEach( el => el.addEventListener( eventName, this.onNavigateNextClicked, false ) );
		} );
	}
	unbind() {
		[ 'touchstart', 'click' ].forEach( eventName => {
			this.controlsLeft.forEach( el => el.removeEventListener( eventName, this.onNavigateLeftClicked, false ) );
			this.controlsRight.forEach( el => el.removeEventListener( eventName, this.onNavigateRightClicked, false ) );
			this.controlsUp.forEach( el => el.removeEventListener( eventName, this.onNavigateUpClicked, false ) );
			this.controlsDown.forEach( el => el.removeEventListener( eventName, this.onNavigateDownClicked, false ) );
			this.controlsPrev.forEach( el => el.removeEventListener( eventName, this.onNavigatePrevClicked, false ) );
			this.controlsNext.forEach( el => el.removeEventListener( eventName, this.onNavigateNextClicked, false ) );
		} );
	}
	update() {
		let routes = this.Reveal.availableRoutes();
		[...this.controlsLeft, ...this.controlsRight, ...this.controlsUp, ...this.controlsDown, ...this.controlsPrev, ...this.controlsNext].forEach( node => {
			node.classList.remove( 'enabled', 'fragmented' );
			node.setAttribute( 'disabled', 'disabled' );
		} );
		if( routes.left ) this.controlsLeft.forEach( el => { el.classList.add( 'enabled' ); el.removeAttribute( 'disabled' ); } );
		if( routes.right ) this.controlsRight.forEach( el => { el.classList.add( 'enabled' ); el.removeAttribute( 'disabled' ); } );
		if( routes.up ) this.controlsUp.forEach( el => { el.classList.add( 'enabled' ); el.removeAttribute( 'disabled' ); } );
		if( routes.down ) this.controlsDown.forEach( el => { el.classList.add( 'enabled' ); el.removeAttribute( 'disabled' ); } );
		if( routes.left || routes.up ) this.controlsPrev.forEach( el => { el.classList.add( 'enabled' ); el.removeAttribute( 'disabled' ); } );
		if( routes.right || routes.down ) this.controlsNext.forEach( el => { el.classList.add( 'enabled' ); el.removeAttribute( 'disabled' ); } );
		let currentSlide = this.Reveal.getCurrentSlide();
		if( currentSlide ) {
			let fragmentsRoutes = this.Reveal.fragments.availableRoutes();
			if( fragmentsRoutes.prev ) this.controlsPrev.forEach( el => { el.classList.add( 'fragmented', 'enabled' ); el.removeAttribute( 'disabled' ); } );
			if( fragmentsRoutes.next ) this.controlsNext.forEach( el => { el.classList.add( 'fragmented', 'enabled' ); el.removeAttribute( 'disabled' ); } );
			if( this.Reveal.isVerticalSlide( currentSlide ) ) {
				if( fragmentsRoutes.prev ) this.controlsUp.forEach( el => { el.classList.add( 'fragmented', 'enabled' ); el.removeAttribute( 'disabled' ); } );
				if( fragmentsRoutes.next ) this.controlsDown.forEach( el => { el.classList.add( 'fragmented', 'enabled' ); el.removeAttribute( 'disabled' ); } );
			}
			else {
				if( fragmentsRoutes.prev ) this.controlsLeft.forEach( el => { el.classList.add( 'fragmented', 'enabled' ); el.removeAttribute( 'disabled' ); } );
				if( fragmentsRoutes.next ) this.controlsRight.forEach( el => { el.classList.add( 'fragmented', 'enabled' ); el.removeAttribute( 'disabled' ); } );
			}
		}
		if( this.Reveal.getConfig().controlsTutorial ) {
			let indices = this.Reveal.getIndices();
			if( !this.Reveal.hasNavigatedVertically() && routes.down ) {
				this.controlsDownArrow.classList.add( 'highlight' );
			}
			else {
				this.controlsDownArrow.classList.remove( 'highlight' );
				if( this.Reveal.getConfig().rtl ) {
					if( !this.Reveal.hasNavigatedHorizontally() && routes.left && indices.v === 0 ) {
						this.controlsLeftArrow.classList.add( 'highlight' );
					}
					else {
						this.controlsLeftArrow.classList.remove( 'highlight' );
					}
				} else {
					if( !this.Reveal.hasNavigatedHorizontally() && routes.right && indices.v === 0 ) {
						this.controlsRightArrow.classList.add( 'highlight' );
					}
					else {
						this.controlsRightArrow.classList.remove( 'highlight' );
					}
				}
			}
		}
	}
	destroy() {
		this.unbind();
		this.element.remove();
	}
	onNavigateLeftClicked( event ) {
		event.preventDefault();
		this.Reveal.onUserInput();
		if( this.Reveal.getConfig().navigationMode === 'linear' ) {
			this.Reveal.prev();
		}
		else {
			this.Reveal.left();
		}
	}
	onNavigateRightClicked( event ) {
		event.preventDefault();
		this.Reveal.onUserInput();
		if( this.Reveal.getConfig().navigationMode === 'linear' ) {
			this.Reveal.next();
		}
		else {
			this.Reveal.right();
		}
	}
	onNavigateUpClicked( event ) {
		event.preventDefault();
		this.Reveal.onUserInput();
		this.Reveal.up();
	}
	onNavigateDownClicked( event ) {
		event.preventDefault();
		this.Reveal.onUserInput();
		this.Reveal.down();
	}
	onNavigatePrevClicked( event ) {
		event.preventDefault();
		this.Reveal.onUserInput();
		this.Reveal.prev();
	}
	onNavigateNextClicked( event ) {
		event.preventDefault();
		this.Reveal.onUserInput();
		this.Reveal.next();
	}
}