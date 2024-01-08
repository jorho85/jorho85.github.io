export default class Pointer {
	constructor( Reveal ) {
		this.Reveal = Reveal;
		this.lastMouseWheelStep = 0;
		this.cursorHidden = false;
		this.cursorInactiveTimeout = 0;
		this.onDocumentCursorActive = this.onDocumentCursorActive.bind( this );
		this.onDocumentMouseScroll = this.onDocumentMouseScroll.bind( this );
	}
	configure( config, oldConfig ) {
		if( config.mouseWheel ) {
			document.addEventListener( 'DOMMouseScroll', this.onDocumentMouseScroll, false ); // FF
			document.addEventListener( 'mousewheel', this.onDocumentMouseScroll, false );
		}
		else {
			document.removeEventListener( 'DOMMouseScroll', this.onDocumentMouseScroll, false ); // FF
			document.removeEventListener( 'mousewheel', this.onDocumentMouseScroll, false );
		}
		if( config.hideInactiveCursor ) {
			document.addEventListener( 'mousemove', this.onDocumentCursorActive, false );
			document.addEventListener( 'mousedown', this.onDocumentCursorActive, false );
		}
		else {
			this.showCursor();
			document.removeEventListener( 'mousemove', this.onDocumentCursorActive, false );
			document.removeEventListener( 'mousedown', this.onDocumentCursorActive, false );
		}
	}
	showCursor() {
		if( this.cursorHidden ) {
			this.cursorHidden = false;
			this.Reveal.getRevealElement().style.cursor = '';
		}
	}
	hideCursor() {
		if( this.cursorHidden === false ) {
			this.cursorHidden = true;
			this.Reveal.getRevealElement().style.cursor = 'none';
		}
	}
	destroy() {
		this.showCursor();
		document.removeEventListener( 'DOMMouseScroll', this.onDocumentMouseScroll, false );
		document.removeEventListener( 'mousewheel', this.onDocumentMouseScroll, false );
		document.removeEventListener( 'mousemove', this.onDocumentCursorActive, false );
		document.removeEventListener( 'mousedown', this.onDocumentCursorActive, false );
	}
	onDocumentCursorActive( event ) {
		this.showCursor();
		clearTimeout( this.cursorInactiveTimeout );
		this.cursorInactiveTimeout = setTimeout( this.hideCursor.bind( this ), this.Reveal.getConfig().hideCursorTime );
	}
	onDocumentMouseScroll( event ) {
		if( Date.now() - this.lastMouseWheelStep > 1000 ) {
			this.lastMouseWheelStep = Date.now();
			let delta = event.detail || -event.wheelDelta;
			if( delta > 0 ) {
				this.Reveal.next();
			}
			else if( delta < 0 ) {
				this.Reveal.prev();
			}
		}
	}
}