import { SLIDES_SELECTOR } from 'js/constants.js'
import { queryAll, createStyleSheet } from 'js/util.js'
export default class Print {
	constructor( Reveal ) {
		this.Reveal = Reveal;
	}
	async setupPDF() {
		const config = this.Reveal.getConfig();
		const slides = queryAll( this.Reveal.getRevealElement(), SLIDES_SELECTOR )
		const injectPageNumbers = config.slideNumber && /all|print/i.test( config.showSlideNumber );
		const slideSize = this.Reveal.getComputedSlideSize( window.innerWidth, window.innerHeight );
		const pageWidth = Math.floor( slideSize.width * ( 1 + config.margin ) ),
              pageHeight = Math.floor( slideSize.height * ( 1 + config.margin ) );
		const slideWidth = slideSize.width,
              slideHeight = slideSize.height;
		await new Promise( requestAnimationFrame );
		createStyleSheet( '@page{size:'+ pageWidth +'px '+ pageHeight +'px; margin: 0px;}' );
		createStyleSheet( '.reveal section>img, .reveal section>video, .reveal section>iframe{max-width: '+ slideWidth +'px; max-height:'+ slideHeight +'px}' );
		document.documentElement.classList.add( 'print-pdf' );
		document.body.style.width = pageWidth + 'px';
		document.body.style.height = pageHeight + 'px';
		const viewportElement = document.querySelector( '.reveal-viewport' );
		let presentationBackground;
		if( viewportElement ) {
			const viewportStyles = window.getComputedStyle( viewportElement );
			if( viewportStyles && viewportStyles.background ) {
				presentationBackground = viewportStyles.background;
			}
		}
		await new Promise( requestAnimationFrame );
		this.Reveal.layoutSlideContents( slideWidth, slideHeight );
		await new Promise( requestAnimationFrame );
		const slideScrollHeights = slides.map( slide => slide.scrollHeight );
		const pages = [];
		const pageContainer = slides[0].parentNode;
		let slideNumber = 1;
		slides.forEach( function( slide, index ) {
			if( slide.classList.contains( 'stack' ) === false ) {
				let left = ( pageWidth - slideWidth ) / 2;
				let top = ( pageHeight - slideHeight ) / 2;
				const contentHeight = slideScrollHeights[ index ];
				let numberOfPages = Math.max( Math.ceil( contentHeight / pageHeight ), 1 );
				numberOfPages = Math.min( numberOfPages, config.pdfMaxPagesPerSlide );
				if( numberOfPages === 1 && config.center || slide.classList.contains( 'center' ) ) {
					top = Math.max( ( pageHeight - contentHeight ) / 2, 0 );
				}
				const page = document.createElement( 'div' );
				pages.push( page );
				page.className = 'pdf-page';
				page.style.height = ( ( pageHeight + config.pdfPageHeightOffset ) * numberOfPages ) + 'px';
				if( presentationBackground ) {
					page.style.background = presentationBackground;
				}
				page.appendChild( slide );
				slide.style.left = left + 'px';
				slide.style.top = top + 'px';
				slide.style.width = slideWidth + 'px';
				this.Reveal.slideContent.layout( slide );
				if( slide.slideBackgroundElement ) {
					page.insertBefore( slide.slideBackgroundElement, slide );
				}
				if( config.showNotes ) {
					const notes = this.Reveal.getSlideNotes( slide );
					if( notes ) {
						const notesSpacing = 8;
						const notesLayout = typeof config.showNotes === 'string' ? config.showNotes : 'inline';
						const notesElement = document.createElement( 'div' );
						notesElement.classList.add( 'speaker-notes' );
						notesElement.classList.add( 'speaker-notes-pdf' );
						notesElement.setAttribute( 'data-layout', notesLayout );
						notesElement.innerHTML = notes;
						if( notesLayout === 'separate-page' ) {
							pages.push( notesElement );
						}
						else {
							notesElement.style.left = notesSpacing + 'px';
							notesElement.style.bottom = notesSpacing + 'px';
							notesElement.style.width = ( pageWidth - notesSpacing*2 ) + 'px';
							page.appendChild( notesElement );
						}
					}
				}
				if( injectPageNumbers ) {
					const numberElement = document.createElement( 'div' );
					numberElement.classList.add( 'slide-number' );
					numberElement.classList.add( 'slide-number-pdf' );
					numberElement.innerHTML = slideNumber++;
					page.appendChild( numberElement );
				}
				if( config.pdfSeparateFragments ) {
					const fragmentGroups = this.Reveal.fragments.sort( page.querySelectorAll( '.fragment' ), true );
					let previousFragmentStep;
					fragmentGroups.forEach( function( fragments, index ) {
						if( previousFragmentStep ) {
							previousFragmentStep.forEach( function( fragment ) {
								fragment.classList.remove( 'current-fragment' );
							} );
						}
						fragments.forEach( function( fragment ) {
							fragment.classList.add( 'visible', 'current-fragment' );
						}, this );
						const clonedPage = page.cloneNode( true );
						if( injectPageNumbers ) {
							const numberElement = clonedPage.querySelector( '.slide-number-pdf' );
							const fragmentNumber = index + 1;
							numberElement.innerHTML += '.' + fragmentNumber;
						}
						pages.push( clonedPage );
						previousFragmentStep = fragments;
					}, this );
					fragmentGroups.forEach( function( fragments ) {
						fragments.forEach( function( fragment ) {
							fragment.classList.remove( 'visible', 'current-fragment' );
						} );
					} );
				}
				else {
					queryAll( page, '.fragment:not(.fade-out)' ).forEach( function( fragment ) {
						fragment.classList.add( 'visible' );
					} );
				}
			}
		}, this );
		await new Promise( requestAnimationFrame );
		pages.forEach( page => pageContainer.appendChild( page ) );
		this.Reveal.slideContent.layout( this.Reveal.getSlidesElement() );
		this.Reveal.dispatchEvent({ type: 'pdf-ready' });
	}
	isPrintingPDF() {
		return ( /print-pdf/gi ).test( window.location.search );
	}
}