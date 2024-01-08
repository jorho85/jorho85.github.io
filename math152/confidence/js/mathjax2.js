export const MathJax2 = () => {
    let deck;
    let defaultOptions = {
        messageStyle: 'none',
		tex2jax: {
            inlineMath: [[ '$', '$'], ['\\(', '\\)']],
			skipTags: ['script', 'noscript', 'style', 'textarea', 'pre']
		},
		skipStartupTypeset: true
	};
	function loadScript(url, callback) {
		let head = document.querySelector('head');
		let script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = url;
		let finish = () => {
            if(typeof callback === 'function') {
				callback.call();
				callback = null;
			}
		};
		script.onload = finish;
		script.onreadystatechange = () => {
			if (this.readyState === 'loaded') {
				finish();
			}
		};
		head.appendChild(script);
	}
	return {
		id: 'mathjax2',
		init: function(reveal) {
			deck = reveal;
			let revealOptions = deck.getConfig().mathjax2 || deck.getConfig().math || {};
			let options = {...defaultOptions, ...revealOptions};
			let mathjax = options.mathjax || 'https://cdn.jsdelivr.net/npm/mathjax@2/MathJax.js';
			let config = options.config || 'TeX-AMS_HTML-full';
			let url = mathjax + '?config=' + config;
			options.tex2jax = {...defaultOptions.tex2jax, ...revealOptions.tex2jax};
			options.mathjax = options.config = null;
            loadScript(url, function () {
                MathJax.Hub.Config(options);
				MathJax.Hub.Queue(['Typeset', MathJax.Hub, deck.getRevealElement()]);
				MathJax.Hub.Queue(deck.layout);
				deck.on('slidechanged', function(event) {
					MathJax.Hub.Queue(['Typeset', MathJax.Hub, event.currentSlide]);
				});
			});
		}
	}
};