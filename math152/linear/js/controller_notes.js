export default class Notes {
	constructor( Reveal ) {
		this.Reveal = Reveal;
	}
	render() {
		this.element = document.createElement( 'div' );
		this.element.className = 'speaker-notes';
		this.element.setAttribute( 'data-prevent-swipe', '' );
		this.element.setAttribute( 'tabindex', '0' );
		this.Reveal.getRevealElement().appendChild( this.element );
	}
	configure( config, oldConfig ) {
		if( config.showNotes ) {
			this.element.setAttribute( 'data-layout', typeof config.showNotes === 'string' ? config.showNotes : 'inline' );
		}
	}
	update() {
		if( this.Reveal.getConfig().showNotes && this.element && this.Reveal.getCurrentSlide() && !this.Reveal.print.isPrintingPDF() ) {
			this.element.innerHTML = this.getSlideNotes() || '<span class="notes-placeholder">No notes on this slide.</span>';
		}
	}
	updateVisibility() {
		if( this.Reveal.getConfig().showNotes && this.hasNotes() && !this.Reveal.print.isPrintingPDF() ) {
			this.Reveal.getRevealElement().classList.add( 'show-notes' );
		}
		else {
			this.Reveal.getRevealElement().classList.remove( 'show-notes' );
		}
	}
	hasNotes() {
		return this.Reveal.getSlidesElement().querySelectorAll( '[data-notes], aside.notes' ).length > 0;
	}
	isSpeakerNotesWindow() {
		return !!window.location.search.match( /receiver/gi );
	}
	getSlideNotes( slide = this.Reveal.getCurrentSlide() ) {
		if( slide.hasAttribute( 'data-notes' ) ) {
			return slide.getAttribute( 'data-notes' );
		}
		let notesElements = slide.querySelectorAll( 'aside.notes' );
		if( notesElements ) {
			return Array.from(notesElements).map( notesElement => notesElement.innerHTML ).join( '\n' );
		}
		return null;
	}
	destroy() {
		this.element.remove();
	}
}