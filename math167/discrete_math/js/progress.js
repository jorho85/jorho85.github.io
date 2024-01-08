export default class Progress {
	constructor( Reveal ) {
		this.Reveal = Reveal;
		this.onProgressClicked = this.onProgressClicked.bind( this );
	}
	render() {
		this.element = document.createElement( 'div' );
		this.element.className = 'progress';
		this.Reveal.getRevealElement().appendChild( this.element );
		this.bar = document.createElement( 'span' );
		this.element.appendChild( this.bar );
	}
	configure( config, oldConfig ) {
		this.element.style.display = config.progress ? 'block' : 'none';
	}
	bind() {
		if( this.Reveal.getConfig().progress && this.element ) {
			this.element.addEventListener( 'click', this.onProgressClicked, false );
		}
	}
	unbind() {
		if ( this.Reveal.getConfig().progress && this.element ) {
			this.element.removeEventListener( 'click', this.onProgressClicked, false );
		}
	}
	update() {
		if( this.Reveal.getConfig().progress && this.bar ) {
			let scale = this.Reveal.getProgress();
			if( this.Reveal.getTotalSlides() < 2 ) {
				scale = 0;
			}
			this.bar.style.transform = 'scaleX('+ scale +')';
		}
	}
	getMaxWidth() {
		return this.Reveal.getRevealElement().offsetWidth;
	}
	onProgressClicked( event ) {
		this.Reveal.onUserInput( event );
		event.preventDefault();
		let slides = this.Reveal.getSlides();
		let slidesTotal = slides.length;
		let slideIndex = Math.floor( ( event.clientX / this.getMaxWidth() ) * slidesTotal );
		if( this.Reveal.getConfig().rtl ) {
			slideIndex = slidesTotal - slideIndex;
		}
		let targetIndices = this.Reveal.getIndices(slides[slideIndex]);
		this.Reveal.slide( targetIndices.h, targetIndices.v );
	}
	destroy() {
		this.element.remove();
	}
}