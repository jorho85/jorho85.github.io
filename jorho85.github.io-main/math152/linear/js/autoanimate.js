import { queryAll, extend, createStyleSheet, matches, closest } from 'js/util.js'
import { FRAGMENT_STYLE_REGEX } from 'js/constants.js'
let autoAnimateCounter = 0;
export default class AutoAnimate {
	constructor( Reveal ) {
		this.Reveal = Reveal;
	}
	run( fromSlide, toSlide ) {
		this.reset();
		let allSlides = this.Reveal.getSlides();
		let toSlideIndex = allSlides.indexOf( toSlide );
		let fromSlideIndex = allSlides.indexOf( fromSlide );
		if( fromSlide.hasAttribute( 'data-auto-animate' ) && toSlide.hasAttribute( 'data-auto-animate' )
				&& fromSlide.getAttribute( 'data-auto-animate-id' ) === toSlide.getAttribute( 'data-auto-animate-id' ) 
				&& !( toSlideIndex > fromSlideIndex ? toSlide : fromSlide ).hasAttribute( 'data-auto-animate-restart' ) ) {
			this.autoAnimateStyleSheet = this.autoAnimateStyleSheet || createStyleSheet();
			let animationOptions = this.getAutoAnimateOptions( toSlide );
			fromSlide.dataset.autoAnimate = 'pending';
			toSlide.dataset.autoAnimate = 'pending';
			animationOptions.slideDirection = toSlideIndex > fromSlideIndex ? 'forward' : 'backward';
			let fromSlideIsHidden = fromSlide.style.display === 'none';
			if( fromSlideIsHidden ) fromSlide.style.display = this.Reveal.getConfig().display;
			let css = this.getAutoAnimatableElements( fromSlide, toSlide ).map( elements => {
				return this.autoAnimateElements( elements.from, elements.to, elements.options || {}, animationOptions, autoAnimateCounter++ );
			} );
			if( fromSlideIsHidden ) fromSlide.style.display = 'none';
			if( toSlide.dataset.autoAnimateUnmatched !== 'false' && this.Reveal.getConfig().autoAnimateUnmatched === true ) {
				let defaultUnmatchedDuration = animationOptions.duration * 0.8,
					defaultUnmatchedDelay = animationOptions.duration * 0.2;
				this.getUnmatchedAutoAnimateElements( toSlide ).forEach( unmatchedElement => {
					let unmatchedOptions = this.getAutoAnimateOptions( unmatchedElement, animationOptions );
					let id = 'unmatched';
					if( unmatchedOptions.duration !== animationOptions.duration || unmatchedOptions.delay !== animationOptions.delay ) {
						id = 'unmatched-' + autoAnimateCounter++;
						css.push( `[data-auto-animate="running"] [data-auto-animate-target="${id}"] { transition: opacity ${unmatchedOptions.duration}s ease ${unmatchedOptions.delay}s; }` );
					}
					unmatchedElement.dataset.autoAnimateTarget = id;
				}, this );
				css.push( `[data-auto-animate="running"] [data-auto-animate-target="unmatched"] { transition: opacity ${defaultUnmatchedDuration}s ease ${defaultUnmatchedDelay}s; }` );
			}
			this.autoAnimateStyleSheet.innerHTML = css.join( '' );
			requestAnimationFrame( () => {
				if( this.autoAnimateStyleSheet ) {
					getComputedStyle( this.autoAnimateStyleSheet ).fontWeight;
					toSlide.dataset.autoAnimate = 'running';
				}
			} );
			this.Reveal.dispatchEvent({
				type: 'autoanimate',
				data: {fromSlide,toSlide,sheet: this.autoAnimateStyleSheet}
			});
		}
	}
	reset() {
		queryAll( this.Reveal.getRevealElement(), '[data-auto-animate]:not([data-auto-animate=""])' ).forEach( element => {
			element.dataset.autoAnimate = '';
		} );
		queryAll( this.Reveal.getRevealElement(), '[data-auto-animate-target]' ).forEach( element => {
			delete element.dataset.autoAnimateTarget;
		} );
		if( this.autoAnimateStyleSheet && this.autoAnimateStyleSheet.parentNode ) {
			this.autoAnimateStyleSheet.parentNode.removeChild( this.autoAnimateStyleSheet );
			this.autoAnimateStyleSheet = null;
		}
	}
	autoAnimateElements( from, to, elementOptions, animationOptions, id ) {
		from.dataset.autoAnimateTarget = '';
		to.dataset.autoAnimateTarget = id;
		let options = this.getAutoAnimateOptions( to, animationOptions );
		if( typeof elementOptions.delay !== 'undefined' ) options.delay = elementOptions.delay;
		if( typeof elementOptions.duration !== 'undefined' ) options.duration = elementOptions.duration;
		if( typeof elementOptions.easing !== 'undefined' ) options.easing = elementOptions.easing;
		let fromProps = this.getAutoAnimatableProperties( 'from', from, elementOptions ),
			toProps = this.getAutoAnimatableProperties( 'to', to, elementOptions );
		if( to.classList.contains( 'fragment' ) ) {
			delete toProps.styles['opacity'];
			if( from.classList.contains( 'fragment' ) ) {
				let fromFragmentStyle = ( from.className.match( FRAGMENT_STYLE_REGEX ) || [''] )[0];
				let toFragmentStyle = ( to.className.match( FRAGMENT_STYLE_REGEX ) || [''] )[0];
				if( fromFragmentStyle === toFragmentStyle && animationOptions.slideDirection === 'forward' ) {
					to.classList.add( 'visible', 'disabled' );
				}
			}
		}
		if( elementOptions.translate !== false || elementOptions.scale !== false ) {
			let presentationScale = this.Reveal.getScale();
			let delta = {
				x: ( fromProps.x - toProps.x ) / presentationScale,
				y: ( fromProps.y - toProps.y ) / presentationScale,
				scaleX: fromProps.width / toProps.width,
				scaleY: fromProps.height / toProps.height
			};
			delta.x = Math.round( delta.x * 1000 ) / 1000;
			delta.y = Math.round( delta.y * 1000 ) / 1000;
			delta.scaleX = Math.round( delta.scaleX * 1000 ) / 1000;
			delta.scaleX = Math.round( delta.scaleX * 1000 ) / 1000;
			let translate = elementOptions.translate !== false && ( delta.x !== 0 || delta.y !== 0 ),
				scale = elementOptions.scale !== false && ( delta.scaleX !== 0 || delta.scaleY !== 0 );
			if( translate || scale ) {
				let transform = [];
				if( translate ) transform.push( `translate(${delta.x}px, ${delta.y}px)` );
				if( scale ) transform.push( `scale(${delta.scaleX}, ${delta.scaleY})` );
				fromProps.styles['transform'] = transform.join( ' ' );
				fromProps.styles['transform-origin'] = 'top left';
				toProps.styles['transform'] = 'none';
			}
		}
		for( let propertyName in toProps.styles ) {
			const toValue = toProps.styles[propertyName];
			const fromValue = fromProps.styles[propertyName];
			if( toValue === fromValue ) {
				delete toProps.styles[propertyName];
			}
			else {
				if( toValue.explicitValue === true ) {
					toProps.styles[propertyName] = toValue.value;
				}
				if( fromValue.explicitValue === true ) {
					fromProps.styles[propertyName] = fromValue.value;
				}
			}
		}
		let css = '';
		let toStyleProperties = Object.keys( toProps.styles );
		if( toStyleProperties.length > 0 ) {
			fromProps.styles['transition'] = 'none';
			toProps.styles['transition'] = `all ${options.duration}s ${options.easing} ${options.delay}s`;
			toProps.styles['transition-property'] = toStyleProperties.join( ', ' );
			toProps.styles['will-change'] = toStyleProperties.join( ', ' );
			let fromCSS = Object.keys( fromProps.styles ).map( propertyName => {
				return propertyName + ': ' + fromProps.styles[propertyName] + ' !important;';
			} ).join( '' );
			let toCSS = Object.keys( toProps.styles ).map( propertyName => {
				return propertyName + ': ' + toProps.styles[propertyName] + ' !important;';
			} ).join( '' );
			css = 	'[data-auto-animate-target="'+ id +'"] {'+ fromCSS +'}' +
					'[data-auto-animate="running"] [data-auto-animate-target="'+ id +'"] {'+ toCSS +'}';
		}
		return css;
	}
	getAutoAnimateOptions( element, inheritedOptions ) {
		let options = {
			easing: this.Reveal.getConfig().autoAnimateEasing,
			duration: this.Reveal.getConfig().autoAnimateDuration,
			delay: 0
		};
		options = extend( options, inheritedOptions );
		if( element.parentNode ) {
			let autoAnimatedParent = closest( element.parentNode, '[data-auto-animate-target]' );
			if( autoAnimatedParent ) {
				options = this.getAutoAnimateOptions( autoAnimatedParent, options );
			}
		}
		if( element.dataset.autoAnimateEasing ) {
			options.easing = element.dataset.autoAnimateEasing;
		}
		if( element.dataset.autoAnimateDuration ) {
			options.duration = parseFloat( element.dataset.autoAnimateDuration );
		}
		if( element.dataset.autoAnimateDelay ) {
			options.delay = parseFloat( element.dataset.autoAnimateDelay );
		}
		return options;
	}
	getAutoAnimatableProperties( direction, element, elementOptions ) {
		let config = this.Reveal.getConfig();
		let properties = { styles: [] };
		if( elementOptions.translate !== false || elementOptions.scale !== false ) {
			let bounds;
			if( typeof elementOptions.measure === 'function' ) {
				bounds = elementOptions.measure( element );
			}
			else {
				if( config.center ) {
					bounds = element.getBoundingClientRect();
				}
				else {
					let scale = this.Reveal.getScale();
					bounds = {
						x: element.offsetLeft * scale,
						y: element.offsetTop * scale,
						width: element.offsetWidth * scale,
						height: element.offsetHeight * scale
					};
				}
			}
			properties.x = bounds.x;
			properties.y = bounds.y;
			properties.width = bounds.width;
			properties.height = bounds.height;
		}
		const computedStyles = getComputedStyle( element );
		( elementOptions.styles || config.autoAnimateStyles ).forEach( style => {
			let value;
			if( typeof style === 'string' ) style = { property: style };
			if( typeof style.from !== 'undefined' && direction === 'from' ) {
				value = { value: style.from, explicitValue: true };
			}
			else if( typeof style.to !== 'undefined' && direction === 'to' ) {
				value = { value: style.to, explicitValue: true };
			}
			else {
				if( style.property === 'line-height' ) {
					value = parseFloat( computedStyles['line-height'] ) / parseFloat( computedStyles['font-size'] );
				}
				if( isNaN(value) ) {
					value = computedStyles[style.property];
				}
			}
			if( value !== '' ) {
				properties.styles[style.property] = value;
			}
		} );
		return properties;
	}
	getAutoAnimatableElements( fromSlide, toSlide ) {
		let matcher = typeof this.Reveal.getConfig().autoAnimateMatcher === 'function' ? this.Reveal.getConfig().autoAnimateMatcher : this.getAutoAnimatePairs;
		let pairs = matcher.call( this, fromSlide, toSlide );
		let reserved = [];
		return pairs.filter( ( pair, index ) => {
			if( reserved.indexOf( pair.to ) === -1 ) {
				reserved.push( pair.to );
				return true;
			}
		} );
	}
	getAutoAnimatePairs( fromSlide, toSlide ) {
		let pairs = [];
		const codeNodes = 'pre';
		const textNodes = 'h1, h2, h3, h4, h5, h6, p, li';
		const mediaNodes = 'img, video, iframe';
		this.findAutoAnimateMatches( pairs, fromSlide, toSlide, '[data-id]', node => {
			return node.nodeName + ':::' + node.getAttribute( 'data-id' );
		} );
		this.findAutoAnimateMatches( pairs, fromSlide, toSlide, textNodes, node => {
			return node.nodeName + ':::' + node.innerText;
		} );
		this.findAutoAnimateMatches( pairs, fromSlide, toSlide, mediaNodes, node => {
			return node.nodeName + ':::' + ( node.getAttribute( 'src' ) || node.getAttribute( 'data-src' ) );
		} );
		this.findAutoAnimateMatches( pairs, fromSlide, toSlide, codeNodes, node => {
			return node.nodeName + ':::' + node.innerText;
		} );
		pairs.forEach( pair => {
			if( matches( pair.from, textNodes ) ) {
				pair.options = { scale: false };
			}
			else if( matches( pair.from, codeNodes ) ) {
				pair.options = { scale: false, styles: [ 'width', 'height' ] };
				this.findAutoAnimateMatches( pairs, pair.from, pair.to, '.hljs .hljs-ln-code', node => {
					return node.textContent;
				}, {
					scale: false,
					styles: [],
					measure: this.getLocalBoundingBox.bind( this )
				} );
				this.findAutoAnimateMatches( pairs, pair.from, pair.to, '.hljs .hljs-ln-numbers[data-line-number]', node => {
					return node.getAttribute( 'data-line-number' );
				}, {
					scale: false,
					styles: [ 'width' ],
					measure: this.getLocalBoundingBox.bind( this )
				} );
			}
		}, this );
		return pairs;
	}
	getLocalBoundingBox( element ) {
		const presentationScale = this.Reveal.getScale();
		return {x: Math.round( ( element.offsetLeft * presentationScale ) * 100 ) / 100,y: Math.round( ( element.offsetTop * presentationScale ) * 100 ) / 100,width: Math.round( ( element.offsetWidth * presentationScale ) * 100 ) / 100,height: Math.round( ( element.offsetHeight * presentationScale ) * 100 ) / 100};
	}
	findAutoAnimateMatches( pairs, fromScope, toScope, selector, serializer, animationOptions ) {
		let fromMatches = {};
		let toMatches = {};
		[].slice.call( fromScope.querySelectorAll( selector ) ).forEach( ( element, i ) => {
			const key = serializer( element );
			if( typeof key === 'string' && key.length ) {
				fromMatches[key] = fromMatches[key] || [];
				fromMatches[key].push( element );
			}
		} );
		[].slice.call( toScope.querySelectorAll( selector ) ).forEach( ( element, i ) => {
			const key = serializer( element );
			toMatches[key] = toMatches[key] || [];
			toMatches[key].push( element );
			let fromElement;
			if( fromMatches[key] ) {
				const primaryIndex = toMatches[key].length - 1;
				const secondaryIndex = fromMatches[key].length - 1;
				if( fromMatches[key][ primaryIndex ] ) {
					fromElement = fromMatches[key][ primaryIndex ];
					fromMatches[key][ primaryIndex ] = null;
				}
				else if( fromMatches[key][ secondaryIndex ] ) {
					fromElement = fromMatches[key][ secondaryIndex ];
					fromMatches[key][ secondaryIndex ] = null;
				}
			}
			if( fromElement ) {
				pairs.push({from: fromElement,to: element,options: animationOptions});
			}
		} );
	}
	getUnmatchedAutoAnimateElements( rootElement ) {
		return [].slice.call( rootElement.children ).reduce( ( result, element ) => {
			const containsAnimatedElements = element.querySelector( '[data-auto-animate-target]' );
			if( !element.hasAttribute( 'data-auto-animate-target' ) && !containsAnimatedElements ) {
				result.push( element );
			}
			if( element.querySelector( '[data-auto-animate-target]' ) ) {
				result = result.concat( this.getUnmatchedAutoAnimateElements( element ) );
			}
			return result;
		}, [] );
	}
}