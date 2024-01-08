import {isAndroid} from 'js/device.js'
import {matches} from 'js/util.js'
const SWIPE_THRESHOLD = 40;
export default class Touch {
	constructor(Reveal) {
		this.Reveal = Reveal;
		this.touchStartX = 0;
		this.touchStartY = 0;
		this.touchStartCount = 0;
		this.touchCaptured = false;
		this.onPointerDown = this.onPointerDown.bind(this);
		this.onPointerMove = this.onPointerMove.bind(this);
		this.onPointerUp = this.onPointerUp.bind(this);
		this.onTouchStart = this.onTouchStart.bind(this);
		this.onTouchMove = this.onTouchMove.bind(this);
		this.onTouchEnd = this.onTouchEnd.bind(this);
	}
	bind() {
		let revealElement = this.Reveal.getRevealElement();
		if('onpointerdown' in window) {
			revealElement.addEventListener('pointerdown', this.onPointerDown, false);
			revealElement.addEventListener('pointermove', this.onPointerMove, false);
			revealElement.addEventListener('pointerup', this.onPointerUp, false);
		}
		else if(window.navigator.msPointerEnabled) {
			revealElement.addEventListener('MSPointerDown', this.onPointerDown, false);
			revealElement.addEventListener('MSPointerMove', this.onPointerMove, false);
			revealElement.addEventListener('MSPointerUp', this.onPointerUp, false);
		}
		else {
			revealElement.addEventListener('touchstart', this.onTouchStart, false);
			revealElement.addEventListener('touchmove', this.onTouchMove, false);
			revealElement.addEventListener('touchend', this.onTouchEnd, false);
		}
	}
	unbind() {
		let revealElement = this.Reveal.getRevealElement();
		revealElement.removeEventListener('pointerdown', this.onPointerDown, false);
		revealElement.removeEventListener('pointermove', this.onPointerMove, false);
		revealElement.removeEventListener('pointerup', this.onPointerUp, false);
		revealElement.removeEventListener('MSPointerDown', this.onPointerDown, false);
		revealElement.removeEventListener('MSPointerMove', this.onPointerMove, false);
		revealElement.removeEventListener('MSPointerUp', this.onPointerUp, false);
		revealElement.removeEventListener('touchstart', this.onTouchStart, false);
		revealElement.removeEventListener('touchmove', this.onTouchMove, false);
		revealElement.removeEventListener('touchend', this.onTouchEnd, false);
	}
	isSwipePrevented(target) {
		if(matches(target, 'video, audio')) return true;
		while(target && typeof target.hasAttribute === 'function') {
			if(target.hasAttribute('data-prevent-swipe')) return true;
			target = target.parentNode;
		}
		return false;
	}
	onTouchStart(event) {
		if(this.isSwipePrevented(event.target)) return true;
		this.touchStartX = event.touches[0].clientX;
		this.touchStartY = event.touches[0].clientY;
		this.touchStartCount = event.touches.length;
	}
	onTouchMove(event) {
		if(this.isSwipePrevented(event.target)) return true;
		let config = this.Reveal.getConfig();
		if(!this.touchCaptured) {
			this.Reveal.onUserInput(event);
			let currentX = event.touches[0].clientX;
			let currentY = event.touches[0].clientY;
			if(event.touches.length === 1 && this.touchStartCount !== 2) {
				let availableRoutes = this.Reveal.availableRoutes({includeFragments: true});
				let deltaX = currentX - this.touchStartX,
					deltaY = currentY - this.touchStartY;
				if(deltaX > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
					this.touchCaptured = true;
					if(config.navigationMode === 'linear') {
						if(config.rtl) {
							this.Reveal.next();
						}
						else {
							this.Reveal.prev();
						}
					}
					else {
						this.Reveal.left();
					}
				}
				else if(deltaX < -SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
					this.touchCaptured = true;
					if(config.navigationMode === 'linear') {
						if(config.rtl) {
							this.Reveal.prev();
						}
						else {
							this.Reveal.next();
						}
					}
					else {
						this.Reveal.right();
					}
				}
				else if(deltaY > SWIPE_THRESHOLD && availableRoutes.up) {
					this.touchCaptured = true;
					if(config.navigationMode === 'linear') {
						this.Reveal.prev();
					}
					else {
						this.Reveal.up();
					}
				}
				else if(deltaY < -SWIPE_THRESHOLD && availableRoutes.down) {
					this.touchCaptured = true;
					if(config.navigationMode === 'linear') {
						this.Reveal.next();
					}
					else {
						this.Reveal.down();
					}
				}
				if(config.embedded) {
					if(this.touchCaptured || this.Reveal.isVerticalSlide()) {
						event.preventDefault();
					}
				}
				else {
					event.preventDefault();
				}
			}
		}
		else if(isAndroid) {
			event.preventDefault();
		}
	}
	onTouchEnd(event) {
		this.touchCaptured = false;
	}
	onPointerDown(event) {
		if(event.pointerType === event.MSPOINTER_TYPE_TOUCH || event.pointerType === "touch") {
			event.touches = [{clientX: event.clientX, clientY: event.clientY}];
			this.onTouchStart(event);
		}
	}
	onPointerMove(event) {
		if(event.pointerType === event.MSPOINTER_TYPE_TOUCH || event.pointerType === "touch")  {
			event.touches = [{clientX: event.clientX, clientY: event.clientY}];
			this.onTouchMove(event);
		}
	}
	onPointerUp(event) {
		if(event.pointerType === event.MSPOINTER_TYPE_TOUCH || event.pointerType === "touch")  {
			event.touches = [{clientX: event.clientX, clientY: event.clientY}];
			this.onTouchEnd(event);
		}
	}
}