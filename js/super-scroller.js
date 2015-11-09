/**
 *  Super Scroller
 *  19/09/2012 - OMFG This needs serious refactoring!!!!!
 *  21/11/2012 - Added a bunch of handy methods for defining areas in css style data-gss-slidename attributes
 *  12/04/2013 - Added trigger feature addClass/removeClass
 *  16/04/2013 - Added feature to change the height of a component.
 *  18/04/2013 - Added area disabling to tidy up areas on scrolling up.
 *  18/04/2013 - Added component activation/deactivation to support hidden elements with delays
 * 	@author Paul David Clegg @cleggypdc
 *  @copyright  Framewerx UK / Gather Digital 2012-13
	This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/** define the FJS viewport object **/
(function($) {
	
	var GSS = this; /** self reference for scope **/
	
	/** debug function **/
	var log = function() {
		//console.log(arguments);
	}
	
	var data = {
		viewport: {
			_el: null,
			_width: 0,
			_height: 0,
			_scrollPosition: 0,
			_scrollDiff: 0,
			_totalAreaHeight: 0,
			_activeAreaRef: null,
			_activeArea: null,
			_areaIndex: null /** an array of the areas **/
		}
		
		/**
		 * Area configuration data,
		 * Holds the following information:
		 * 	scale	   - The size of the area compared to the viewport
		 * 
		 * When initialised, this object also stores the following:
		 * 	start	   - The Scroll Position where the area is initialised
		 * 	end		   - The Scroll Position where the area ends
		 * 	components - The components which are active within this area
		 *  components have a config which shows the increments of how much a component should move given the difference
		 * 	in scroll Position.
		 * 	components : {
		 * 		'componentName' : {
		 * 			_el: // this is a element itself
		 * 			_increments: {
		 *  			left: 
		 * 				top:
		 * 				rotation:
		 * 				scale:
		 * 				opacity:
		 * 			}
		 * 		}
		 * }
		 */
		/*areas: {  
			's1'	: 	{scale: 3},
			's2'	: 	{scale: 3},
			's3'	: 	{scale: 3},
		},
		
		/*components: {
			'navigation': {
				areas: {
					/*'s0': {
						start: 	{'top': 30 },
						end: 	{'top': 0 },
						speed: 1
					},
					's1': {
						start: 	{'top': 0},
						end:	{'top': 10},
						speed: 3
					}
				}			
			}
		}*/
		
	}
	
	var methods = {
		
		/**
		 * This is the Plugin constructor
		 * It loads everything we need and starts the scroller
		 */
		init: function(options) {
			methods.initHtmlDefinitions();
			methods.initViewport(); //initialise the viewport
			methods.initAreas();
			methods.initComponents();
			methods.activateArea();

			/** add the scrolling listener **/
			data.viewport._el.scroll(methods.scrollListener);
			
		},
		
		/**
		 * initViewport
		 * - Creates a viewport configuration for the page that other methods can
		 *   use to grab information on the users window at any point
		 * **/
		initViewport: function() {
			data.viewport._el				= $(window);
			var jWindow = data.viewport._el;
			data.viewport._width 			= jWindow.width();
			data.viewport._height 			= jWindow.height();
			data.viewport._scrollPosition 	= jWindow.scrollTop();
			data.viewport._areaIndex 		= data.viewport._areaIndex || [];
		}, //initViewport
		
		/** 
		 * Configures the height information for each area
		 * sets the start and end points based on the scale and viewport height 
		 * */
		initAreas: function() {
			var startPoint = 0,
				totalAreaHeight = 0;
			for(i in data.areas) {
				
				var area = data.areas[i];
				area.start = startPoint;
				/** set the endpoint to the height of the viewport * the scale of the area **/
				area.height = lastAreaHeight = (data.viewport._height*area.scale);
				totalAreaHeight += lastAreaHeight;
				area.end   = startPoint + area.height;
				/** set the new startpoint for the next area **/
				startPoint = area.end + 1;
				
				/** push this area name into the viewport index **/
				data.viewport._areaIndex.push(i);
				
			}
			data.viewport._totalAreaHeight = totalAreaHeight;
			
		},//initAreas
		
		/**
		 * initHtmlDefinitions
		 * - Main function for creating the animation configuration
		 * Loops through the DOM, reading all elements with the class GSS
		 * and attempting to get data-gss-{areaName} attributes in order to configure
		 * an animation for that element.  Elements MUST have an id to work.
		 */
		initHtmlDefinitions: function() {
			
			/** get the body **/
			var body 	= document.getElementsByTagName('body')[0],
				areas 	= body.getAttribute('data-gss-areas');
			
			if (!areas) {
				alert("There are no areas configured for this slider, please add the configuration into the document body");
				return;
			}
			
			data.areas = data.areas || {};
			
			/** setup the areas from the DOM first **/
			slides = methods.CSSToAreas(areas);
			
			/** now find moveable components **/
			$(".GSS").each(function() {
				
				/** now we want to find a slide configuration on the components **/
				for(var i in slides) {
					var slideName = slides[i].trim(); /** get rid of crap **/
					var slideConf = this.getAttribute('data-gss-'+slideName);
					
					if(!slideConf) { continue; }
					/** convert this config into an object **/
					var component = this.getAttribute('id');
					if(!component) {
						throw "Required ID not found in element with GSS class...";
					}
					/** initialise components **/
					data.components = data.components || {};
					/** initialise the component config **/
					data.components[component] = data.components[component] || {}; 
					
					/** initialise the area config **/
					data.components[component].areas = data.components[component].areas || {};
					data.components[component].areas[slideName] = data.components[component].areas[slideName] 
					|| methods.CSSToComponent(slideConf);
				}
				
			});
		},
		
		/**
		 * CSSToAreas
		 * - Creates the area configurations from a CSS like attribute.
		 */
		CSSToAreas: function(string) {
			/** get the areas by reading the string backward { **/
			/** remove whitespace **/
			string = string.replace(/\s+/g, '');
			var pos = -1;
			var areas = [];
			/** get the areas **/
			do {
				/*** some stuff to do here **/
				var bracket = string.indexOf('{', pos);
				if(bracket < 1) { bracket = string.length;}
				var newAreas = string.substring(pos+1, bracket);
				if(newAreas.length > 0) {
					newAreas = newAreas.split(',');
					areas = areas.concat(newAreas);
				}
				pos = string.indexOf('}', bracket);
			} while (pos >= 0 && pos < string.length);
			
			/** for each area get the configuration **/
			
			areas = methods.getUnique(areas);
			for(var a in areas) {
				data.areas[areas[a]] = methods.CSSClassToConfig(areas[a], string);
				//log(areas[a]);
			}
			//log(data.areas);
			//log("Parsed Areas", areas);
			/** return the areas too **/
			return areas;
			
		},
		
		/** Converts a CSS style string to a configuration object **/
		CSSToComponent: function(slideConfString) {
			/** typical input = start{top:20;left:20} end{} **/
			/** separate the string into start and end components **/ 
			
			slideConf = {};
			/** now get the start configuration **/
			slideConf.start  = methods.CSSClassToConfig('start', slideConfString);
			slideConf.end	 = methods.CSSClassToConfig('end', slideConfString);
			slideConf.speed  = methods.CSSClassToConfig('speed', slideConfString, true); /** true as we just want a single value **/
			slideConf.triggers = methods.CSSClassToConfig('triggers', slideConfString); /** triggers **/
			slideConf.direction = methods.CSSClassToConfig('direction', slideConfString, true);

			return slideConf;
			
		},
		
		/** gets a css class and returns an object **/
		CSSClassToConfig: function(classname, string, singleValue) {
			/** get the position of the class, i.e the end of the word**/
			var clsPos = string.indexOf(classname)+classname.length;
			/** if not found return nothing **/
			if(clsPos < classname.length) {return (typeof singleValue == 'undefined') ? {} : null; }
			/** get the start of the class definition **/
			var start  = string.indexOf('{', clsPos)+1;
			/** get the end of the class definition **/
			var end    = string.indexOf('}', clsPos);
			/** now get the actual definition **/
			var definition = string.substring(start, end);
			
			if(singleValue) {
				var val = definition.trim();
				if(val) {
					return val;
				}
				return 1;
			} else {
			
				/** split via semi-colon **/
				var confArray = definition.split(';');
				
				var configObj = {};
				for(var j in confArray) {
					if(!confArray[j] || confArray[j].trim().length < 1) {continue;};
					/** split by colon **/
					var transString = confArray[j].split(':');
					if(!transString) { continue; }
					configObj[transString[0].trim()] = (isNaN(transString[1])) ? transString[1] : parseFloat(transString[1]); //allows both floats and text
				}
				//log(configObj);
				return configObj;
				
			}
		},
		
		/** 
		 * Gets unique values in an array
		 * It's here as I didnt want to specify it as a prototype.
		 */
		getUnique:function(ar){var u={},a=[];for(var i=0,l=ar.length;i<l;++i){if(u.hasOwnProperty(ar[i])){continue;}a.push(ar[i]);u[ar[i]]=1;}return a;},
		
		/**
		 * Gets the intersection of two arrays
		 ***/
		getIntersect:function(arr1,arr2){var r=[],o={},l=arr2.length,i,v;for(i=0;i<l;i++) {o[arr2[i]]=true;}l=arr1.length;for(i=0;i<l;i++){v=arr1[i];if(v in o){r.push(v);}}return r;},
		
		/** initilises each areas components **/
		initComponents: function() {
			
			/** loop through each component **/
			for(componentName in data.components) {
				var cmp = data.components[componentName];
				
				/** loop through each components area configuration **/
				for(areaName in cmp.areas) {
					var componentConfig = cmp.areas[areaName];
					
					/** get the area it refers to, if it doesn't exist then move on **/
					var area = data.areas[areaName]
					if(!typeof area == "object") { continue; }
					
					/** list this component in the areas component object **/
					area.components = area.components || {};
					area.components[componentName] = {};
					
					/** shortcut **/
					var componentAreaConfig = area.components[componentName];
						
					/** get start/end config **/
					var startConf 	= componentConfig.start;
					var endConf 	= componentConfig.end;
					
					componentAreaConfig.start 		= startConf;
					componentAreaConfig.end 		= endConf;
					componentAreaConfig.triggers 	= componentConfig.triggers;
					componentAreaConfig.direction		= componentConfig.direction;
					
					/**
					 * for each start configuration find the end configuration to define the transition
					 * if there is a transition then calculate the incremental values for the area
					 * and store them in the components area configuration 
					 **/
					for(transitionName in startConf) {
						var transitionStart = startConf[transitionName];
						var transitionEnd	= endConf[transitionName];
						
						if(typeof transitionEnd == "undefined") { continue;	}
						
						/** calculate the difference **/
							/** difference is as if scroll direction is down **/
							var transitionDifference 	= transitionEnd - transitionStart,		
								speed 					= componentConfig.speed || 1,
							increment 				= (transitionDifference / area.height*100)*speed;
							
						/** store the values in the area configuration **/
						componentAreaConfig._increments = componentAreaConfig._increments || {}; 
						componentAreaConfig._increments[transitionName] = increment;
					}
						
				}
				
				
			}//foreach component
		},//initComponents
		
		/**
		 * Acivates an area within the viewport 
		 */
		activateArea: function(areaRef) {
			
			var vp 		 = data.viewport, //viewport;
				oldArea  = vp._activeAreaRef;
				newIndex = vp._areaIndex.indexOf(vp._activeAreaRef);
			
			/** some key identifiers here to speed up area activation **/
			if(areaRef == "next") {
				
				/** set the new area as the next one in the index **/
				newIndex++;
				vp._activeAreaRef 	= vp._areaIndex[newIndex] || oldArea; //fallback incase we can't go forward
				vp._activeArea 		= data.areas[vp._activeAreaRef];
				
			} else if (areaRef == "prev") {
					
				newIndex--;
				vp._activeAreaRef 	= vp._areaIndex[newIndex] || oldArea; //fallback incase we can't go back
				vp._activeArea 		= data.areas[vp._activeAreaRef];
				
						
			} else if(!typeof areaRef == "undefined" && !typeof data.areas[areaRef] == "undefined") {
				
				/**
				 * if an area is specified use this one, else get the scrollPosition
				 * and attempt to find the active area. 
				 */

				vp._activeAreaRef = areaRef;
				vp._activeArea	  = data.areas[areaRef];
				/** TODO, if named then scroll to that area */
			
			} else {
				/** find based on scrollPosition **/
				var activeArea = vp._activeArea,
					scrollPos  = vp._scrollPosition;
				
				if(!activeArea || (activeArea && !methods.checkAreaBoundarys(activeArea, scrollPos))) {
					/**
					 * scroll position is outside of the current area boundary so we need to find 
					 * the correct boundary 
					 */
					for(var areaName in data.areas) {
						if(methods.checkAreaBoundarys(data.areas[areaName], scrollPos)) {
							vp._activeAreaRef = areaName;
							vp._activeArea = data.areas[areaName];
							break;
						}
					}
					
				}
				
			}
			
			/** Now that the active area has changed we need to initialise the elements **/
			
			/** only if the area has changed we position the components **/
			if(oldArea != vp._activeAreaRef) {
				log("activated area", vp._activeAreaRef,  vp._activeArea);
				methods.activateAreaComponents();
				methods.positionAreaComponents();
				methods.deactivateArea(data.areas[oldArea]);
			}
			
			
		},
		
		/**
		 * activateAreaComponents
		 * - caches the components for faster animation
		 * - sets each components visibility.
		 */
		activateAreaComponents: function()  {
			/** viewport and area check **/
			var vp = data.viewport;
			if(!vp._activeArea) { log("no active area "); return; }
			var areaComponents = vp._activeArea.components;
			if(!areaComponents) { log("no components in area"); return; }
			
			for (comp in areaComponents) {
				
				/** get each component and cache it **/
				/** TODO: create a cleanup function somewhere **/
				areaComponents[comp]._el = areaComponents[comp]._el || $("#"+ comp);//document.getElementById("comp");
				
				/**
				 * 
				 * 18/04/2013 - Only show a component that has no opacity if there is no delay on that component, and the progress through the area 
				 * is grater than that delay
				 */
				//log(areaComponents[comp]);
				var delay = areaComponents[comp].triggers.delay;
				if(!delay || (delay && methods.getAreaProgress() >= delay)) {
					methods.activateComponent(areaComponents[comp]);
				}
				
				/** this is later overridden by triggers **/
				
			}
			
		},
		
		/**
		 * Activates a component
		 */
		activateComponent: function(comp) {
			/**
			 * check the opacity configuration for each component in this slide
			 * If it has an opacity, set it, otherwise by default the component
			 * is given an opacity of 1, as we can assume it needs to be visible.
			 */
			if(comp.start && (comp.start.opacity || comp.start.opacity == 0) ) {
				comp._el.css({'opacity': comp.start.opacity});
			} else {
				comp._el.css({'opacity': 1});
			}
			
			/** By default mark this component as active **/
			comp._isActive = true;
		},
		
		/**
		 * Activates a component
		 */
		deactivateComponent: function(comp) {
			/**
			 * check the opacity configuration for each component in this slide
			 * If it has an opacity, set it, otherwise by default the component
			 * is given an opacity of 1, as we can assume it needs to be visible.
			 */
			if(comp.start && (comp.start.opacity || comp.start.opacity == 0) ) {
				comp._el.css({'opacity': comp.start.opacity});
			} else {
				comp._el.css({'opacity': 0});
			}
			
			/** By default mark this component as active **/
			comp._isActive = false;
		},
		
		/**
		 * deactivateArea
		 * - resets components of an area bak to their original (start) state
		 * - sets the component visibility
		 * - uncaches the area from memory. 
		 */
		deactivateArea: function(area) {
			
			var vp = data.viewport;
			if(!area) { log('no area to deactivate'); return;}
			var components = area.components;
			if(!components) { log('no components to deactivate'); return;}
			
			//check the scroll position
			//if scroll postion is less than the old area, reset the area, else do nothing
			if(vp._scrollPosition <= area.start) {
				for (comp in components) {
					//remove all styling information from the component
					components[comp]._el.removeAttr('style');
					//remove any classes and reset triggers
					components[comp]._taskDone = null;
					//uncache the component
					components[comp]._el = null;
				}
			}
			
		},
		
		/** checks to see if a scroll position value is within an area boundary **/
		checkAreaBoundarys: function(area, position) {
			if((position >= area.start && position <= area.end) || (position > data.viewport._totalAreaHeight)) {
				return true;
			}
			return false;
		},//checkAreaBoundarys
		
		getAreaProgress: function() {
			return (data.viewport._scrollPosition - data.viewport._activeArea.start) / (data.viewport._activeArea.height)  * 100;
		},
		
		
		/**
		 * Loops through an areas components and moves them
		 * to the correct location based on the scroll position.
		 */
		positionAreaComponents: function() {
			var area 			= data.viewport._activeArea,
				components 		= area.components,
				areaProgress	= (data.viewport._scrollPosition - area.start) / (area.height)  * 100;
				
				/** loop area components **/
			for(n in components) {
				cmp = components[n];
				/** build transformation **/
				var style = {},
					delay = cmp.triggers.delay || 0;
				
				methods.checkTriggers(cmp, areaProgress);
				
				/** this is set via the triggers **/
				if(!cmp._isActive || !methods.checkDirection(cmp)) {
					continue;
				}
				
				/** check for tasks to do **/
				if(cmp._task) {
					
					switch(cmp._task) {
					
						case 'ac' : 
							cmp._el.addClass(cmp._taskVal);
						break;
						
						case 'rc' :
							cmp._el.removeClass(cmp._taskVal);
						break;
					
					}
					
					cmp._task = null;
					cmp._taskVal = null;
					cmp._taskDone = true;
				}
				
				for(trans in cmp._increments) {
					var transValue = cmp._increments[trans],
						delayVal = (cmp.triggers.delay) ? cmp.triggers.delay : 0,
						elProgress = areaProgress-delayVal;
					/** make a css style to apply to each component **/
					switch (trans) {
						
						case 'left':
							var calc = cmp.start.left + (elProgress*transValue);
							style['left'] = ((calc >= cmp.start.left && calc <= cmp.end.left) 
										  || (calc <= cmp.start.left && calc >= cmp.end.left)) ? calc+"%" : cmp.end.left+"%";
						break; 
						
						case 'top':
							var calc = cmp.start.top + (elProgress*transValue);
							style['top'] = ((calc >= cmp.start.top && calc <= cmp.end.top) 
										  || (calc <= cmp.start.top && calc >= cmp.end.top)) ? calc+"%":cmp.end.top+"%";
						break;
						
						case 'bottom':
							var calc = cmp.start.bottom + (elProgress*transValue);
							style['bottom'] = ((calc >= cmp.start.bottom && calc <= cmp.end.bottom) 
										  || (calc <= cmp.start.bottom && calc >= cmp.end.bottom)) ? calc+"%":cmp.end.bottom+"%";
						break;
						
						case 'rotation':
							var calc = cmp.start.rotation + (elProgress*transValue);
							var val = ((calc >= cmp.start.rotation && calc <= cmp.end.rotation) 
										  || (calc <= cmp.start.rotation && calc >= cmp.end.rotation)) ? 
												  " rotate("+calc+"deg) " : " rotate("+cmp.end.rotation+"deg) ";
							style['-webkit-transform'] = (style['-webkit-transform']) ? style['-webkit-transform']+val : val; 
						break;
						
						case 'scale':
							var calc = cmp.start.scale + (elProgress*transValue);
							var val  = ((calc >= cmp.start.scale && calc <= cmp.end.scale) 
										  || (calc <= cmp.start.scale && calc >= cmp.end.scale)) ? 
												  " scale("+calc+") " : " scale("+cmp.end.scale+") ";
							style['-webkit-transform'] = (style['-webkit-transform']) ? style['-webkit-transform']+val : val;
						break;
						
						case 'opacity':
							var calc = cmp.start.opacity + (elProgress > 2) ? (elProgress*transValue) : 0;
							style['opacity'] = ((calc >= cmp.start.opacity && calc <= cmp.end.opacity) 
									  	|| (calc <= cmp.start.opacity && calc >= cmp.end.opacity)) ? calc:cmp.end.opacity;
						break;
						
						case 'height':
							var calc = cmp.start.height + (elProgress > 0.5) ? (elProgress*transValue) : 0;
							style['height'] = ((calc >= cmp.start.height && calc <= cmp.end.height) 
								  	|| (calc <= cmp.start.height && calc >= cmp.end.height)) ? calc+'%':cmp.end.height+'%';
						break;
						
					}
				}
				
				/** apply the style to the component **/
				cmp._el.css(style);
			}
		},
		
		checkTriggers: function(component, areaProgress) {
			
			for(var triggerName in component.triggers) {
				var triggerValue = component.triggers[triggerName];
				switch (triggerName) {
					
					/** check a delay **/
					case "delay" :
						if(areaProgress >= triggerValue) {
							methods.activateComponent(component);
						} else {
							methods.deactivateComponent(component);
						}
					break;
					
					/** add a class to the component **/
					case "addClass" :
						component._task = (!component._taskDone) ? 'ac' : null;
						component._taskVal = triggerValue;
					break;
					
					case "removeClass" :
						component._task = (!component._taskDone) ? 'rc' : null;
						component._taskVal = triggerValue;
					break;
					
				}
					
			}
			
		},
		
		checkDirection: function(component) {
			
			if(!component.direction) {
				return true;
			}

			if(data.viewport._scrollDir == component.direction) {
				return true;
			}
			
			return false;
		},
		
		/** 
		 * The Listener for all scrolling. 
		 */
		scrollListener: function() {
			
			/** update the viewport settings **/
			var vp = data.viewport;
			vp._lastScrollPos  = vp._scrollPosition; 
			vp._scrollPosition = vp._el.scrollTop();
			vp._scrollDiff	   = Math.abs(vp._scrollPosition - vp._scrollPosition);
			vp._scrollDir	   = (vp._scrollPosition > vp._lastScrollPos) ? 'd':'u';
			
			/** check the boundaries for this area **/
			if(methods.checkAreaBoundarys(vp._activeArea, vp._scrollPosition)) {
				/** if in the boundaries then animate the components **/
				methods.positionAreaComponents();
			} else {
				/** else we need to change the area, lets find it **/
				var d = (vp._scrollDir == 'd') ? 'next':'prev';
				methods.activateArea(d);
			}
			
		}
		
	}//methods

	/** Nice Namespaced plugin definition **/
	$.fn.SuperScroller = function(method) {
		if(typeof methods[method] == "function") {
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1))
		} else if (typeof method == "object" || !method){
			return methods.init.apply(this, arguments);
		} else {
			$.error('Method does not exist');
		}
	}//Class Definition
})(jQuery);