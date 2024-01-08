import { extend, queryAll } from 'js/util.js'
export default class Fragments {
	constructor( Reveal ) {
		this.Reveal = Reveal;
	}
	configure( config, oldConfig ) {
		if( config.fragments === false ) {
			this.disable();
		}
		else if( oldConfig.fragments === false ) {
			this.enable();
		}
	}
	disable() {
		queryAll( this.Reveal.getSlidesElement(), '.fragment' ).forEach( element => {
			element.classList.add( 'visible' );
			element.classList.remove( 'current-fragment' );
		} );
	}
	enable() {
		queryAll( this.Reveal.getSlidesElement(), '.fragment' ).forEach( element => {
			element.classList.remove( 'visible' );
			element.classList.remove( 'current-fragment' );
		} );
	}
	availableRoutes() {
		let currentSlide = this.Reveal.getCurrentSlide();
		if( currentSlide && this.Reveal.getConfig().fragments ) {
			let fragments = currentSlide.querySelectorAll( '.fragment:not(.disabled)' );
			let hiddenFragments = currentSlide.querySelectorAll( '.fragment:not(.disabled):not(.visible)' );
			return {
				prev: fragments.length - hiddenFragments.length > 0,
				next: !!hiddenFragments.length
			};
		}
		else {
			return { prev: false, next: false };
		}
	}
	sort( fragments, grouped = false ) {
		fragments = Array.from( fragments );
		let ordered = [],
			unordered = [],
			sorted = [];
		fragments.forEach( fragment => {
			if( fragment.hasAttribute( 'data-fragment-index' ) ) {
				let index = parseInt( fragment.getAttribute( 'data-fragment-index' ), 10 );
				if( !ordered[index] ) {
					ordered[index] = [];
				}
				ordered[index].push( fragment );
			}
			else {
				unordered.push( [ fragment ] );
			}
		} );
		ordered = ordered.concat( unordered );
		let index = 0;
		ordered.forEach( group => {
			group.forEach( fragment => {
				sorted.push( fragment );
				fragment.setAttribute( 'data-fragment-index', index );
			} );
			index ++;
		} );
		return grouped === true ? ordered : sorted;
	}
	sortAll() {
		this.Reveal.getHorizontalSlides().forEach( horizontalSlide => {
			let verticalSlides = queryAll( horizontalSlide, 'section' );
			verticalSlides.forEach( ( verticalSlide, y ) => {
				this.sort( verticalSlide.querySelectorAll( '.fragment' ) );
			}, this );
			if( verticalSlides.length === 0 ) this.sort( horizontalSlide.querySelectorAll( '.fragment' ) );
		} );
	}
	update( index, fragments ) {
		let changedFragments = {
			shown: [],
			hidden: []
		};
		let currentSlide = this.Reveal.getCurrentSlide();
		if( currentSlide && this.Reveal.getConfig().fragments ) {
			fragments = fragments || this.sort( currentSlide.querySelectorAll( '.fragment' ) );
			if( fragments.length ) {
				let maxIndex = 0;
				if( typeof index !== 'number' ) {
					let currentFragment = this.sort( currentSlide.querySelectorAll( '.fragment.visible' ) ).pop();
					if( currentFragment ) {
						index = parseInt( currentFragment.getAttribute( 'data-fragment-index' ) || 0, 10 );
					}
				}
				Array.from( fragments ).forEach( ( el, i ) => {
					if( el.hasAttribute( 'data-fragment-index' ) ) {
						i = parseInt( el.getAttribute( 'data-fragment-index' ), 10 );
					}
					maxIndex = Math.max( maxIndex, i );
					if( i <= index ) {
						let wasVisible = el.classList.contains( 'visible' )
						el.classList.add( 'visible' );
						el.classList.remove( 'current-fragment' );
						if( i === index ) {
							this.Reveal.announceStatus( this.Reveal.getStatusText( el ) );
							el.classList.add( 'current-fragment' );
							this.Reveal.slideContent.startEmbeddedContent( el );
						}
						if( !wasVisible ) {
							changedFragments.shown.push( el )
							this.Reveal.dispatchEvent({
								target: el,
								type: 'visible',
								bubbles: false
							});
						}
					}
					else {
						let wasVisible = el.classList.contains( 'visible' )
						el.classList.remove( 'visible' );
						el.classList.remove( 'current-fragment' );
						if( wasVisible ) {
							this.Reveal.slideContent.stopEmbeddedContent( el );
							changedFragments.hidden.push( el );
							this.Reveal.dispatchEvent({
								target: el,
								type: 'hidden',
								bubbles: false
							});
						}
					}
				} );
				index = typeof index === 'number' ? index : -1;
				index = Math.max( Math.min( index, maxIndex ), -1 );
				currentSlide.setAttribute( 'data-fragment', index );
			}
		}
		return changedFragments;
	}
	sync( slide = this.Reveal.getCurrentSlide() ) {
		return this.sort( slide.querySelectorAll( '.fragment' ) );
	}
	goto( index, offset = 0 ) {
		let currentSlide = this.Reveal.getCurrentSlide();
		if( currentSlide && this.Reveal.getConfig().fragments ) {
			let fragments = this.sort( currentSlide.querySelectorAll( '.fragment:not(.disabled)' ) );
			if( fragments.length ) {
				if( typeof index !== 'number' ) {
					let lastVisibleFragment = this.sort( currentSlide.querySelectorAll( '.fragment:not(.disabled).visible' ) ).pop();
					if( lastVisibleFragment ) {
						index = parseInt( lastVisibleFragment.getAttribute( 'data-fragment-index' ) || 0, 10 );
					}
					else {
						index = -1;
					}
				}
				index += offset;
				let changedFragments = this.update( index, fragments );
				if( changedFragments.hidden.length ) {
					this.Reveal.dispatchEvent({
						type: 'fragmenthidden',
						data: {fragment: changedFragments.hidden[0],fragments: changedFragments.hidden}
					});
				}
				if( changedFragments.shown.length ) {
					this.Reveal.dispatchEvent({
						type: 'fragmentshown',
						data: {
							fragment: changedFragments.shown[0],
							fragments: changedFragments.shown
						}
					});
				}
				this.Reveal.controls.update();
				this.Reveal.progress.update();
				if( this.Reveal.getConfig().fragmentInURL ) {
					this.Reveal.location.writeURL();
				}
				return !!( changedFragments.shown.length || changedFragments.hidden.length );
			}
		}
		return false;
	}
	next() {
		return this.goto( null, 1 );
	}
	prev() {
		return this.goto( null, -1 );
	}
}