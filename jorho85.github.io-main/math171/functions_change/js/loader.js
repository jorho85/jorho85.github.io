export const loadScript = (url, callback) => {
	const script = document.createElement('script');
	script.type = 'text/javascript';
	script.async = false;
	script.defer = false;
	script.src = url;
	if(typeof callback === 'function') {
		script.onload = script.onreadystatechange = event => {
			if(event.type === 'load' || /loaded|complete/.test(script.readyState)) {
				script.onload = script.onreadystatechange = script.onerror = null;
				callback();
		};
		script.onerror = err => {
			script.onload = script.onreadystatechange = script.onerror = null;
			callback(new Error('Failed loading script: ' + script.src + '\n' + err));
		};
	}
	const head = document.querySelector('head');
	head.insertBefore(script, head.lastChild);
};