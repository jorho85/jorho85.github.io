export default class Location {
	MAX_REPLACE_STATE_FREQUENCY = 1000;
	constructor(Reveal) {
		this.Reveal = Reveal;
		this.writeURLTimeout = 0;
		this.replaceStateTimestamp = 0;
		this.onWindowHashChange = this.onWindowHashChange.bind(this);
	}
	bind() {
		window.addEventListener('hashchange', this.onWindowHashChange, false);
	}
	unbind() {
		window.removeEventListener('hashchange', this.onWindowHashChange, false);
	}
	getIndicesFromHash(hash=window.location.hash, options={}) {
		let name = hash.replace(/^#\/?/, '');
		let bits = name.split('/');
		if(!/^[0-9]*$/.test(bits[0]) && name.length) {
			let element;
			let f;
			if(/\/[-\d]+$/g.test(name)) {
				f = parseInt(name.split('/').pop(), 10);
				f = isNaN(f) ? undefined : f;
				name = name.split('/').shift();
			}
			try {
				element = document.getElementById(decodeURIComponent(name));
			}
			catch (error) { }

			if(element) {
				return { ...this.Reveal.getIndices( element ), f };
			}
		}
		else {
			const config = this.Reveal.getConfig();
			let hashIndexBase = config.hashOneBasedIndex || options.oneBasedIndex ? 1 : 0;
			let h = (parseInt(bits[0], 10) - hashIndexBase) || 0,
				v = (parseInt(bits[1], 10) - hashIndexBase) || 0,
				f;
			if(config.fragmentInURL) {
				f = parseInt(bits[2], 10);
				if(isNaN(f)) {
					f = undefined;
				}
			}
			return {h, v, f};
		}
		return null;
	}
	readURL() {
		const currentIndices = this.Reveal.getIndices();
		const newIndices = this.getIndicesFromHash();
		if(newIndices) {
			if((newIndices.h !== currentIndices.h || newIndices.v !== currentIndices.v || newIndices.f !== undefined)) {
					this.Reveal.slide(newIndices.h, newIndices.v, newIndices.f);
        }
    }
		else {
			this.Reveal.slide(currentIndices.h || 0, currentIndices.v || 0);
		}
	}
	writeURL(delay) {
		let config = this.Reveal.getConfig();
		let currentSlide = this.Reveal.getCurrentSlide();
		clearTimeout(this.writeURLTimeout);
		if(typeof delay === 'number') {
			this.writeURLTimeout = setTimeout(this.writeURL, delay);
		}
		else if(currentSlide) {
			let hash = this.getHash();
			if(config.history) {
				window.location.hash = hash;
			}
			else if(config.hash) {
				if(hash === '/') {
					this.debouncedReplaceState(window.location.pathname + window.location.search);
				}
				else {
					this.debouncedReplaceState('#' + hash);
				}
			}
		}
	}
	replaceState(url) {
		window.history.replaceState(null, null, url);
		this.replaceStateTimestamp = Date.now();
	}
	debouncedReplaceState(url) {
		clearTimeout(this.replaceStateTimeout);
		if(Date.now() - this.replaceStateTimestamp > this.MAX_REPLACE_STATE_FREQUENCY) {
			this.replaceState(url);
		}
		else {
			this.replaceStateTimeout = setTimeout(() => this.replaceState( url ), this.MAX_REPLACE_STATE_FREQUENCY);
		}
	}
	getHash(slide) {
		let url = '/';
		let s = slide || this.Reveal.getCurrentSlide();
		let id = s ? s.getAttribute('id') : null;
		if(id) {
			id = encodeURIComponent(id);
		}
		let index = this.Reveal.getIndices(slide);
		if(!this.Reveal.getConfig().fragmentInURL) {
			index.f = undefined;
		}
		if(typeof id === 'string' && id.length) {
			url = '/' + id;
			if(index.f >= 0) url += '/' + index.f;
		}
		else {
			let hashIndexBase = this.Reveal.getConfig().hashOneBasedIndex ? 1 : 0;
			if(index.h > 0 || index.v > 0 || index.f >= 0) url += index.h + hashIndexBase;
			if(index.v > 0 || index.f >= 0) url += '/' + (index.v + hashIndexBase);
			if(index.f >= 0) url += '/' + index.f;
		}
		return url;
	}
	onWindowHashChange(event) {
		this.readURL();
	}
}