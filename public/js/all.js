/* =========================================================
 * bootstrap-datepicker.js
 * Repo: https://github.com/eternicode/bootstrap-datepicker/
 * Demo: http://eternicode.github.io/bootstrap-datepicker/
 * Docs: http://bootstrap-datepicker.readthedocs.org/
 * Forked from http://www.eyecon.ro/bootstrap-datepicker
 * =========================================================
 * Started by Stefan Petre; improvements by Andrew Rowls + contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================= */

(function($, undefined){

	var $window = $(window);

	function UTCDate(){
		return new Date(Date.UTC.apply(Date, arguments));
	}
	function UTCToday(){
		var today = new Date();
		return UTCDate(today.getFullYear(), today.getMonth(), today.getDate());
	}
	function alias(method){
		return function(){
			return this[method].apply(this, arguments);
		};
	}

	var DateArray = (function(){
		var extras = {
			get: function(i){
				return this.slice(i)[0];
			},
			contains: function(d){
				// Array.indexOf is not cross-browser;
				// $.inArray doesn't work with Dates
				var val = d && d.valueOf();
				for (var i=0, l=this.length; i < l; i++)
					if (this[i].valueOf() === val)
						return i;
				return -1;
			},
			remove: function(i){
				this.splice(i,1);
			},
			replace: function(new_array){
				if (!new_array)
					return;
				if (!$.isArray(new_array))
					new_array = [new_array];
				this.clear();
				this.push.apply(this, new_array);
			},
			clear: function(){
				this.length = 0;
			},
			copy: function(){
				var a = new DateArray();
				a.replace(this);
				return a;
			}
		};

		return function(){
			var a = [];
			a.push.apply(a, arguments);
			$.extend(a, extras);
			return a;
		};
	})();


	// Picker object

	var Datepicker = function(element, options){
		this.dates = new DateArray();
		this.viewDate = UTCToday();
		this.focusDate = null;

		this._process_options(options);

		this.element = $(element);
		this.isInline = false;
		this.isInput = this.element.is('input');
		this.component = this.element.is('.date') ? this.element.find('.add-on, .input-group-addon, .btn') : false;
		this.hasInput = this.component && this.element.find('input').length;
		if (this.component && this.component.length === 0)
			this.component = false;

		this.picker = $(DPGlobal.template);
		this._buildEvents();
		this._attachEvents();

		if (this.isInline){
			this.picker.addClass('datepicker-inline').appendTo(this.element);
		}
		else {
			this.picker.addClass('datepicker-dropdown dropdown-menu');
		}

		if (this.o.rtl){
			this.picker.addClass('datepicker-rtl');
		}

		this.viewMode = this.o.startView;

		if (this.o.calendarWeeks)
			this.picker.find('tfoot th.today')
						.attr('colspan', function(i, val){
							return parseInt(val) + 1;
						});

		this._allow_update = false;

		this.setStartDate(this._o.startDate);
		this.setEndDate(this._o.endDate);
		this.setDaysOfWeekDisabled(this.o.daysOfWeekDisabled);

		this.fillDow();
		this.fillMonths();

		this._allow_update = true;

		this.update();
		this.showMode();

		if (this.isInline){
			this.show();
		}
	};

	Datepicker.prototype = {
		constructor: Datepicker,

		_process_options: function(opts){
			// Store raw options for reference
			this._o = $.extend({}, this._o, opts);
			// Processed options
			var o = this.o = $.extend({}, this._o);

			// Check if "de-DE" style date is available, if not language should
			// fallback to 2 letter code eg "de"
			var lang = o.language;
			if (!dates[lang]){
				lang = lang.split('-')[0];
				if (!dates[lang])
					lang = defaults.language;
			}
			o.language = lang;

			switch (o.startView){
				case 2:
				case 'decade':
					o.startView = 2;
					break;
				case 1:
				case 'year':
					o.startView = 1;
					break;
				default:
					o.startView = 0;
			}

			switch (o.minViewMode){
				case 1:
				case 'months':
					o.minViewMode = 1;
					break;
				case 2:
				case 'years':
					o.minViewMode = 2;
					break;
				default:
					o.minViewMode = 0;
			}

			o.startView = Math.max(o.startView, o.minViewMode);

			// true, false, or Number > 0
			if (o.multidate !== true){
				o.multidate = Number(o.multidate) || false;
				if (o.multidate !== false)
					o.multidate = Math.max(0, o.multidate);
				else
					o.multidate = 1;
			}
			o.multidateSeparator = String(o.multidateSeparator);

			o.weekStart %= 7;
			o.weekEnd = ((o.weekStart + 6) % 7);

			var format = DPGlobal.parseFormat(o.format);
			if (o.startDate !== -Infinity){
				if (!!o.startDate){
					if (o.startDate instanceof Date)
						o.startDate = this._local_to_utc(this._zero_time(o.startDate));
					else
						o.startDate = DPGlobal.parseDate(o.startDate, format, o.language);
				}
				else {
					o.startDate = -Infinity;
				}
			}
			if (o.endDate !== Infinity){
				if (!!o.endDate){
					if (o.endDate instanceof Date)
						o.endDate = this._local_to_utc(this._zero_time(o.endDate));
					else
						o.endDate = DPGlobal.parseDate(o.endDate, format, o.language);
				}
				else {
					o.endDate = Infinity;
				}
			}

			o.daysOfWeekDisabled = o.daysOfWeekDisabled||[];
			if (!$.isArray(o.daysOfWeekDisabled))
				o.daysOfWeekDisabled = o.daysOfWeekDisabled.split(/[,\s]*/);
			o.daysOfWeekDisabled = $.map(o.daysOfWeekDisabled, function(d){
				return parseInt(d, 10);
			});

			var plc = String(o.orientation).toLowerCase().split(/\s+/g),
				_plc = o.orientation.toLowerCase();
			plc = $.grep(plc, function(word){
				return (/^auto|left|right|top|bottom$/).test(word);
			});
			o.orientation = {x: 'auto', y: 'auto'};
			if (!_plc || _plc === 'auto')
				; // no action
			else if (plc.length === 1){
				switch (plc[0]){
					case 'top':
					case 'bottom':
						o.orientation.y = plc[0];
						break;
					case 'left':
					case 'right':
						o.orientation.x = plc[0];
						break;
				}
			}
			else {
				_plc = $.grep(plc, function(word){
					return (/^left|right$/).test(word);
				});
				o.orientation.x = _plc[0] || 'auto';

				_plc = $.grep(plc, function(word){
					return (/^top|bottom$/).test(word);
				});
				o.orientation.y = _plc[0] || 'auto';
			}
		},
		_events: [],
		_secondaryEvents: [],
		_applyEvents: function(evs){
			for (var i=0, el, ch, ev; i < evs.length; i++){
				el = evs[i][0];
				if (evs[i].length === 2){
					ch = undefined;
					ev = evs[i][1];
				}
				else if (evs[i].length === 3){
					ch = evs[i][1];
					ev = evs[i][2];
				}
				el.on(ev, ch);
			}
		},
		_unapplyEvents: function(evs){
			for (var i=0, el, ev, ch; i < evs.length; i++){
				el = evs[i][0];
				if (evs[i].length === 2){
					ch = undefined;
					ev = evs[i][1];
				}
				else if (evs[i].length === 3){
					ch = evs[i][1];
					ev = evs[i][2];
				}
				el.off(ev, ch);
			}
		},
		_buildEvents: function(){
			if (this.isInput){ // single input
				this._events = [
					[this.element, {
						focus: $.proxy(this.show, this),
						keyup: $.proxy(function(e){
							if ($.inArray(e.keyCode, [27,37,39,38,40,32,13,9]) === -1)
								this.update();
						}, this),
						keydown: $.proxy(this.keydown, this)
					}]
				];
			}
			else if (this.component && this.hasInput){ // component: input + button
				this._events = [
					// For components that are not readonly, allow keyboard nav
					[this.element.find('input'), {
						focus: $.proxy(this.show, this),
						keyup: $.proxy(function(e){
							if ($.inArray(e.keyCode, [27,37,39,38,40,32,13,9]) === -1)
								this.update();
						}, this),
						keydown: $.proxy(this.keydown, this)
					}],
					[this.component, {
						click: $.proxy(this.show, this)
					}]
				];
			}
			else if (this.element.is('div')){  // inline datepicker
				this.isInline = true;
			}
			else {
				this._events = [
					[this.element, {
						click: $.proxy(this.show, this)
					}]
				];
			}
			this._events.push(
				// Component: listen for blur on element descendants
				[this.element, '*', {
					blur: $.proxy(function(e){
						this._focused_from = e.target;
					}, this)
				}],
				// Input: listen for blur on element
				[this.element, {
					blur: $.proxy(function(e){
						this._focused_from = e.target;
					}, this)
				}]
			);

			this._secondaryEvents = [
				[this.picker, {
					click: $.proxy(this.click, this)
				}],
				[$(window), {
					resize: $.proxy(this.place, this)
				}],
				[$(document), {
					'mousedown touchstart': $.proxy(function(e){
						// Clicked outside the datepicker, hide it
						if (!(
							this.element.is(e.target) ||
							this.element.find(e.target).length ||
							this.picker.is(e.target) ||
							this.picker.find(e.target).length
						)){
							this.hide();
						}
					}, this)
				}]
			];
		},
		_attachEvents: function(){
			this._detachEvents();
			this._applyEvents(this._events);
		},
		_detachEvents: function(){
			this._unapplyEvents(this._events);
		},
		_attachSecondaryEvents: function(){
			this._detachSecondaryEvents();
			this._applyEvents(this._secondaryEvents);
		},
		_detachSecondaryEvents: function(){
			this._unapplyEvents(this._secondaryEvents);
		},
		_trigger: function(event, altdate){
			var date = altdate || this.dates.get(-1),
				local_date = this._utc_to_local(date);

			this.element.trigger({
				type: event,
				date: local_date,
				dates: $.map(this.dates, this._utc_to_local),
				format: $.proxy(function(ix, format){
					if (arguments.length === 0){
						ix = this.dates.length - 1;
						format = this.o.format;
					}
					else if (typeof ix === 'string'){
						format = ix;
						ix = this.dates.length - 1;
					}
					format = format || this.o.format;
					var date = this.dates.get(ix);
					return DPGlobal.formatDate(date, format, this.o.language);
				}, this)
			});
		},

		show: function(){
			if (!this.isInline)
				this.picker.appendTo('body');
			this.picker.show();
			this.place();
			this._attachSecondaryEvents();
			this._trigger('show');
		},

		hide: function(){
			if (this.isInline)
				return;
			if (!this.picker.is(':visible'))
				return;
			this.focusDate = null;
			this.picker.hide().detach();
			this._detachSecondaryEvents();
			this.viewMode = this.o.startView;
			this.showMode();

			if (
				this.o.forceParse &&
				(
					this.isInput && this.element.val() ||
					this.hasInput && this.element.find('input').val()
				)
			)
				this.setValue();
			this._trigger('hide');
		},

		remove: function(){
			this.hide();
			this._detachEvents();
			this._detachSecondaryEvents();
			this.picker.remove();
			delete this.element.data().datepicker;
			if (!this.isInput){
				delete this.element.data().date;
			}
		},

		_utc_to_local: function(utc){
			return utc && new Date(utc.getTime() + (utc.getTimezoneOffset()*60000));
		},
		_local_to_utc: function(local){
			return local && new Date(local.getTime() - (local.getTimezoneOffset()*60000));
		},
		_zero_time: function(local){
			return local && new Date(local.getFullYear(), local.getMonth(), local.getDate());
		},
		_zero_utc_time: function(utc){
			return utc && new Date(Date.UTC(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()));
		},

		getDates: function(){
			return $.map(this.dates, this._utc_to_local);
		},

		getUTCDates: function(){
			return $.map(this.dates, function(d){
				return new Date(d);
			});
		},

		getDate: function(){
			return this._utc_to_local(this.getUTCDate());
		},

		getUTCDate: function(){
			return new Date(this.dates.get(-1));
		},

		setDates: function(){
			var args = $.isArray(arguments[0]) ? arguments[0] : arguments;
			this.update.apply(this, args);
			this._trigger('changeDate');
			this.setValue();
		},

		setUTCDates: function(){
			var args = $.isArray(arguments[0]) ? arguments[0] : arguments;
			this.update.apply(this, $.map(args, this._utc_to_local));
			this._trigger('changeDate');
			this.setValue();
		},

		setDate: alias('setDates'),
		setUTCDate: alias('setUTCDates'),

		setValue: function(){
			var formatted = this.getFormattedDate();
			if (!this.isInput){
				if (this.component){
					this.element.find('input').val(formatted).change();
				}
			}
			else {
				this.element.val(formatted).change();
			}
		},

		getFormattedDate: function(format){
			if (format === undefined)
				format = this.o.format;

			var lang = this.o.language;
			return $.map(this.dates, function(d){
				return DPGlobal.formatDate(d, format, lang);
			}).join(this.o.multidateSeparator);
		},

		setStartDate: function(startDate){
			this._process_options({startDate: startDate});
			this.update();
			this.updateNavArrows();
		},

		setEndDate: function(endDate){
			this._process_options({endDate: endDate});
			this.update();
			this.updateNavArrows();
		},

		setDaysOfWeekDisabled: function(daysOfWeekDisabled){
			this._process_options({daysOfWeekDisabled: daysOfWeekDisabled});
			this.update();
			this.updateNavArrows();
		},

		place: function(){
			if (this.isInline)
				return;
			var calendarWidth = this.picker.outerWidth(),
				calendarHeight = this.picker.outerHeight(),
				visualPadding = 10,
				windowWidth = $window.width(),
				windowHeight = $window.height(),
				scrollTop = $window.scrollTop();

			var zIndex = parseInt(this.element.parents().filter(function(){
					return $(this).css('z-index') !== 'auto';
				}).first().css('z-index'))+10;
			var offset = this.component ? this.component.parent().offset() : this.element.offset();
			var height = this.component ? this.component.outerHeight(true) : this.element.outerHeight(false);
			var width = this.component ? this.component.outerWidth(true) : this.element.outerWidth(false);
			var left = offset.left,
				top = offset.top;

			this.picker.removeClass(
				'datepicker-orient-top datepicker-orient-bottom '+
				'datepicker-orient-right datepicker-orient-left'
			);

			if (this.o.orientation.x !== 'auto'){
				this.picker.addClass('datepicker-orient-' + this.o.orientation.x);
				if (this.o.orientation.x === 'right')
					left -= calendarWidth - width;
			}
			// auto x orientation is best-placement: if it crosses a window
			// edge, fudge it sideways
			else {
				// Default to left
				this.picker.addClass('datepicker-orient-left');
				if (offset.left < 0)
					left -= offset.left - visualPadding;
				else if (offset.left + calendarWidth > windowWidth)
					left = windowWidth - calendarWidth - visualPadding;
			}

			// auto y orientation is best-situation: top or bottom, no fudging,
			// decision based on which shows more of the calendar
			var yorient = this.o.orientation.y,
				top_overflow, bottom_overflow;
			if (yorient === 'auto'){
				top_overflow = -scrollTop + offset.top - calendarHeight;
				bottom_overflow = scrollTop + windowHeight - (offset.top + height + calendarHeight);
				if (Math.max(top_overflow, bottom_overflow) === bottom_overflow)
					yorient = 'top';
				else
					yorient = 'bottom';
			}
			this.picker.addClass('datepicker-orient-' + yorient);
			if (yorient === 'top')
				top += height;
			else
				top -= calendarHeight + parseInt(this.picker.css('padding-top'));

			this.picker.css({
				top: top,
				left: left,
				zIndex: zIndex
			});
		},

		_allow_update: true,
		update: function(){
			if (!this._allow_update)
				return;

			var oldDates = this.dates.copy(),
				dates = [],
				fromArgs = false;
			if (arguments.length){
				$.each(arguments, $.proxy(function(i, date){
					if (date instanceof Date)
						date = this._local_to_utc(date);
					dates.push(date);
				}, this));
				fromArgs = true;
			}
			else {
				dates = this.isInput
						? this.element.val()
						: this.element.data('date') || this.element.find('input').val();
				if (dates && this.o.multidate)
					dates = dates.split(this.o.multidateSeparator);
				else
					dates = [dates];
				delete this.element.data().date;
			}

			dates = $.map(dates, $.proxy(function(date){
				return DPGlobal.parseDate(date, this.o.format, this.o.language);
			}, this));
			dates = $.grep(dates, $.proxy(function(date){
				return (
					date < this.o.startDate ||
					date > this.o.endDate ||
					!date
				);
			}, this), true);
			this.dates.replace(dates);

			if (this.dates.length)
				this.viewDate = new Date(this.dates.get(-1));
			else if (this.viewDate < this.o.startDate)
				this.viewDate = new Date(this.o.startDate);
			else if (this.viewDate > this.o.endDate)
				this.viewDate = new Date(this.o.endDate);

			if (fromArgs){
				// setting date by clicking
				this.setValue();
			}
			else if (dates.length){
				// setting date by typing
				if (String(oldDates) !== String(this.dates))
					this._trigger('changeDate');
			}
			if (!this.dates.length && oldDates.length)
				this._trigger('clearDate');

			this.fill();
		},

		fillDow: function(){
			var dowCnt = this.o.weekStart,
				html = '<tr>';
			if (this.o.calendarWeeks){
				var cell = '<th class="cw">&nbsp;</th>';
				html += cell;
				this.picker.find('.datepicker-days thead tr:first-child').prepend(cell);
			}
			while (dowCnt < this.o.weekStart + 7){
				html += '<th class="dow">'+dates[this.o.language].daysMin[(dowCnt++)%7]+'</th>';
			}
			html += '</tr>';
			this.picker.find('.datepicker-days thead').append(html);
		},

		fillMonths: function(){
			var html = '',
			i = 0;
			while (i < 12){
				html += '<span class="month">'+dates[this.o.language].monthsShort[i++]+'</span>';
			}
			this.picker.find('.datepicker-months td').html(html);
		},

		setRange: function(range){
			if (!range || !range.length)
				delete this.range;
			else
				this.range = $.map(range, function(d){
					return d.valueOf();
				});
			this.fill();
		},

		getClassNames: function(date){
			var cls = [],
				year = this.viewDate.getUTCFullYear(),
				month = this.viewDate.getUTCMonth(),
				today = new Date();
			if (date.getUTCFullYear() < year || (date.getUTCFullYear() === year && date.getUTCMonth() < month)){
				cls.push('old');
			}
			else if (date.getUTCFullYear() > year || (date.getUTCFullYear() === year && date.getUTCMonth() > month)){
				cls.push('new');
			}
			if (this.focusDate && date.valueOf() === this.focusDate.valueOf())
				cls.push('focused');
			// Compare internal UTC date with local today, not UTC today
			if (this.o.todayHighlight &&
				date.getUTCFullYear() === today.getFullYear() &&
				date.getUTCMonth() === today.getMonth() &&
				date.getUTCDate() === today.getDate()){
				cls.push('today');
			}
			if (this.dates.contains(date) !== -1)
				cls.push('active');
			if (date.valueOf() < this.o.startDate || date.valueOf() > this.o.endDate ||
				$.inArray(date.getUTCDay(), this.o.daysOfWeekDisabled) !== -1){
				cls.push('disabled');
			}
			if (this.range){
				if (date > this.range[0] && date < this.range[this.range.length-1]){
					cls.push('range');
				}
				if ($.inArray(date.valueOf(), this.range) !== -1){
					cls.push('selected');
				}
			}
			return cls;
		},

		fill: function(){
			var d = new Date(this.viewDate),
				year = d.getUTCFullYear(),
				month = d.getUTCMonth(),
				startYear = this.o.startDate !== -Infinity ? this.o.startDate.getUTCFullYear() : -Infinity,
				startMonth = this.o.startDate !== -Infinity ? this.o.startDate.getUTCMonth() : -Infinity,
				endYear = this.o.endDate !== Infinity ? this.o.endDate.getUTCFullYear() : Infinity,
				endMonth = this.o.endDate !== Infinity ? this.o.endDate.getUTCMonth() : Infinity,
				todaytxt = dates[this.o.language].today || dates['en'].today || '',
				cleartxt = dates[this.o.language].clear || dates['en'].clear || '',
				tooltip;
			this.picker.find('.datepicker-days thead th.datepicker-switch')
						.text(dates[this.o.language].months[month]+' '+year);
			this.picker.find('tfoot th.today')
						.text(todaytxt)
						.toggle(this.o.todayBtn !== false);
			this.picker.find('tfoot th.clear')
						.text(cleartxt)
						.toggle(this.o.clearBtn !== false);
			this.updateNavArrows();
			this.fillMonths();
			var prevMonth = UTCDate(year, month-1, 28),
				day = DPGlobal.getDaysInMonth(prevMonth.getUTCFullYear(), prevMonth.getUTCMonth());
			prevMonth.setUTCDate(day);
			prevMonth.setUTCDate(day - (prevMonth.getUTCDay() - this.o.weekStart + 7)%7);
			var nextMonth = new Date(prevMonth);
			nextMonth.setUTCDate(nextMonth.getUTCDate() + 42);
			nextMonth = nextMonth.valueOf();
			var html = [];
			var clsName;
			while (prevMonth.valueOf() < nextMonth){
				if (prevMonth.getUTCDay() === this.o.weekStart){
					html.push('<tr>');
					if (this.o.calendarWeeks){
						// ISO 8601: First week contains first thursday.
						// ISO also states week starts on Monday, but we can be more abstract here.
						var
							// Start of current week: based on weekstart/current date
							ws = new Date(+prevMonth + (this.o.weekStart - prevMonth.getUTCDay() - 7) % 7 * 864e5),
							// Thursday of this week
							th = new Date(Number(ws) + (7 + 4 - ws.getUTCDay()) % 7 * 864e5),
							// First Thursday of year, year from thursday
							yth = new Date(Number(yth = UTCDate(th.getUTCFullYear(), 0, 1)) + (7 + 4 - yth.getUTCDay())%7*864e5),
							// Calendar week: ms between thursdays, div ms per day, div 7 days
							calWeek =  (th - yth) / 864e5 / 7 + 1;
						html.push('<td class="cw">'+ calWeek +'</td>');

					}
				}
				clsName = this.getClassNames(prevMonth);
				clsName.push('day');

				if (this.o.beforeShowDay !== $.noop){
					var before = this.o.beforeShowDay(this._utc_to_local(prevMonth));
					if (before === undefined)
						before = {};
					else if (typeof(before) === 'boolean')
						before = {enabled: before};
					else if (typeof(before) === 'string')
						before = {classes: before};
					if (before.enabled === false)
						clsName.push('disabled');
					if (before.classes)
						clsName = clsName.concat(before.classes.split(/\s+/));
					if (before.tooltip)
						tooltip = before.tooltip;
				}

				clsName = $.unique(clsName);
				html.push('<td class="'+clsName.join(' ')+'"' + (tooltip ? ' title="'+tooltip+'"' : '') + '>'+prevMonth.getUTCDate() + '</td>');
				if (prevMonth.getUTCDay() === this.o.weekEnd){
					html.push('</tr>');
				}
				prevMonth.setUTCDate(prevMonth.getUTCDate()+1);
			}
			this.picker.find('.datepicker-days tbody').empty().append(html.join(''));

			var months = this.picker.find('.datepicker-months')
						.find('th:eq(1)')
							.text(year)
							.end()
						.find('span').removeClass('active');

			$.each(this.dates, function(i, d){
				if (d.getUTCFullYear() === year)
					months.eq(d.getUTCMonth()).addClass('active');
			});

			if (year < startYear || year > endYear){
				months.addClass('disabled');
			}
			if (year === startYear){
				months.slice(0, startMonth).addClass('disabled');
			}
			if (year === endYear){
				months.slice(endMonth+1).addClass('disabled');
			}

			html = '';
			year = parseInt(year/10, 10) * 10;
			var yearCont = this.picker.find('.datepicker-years')
								.find('th:eq(1)')
									.text(year + '-' + (year + 9))
									.end()
								.find('td');
			year -= 1;
			var years = $.map(this.dates, function(d){
					return d.getUTCFullYear();
				}),
				classes;
			for (var i = -1; i < 11; i++){
				classes = ['year'];
				if (i === -1)
					classes.push('old');
				else if (i === 10)
					classes.push('new');
				if ($.inArray(year, years) !== -1)
					classes.push('active');
				if (year < startYear || year > endYear)
					classes.push('disabled');
				html += '<span class="' + classes.join(' ') + '">'+year+'</span>';
				year += 1;
			}
			yearCont.html(html);
		},

		updateNavArrows: function(){
			if (!this._allow_update)
				return;

			var d = new Date(this.viewDate),
				year = d.getUTCFullYear(),
				month = d.getUTCMonth();
			switch (this.viewMode){
				case 0:
					if (this.o.startDate !== -Infinity && year <= this.o.startDate.getUTCFullYear() && month <= this.o.startDate.getUTCMonth()){
						this.picker.find('.prev').css({visibility: 'hidden'});
					}
					else {
						this.picker.find('.prev').css({visibility: 'visible'});
					}
					if (this.o.endDate !== Infinity && year >= this.o.endDate.getUTCFullYear() && month >= this.o.endDate.getUTCMonth()){
						this.picker.find('.next').css({visibility: 'hidden'});
					}
					else {
						this.picker.find('.next').css({visibility: 'visible'});
					}
					break;
				case 1:
				case 2:
					if (this.o.startDate !== -Infinity && year <= this.o.startDate.getUTCFullYear()){
						this.picker.find('.prev').css({visibility: 'hidden'});
					}
					else {
						this.picker.find('.prev').css({visibility: 'visible'});
					}
					if (this.o.endDate !== Infinity && year >= this.o.endDate.getUTCFullYear()){
						this.picker.find('.next').css({visibility: 'hidden'});
					}
					else {
						this.picker.find('.next').css({visibility: 'visible'});
					}
					break;
			}
		},

		click: function(e){
			e.preventDefault();
			var target = $(e.target).closest('span, td, th'),
				year, month, day;
			if (target.length === 1){
				switch (target[0].nodeName.toLowerCase()){
					case 'th':
						switch (target[0].className){
							case 'datepicker-switch':
								this.showMode(1);
								break;
							case 'prev':
							case 'next':
								var dir = DPGlobal.modes[this.viewMode].navStep * (target[0].className === 'prev' ? -1 : 1);
								switch (this.viewMode){
									case 0:
										this.viewDate = this.moveMonth(this.viewDate, dir);
										this._trigger('changeMonth', this.viewDate);
										break;
									case 1:
									case 2:
										this.viewDate = this.moveYear(this.viewDate, dir);
										if (this.viewMode === 1)
											this._trigger('changeYear', this.viewDate);
										break;
								}
								this.fill();
								break;
							case 'today':
								var date = new Date();
								date = UTCDate(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);

								this.showMode(-2);
								var which = this.o.todayBtn === 'linked' ? null : 'view';
								this._setDate(date, which);
								break;
							case 'clear':
								var element;
								if (this.isInput)
									element = this.element;
								else if (this.component)
									element = this.element.find('input');
								if (element)
									element.val("").change();
								this.update();
								this._trigger('changeDate');
								if (this.o.autoclose)
									this.hide();
								break;
						}
						break;
					case 'span':
						if (!target.is('.disabled')){
							this.viewDate.setUTCDate(1);
							if (target.is('.month')){
								day = 1;
								month = target.parent().find('span').index(target);
								year = this.viewDate.getUTCFullYear();
								this.viewDate.setUTCMonth(month);
								this._trigger('changeMonth', this.viewDate);
								if (this.o.minViewMode === 1){
									this._setDate(UTCDate(year, month, day));
								}
							}
							else {
								day = 1;
								month = 0;
								year = parseInt(target.text(), 10)||0;
								this.viewDate.setUTCFullYear(year);
								this._trigger('changeYear', this.viewDate);
								if (this.o.minViewMode === 2){
									this._setDate(UTCDate(year, month, day));
								}
							}
							this.showMode(-1);
							this.fill();
						}
						break;
					case 'td':
						if (target.is('.day') && !target.is('.disabled')){
							day = parseInt(target.text(), 10)||1;
							year = this.viewDate.getUTCFullYear();
							month = this.viewDate.getUTCMonth();
							if (target.is('.old')){
								if (month === 0){
									month = 11;
									year -= 1;
								}
								else {
									month -= 1;
								}
							}
							else if (target.is('.new')){
								if (month === 11){
									month = 0;
									year += 1;
								}
								else {
									month += 1;
								}
							}
							this._setDate(UTCDate(year, month, day));
						}
						break;
				}
			}
			if (this.picker.is(':visible') && this._focused_from){
				$(this._focused_from).focus();
			}
			delete this._focused_from;
		},

		_toggle_multidate: function(date){
			var ix = this.dates.contains(date);
			if (!date){
				this.dates.clear();
			}
			else if (ix !== -1){
				this.dates.remove(ix);
			}
			else {
				this.dates.push(date);
			}
			if (typeof this.o.multidate === 'number')
				while (this.dates.length > this.o.multidate)
					this.dates.remove(0);
		},

		_setDate: function(date, which){
			if (!which || which === 'date')
				this._toggle_multidate(date && new Date(date));
			if (!which || which  === 'view')
				this.viewDate = date && new Date(date);

			this.fill();
			this.setValue();
			this._trigger('changeDate');
			var element;
			if (this.isInput){
				element = this.element;
			}
			else if (this.component){
				element = this.element.find('input');
			}
			if (element){
				element.change();
			}
			if (this.o.autoclose && (!which || which === 'date')){
				this.hide();
			}
		},

		moveMonth: function(date, dir){
			if (!date)
				return undefined;
			if (!dir)
				return date;
			var new_date = new Date(date.valueOf()),
				day = new_date.getUTCDate(),
				month = new_date.getUTCMonth(),
				mag = Math.abs(dir),
				new_month, test;
			dir = dir > 0 ? 1 : -1;
			if (mag === 1){
				test = dir === -1
					// If going back one month, make sure month is not current month
					// (eg, Mar 31 -> Feb 31 == Feb 28, not Mar 02)
					? function(){
						return new_date.getUTCMonth() === month;
					}
					// If going forward one month, make sure month is as expected
					// (eg, Jan 31 -> Feb 31 == Feb 28, not Mar 02)
					: function(){
						return new_date.getUTCMonth() !== new_month;
					};
				new_month = month + dir;
				new_date.setUTCMonth(new_month);
				// Dec -> Jan (12) or Jan -> Dec (-1) -- limit expected date to 0-11
				if (new_month < 0 || new_month > 11)
					new_month = (new_month + 12) % 12;
			}
			else {
				// For magnitudes >1, move one month at a time...
				for (var i=0; i < mag; i++)
					// ...which might decrease the day (eg, Jan 31 to Feb 28, etc)...
					new_date = this.moveMonth(new_date, dir);
				// ...then reset the day, keeping it in the new month
				new_month = new_date.getUTCMonth();
				new_date.setUTCDate(day);
				test = function(){
					return new_month !== new_date.getUTCMonth();
				};
			}
			// Common date-resetting loop -- if date is beyond end of month, make it
			// end of month
			while (test()){
				new_date.setUTCDate(--day);
				new_date.setUTCMonth(new_month);
			}
			return new_date;
		},

		moveYear: function(date, dir){
			return this.moveMonth(date, dir*12);
		},

		dateWithinRange: function(date){
			return date >= this.o.startDate && date <= this.o.endDate;
		},

		keydown: function(e){
			if (this.picker.is(':not(:visible)')){
				if (e.keyCode === 27) // allow escape to hide and re-show picker
					this.show();
				return;
			}
			var dateChanged = false,
				dir, newDate, newViewDate,
				focusDate = this.focusDate || this.viewDate;
			switch (e.keyCode){
				case 27: // escape
					if (this.focusDate){
						this.focusDate = null;
						this.viewDate = this.dates.get(-1) || this.viewDate;
						this.fill();
					}
					else
						this.hide();
					e.preventDefault();
					break;
				case 37: // left
				case 39: // right
					if (!this.o.keyboardNavigation)
						break;
					dir = e.keyCode === 37 ? -1 : 1;
					if (e.ctrlKey){
						newDate = this.moveYear(this.dates.get(-1) || UTCToday(), dir);
						newViewDate = this.moveYear(focusDate, dir);
						this._trigger('changeYear', this.viewDate);
					}
					else if (e.shiftKey){
						newDate = this.moveMonth(this.dates.get(-1) || UTCToday(), dir);
						newViewDate = this.moveMonth(focusDate, dir);
						this._trigger('changeMonth', this.viewDate);
					}
					else {
						newDate = new Date(this.dates.get(-1) || UTCToday());
						newDate.setUTCDate(newDate.getUTCDate() + dir);
						newViewDate = new Date(focusDate);
						newViewDate.setUTCDate(focusDate.getUTCDate() + dir);
					}
					if (this.dateWithinRange(newDate)){
						this.focusDate = this.viewDate = newViewDate;
						this.setValue();
						this.fill();
						e.preventDefault();
					}
					break;
				case 38: // up
				case 40: // down
					if (!this.o.keyboardNavigation)
						break;
					dir = e.keyCode === 38 ? -1 : 1;
					if (e.ctrlKey){
						newDate = this.moveYear(this.dates.get(-1) || UTCToday(), dir);
						newViewDate = this.moveYear(focusDate, dir);
						this._trigger('changeYear', this.viewDate);
					}
					else if (e.shiftKey){
						newDate = this.moveMonth(this.dates.get(-1) || UTCToday(), dir);
						newViewDate = this.moveMonth(focusDate, dir);
						this._trigger('changeMonth', this.viewDate);
					}
					else {
						newDate = new Date(this.dates.get(-1) || UTCToday());
						newDate.setUTCDate(newDate.getUTCDate() + dir * 7);
						newViewDate = new Date(focusDate);
						newViewDate.setUTCDate(focusDate.getUTCDate() + dir * 7);
					}
					if (this.dateWithinRange(newDate)){
						this.focusDate = this.viewDate = newViewDate;
						this.setValue();
						this.fill();
						e.preventDefault();
					}
					break;
				case 32: // spacebar
					// Spacebar is used in manually typing dates in some formats.
					// As such, its behavior should not be hijacked.
					break;
				case 13: // enter
					focusDate = this.focusDate || this.dates.get(-1) || this.viewDate;
					this._toggle_multidate(focusDate);
					dateChanged = true;
					this.focusDate = null;
					this.viewDate = this.dates.get(-1) || this.viewDate;
					this.setValue();
					this.fill();
					if (this.picker.is(':visible')){
						e.preventDefault();
						if (this.o.autoclose)
							this.hide();
					}
					break;
				case 9: // tab
					this.focusDate = null;
					this.viewDate = this.dates.get(-1) || this.viewDate;
					this.fill();
					this.hide();
					break;
			}
			if (dateChanged){
				if (this.dates.length)
					this._trigger('changeDate');
				else
					this._trigger('clearDate');
				var element;
				if (this.isInput){
					element = this.element;
				}
				else if (this.component){
					element = this.element.find('input');
				}
				if (element){
					element.change();
				}
			}
		},

		showMode: function(dir){
			if (dir){
				this.viewMode = Math.max(this.o.minViewMode, Math.min(2, this.viewMode + dir));
			}
			this.picker
				.find('>div')
				.hide()
				.filter('.datepicker-'+DPGlobal.modes[this.viewMode].clsName)
					.css('display', 'block');
			this.updateNavArrows();
		}
	};

	var DateRangePicker = function(element, options){
		this.element = $(element);
		this.inputs = $.map(options.inputs, function(i){
			return i.jquery ? i[0] : i;
		});
		delete options.inputs;

		$(this.inputs)
			.datepicker(options)
			.bind('changeDate', $.proxy(this.dateUpdated, this));

		this.pickers = $.map(this.inputs, function(i){
			return $(i).data('datepicker');
		});
		this.updateDates();
	};
	DateRangePicker.prototype = {
		updateDates: function(){
			this.dates = $.map(this.pickers, function(i){
				return i.getUTCDate();
			});
			this.updateRanges();
		},
		updateRanges: function(){
			var range = $.map(this.dates, function(d){
				return d.valueOf();
			});
			$.each(this.pickers, function(i, p){
				p.setRange(range);
			});
		},
		dateUpdated: function(e){
			// `this.updating` is a workaround for preventing infinite recursion
			// between `changeDate` triggering and `setUTCDate` calling.  Until
			// there is a better mechanism.
			if (this.updating)
				return;
			this.updating = true;

			var dp = $(e.target).data('datepicker'),
				new_date = dp.getUTCDate(),
				i = $.inArray(e.target, this.inputs),
				l = this.inputs.length;
			if (i === -1)
				return;

			$.each(this.pickers, function(i, p){
				if (!p.getUTCDate())
					p.setUTCDate(new_date);
			});

			if (new_date < this.dates[i]){
				// Date being moved earlier/left
				while (i >= 0 && new_date < this.dates[i]){
					this.pickers[i--].setUTCDate(new_date);
				}
			}
			else if (new_date > this.dates[i]){
				// Date being moved later/right
				while (i < l && new_date > this.dates[i]){
					this.pickers[i++].setUTCDate(new_date);
				}
			}
			this.updateDates();

			delete this.updating;
		},
		remove: function(){
			$.map(this.pickers, function(p){ p.remove(); });
			delete this.element.data().datepicker;
		}
	};

	function opts_from_el(el, prefix){
		// Derive options from element data-attrs
		var data = $(el).data(),
			out = {}, inkey,
			replace = new RegExp('^' + prefix.toLowerCase() + '([A-Z])');
		prefix = new RegExp('^' + prefix.toLowerCase());
		function re_lower(_,a){
			return a.toLowerCase();
		}
		for (var key in data)
			if (prefix.test(key)){
				inkey = key.replace(replace, re_lower);
				out[inkey] = data[key];
			}
		return out;
	}

	function opts_from_locale(lang){
		// Derive options from locale plugins
		var out = {};
		// Check if "de-DE" style date is available, if not language should
		// fallback to 2 letter code eg "de"
		if (!dates[lang]){
			lang = lang.split('-')[0];
			if (!dates[lang])
				return;
		}
		var d = dates[lang];
		$.each(locale_opts, function(i,k){
			if (k in d)
				out[k] = d[k];
		});
		return out;
	}

	var old = $.fn.datepicker;
	$.fn.datepicker = function(option){
		var args = Array.apply(null, arguments);
		args.shift();
		var internal_return;
		this.each(function(){
			var $this = $(this),
				data = $this.data('datepicker'),
				options = typeof option === 'object' && option;
			if (!data){
				var elopts = opts_from_el(this, 'date'),
					// Preliminary otions
					xopts = $.extend({}, defaults, elopts, options),
					locopts = opts_from_locale(xopts.language),
					// Options priority: js args, data-attrs, locales, defaults
					opts = $.extend({}, defaults, locopts, elopts, options);
				if ($this.is('.input-daterange') || opts.inputs){
					var ropts = {
						inputs: opts.inputs || $this.find('input').toArray()
					};
					$this.data('datepicker', (data = new DateRangePicker(this, $.extend(opts, ropts))));
				}
				else {
					$this.data('datepicker', (data = new Datepicker(this, opts)));
				}
			}
			if (typeof option === 'string' && typeof data[option] === 'function'){
				internal_return = data[option].apply(data, args);
				if (internal_return !== undefined)
					return false;
			}
		});
		if (internal_return !== undefined)
			return internal_return;
		else
			return this;
	};

	var defaults = $.fn.datepicker.defaults = {
		autoclose: false,
		beforeShowDay: $.noop,
		calendarWeeks: false,
		clearBtn: false,
		daysOfWeekDisabled: [],
		endDate: Infinity,
		forceParse: true,
		format: 'mm/dd/yyyy',
		keyboardNavigation: true,
		language: 'en',
		minViewMode: 0,
		multidate: false,
		multidateSeparator: ',',
		orientation: "auto",
		rtl: false,
		startDate: -Infinity,
		startView: 0,
		todayBtn: false,
		todayHighlight: false,
		weekStart: 0
	};
	var locale_opts = $.fn.datepicker.locale_opts = [
		'format',
		'rtl',
		'weekStart'
	];
	$.fn.datepicker.Constructor = Datepicker;
	var dates = $.fn.datepicker.dates = {
		en: {
			days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
			daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
			daysMin: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
			months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
			monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
			today: "Today",
			clear: "Clear"
		}
	};

	var DPGlobal = {
		modes: [
			{
				clsName: 'days',
				navFnc: 'Month',
				navStep: 1
			},
			{
				clsName: 'months',
				navFnc: 'FullYear',
				navStep: 1
			},
			{
				clsName: 'years',
				navFnc: 'FullYear',
				navStep: 10
		}],
		isLeapYear: function(year){
			return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0));
		},
		getDaysInMonth: function(year, month){
			return [31, (DPGlobal.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
		},
		validParts: /dd?|DD?|mm?|MM?|yy(?:yy)?/g,
		nonpunctuation: /[^ -\/:-@\[\u3400-\u9fff-`{-~\t\n\r]+/g,
		parseFormat: function(format){
			// IE treats \0 as a string end in inputs (truncating the value),
			// so it's a bad format delimiter, anyway
			var separators = format.replace(this.validParts, '\0').split('\0'),
				parts = format.match(this.validParts);
			if (!separators || !separators.length || !parts || parts.length === 0){
				throw new Error("Invalid date format.");
			}
			return {separators: separators, parts: parts};
		},
		parseDate: function(date, format, language){
			if (!date)
				return undefined;
			if (date instanceof Date)
				return date;
			if (typeof format === 'string')
				format = DPGlobal.parseFormat(format);
			var part_re = /([\-+]\d+)([dmwy])/,
				parts = date.match(/([\-+]\d+)([dmwy])/g),
				part, dir, i;
			if (/^[\-+]\d+[dmwy]([\s,]+[\-+]\d+[dmwy])*$/.test(date)){
				date = new Date();
				for (i=0; i < parts.length; i++){
					part = part_re.exec(parts[i]);
					dir = parseInt(part[1]);
					switch (part[2]){
						case 'd':
							date.setUTCDate(date.getUTCDate() + dir);
							break;
						case 'm':
							date = Datepicker.prototype.moveMonth.call(Datepicker.prototype, date, dir);
							break;
						case 'w':
							date.setUTCDate(date.getUTCDate() + dir * 7);
							break;
						case 'y':
							date = Datepicker.prototype.moveYear.call(Datepicker.prototype, date, dir);
							break;
					}
				}
				return UTCDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0);
			}
			parts = date && date.match(this.nonpunctuation) || [];
			date = new Date();
			var parsed = {},
				setters_order = ['yyyy', 'yy', 'M', 'MM', 'm', 'mm', 'd', 'dd'],
				setters_map = {
					yyyy: function(d,v){
						return d.setUTCFullYear(v);
					},
					yy: function(d,v){
						return d.setUTCFullYear(2000+v);
					},
					m: function(d,v){
						if (isNaN(d))
							return d;
						v -= 1;
						while (v < 0) v += 12;
						v %= 12;
						d.setUTCMonth(v);
						while (d.getUTCMonth() !== v)
							d.setUTCDate(d.getUTCDate()-1);
						return d;
					},
					d: function(d,v){
						return d.setUTCDate(v);
					}
				},
				val, filtered;
			setters_map['M'] = setters_map['MM'] = setters_map['mm'] = setters_map['m'];
			setters_map['dd'] = setters_map['d'];
			date = UTCDate(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
			var fparts = format.parts.slice();
			// Remove noop parts
			if (parts.length !== fparts.length){
				fparts = $(fparts).filter(function(i,p){
					return $.inArray(p, setters_order) !== -1;
				}).toArray();
			}
			// Process remainder
			function match_part(){
				var m = this.slice(0, parts[i].length),
					p = parts[i].slice(0, m.length);
				return m === p;
			}
			if (parts.length === fparts.length){
				var cnt;
				for (i=0, cnt = fparts.length; i < cnt; i++){
					val = parseInt(parts[i], 10);
					part = fparts[i];
					if (isNaN(val)){
						switch (part){
							case 'MM':
								filtered = $(dates[language].months).filter(match_part);
								val = $.inArray(filtered[0], dates[language].months) + 1;
								break;
							case 'M':
								filtered = $(dates[language].monthsShort).filter(match_part);
								val = $.inArray(filtered[0], dates[language].monthsShort) + 1;
								break;
						}
					}
					parsed[part] = val;
				}
				var _date, s;
				for (i=0; i < setters_order.length; i++){
					s = setters_order[i];
					if (s in parsed && !isNaN(parsed[s])){
						_date = new Date(date);
						setters_map[s](_date, parsed[s]);
						if (!isNaN(_date))
							date = _date;
					}
				}
			}
			return date;
		},
		formatDate: function(date, format, language){
			if (!date)
				return '';
			if (typeof format === 'string')
				format = DPGlobal.parseFormat(format);
			var val = {
				d: date.getUTCDate(),
				D: dates[language].daysShort[date.getUTCDay()],
				DD: dates[language].days[date.getUTCDay()],
				m: date.getUTCMonth() + 1,
				M: dates[language].monthsShort[date.getUTCMonth()],
				MM: dates[language].months[date.getUTCMonth()],
				yy: date.getUTCFullYear().toString().substring(2),
				yyyy: date.getUTCFullYear()
			};
			val.dd = (val.d < 10 ? '0' : '') + val.d;
			val.mm = (val.m < 10 ? '0' : '') + val.m;
			date = [];
			var seps = $.extend([], format.separators);
			for (var i=0, cnt = format.parts.length; i <= cnt; i++){
				if (seps.length)
					date.push(seps.shift());
				date.push(val[format.parts[i]]);
			}
			return date.join('');
		},
		headTemplate: '<thead>'+
							'<tr>'+
								'<th class="prev">&laquo;</th>'+
								'<th colspan="5" class="datepicker-switch"></th>'+
								'<th class="next">&raquo;</th>'+
							'</tr>'+
						'</thead>',
		contTemplate: '<tbody><tr><td colspan="7"></td></tr></tbody>',
		footTemplate: '<tfoot>'+
							'<tr>'+
								'<th colspan="7" class="today"></th>'+
							'</tr>'+
							'<tr>'+
								'<th colspan="7" class="clear"></th>'+
							'</tr>'+
						'</tfoot>'
	};
	DPGlobal.template = '<div class="datepicker">'+
							'<div class="datepicker-days">'+
								'<table class=" table-condensed">'+
									DPGlobal.headTemplate+
									'<tbody></tbody>'+
									DPGlobal.footTemplate+
								'</table>'+
							'</div>'+
							'<div class="datepicker-months">'+
								'<table class="table-condensed">'+
									DPGlobal.headTemplate+
									DPGlobal.contTemplate+
									DPGlobal.footTemplate+
								'</table>'+
							'</div>'+
							'<div class="datepicker-years">'+
								'<table class="table-condensed">'+
									DPGlobal.headTemplate+
									DPGlobal.contTemplate+
									DPGlobal.footTemplate+
								'</table>'+
							'</div>'+
						'</div>';

	$.fn.datepicker.DPGlobal = DPGlobal;


	/* DATEPICKER NO CONFLICT
	* =================== */

	$.fn.datepicker.noConflict = function(){
		$.fn.datepicker = old;
		return this;
	};


	/* DATEPICKER DATA-API
	* ================== */

	$(document).on(
		'focus.datepicker.data-api click.datepicker.data-api',
		'[data-provide="datepicker"]',
		function(e){
			var $this = $(this);
			if ($this.data('datepicker'))
				return;
			e.preventDefault();
			// component click requires us to explicitly show it
			$this.datepicker('show');
		}
	);
	$(function(){
		$('[data-provide="datepicker-inline"]').datepicker();
	});

}(window.jQuery));

/*!
 * Chart.js
 * http://chartjs.org/
 * Version: 1.0.1-beta.4
 *
 * Copyright 2014 Nick Downie
 * Released under the MIT license
 * https://github.com/nnnick/Chart.js/blob/master/LICENSE.md
 */
(function(){"use strict";var t=this,i=t.Chart,e=function(t){this.canvas=t.canvas,this.ctx=t;this.width=t.canvas.width,this.height=t.canvas.height;return this.aspectRatio=this.width/this.height,s.retinaScale(this),this};e.defaults={global:{animation:!0,animationSteps:60,animationEasing:"easeOutQuart",showScale:!0,scaleOverride:!1,scaleSteps:null,scaleStepWidth:null,scaleStartValue:null,scaleLineColor:"rgba(0,0,0,.1)",scaleLineWidth:1,scaleShowLabels:!0,scaleLabel:"<%=value%>",scaleIntegersOnly:!0,scaleBeginAtZero:!1,scaleFontFamily:"'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",scaleFontSize:12,scaleFontStyle:"normal",scaleFontColor:"#666",responsive:!1,maintainAspectRatio:!0,showTooltips:!0,tooltipEvents:["mousemove","touchstart","touchmove","mouseout"],tooltipFillColor:"rgba(0,0,0,0.8)",tooltipFontFamily:"'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",tooltipFontSize:14,tooltipFontStyle:"normal",tooltipFontColor:"#fff",tooltipTitleFontFamily:"'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",tooltipTitleFontSize:14,tooltipTitleFontStyle:"bold",tooltipTitleFontColor:"#fff",tooltipYPadding:6,tooltipXPadding:6,tooltipCaretSize:8,tooltipCornerRadius:6,tooltipXOffset:10,tooltipTemplate:"<%if (label){%><%=label%>: <%}%><%= value %>",multiTooltipTemplate:"<%= value %>",multiTooltipKeyBackground:"#fff",onAnimationProgress:function(){},onAnimationComplete:function(){}}},e.types={};var s=e.helpers={},n=s.each=function(t,i,e){var s=Array.prototype.slice.call(arguments,3);if(t)if(t.length===+t.length){var n;for(n=0;n<t.length;n++)i.apply(e,[t[n],n].concat(s))}else for(var o in t)i.apply(e,[t[o],o].concat(s))},o=s.clone=function(t){var i={};return n(t,function(e,s){t.hasOwnProperty(s)&&(i[s]=e)}),i},a=s.extend=function(t){return n(Array.prototype.slice.call(arguments,1),function(i){n(i,function(e,s){i.hasOwnProperty(s)&&(t[s]=e)})}),t},h=s.merge=function(){var t=Array.prototype.slice.call(arguments,0);return t.unshift({}),a.apply(null,t)},l=s.indexOf=function(t,i){if(Array.prototype.indexOf)return t.indexOf(i);for(var e=0;e<t.length;e++)if(t[e]===i)return e;return-1},r=(s.where=function(t,i){var e=[];return s.each(t,function(t){i(t)&&e.push(t)}),e},s.findNextWhere=function(t,i,e){e||(e=-1);for(var s=e+1;s<t.length;s++){var n=t[s];if(i(n))return n}},s.findPreviousWhere=function(t,i,e){e||(e=t.length);for(var s=e-1;s>=0;s--){var n=t[s];if(i(n))return n}},s.inherits=function(t){var i=this,e=t&&t.hasOwnProperty("constructor")?t.constructor:function(){return i.apply(this,arguments)},s=function(){this.constructor=e};return s.prototype=i.prototype,e.prototype=new s,e.extend=r,t&&a(e.prototype,t),e.__super__=i.prototype,e}),c=s.noop=function(){},u=s.uid=function(){var t=0;return function(){return"chart-"+t++}}(),d=s.warn=function(t){window.console&&"function"==typeof window.console.warn&&console.warn(t)},p=s.amd="function"==typeof t.define&&t.define.amd,f=s.isNumber=function(t){return!isNaN(parseFloat(t))&&isFinite(t)},g=s.max=function(t){return Math.max.apply(Math,t)},m=s.min=function(t){return Math.min.apply(Math,t)},v=(s.cap=function(t,i,e){if(f(i)){if(t>i)return i}else if(f(e)&&e>t)return e;return t},s.getDecimalPlaces=function(t){return t%1!==0&&f(t)?t.toString().split(".")[1].length:0}),x=s.radians=function(t){return t*(Math.PI/180)},S=(s.getAngleFromPoint=function(t,i){var e=i.x-t.x,s=i.y-t.y,n=Math.sqrt(e*e+s*s),o=2*Math.PI+Math.atan2(s,e);return 0>e&&0>s&&(o+=2*Math.PI),{angle:o,distance:n}},s.aliasPixel=function(t){return t%2===0?0:.5}),y=(s.splineCurve=function(t,i,e,s){var n=Math.sqrt(Math.pow(i.x-t.x,2)+Math.pow(i.y-t.y,2)),o=Math.sqrt(Math.pow(e.x-i.x,2)+Math.pow(e.y-i.y,2)),a=s*n/(n+o),h=s*o/(n+o);return{inner:{x:i.x-a*(e.x-t.x),y:i.y-a*(e.y-t.y)},outer:{x:i.x+h*(e.x-t.x),y:i.y+h*(e.y-t.y)}}},s.calculateOrderOfMagnitude=function(t){return Math.floor(Math.log(t)/Math.LN10)}),C=(s.calculateScaleRange=function(t,i,e,s,n){var o=2,a=Math.floor(i/(1.5*e)),h=o>=a,l=g(t),r=m(t);l===r&&(l+=.5,r>=.5&&!s?r-=.5:l+=.5);for(var c=Math.abs(l-r),u=y(c),d=Math.ceil(l/(1*Math.pow(10,u)))*Math.pow(10,u),p=s?0:Math.floor(r/(1*Math.pow(10,u)))*Math.pow(10,u),f=d-p,v=Math.pow(10,u),x=Math.round(f/v);(x>a||a>2*x)&&!h;)if(x>a)v*=2,x=Math.round(f/v),x%1!==0&&(h=!0);else if(n&&u>=0){if(v/2%1!==0)break;v/=2,x=Math.round(f/v)}else v/=2,x=Math.round(f/v);return h&&(x=o,v=f/x),{steps:x,stepValue:v,min:p,max:p+x*v}},s.template=function(t,i){function e(t,i){var e=/\W/.test(t)?new Function("obj","var p=[],print=function(){p.push.apply(p,arguments);};with(obj){p.push('"+t.replace(/[\r\t\n]/g," ").split("<%").join("	").replace(/((^|%>)[^\t]*)'/g,"$1\r").replace(/\t=(.*?)%>/g,"',$1,'").split("	").join("');").split("%>").join("p.push('").split("\r").join("\\'")+"');}return p.join('');"):s[t]=s[t];return i?e(i):e}if(t instanceof Function)return t(i);var s={};return e(t,i)}),b=(s.generateLabels=function(t,i,e,s){var o=new Array(i);return labelTemplateString&&n(o,function(i,n){o[n]=C(t,{value:e+s*(n+1)})}),o},s.easingEffects={linear:function(t){return t},easeInQuad:function(t){return t*t},easeOutQuad:function(t){return-1*t*(t-2)},easeInOutQuad:function(t){return(t/=.5)<1?.5*t*t:-0.5*(--t*(t-2)-1)},easeInCubic:function(t){return t*t*t},easeOutCubic:function(t){return 1*((t=t/1-1)*t*t+1)},easeInOutCubic:function(t){return(t/=.5)<1?.5*t*t*t:.5*((t-=2)*t*t+2)},easeInQuart:function(t){return t*t*t*t},easeOutQuart:function(t){return-1*((t=t/1-1)*t*t*t-1)},easeInOutQuart:function(t){return(t/=.5)<1?.5*t*t*t*t:-0.5*((t-=2)*t*t*t-2)},easeInQuint:function(t){return 1*(t/=1)*t*t*t*t},easeOutQuint:function(t){return 1*((t=t/1-1)*t*t*t*t+1)},easeInOutQuint:function(t){return(t/=.5)<1?.5*t*t*t*t*t:.5*((t-=2)*t*t*t*t+2)},easeInSine:function(t){return-1*Math.cos(t/1*(Math.PI/2))+1},easeOutSine:function(t){return 1*Math.sin(t/1*(Math.PI/2))},easeInOutSine:function(t){return-0.5*(Math.cos(Math.PI*t/1)-1)},easeInExpo:function(t){return 0===t?1:1*Math.pow(2,10*(t/1-1))},easeOutExpo:function(t){return 1===t?1:1*(-Math.pow(2,-10*t/1)+1)},easeInOutExpo:function(t){return 0===t?0:1===t?1:(t/=.5)<1?.5*Math.pow(2,10*(t-1)):.5*(-Math.pow(2,-10*--t)+2)},easeInCirc:function(t){return t>=1?t:-1*(Math.sqrt(1-(t/=1)*t)-1)},easeOutCirc:function(t){return 1*Math.sqrt(1-(t=t/1-1)*t)},easeInOutCirc:function(t){return(t/=.5)<1?-0.5*(Math.sqrt(1-t*t)-1):.5*(Math.sqrt(1-(t-=2)*t)+1)},easeInElastic:function(t){var i=1.70158,e=0,s=1;return 0===t?0:1==(t/=1)?1:(e||(e=.3),s<Math.abs(1)?(s=1,i=e/4):i=e/(2*Math.PI)*Math.asin(1/s),-(s*Math.pow(2,10*(t-=1))*Math.sin(2*(1*t-i)*Math.PI/e)))},easeOutElastic:function(t){var i=1.70158,e=0,s=1;return 0===t?0:1==(t/=1)?1:(e||(e=.3),s<Math.abs(1)?(s=1,i=e/4):i=e/(2*Math.PI)*Math.asin(1/s),s*Math.pow(2,-10*t)*Math.sin(2*(1*t-i)*Math.PI/e)+1)},easeInOutElastic:function(t){var i=1.70158,e=0,s=1;return 0===t?0:2==(t/=.5)?1:(e||(e=.3*1.5),s<Math.abs(1)?(s=1,i=e/4):i=e/(2*Math.PI)*Math.asin(1/s),1>t?-.5*s*Math.pow(2,10*(t-=1))*Math.sin(2*(1*t-i)*Math.PI/e):s*Math.pow(2,-10*(t-=1))*Math.sin(2*(1*t-i)*Math.PI/e)*.5+1)},easeInBack:function(t){var i=1.70158;return 1*(t/=1)*t*((i+1)*t-i)},easeOutBack:function(t){var i=1.70158;return 1*((t=t/1-1)*t*((i+1)*t+i)+1)},easeInOutBack:function(t){var i=1.70158;return(t/=.5)<1?.5*t*t*(((i*=1.525)+1)*t-i):.5*((t-=2)*t*(((i*=1.525)+1)*t+i)+2)},easeInBounce:function(t){return 1-b.easeOutBounce(1-t)},easeOutBounce:function(t){return(t/=1)<1/2.75?7.5625*t*t:2/2.75>t?1*(7.5625*(t-=1.5/2.75)*t+.75):2.5/2.75>t?1*(7.5625*(t-=2.25/2.75)*t+.9375):1*(7.5625*(t-=2.625/2.75)*t+.984375)},easeInOutBounce:function(t){return.5>t?.5*b.easeInBounce(2*t):.5*b.easeOutBounce(2*t-1)+.5}}),w=s.requestAnimFrame=function(){return window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||function(t){return window.setTimeout(t,1e3/60)}}(),P=(s.cancelAnimFrame=function(){return window.cancelAnimationFrame||window.webkitCancelAnimationFrame||window.mozCancelAnimationFrame||window.oCancelAnimationFrame||window.msCancelAnimationFrame||function(t){return window.clearTimeout(t,1e3/60)}}(),s.animationLoop=function(t,i,e,s,n,o){var a=0,h=b[e]||b.linear,l=function(){a++;var e=a/i,r=h(e);t.call(o,r,e,a),s.call(o,r,e),i>a?o.animationFrame=w(l):n.apply(o)};w(l)},s.getRelativePosition=function(t){var i,e,s=t.originalEvent||t,n=t.currentTarget||t.srcElement,o=n.getBoundingClientRect();return s.touches?(i=s.touches[0].clientX-o.left,e=s.touches[0].clientY-o.top):(i=s.clientX-o.left,e=s.clientY-o.top),{x:i,y:e}},s.addEvent=function(t,i,e){t.addEventListener?t.addEventListener(i,e):t.attachEvent?t.attachEvent("on"+i,e):t["on"+i]=e}),L=s.removeEvent=function(t,i,e){t.removeEventListener?t.removeEventListener(i,e,!1):t.detachEvent?t.detachEvent("on"+i,e):t["on"+i]=c},k=(s.bindEvents=function(t,i,e){t.events||(t.events={}),n(i,function(i){t.events[i]=function(){e.apply(t,arguments)},P(t.chart.canvas,i,t.events[i])})},s.unbindEvents=function(t,i){n(i,function(i,e){L(t.chart.canvas,e,i)})}),F=s.getMaximumWidth=function(t){var i=t.parentNode;return i.clientWidth},R=s.getMaximumHeight=function(t){var i=t.parentNode;return i.clientHeight},A=(s.getMaximumSize=s.getMaximumWidth,s.retinaScale=function(t){var i=t.ctx,e=t.canvas.width,s=t.canvas.height;window.devicePixelRatio&&(i.canvas.style.width=e+"px",i.canvas.style.height=s+"px",i.canvas.height=s*window.devicePixelRatio,i.canvas.width=e*window.devicePixelRatio,i.scale(window.devicePixelRatio,window.devicePixelRatio))}),T=s.clear=function(t){t.ctx.clearRect(0,0,t.width,t.height)},M=s.fontString=function(t,i,e){return i+" "+t+"px "+e},W=s.longestText=function(t,i,e){t.font=i;var s=0;return n(e,function(i){var e=t.measureText(i).width;s=e>s?e:s}),s},z=s.drawRoundedRectangle=function(t,i,e,s,n,o){t.beginPath(),t.moveTo(i+o,e),t.lineTo(i+s-o,e),t.quadraticCurveTo(i+s,e,i+s,e+o),t.lineTo(i+s,e+n-o),t.quadraticCurveTo(i+s,e+n,i+s-o,e+n),t.lineTo(i+o,e+n),t.quadraticCurveTo(i,e+n,i,e+n-o),t.lineTo(i,e+o),t.quadraticCurveTo(i,e,i+o,e),t.closePath()};e.instances={},e.Type=function(t,i,s){this.options=i,this.chart=s,this.id=u(),e.instances[this.id]=this,i.responsive&&this.resize(),this.initialize.call(this,t)},a(e.Type.prototype,{initialize:function(){return this},clear:function(){return T(this.chart),this},stop:function(){return s.cancelAnimFrame.call(t,this.animationFrame),this},resize:function(t){this.stop();var i=this.chart.canvas,e=F(this.chart.canvas),s=this.options.maintainAspectRatio?e/this.chart.aspectRatio:R(this.chart.canvas);return i.width=this.chart.width=e,i.height=this.chart.height=s,A(this.chart),"function"==typeof t&&t.apply(this,Array.prototype.slice.call(arguments,1)),this},reflow:c,render:function(t){return t&&this.reflow(),this.options.animation&&!t?s.animationLoop(this.draw,this.options.animationSteps,this.options.animationEasing,this.options.onAnimationProgress,this.options.onAnimationComplete,this):(this.draw(),this.options.onAnimationComplete.call(this)),this},generateLegend:function(){return C(this.options.legendTemplate,this)},destroy:function(){this.clear(),k(this,this.events),delete e.instances[this.id]},showTooltip:function(t,i){"undefined"==typeof this.activeElements&&(this.activeElements=[]);var o=function(t){var i=!1;return t.length!==this.activeElements.length?i=!0:(n(t,function(t,e){t!==this.activeElements[e]&&(i=!0)},this),i)}.call(this,t);if(o||i){if(this.activeElements=t,this.draw(),t.length>0)if(this.datasets&&this.datasets.length>1){for(var a,h,r=this.datasets.length-1;r>=0&&(a=this.datasets[r].points||this.datasets[r].bars||this.datasets[r].segments,h=l(a,t[0]),-1===h);r--);var c=[],u=[],d=function(){var t,i,e,n,o,a=[],l=[],r=[];return s.each(this.datasets,function(i){t=i.points||i.bars||i.segments,t[h]&&t[h].hasValue()&&a.push(t[h])}),s.each(a,function(t){l.push(t.x),r.push(t.y),c.push(s.template(this.options.multiTooltipTemplate,t)),u.push({fill:t._saved.fillColor||t.fillColor,stroke:t._saved.strokeColor||t.strokeColor})},this),o=m(r),e=g(r),n=m(l),i=g(l),{x:n>this.chart.width/2?n:i,y:(o+e)/2}}.call(this,h);new e.MultiTooltip({x:d.x,y:d.y,xPadding:this.options.tooltipXPadding,yPadding:this.options.tooltipYPadding,xOffset:this.options.tooltipXOffset,fillColor:this.options.tooltipFillColor,textColor:this.options.tooltipFontColor,fontFamily:this.options.tooltipFontFamily,fontStyle:this.options.tooltipFontStyle,fontSize:this.options.tooltipFontSize,titleTextColor:this.options.tooltipTitleFontColor,titleFontFamily:this.options.tooltipTitleFontFamily,titleFontStyle:this.options.tooltipTitleFontStyle,titleFontSize:this.options.tooltipTitleFontSize,cornerRadius:this.options.tooltipCornerRadius,labels:c,legendColors:u,legendColorBackground:this.options.multiTooltipKeyBackground,title:t[0].label,chart:this.chart,ctx:this.chart.ctx}).draw()}else n(t,function(t){var i=t.tooltipPosition();new e.Tooltip({x:Math.round(i.x),y:Math.round(i.y),xPadding:this.options.tooltipXPadding,yPadding:this.options.tooltipYPadding,fillColor:this.options.tooltipFillColor,textColor:this.options.tooltipFontColor,fontFamily:this.options.tooltipFontFamily,fontStyle:this.options.tooltipFontStyle,fontSize:this.options.tooltipFontSize,caretHeight:this.options.tooltipCaretSize,cornerRadius:this.options.tooltipCornerRadius,text:C(this.options.tooltipTemplate,t),chart:this.chart}).draw()},this);return this}},toBase64Image:function(){return this.chart.canvas.toDataURL.apply(this.chart.canvas,arguments)}}),e.Type.extend=function(t){var i=this,s=function(){return i.apply(this,arguments)};if(s.prototype=o(i.prototype),a(s.prototype,t),s.extend=e.Type.extend,t.name||i.prototype.name){var n=t.name||i.prototype.name,l=e.defaults[i.prototype.name]?o(e.defaults[i.prototype.name]):{};e.defaults[n]=a(l,t.defaults),e.types[n]=s,e.prototype[n]=function(t,i){var o=h(e.defaults.global,e.defaults[n],i||{});return new s(t,o,this)}}else d("Name not provided for this chart, so it hasn't been registered");return i},e.Element=function(t){a(this,t),this.initialize.apply(this,arguments),this.save()},a(e.Element.prototype,{initialize:function(){},restore:function(t){return t?n(t,function(t){this[t]=this._saved[t]},this):a(this,this._saved),this},save:function(){return this._saved=o(this),delete this._saved._saved,this},update:function(t){return n(t,function(t,i){this._saved[i]=this[i],this[i]=t},this),this},transition:function(t,i){return n(t,function(t,e){this[e]=(t-this._saved[e])*i+this._saved[e]},this),this},tooltipPosition:function(){return{x:this.x,y:this.y}},hasValue:function(){return f(this.value)}}),e.Element.extend=r,e.Point=e.Element.extend({display:!0,inRange:function(t,i){var e=this.hitDetectionRadius+this.radius;return Math.pow(t-this.x,2)+Math.pow(i-this.y,2)<Math.pow(e,2)},draw:function(){if(this.display){var t=this.ctx;t.beginPath(),t.arc(this.x,this.y,this.radius,0,2*Math.PI),t.closePath(),t.strokeStyle=this.strokeColor,t.lineWidth=this.strokeWidth,t.fillStyle=this.fillColor,t.fill(),t.stroke()}}}),e.Arc=e.Element.extend({inRange:function(t,i){var e=s.getAngleFromPoint(this,{x:t,y:i}),n=e.angle>=this.startAngle&&e.angle<=this.endAngle,o=e.distance>=this.innerRadius&&e.distance<=this.outerRadius;return n&&o},tooltipPosition:function(){var t=this.startAngle+(this.endAngle-this.startAngle)/2,i=(this.outerRadius-this.innerRadius)/2+this.innerRadius;return{x:this.x+Math.cos(t)*i,y:this.y+Math.sin(t)*i}},draw:function(t){var i=this.ctx;i.beginPath(),i.arc(this.x,this.y,this.outerRadius,this.startAngle,this.endAngle),i.arc(this.x,this.y,this.innerRadius,this.endAngle,this.startAngle,!0),i.closePath(),i.strokeStyle=this.strokeColor,i.lineWidth=this.strokeWidth,i.fillStyle=this.fillColor,i.fill(),i.lineJoin="bevel",this.showStroke&&i.stroke()}}),e.Rectangle=e.Element.extend({draw:function(){var t=this.ctx,i=this.width/2,e=this.x-i,s=this.x+i,n=this.base-(this.base-this.y),o=this.strokeWidth/2;this.showStroke&&(e+=o,s-=o,n+=o),t.beginPath(),t.fillStyle=this.fillColor,t.strokeStyle=this.strokeColor,t.lineWidth=this.strokeWidth,t.moveTo(e,this.base),t.lineTo(e,n),t.lineTo(s,n),t.lineTo(s,this.base),t.fill(),this.showStroke&&t.stroke()},height:function(){return this.base-this.y},inRange:function(t,i){return t>=this.x-this.width/2&&t<=this.x+this.width/2&&i>=this.y&&i<=this.base}}),e.Tooltip=e.Element.extend({draw:function(){var t=this.chart.ctx;t.font=M(this.fontSize,this.fontStyle,this.fontFamily),this.xAlign="center",this.yAlign="above";var i=2,e=t.measureText(this.text).width+2*this.xPadding,s=this.fontSize+2*this.yPadding,n=s+this.caretHeight+i;this.x+e/2>this.chart.width?this.xAlign="left":this.x-e/2<0&&(this.xAlign="right"),this.y-n<0&&(this.yAlign="below");var o=this.x-e/2,a=this.y-n;switch(t.fillStyle=this.fillColor,this.yAlign){case"above":t.beginPath(),t.moveTo(this.x,this.y-i),t.lineTo(this.x+this.caretHeight,this.y-(i+this.caretHeight)),t.lineTo(this.x-this.caretHeight,this.y-(i+this.caretHeight)),t.closePath(),t.fill();break;case"below":a=this.y+i+this.caretHeight,t.beginPath(),t.moveTo(this.x,this.y+i),t.lineTo(this.x+this.caretHeight,this.y+i+this.caretHeight),t.lineTo(this.x-this.caretHeight,this.y+i+this.caretHeight),t.closePath(),t.fill()}switch(this.xAlign){case"left":o=this.x-e+(this.cornerRadius+this.caretHeight);break;case"right":o=this.x-(this.cornerRadius+this.caretHeight)}z(t,o,a,e,s,this.cornerRadius),t.fill(),t.fillStyle=this.textColor,t.textAlign="center",t.textBaseline="middle",t.fillText(this.text,o+e/2,a+s/2)}}),e.MultiTooltip=e.Element.extend({initialize:function(){this.font=M(this.fontSize,this.fontStyle,this.fontFamily),this.titleFont=M(this.titleFontSize,this.titleFontStyle,this.titleFontFamily),this.height=this.labels.length*this.fontSize+(this.labels.length-1)*(this.fontSize/2)+2*this.yPadding+1.5*this.titleFontSize,this.ctx.font=this.titleFont;var t=this.ctx.measureText(this.title).width,i=W(this.ctx,this.font,this.labels)+this.fontSize+3,e=g([i,t]);this.width=e+2*this.xPadding;var s=this.height/2;this.y-s<0?this.y=s:this.y+s>this.chart.height&&(this.y=this.chart.height-s),this.x>this.chart.width/2?this.x-=this.xOffset+this.width:this.x+=this.xOffset},getLineHeight:function(t){var i=this.y-this.height/2+this.yPadding,e=t-1;return 0===t?i+this.titleFontSize/2:i+(1.5*this.fontSize*e+this.fontSize/2)+1.5*this.titleFontSize},draw:function(){z(this.ctx,this.x,this.y-this.height/2,this.width,this.height,this.cornerRadius);var t=this.ctx;t.fillStyle=this.fillColor,t.fill(),t.closePath(),t.textAlign="left",t.textBaseline="middle",t.fillStyle=this.titleTextColor,t.font=this.titleFont,t.fillText(this.title,this.x+this.xPadding,this.getLineHeight(0)),t.font=this.font,s.each(this.labels,function(i,e){t.fillStyle=this.textColor,t.fillText(i,this.x+this.xPadding+this.fontSize+3,this.getLineHeight(e+1)),t.fillStyle=this.legendColorBackground,t.fillRect(this.x+this.xPadding,this.getLineHeight(e+1)-this.fontSize/2,this.fontSize,this.fontSize),t.fillStyle=this.legendColors[e].fill,t.fillRect(this.x+this.xPadding,this.getLineHeight(e+1)-this.fontSize/2,this.fontSize,this.fontSize)},this)}}),e.Scale=e.Element.extend({initialize:function(){this.fit()},buildYLabels:function(){this.yLabels=[];for(var t=v(this.stepValue),i=0;i<=this.steps;i++)this.yLabels.push(C(this.templateString,{value:(this.min+i*this.stepValue).toFixed(t)}));this.yLabelWidth=this.display&&this.showLabels?W(this.ctx,this.font,this.yLabels):0},addXLabel:function(t){this.xLabels.push(t),this.valuesCount++,this.fit()},removeXLabel:function(){this.xLabels.shift(),this.valuesCount--,this.fit()},fit:function(){this.startPoint=this.display?this.fontSize:0,this.endPoint=this.display?this.height-1.5*this.fontSize-5:this.height,this.startPoint+=this.padding,this.endPoint-=this.padding;var t,i=this.endPoint-this.startPoint;for(this.calculateYRange(i),this.buildYLabels(),this.calculateXLabelRotation();i>this.endPoint-this.startPoint;)i=this.endPoint-this.startPoint,t=this.yLabelWidth,this.calculateYRange(i),this.buildYLabels(),t<this.yLabelWidth&&this.calculateXLabelRotation()},calculateXLabelRotation:function(){this.ctx.font=this.font;var t,i,e=this.ctx.measureText(this.xLabels[0]).width,s=this.ctx.measureText(this.xLabels[this.xLabels.length-1]).width;if(this.xScalePaddingRight=s/2+3,this.xScalePaddingLeft=e/2>this.yLabelWidth+10?e/2:this.yLabelWidth+10,this.xLabelRotation=0,this.display){var n,o=W(this.ctx,this.font,this.xLabels);this.xLabelWidth=o;for(var a=Math.floor(this.calculateX(1)-this.calculateX(0))-6;this.xLabelWidth>a&&0===this.xLabelRotation||this.xLabelWidth>a&&this.xLabelRotation<=90&&this.xLabelRotation>0;)n=Math.cos(x(this.xLabelRotation)),t=n*e,i=n*s,t+this.fontSize/2>this.yLabelWidth+8&&(this.xScalePaddingLeft=t+this.fontSize/2),this.xScalePaddingRight=this.fontSize/2,this.xLabelRotation++,this.xLabelWidth=n*o;this.xLabelRotation>0&&(this.endPoint-=Math.sin(x(this.xLabelRotation))*o+3)}else this.xLabelWidth=0,this.xScalePaddingRight=this.padding,this.xScalePaddingLeft=this.padding},calculateYRange:c,drawingArea:function(){return this.startPoint-this.endPoint},calculateY:function(t){var i=this.drawingArea()/(this.min-this.max);return this.endPoint-i*(t-this.min)},calculateX:function(t){var i=(this.xLabelRotation>0,this.width-(this.xScalePaddingLeft+this.xScalePaddingRight)),e=i/(this.valuesCount-(this.offsetGridLines?0:1)),s=e*t+this.xScalePaddingLeft;return this.offsetGridLines&&(s+=e/2),Math.round(s)},update:function(t){s.extend(this,t),this.fit()},draw:function(){var t=this.ctx,i=(this.endPoint-this.startPoint)/this.steps,e=Math.round(this.xScalePaddingLeft);this.display&&(t.fillStyle=this.textColor,t.font=this.font,n(this.yLabels,function(n,o){var a=this.endPoint-i*o,h=Math.round(a);t.textAlign="right",t.textBaseline="middle",this.showLabels&&t.fillText(n,e-10,a),t.beginPath(),o>0?(t.lineWidth=this.gridLineWidth,t.strokeStyle=this.gridLineColor):(t.lineWidth=this.lineWidth,t.strokeStyle=this.lineColor),h+=s.aliasPixel(t.lineWidth),t.moveTo(e,h),t.lineTo(this.width,h),t.stroke(),t.closePath(),t.lineWidth=this.lineWidth,t.strokeStyle=this.lineColor,t.beginPath(),t.moveTo(e-5,h),t.lineTo(e,h),t.stroke(),t.closePath()},this),n(this.xLabels,function(i,e){var s=this.calculateX(e)+S(this.lineWidth),n=this.calculateX(e-(this.offsetGridLines?.5:0))+S(this.lineWidth),o=this.xLabelRotation>0;t.beginPath(),e>0?(t.lineWidth=this.gridLineWidth,t.strokeStyle=this.gridLineColor):(t.lineWidth=this.lineWidth,t.strokeStyle=this.lineColor),t.moveTo(n,this.endPoint),t.lineTo(n,this.startPoint-3),t.stroke(),t.closePath(),t.lineWidth=this.lineWidth,t.strokeStyle=this.lineColor,t.beginPath(),t.moveTo(n,this.endPoint),t.lineTo(n,this.endPoint+5),t.stroke(),t.closePath(),t.save(),t.translate(s,o?this.endPoint+12:this.endPoint+8),t.rotate(-1*x(this.xLabelRotation)),t.font=this.font,t.textAlign=o?"right":"center",t.textBaseline=o?"middle":"top",t.fillText(i,0,0),t.restore()},this))}}),e.RadialScale=e.Element.extend({initialize:function(){this.size=m([this.height,this.width]),this.drawingArea=this.display?this.size/2-(this.fontSize/2+this.backdropPaddingY):this.size/2},calculateCenterOffset:function(t){var i=this.drawingArea/(this.max-this.min);return(t-this.min)*i},update:function(){this.lineArc?this.drawingArea=this.display?this.size/2-(this.fontSize/2+this.backdropPaddingY):this.size/2:this.setScaleSize(),this.buildYLabels()},buildYLabels:function(){this.yLabels=[];for(var t=v(this.stepValue),i=0;i<=this.steps;i++)this.yLabels.push(C(this.templateString,{value:(this.min+i*this.stepValue).toFixed(t)}))},getCircumference:function(){return 2*Math.PI/this.valuesCount},setScaleSize:function(){var t,i,e,s,n,o,a,h,l,r,c,u,d=m([this.height/2-this.pointLabelFontSize-5,this.width/2]),p=this.width,g=0;for(this.ctx.font=M(this.pointLabelFontSize,this.pointLabelFontStyle,this.pointLabelFontFamily),i=0;i<this.valuesCount;i++)t=this.getPointPosition(i,d),e=this.ctx.measureText(C(this.templateString,{value:this.labels[i]})).width+5,0===i||i===this.valuesCount/2?(s=e/2,t.x+s>p&&(p=t.x+s,n=i),t.x-s<g&&(g=t.x-s,a=i)):i<this.valuesCount/2?t.x+e>p&&(p=t.x+e,n=i):i>this.valuesCount/2&&t.x-e<g&&(g=t.x-e,a=i);l=g,r=Math.ceil(p-this.width),o=this.getIndexAngle(n),h=this.getIndexAngle(a),c=r/Math.sin(o+Math.PI/2),u=l/Math.sin(h+Math.PI/2),c=f(c)?c:0,u=f(u)?u:0,this.drawingArea=d-(u+c)/2,this.setCenterPoint(u,c)},setCenterPoint:function(t,i){var e=this.width-i-this.drawingArea,s=t+this.drawingArea;this.xCenter=(s+e)/2,this.yCenter=this.height/2},getIndexAngle:function(t){var i=2*Math.PI/this.valuesCount;return t*i-Math.PI/2},getPointPosition:function(t,i){var e=this.getIndexAngle(t);return{x:Math.cos(e)*i+this.xCenter,y:Math.sin(e)*i+this.yCenter}},draw:function(){if(this.display){var t=this.ctx;if(n(this.yLabels,function(i,e){if(e>0){var s,n=e*(this.drawingArea/this.steps),o=this.yCenter-n;if(this.lineWidth>0)if(t.strokeStyle=this.lineColor,t.lineWidth=this.lineWidth,this.lineArc)t.beginPath(),t.arc(this.xCenter,this.yCenter,n,0,2*Math.PI),t.closePath(),t.stroke();else{t.beginPath();for(var a=0;a<this.valuesCount;a++)s=this.getPointPosition(a,this.calculateCenterOffset(this.min+e*this.stepValue)),0===a?t.moveTo(s.x,s.y):t.lineTo(s.x,s.y);t.closePath(),t.stroke()}if(this.showLabels){if(t.font=M(this.fontSize,this.fontStyle,this.fontFamily),this.showLabelBackdrop){var h=t.measureText(i).width;t.fillStyle=this.backdropColor,t.fillRect(this.xCenter-h/2-this.backdropPaddingX,o-this.fontSize/2-this.backdropPaddingY,h+2*this.backdropPaddingX,this.fontSize+2*this.backdropPaddingY)}t.textAlign="center",t.textBaseline="middle",t.fillStyle=this.fontColor,t.fillText(i,this.xCenter,o)}}},this),!this.lineArc){t.lineWidth=this.angleLineWidth,t.strokeStyle=this.angleLineColor;for(var i=this.valuesCount-1;i>=0;i--){if(this.angleLineWidth>0){var e=this.getPointPosition(i,this.calculateCenterOffset(this.max));t.beginPath(),t.moveTo(this.xCenter,this.yCenter),t.lineTo(e.x,e.y),t.stroke(),t.closePath()}var s=this.getPointPosition(i,this.calculateCenterOffset(this.max)+5);t.font=M(this.pointLabelFontSize,this.pointLabelFontStyle,this.pointLabelFontFamily),t.fillStyle=this.pointLabelFontColor;var o=this.labels.length,a=this.labels.length/2,h=a/2,l=h>i||i>o-h,r=i===h||i===o-h;t.textAlign=0===i?"center":i===a?"center":a>i?"left":"right",t.textBaseline=r?"middle":l?"bottom":"top",t.fillText(this.labels[i],s.x,s.y)}}}}}),s.addEvent(window,"resize",function(){var t;return function(){clearTimeout(t),t=setTimeout(function(){n(e.instances,function(t){t.options.responsive&&t.resize(t.render,!0)})},50)}}()),p?define(function(){return e}):"object"==typeof module&&module.exports&&(module.exports=e),t.Chart=e,e.noConflict=function(){return t.Chart=i,e}}).call(this),function(){"use strict";var t=this,i=t.Chart,e=i.helpers,s={scaleBeginAtZero:!0,scaleShowGridLines:!0,scaleGridLineColor:"rgba(0,0,0,.05)",scaleGridLineWidth:1,barShowStroke:!0,barStrokeWidth:2,barValueSpacing:5,barDatasetSpacing:1,legendTemplate:'<ul class="<%=name.toLowerCase()%>-legend"><% for (var i=0; i<datasets.length; i++){%><li><span style="background-color:<%=datasets[i].fillColor%>"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>'};i.Type.extend({name:"Bar",defaults:s,initialize:function(t){var s=this.options;this.ScaleClass=i.Scale.extend({offsetGridLines:!0,calculateBarX:function(t,i,e){var n=this.calculateBaseWidth(),o=this.calculateX(e)-n/2,a=this.calculateBarWidth(t);return o+a*i+i*s.barDatasetSpacing+a/2},calculateBaseWidth:function(){return this.calculateX(1)-this.calculateX(0)-2*s.barValueSpacing},calculateBarWidth:function(t){var i=this.calculateBaseWidth()-(t-1)*s.barDatasetSpacing;return i/t}}),this.datasets=[],this.options.showTooltips&&e.bindEvents(this,this.options.tooltipEvents,function(t){var i="mouseout"!==t.type?this.getBarsAtEvent(t):[];this.eachBars(function(t){t.restore(["fillColor","strokeColor"])}),e.each(i,function(t){t.fillColor=t.highlightFill,t.strokeColor=t.highlightStroke}),this.showTooltip(i)}),this.BarClass=i.Rectangle.extend({strokeWidth:this.options.barStrokeWidth,showStroke:this.options.barShowStroke,ctx:this.chart.ctx}),e.each(t.datasets,function(i){var s={label:i.label||null,fillColor:i.fillColor,strokeColor:i.strokeColor,bars:[]};this.datasets.push(s),e.each(i.data,function(e,n){s.bars.push(new this.BarClass({value:e,label:t.labels[n],datasetLabel:i.label,strokeColor:i.strokeColor,fillColor:i.fillColor,highlightFill:i.highlightFill||i.fillColor,highlightStroke:i.highlightStroke||i.strokeColor}))},this)},this),this.buildScale(t.labels),this.BarClass.prototype.base=this.scale.endPoint,this.eachBars(function(t,i,s){e.extend(t,{width:this.scale.calculateBarWidth(this.datasets.length),x:this.scale.calculateBarX(this.datasets.length,s,i),y:this.scale.endPoint}),t.save()},this),this.render()},update:function(){this.scale.update(),e.each(this.activeElements,function(t){t.restore(["fillColor","strokeColor"])}),this.eachBars(function(t){t.save()}),this.render()},eachBars:function(t){e.each(this.datasets,function(i,s){e.each(i.bars,t,this,s)},this)},getBarsAtEvent:function(t){for(var i,s=[],n=e.getRelativePosition(t),o=function(t){s.push(t.bars[i])},a=0;a<this.datasets.length;a++)for(i=0;i<this.datasets[a].bars.length;i++)if(this.datasets[a].bars[i].inRange(n.x,n.y))return e.each(this.datasets,o),s;return s},buildScale:function(t){var i=this,s=function(){var t=[];return i.eachBars(function(i){t.push(i.value)}),t},n={templateString:this.options.scaleLabel,height:this.chart.height,width:this.chart.width,ctx:this.chart.ctx,textColor:this.options.scaleFontColor,fontSize:this.options.scaleFontSize,fontStyle:this.options.scaleFontStyle,fontFamily:this.options.scaleFontFamily,valuesCount:t.length,beginAtZero:this.options.scaleBeginAtZero,integersOnly:this.options.scaleIntegersOnly,calculateYRange:function(t){var i=e.calculateScaleRange(s(),t,this.fontSize,this.beginAtZero,this.integersOnly);e.extend(this,i)},xLabels:t,font:e.fontString(this.options.scaleFontSize,this.options.scaleFontStyle,this.options.scaleFontFamily),lineWidth:this.options.scaleLineWidth,lineColor:this.options.scaleLineColor,gridLineWidth:this.options.scaleShowGridLines?this.options.scaleGridLineWidth:0,gridLineColor:this.options.scaleShowGridLines?this.options.scaleGridLineColor:"rgba(0,0,0,0)",padding:this.options.showScale?0:this.options.barShowStroke?this.options.barStrokeWidth:0,showLabels:this.options.scaleShowLabels,display:this.options.showScale};this.options.scaleOverride&&e.extend(n,{calculateYRange:e.noop,steps:this.options.scaleSteps,stepValue:this.options.scaleStepWidth,min:this.options.scaleStartValue,max:this.options.scaleStartValue+this.options.scaleSteps*this.options.scaleStepWidth}),this.scale=new this.ScaleClass(n)},addData:function(t,i){e.each(t,function(t,e){this.datasets[e].bars.push(new this.BarClass({value:t,label:i,x:this.scale.calculateBarX(this.datasets.length,e,this.scale.valuesCount+1),y:this.scale.endPoint,width:this.scale.calculateBarWidth(this.datasets.length),base:this.scale.endPoint,strokeColor:this.datasets[e].strokeColor,fillColor:this.datasets[e].fillColor}))},this),this.scale.addXLabel(i),this.update()},removeData:function(){this.scale.removeXLabel(),e.each(this.datasets,function(t){t.bars.shift()},this),this.update()},reflow:function(){e.extend(this.BarClass.prototype,{y:this.scale.endPoint,base:this.scale.endPoint});var t=e.extend({height:this.chart.height,width:this.chart.width});this.scale.update(t)},draw:function(t){var i=t||1;this.clear();this.chart.ctx;this.scale.draw(i),e.each(this.datasets,function(t,s){e.each(t.bars,function(t,e){t.hasValue()&&(t.base=this.scale.endPoint,t.transition({x:this.scale.calculateBarX(this.datasets.length,s,e),y:this.scale.calculateY(t.value),width:this.scale.calculateBarWidth(this.datasets.length)},i).draw())},this)},this)}})}.call(this),function(){"use strict";var t=this,i=t.Chart,e=i.helpers,s={segmentShowStroke:!0,segmentStrokeColor:"#fff",segmentStrokeWidth:2,percentageInnerCutout:50,animationSteps:100,animationEasing:"easeOutBounce",animateRotate:!0,animateScale:!1,legendTemplate:'<ul class="<%=name.toLowerCase()%>-legend"><% for (var i=0; i<segments.length; i++){%><li><span style="background-color:<%=segments[i].fillColor%>"></span><%if(segments[i].label){%><%=segments[i].label%><%}%></li><%}%></ul>'};
i.Type.extend({name:"Doughnut",defaults:s,initialize:function(t){this.segments=[],this.outerRadius=(e.min([this.chart.width,this.chart.height])-this.options.segmentStrokeWidth/2)/2,this.SegmentArc=i.Arc.extend({ctx:this.chart.ctx,x:this.chart.width/2,y:this.chart.height/2}),this.options.showTooltips&&e.bindEvents(this,this.options.tooltipEvents,function(t){var i="mouseout"!==t.type?this.getSegmentsAtEvent(t):[];e.each(this.segments,function(t){t.restore(["fillColor"])}),e.each(i,function(t){t.fillColor=t.highlightColor}),this.showTooltip(i)}),this.calculateTotal(t),e.each(t,function(t,i){this.addData(t,i,!0)},this),this.render()},getSegmentsAtEvent:function(t){var i=[],s=e.getRelativePosition(t);return e.each(this.segments,function(t){t.inRange(s.x,s.y)&&i.push(t)},this),i},addData:function(t,i,e){var s=i||this.segments.length;this.segments.splice(s,0,new this.SegmentArc({value:t.value,outerRadius:this.options.animateScale?0:this.outerRadius,innerRadius:this.options.animateScale?0:this.outerRadius/100*this.options.percentageInnerCutout,fillColor:t.color,highlightColor:t.highlight||t.color,showStroke:this.options.segmentShowStroke,strokeWidth:this.options.segmentStrokeWidth,strokeColor:this.options.segmentStrokeColor,startAngle:1.5*Math.PI,circumference:this.options.animateRotate?0:this.calculateCircumference(t.value),label:t.label})),e||(this.reflow(),this.update())},calculateCircumference:function(t){return 2*Math.PI*(t/this.total)},calculateTotal:function(t){this.total=0,e.each(t,function(t){this.total+=t.value},this)},update:function(){this.calculateTotal(this.segments),e.each(this.activeElements,function(t){t.restore(["fillColor"])}),e.each(this.segments,function(t){t.save()}),this.render()},removeData:function(t){var i=e.isNumber(t)?t:this.segments.length-1;this.segments.splice(i,1),this.reflow(),this.update()},reflow:function(){e.extend(this.SegmentArc.prototype,{x:this.chart.width/2,y:this.chart.height/2}),this.outerRadius=(e.min([this.chart.width,this.chart.height])-this.options.segmentStrokeWidth/2)/2,e.each(this.segments,function(t){t.update({outerRadius:this.outerRadius,innerRadius:this.outerRadius/100*this.options.percentageInnerCutout})},this)},draw:function(t){var i=t?t:1;this.clear(),e.each(this.segments,function(t,e){t.transition({circumference:this.calculateCircumference(t.value),outerRadius:this.outerRadius,innerRadius:this.outerRadius/100*this.options.percentageInnerCutout},i),t.endAngle=t.startAngle+t.circumference,t.draw(),0===e&&(t.startAngle=1.5*Math.PI),e<this.segments.length-1&&(this.segments[e+1].startAngle=t.endAngle)},this)}}),i.types.Doughnut.extend({name:"Pie",defaults:e.merge(s,{percentageInnerCutout:0})})}.call(this),function(){"use strict";var t=this,i=t.Chart,e=i.helpers,s={scaleShowGridLines:!0,scaleGridLineColor:"rgba(0,0,0,.05)",scaleGridLineWidth:1,bezierCurve:!0,bezierCurveTension:.4,pointDot:!0,pointDotRadius:4,pointDotStrokeWidth:1,pointHitDetectionRadius:20,datasetStroke:!0,datasetStrokeWidth:2,datasetFill:!0,legendTemplate:'<ul class="<%=name.toLowerCase()%>-legend"><% for (var i=0; i<datasets.length; i++){%><li><span style="background-color:<%=datasets[i].strokeColor%>"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>'};i.Type.extend({name:"Line",defaults:s,initialize:function(t){this.PointClass=i.Point.extend({strokeWidth:this.options.pointDotStrokeWidth,radius:this.options.pointDotRadius,display:this.options.pointDot,hitDetectionRadius:this.options.pointHitDetectionRadius,ctx:this.chart.ctx,inRange:function(t){return Math.pow(t-this.x,2)<Math.pow(this.radius+this.hitDetectionRadius,2)}}),this.datasets=[],this.options.showTooltips&&e.bindEvents(this,this.options.tooltipEvents,function(t){var i="mouseout"!==t.type?this.getPointsAtEvent(t):[];this.eachPoints(function(t){t.restore(["fillColor","strokeColor"])}),e.each(i,function(t){t.fillColor=t.highlightFill,t.strokeColor=t.highlightStroke}),this.showTooltip(i)}),e.each(t.datasets,function(i){var s={label:i.label||null,fillColor:i.fillColor,strokeColor:i.strokeColor,pointColor:i.pointColor,pointStrokeColor:i.pointStrokeColor,points:[]};this.datasets.push(s),e.each(i.data,function(e,n){s.points.push(new this.PointClass({value:e,label:t.labels[n],datasetLabel:i.label,strokeColor:i.pointStrokeColor,fillColor:i.pointColor,highlightFill:i.pointHighlightFill||i.pointColor,highlightStroke:i.pointHighlightStroke||i.pointStrokeColor}))},this),this.buildScale(t.labels),this.eachPoints(function(t,i){e.extend(t,{x:this.scale.calculateX(i),y:this.scale.endPoint}),t.save()},this)},this),this.render()},update:function(){this.scale.update(),e.each(this.activeElements,function(t){t.restore(["fillColor","strokeColor"])}),this.eachPoints(function(t){t.save()}),this.render()},eachPoints:function(t){e.each(this.datasets,function(i){e.each(i.points,t,this)},this)},getPointsAtEvent:function(t){var i=[],s=e.getRelativePosition(t);return e.each(this.datasets,function(t){e.each(t.points,function(t){t.inRange(s.x,s.y)&&i.push(t)})},this),i},buildScale:function(t){var s=this,n=function(){var t=[];return s.eachPoints(function(i){t.push(i.value)}),t},o={templateString:this.options.scaleLabel,height:this.chart.height,width:this.chart.width,ctx:this.chart.ctx,textColor:this.options.scaleFontColor,fontSize:this.options.scaleFontSize,fontStyle:this.options.scaleFontStyle,fontFamily:this.options.scaleFontFamily,valuesCount:t.length,beginAtZero:this.options.scaleBeginAtZero,integersOnly:this.options.scaleIntegersOnly,calculateYRange:function(t){var i=e.calculateScaleRange(n(),t,this.fontSize,this.beginAtZero,this.integersOnly);e.extend(this,i)},xLabels:t,font:e.fontString(this.options.scaleFontSize,this.options.scaleFontStyle,this.options.scaleFontFamily),lineWidth:this.options.scaleLineWidth,lineColor:this.options.scaleLineColor,gridLineWidth:this.options.scaleShowGridLines?this.options.scaleGridLineWidth:0,gridLineColor:this.options.scaleShowGridLines?this.options.scaleGridLineColor:"rgba(0,0,0,0)",padding:this.options.showScale?0:this.options.pointDotRadius+this.options.pointDotStrokeWidth,showLabels:this.options.scaleShowLabels,display:this.options.showScale};this.options.scaleOverride&&e.extend(o,{calculateYRange:e.noop,steps:this.options.scaleSteps,stepValue:this.options.scaleStepWidth,min:this.options.scaleStartValue,max:this.options.scaleStartValue+this.options.scaleSteps*this.options.scaleStepWidth}),this.scale=new i.Scale(o)},addData:function(t,i){e.each(t,function(t,e){this.datasets[e].points.push(new this.PointClass({value:t,label:i,x:this.scale.calculateX(this.scale.valuesCount+1),y:this.scale.endPoint,strokeColor:this.datasets[e].pointStrokeColor,fillColor:this.datasets[e].pointColor}))},this),this.scale.addXLabel(i),this.update()},removeData:function(){this.scale.removeXLabel(),e.each(this.datasets,function(t){t.points.shift()},this),this.update()},reflow:function(){var t=e.extend({height:this.chart.height,width:this.chart.width});this.scale.update(t)},draw:function(t){var i=t||1;this.clear();var s=this.chart.ctx,n=function(t){return null!==t.value},o=function(t,i,s){return e.findNextWhere(i,n,s)||t},a=function(t,i,s){return e.findPreviousWhere(i,n,s)||t};this.scale.draw(i),e.each(this.datasets,function(t){var h=e.where(t.points,n);e.each(t.points,function(t,e){t.hasValue()&&t.transition({y:this.scale.calculateY(t.value),x:this.scale.calculateX(e)},i)},this),this.options.bezierCurve&&e.each(h,function(t,i){var s=i>0&&i<h.length-1?this.options.bezierCurveTension:0;t.controlPoints=e.splineCurve(a(t,h,i),t,o(t,h,i),s),t.controlPoints.outer.y>this.scale.endPoint?t.controlPoints.outer.y=this.scale.endPoint:t.controlPoints.outer.y<this.scale.startPoint&&(t.controlPoints.outer.y=this.scale.startPoint),t.controlPoints.inner.y>this.scale.endPoint?t.controlPoints.inner.y=this.scale.endPoint:t.controlPoints.inner.y<this.scale.startPoint&&(t.controlPoints.inner.y=this.scale.startPoint)},this),s.lineWidth=this.options.datasetStrokeWidth,s.strokeStyle=t.strokeColor,s.beginPath(),e.each(h,function(t,i){if(0===i)s.moveTo(t.x,t.y);else if(this.options.bezierCurve){var e=a(t,h,i);s.bezierCurveTo(e.controlPoints.outer.x,e.controlPoints.outer.y,t.controlPoints.inner.x,t.controlPoints.inner.y,t.x,t.y)}else s.lineTo(t.x,t.y)},this),s.stroke(),this.options.datasetFill&&h.length>0&&(s.lineTo(h[h.length-1].x,this.scale.endPoint),s.lineTo(h[0].x,this.scale.endPoint),s.fillStyle=t.fillColor,s.closePath(),s.fill()),e.each(h,function(t){t.draw()})},this)}})}.call(this),function(){"use strict";var t=this,i=t.Chart,e=i.helpers,s={scaleShowLabelBackdrop:!0,scaleBackdropColor:"rgba(255,255,255,0.75)",scaleBeginAtZero:!0,scaleBackdropPaddingY:2,scaleBackdropPaddingX:2,scaleShowLine:!0,segmentShowStroke:!0,segmentStrokeColor:"#fff",segmentStrokeWidth:2,animationSteps:100,animationEasing:"easeOutBounce",animateRotate:!0,animateScale:!1,legendTemplate:'<ul class="<%=name.toLowerCase()%>-legend"><% for (var i=0; i<segments.length; i++){%><li><span style="background-color:<%=segments[i].fillColor%>"></span><%if(segments[i].label){%><%=segments[i].label%><%}%></li><%}%></ul>'};i.Type.extend({name:"PolarArea",defaults:s,initialize:function(t){this.segments=[],this.SegmentArc=i.Arc.extend({showStroke:this.options.segmentShowStroke,strokeWidth:this.options.segmentStrokeWidth,strokeColor:this.options.segmentStrokeColor,ctx:this.chart.ctx,innerRadius:0,x:this.chart.width/2,y:this.chart.height/2}),this.scale=new i.RadialScale({display:this.options.showScale,fontStyle:this.options.scaleFontStyle,fontSize:this.options.scaleFontSize,fontFamily:this.options.scaleFontFamily,fontColor:this.options.scaleFontColor,showLabels:this.options.scaleShowLabels,showLabelBackdrop:this.options.scaleShowLabelBackdrop,backdropColor:this.options.scaleBackdropColor,backdropPaddingY:this.options.scaleBackdropPaddingY,backdropPaddingX:this.options.scaleBackdropPaddingX,lineWidth:this.options.scaleShowLine?this.options.scaleLineWidth:0,lineColor:this.options.scaleLineColor,lineArc:!0,width:this.chart.width,height:this.chart.height,xCenter:this.chart.width/2,yCenter:this.chart.height/2,ctx:this.chart.ctx,templateString:this.options.scaleLabel,valuesCount:t.length}),this.updateScaleRange(t),this.scale.update(),e.each(t,function(t,i){this.addData(t,i,!0)},this),this.options.showTooltips&&e.bindEvents(this,this.options.tooltipEvents,function(t){var i="mouseout"!==t.type?this.getSegmentsAtEvent(t):[];e.each(this.segments,function(t){t.restore(["fillColor"])}),e.each(i,function(t){t.fillColor=t.highlightColor}),this.showTooltip(i)}),this.render()},getSegmentsAtEvent:function(t){var i=[],s=e.getRelativePosition(t);return e.each(this.segments,function(t){t.inRange(s.x,s.y)&&i.push(t)},this),i},addData:function(t,i,e){var s=i||this.segments.length;this.segments.splice(s,0,new this.SegmentArc({fillColor:t.color,highlightColor:t.highlight||t.color,label:t.label,value:t.value,outerRadius:this.options.animateScale?0:this.scale.calculateCenterOffset(t.value),circumference:this.options.animateRotate?0:this.scale.getCircumference(),startAngle:1.5*Math.PI})),e||(this.reflow(),this.update())},removeData:function(t){var i=e.isNumber(t)?t:this.segments.length-1;this.segments.splice(i,1),this.reflow(),this.update()},calculateTotal:function(t){this.total=0,e.each(t,function(t){this.total+=t.value},this),this.scale.valuesCount=this.segments.length},updateScaleRange:function(t){var i=[];e.each(t,function(t){i.push(t.value)});var s=this.options.scaleOverride?{steps:this.options.scaleSteps,stepValue:this.options.scaleStepWidth,min:this.options.scaleStartValue,max:this.options.scaleStartValue+this.options.scaleSteps*this.options.scaleStepWidth}:e.calculateScaleRange(i,e.min([this.chart.width,this.chart.height])/2,this.options.scaleFontSize,this.options.scaleBeginAtZero,this.options.scaleIntegersOnly);e.extend(this.scale,s,{size:e.min([this.chart.width,this.chart.height]),xCenter:this.chart.width/2,yCenter:this.chart.height/2})},update:function(){this.calculateTotal(this.segments),e.each(this.segments,function(t){t.save()}),this.render()},reflow:function(){e.extend(this.SegmentArc.prototype,{x:this.chart.width/2,y:this.chart.height/2}),this.updateScaleRange(this.segments),this.scale.update(),e.extend(this.scale,{xCenter:this.chart.width/2,yCenter:this.chart.height/2}),e.each(this.segments,function(t){t.update({outerRadius:this.scale.calculateCenterOffset(t.value)})},this)},draw:function(t){var i=t||1;this.clear(),e.each(this.segments,function(t,e){t.transition({circumference:this.scale.getCircumference(),outerRadius:this.scale.calculateCenterOffset(t.value)},i),t.endAngle=t.startAngle+t.circumference,0===e&&(t.startAngle=1.5*Math.PI),e<this.segments.length-1&&(this.segments[e+1].startAngle=t.endAngle),t.draw()},this),this.scale.draw()}})}.call(this),function(){"use strict";var t=this,i=t.Chart,e=i.helpers;i.Type.extend({name:"Radar",defaults:{scaleShowLine:!0,angleShowLineOut:!0,scaleShowLabels:!1,scaleBeginAtZero:!0,angleLineColor:"rgba(0,0,0,.1)",angleLineWidth:1,pointLabelFontFamily:"'Arial'",pointLabelFontStyle:"normal",pointLabelFontSize:10,pointLabelFontColor:"#666",pointDot:!0,pointDotRadius:3,pointDotStrokeWidth:1,pointHitDetectionRadius:20,datasetStroke:!0,datasetStrokeWidth:2,datasetFill:!0,legendTemplate:'<ul class="<%=name.toLowerCase()%>-legend"><% for (var i=0; i<datasets.length; i++){%><li><span style="background-color:<%=datasets[i].strokeColor%>"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>'},initialize:function(t){this.PointClass=i.Point.extend({strokeWidth:this.options.pointDotStrokeWidth,radius:this.options.pointDotRadius,display:this.options.pointDot,hitDetectionRadius:this.options.pointHitDetectionRadius,ctx:this.chart.ctx}),this.datasets=[],this.buildScale(t),this.options.showTooltips&&e.bindEvents(this,this.options.tooltipEvents,function(t){var i="mouseout"!==t.type?this.getPointsAtEvent(t):[];this.eachPoints(function(t){t.restore(["fillColor","strokeColor"])}),e.each(i,function(t){t.fillColor=t.highlightFill,t.strokeColor=t.highlightStroke}),this.showTooltip(i)}),e.each(t.datasets,function(i){var s={label:i.label||null,fillColor:i.fillColor,strokeColor:i.strokeColor,pointColor:i.pointColor,pointStrokeColor:i.pointStrokeColor,points:[]};this.datasets.push(s),e.each(i.data,function(e,n){var o;this.scale.animation||(o=this.scale.getPointPosition(n,this.scale.calculateCenterOffset(e))),s.points.push(new this.PointClass({value:e,label:t.labels[n],datasetLabel:i.label,x:this.options.animation?this.scale.xCenter:o.x,y:this.options.animation?this.scale.yCenter:o.y,strokeColor:i.pointStrokeColor,fillColor:i.pointColor,highlightFill:i.pointHighlightFill||i.pointColor,highlightStroke:i.pointHighlightStroke||i.pointStrokeColor}))},this)},this),this.render()},eachPoints:function(t){e.each(this.datasets,function(i){e.each(i.points,t,this)},this)},getPointsAtEvent:function(t){var i=e.getRelativePosition(t),s=e.getAngleFromPoint({x:this.scale.xCenter,y:this.scale.yCenter},i),n=2*Math.PI/this.scale.valuesCount,o=Math.round((s.angle-1.5*Math.PI)/n),a=[];return(o>=this.scale.valuesCount||0>o)&&(o=0),s.distance<=this.scale.drawingArea&&e.each(this.datasets,function(t){a.push(t.points[o])}),a},buildScale:function(t){this.scale=new i.RadialScale({display:this.options.showScale,fontStyle:this.options.scaleFontStyle,fontSize:this.options.scaleFontSize,fontFamily:this.options.scaleFontFamily,fontColor:this.options.scaleFontColor,showLabels:this.options.scaleShowLabels,showLabelBackdrop:this.options.scaleShowLabelBackdrop,backdropColor:this.options.scaleBackdropColor,backdropPaddingY:this.options.scaleBackdropPaddingY,backdropPaddingX:this.options.scaleBackdropPaddingX,lineWidth:this.options.scaleShowLine?this.options.scaleLineWidth:0,lineColor:this.options.scaleLineColor,angleLineColor:this.options.angleLineColor,angleLineWidth:this.options.angleShowLineOut?this.options.angleLineWidth:0,pointLabelFontColor:this.options.pointLabelFontColor,pointLabelFontSize:this.options.pointLabelFontSize,pointLabelFontFamily:this.options.pointLabelFontFamily,pointLabelFontStyle:this.options.pointLabelFontStyle,height:this.chart.height,width:this.chart.width,xCenter:this.chart.width/2,yCenter:this.chart.height/2,ctx:this.chart.ctx,templateString:this.options.scaleLabel,labels:t.labels,valuesCount:t.datasets[0].data.length}),this.scale.setScaleSize(),this.updateScaleRange(t.datasets),this.scale.buildYLabels()},updateScaleRange:function(t){var i=function(){var i=[];return e.each(t,function(t){t.data?i=i.concat(t.data):e.each(t.points,function(t){i.push(t.value)})}),i}(),s=this.options.scaleOverride?{steps:this.options.scaleSteps,stepValue:this.options.scaleStepWidth,min:this.options.scaleStartValue,max:this.options.scaleStartValue+this.options.scaleSteps*this.options.scaleStepWidth}:e.calculateScaleRange(i,e.min([this.chart.width,this.chart.height])/2,this.options.scaleFontSize,this.options.scaleBeginAtZero,this.options.scaleIntegersOnly);e.extend(this.scale,s)},addData:function(t,i){this.scale.valuesCount++,e.each(t,function(t,e){var s=this.scale.getPointPosition(this.scale.valuesCount,this.scale.calculateCenterOffset(t));this.datasets[e].points.push(new this.PointClass({value:t,label:i,x:s.x,y:s.y,strokeColor:this.datasets[e].pointStrokeColor,fillColor:this.datasets[e].pointColor}))},this),this.scale.labels.push(i),this.reflow(),this.update()},removeData:function(){this.scale.valuesCount--,this.scale.labels.shift(),e.each(this.datasets,function(t){t.points.shift()},this),this.reflow(),this.update()},update:function(){this.eachPoints(function(t){t.save()}),this.reflow(),this.render()},reflow:function(){e.extend(this.scale,{width:this.chart.width,height:this.chart.height,size:e.min([this.chart.width,this.chart.height]),xCenter:this.chart.width/2,yCenter:this.chart.height/2}),this.updateScaleRange(this.datasets),this.scale.setScaleSize(),this.scale.buildYLabels()},draw:function(t){var i=t||1,s=this.chart.ctx;this.clear(),this.scale.draw(),e.each(this.datasets,function(t){e.each(t.points,function(t,e){t.hasValue()&&t.transition(this.scale.getPointPosition(e,this.scale.calculateCenterOffset(t.value)),i)},this),s.lineWidth=this.options.datasetStrokeWidth,s.strokeStyle=t.strokeColor,s.beginPath(),e.each(t.points,function(t,i){0===i?s.moveTo(t.x,t.y):s.lineTo(t.x,t.y)},this),s.closePath(),s.stroke(),s.fillStyle=t.fillColor,s.fill(),e.each(t.points,function(t){t.hasValue()&&t.draw()})},this)}})}.call(this);
var randomScalingFactor = function(){ return Math.round(Math.random()*1000)};
	
	var lineChartData = {
		labels : ["January","February","March","April","May","June","July"],
		datasets : [
			{
				label: "My First dataset",
				fillColor : "rgba(220,220,220,0.2)",
				strokeColor : "rgba(220,220,220,1)",
				pointColor : "rgba(220,220,220,1)",
				pointStrokeColor : "#fff",
				pointHighlightFill : "#fff",
				pointHighlightStroke : "rgba(220,220,220,1)",
				data : [randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor()]
			},
			{
				label: "My Second dataset",
				fillColor : "rgba(48, 164, 255, 0.2)",
				strokeColor : "rgba(48, 164, 255, 1)",
				pointColor : "rgba(48, 164, 255, 1)",
				pointStrokeColor : "#fff",
				pointHighlightFill : "#fff",
				pointHighlightStroke : "rgba(48, 164, 255, 1)",
				data : [randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor()]
			}
		]

	}
		
	var barChartData = {
		labels : ["January","February","March","April","May","June","July"],
		datasets : [
			{
				fillColor : "rgba(220,220,220,0.5)",
				strokeColor : "rgba(220,220,220,0.8)",
				highlightFill: "rgba(220,220,220,0.75)",
				highlightStroke: "rgba(220,220,220,1)",
				data : [randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor()]
			},
			{
				fillColor : "rgba(48, 164, 255, 0.2)",
				strokeColor : "rgba(48, 164, 255, 0.8)",
				highlightFill : "rgba(48, 164, 255, 0.75)",
				highlightStroke : "rgba(48, 164, 255, 1)",
				data : [randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor(),randomScalingFactor()]
			}
		]

	}

	var pieData = [
			{
				value: 300,
				color:"#30a5ff",
				highlight: "#62b9fb",
				label: "Blue"
			},
			{
				value: 50,
				color: "#ffb53e",
				highlight: "#fac878",
				label: "Orange"
			},
			{
				value: 100,
				color: "#1ebfae",
				highlight: "#3cdfce",
				label: "Teal"
			},
			{
				value: 120,
				color: "#f9243f",
				highlight: "#f6495f",
				label: "Red"
			}

		];
			
	var doughnutData = [
				{
					value: 300,
					color:"#30a5ff",
					highlight: "#62b9fb",
					label: "Blue"
				},
				{
					value: 50,
					color: "#ffb53e",
					highlight: "#fac878",
					label: "Orange"
				},
				{
					value: 100,
					color: "#1ebfae",
					highlight: "#3cdfce",
					label: "Teal"
				},
				{
					value: 120,
					color: "#f9243f",
					highlight: "#f6495f",
					label: "Red"
				}

			];
			
	var radarData = {
	    labels: ["Eating", "Drinking", "Sleeping", "Designing", "Coding", "Cycling", "Running"],
	    datasets: [
	        {
	            label: "My First dataset",
	            fillColor: "rgba(220,220,220,0.2)",
	            strokeColor: "rgba(220,220,220,1)",
	            pointColor: "rgba(220,220,220,1)",
	            pointStrokeColor: "#fff",
	            pointHighlightFill: "#fff",
	            pointHighlightStroke: "rgba(220,220,220,1)",
	            data: [65, 59, 90, 81, 56, 55, 40]
	        },
	        {
	            label: "My Second dataset",
	            fillColor : "rgba(48, 164, 255, 0.2)",
	            strokeColor : "rgba(48, 164, 255, 0.8)",
	            pointColor : "rgba(48, 164, 255, 1)",
	            pointStrokeColor : "#fff",
	            pointHighlightFill : "#fff",
	            pointHighlightStroke : "rgba(48, 164, 255, 1)",
	            data: [28, 48, 40, 19, 96, 27, 100]
	        }
	    ]
	};
	
	var polarData = [
		    {
		    	value: 300,
		    	color: "#1ebfae",
		    	highlight: "#38cabe",
		    	label: "Teal"
		    },
		    {
		    	value: 140,
		    	color: "#ffb53e",
		    	highlight: "#fac878",
		    	label: "Orange"
		    },
		    {
		    	value: 220,
		    	color:"#30a5ff",
		    	highlight: "#62b9fb",
		    	label: "Blue"
		    },
		    {
		    	value: 250,
		    	color: "#f9243f",
		    	highlight: "#f6495f",
		    	label: "Red"
		    }
		
	];


/**!
 * easyPieChart
 * Lightweight plugin to render simple, animated and retina optimized pie charts
 *
 * @license 
 * @author Robert Fleischmann <rendro87@gmail.com> (http://robert-fleischmann.de)
 * @version 2.1.5
 **/

(function(root, factory) {
    if(typeof exports === 'object') {
        module.exports = factory(require('jquery'));
    }
    else if(typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    }
    else {
        factory(root.jQuery);
    }
}(this, function($) {

/**
 * Renderer to render the chart on a canvas object
 * @param {DOMElement} el      DOM element to host the canvas (root of the plugin)
 * @param {object}     options options object of the plugin
 */
var CanvasRenderer = function(el, options) {
	var cachedBackground;
	var canvas = document.createElement('canvas');

	el.appendChild(canvas);

	if (typeof(G_vmlCanvasManager) !== 'undefined') {
		G_vmlCanvasManager.initElement(canvas);
	}

	var ctx = canvas.getContext('2d');

	canvas.width = canvas.height = options.size;

	// canvas on retina devices
	var scaleBy = 1;
	if (window.devicePixelRatio > 1) {
		scaleBy = window.devicePixelRatio;
		canvas.style.width = canvas.style.height = [options.size, 'px'].join('');
		canvas.width = canvas.height = options.size * scaleBy;
		ctx.scale(scaleBy, scaleBy);
	}

	// move 0,0 coordinates to the center
	ctx.translate(options.size / 2, options.size / 2);

	// rotate canvas -90deg
	ctx.rotate((-1 / 2 + options.rotate / 180) * Math.PI);

	var radius = (options.size - options.lineWidth) / 2;
	if (options.scaleColor && options.scaleLength) {
		radius -= options.scaleLength + 2; // 2 is the distance between scale and bar
	}

	// IE polyfill for Date
	Date.now = Date.now || function() {
		return +(new Date());
	};

	/**
	 * Draw a circle around the center of the canvas
	 * @param {strong} color     Valid CSS color string
	 * @param {number} lineWidth Width of the line in px
	 * @param {number} percent   Percentage to draw (float between -1 and 1)
	 */
	var drawCircle = function(color, lineWidth, percent) {
		percent = Math.min(Math.max(-1, percent || 0), 1);
		var isNegative = percent <= 0 ? true : false;

		ctx.beginPath();
		ctx.arc(0, 0, radius, 0, Math.PI * 2 * percent, isNegative);

		ctx.strokeStyle = color;
		ctx.lineWidth = lineWidth;

		ctx.stroke();
	};

	/**
	 * Draw the scale of the chart
	 */
	var drawScale = function() {
		var offset;
		var length;

		ctx.lineWidth = 1;
		ctx.fillStyle = options.scaleColor;

		ctx.save();
		for (var i = 24; i > 0; --i) {
			if (i % 6 === 0) {
				length = options.scaleLength;
				offset = 0;
			} else {
				length = options.scaleLength * 0.6;
				offset = options.scaleLength - length;
			}
			ctx.fillRect(-options.size/2 + offset, 0, length, 1);
			ctx.rotate(Math.PI / 12);
		}
		ctx.restore();
	};

	/**
	 * Request animation frame wrapper with polyfill
	 * @return {function} Request animation frame method or timeout fallback
	 */
	var reqAnimationFrame = (function() {
		return  window.requestAnimationFrame ||
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame ||
				function(callback) {
					window.setTimeout(callback, 1000 / 60);
				};
	}());

	/**
	 * Draw the background of the plugin including the scale and the track
	 */
	var drawBackground = function() {
		if(options.scaleColor) drawScale();
		if(options.trackColor) drawCircle(options.trackColor, options.lineWidth, 1);
	};

  /**
    * Canvas accessor
   */
  this.getCanvas = function() {
    return canvas;
  };
  
  /**
    * Canvas 2D context 'ctx' accessor
   */
  this.getCtx = function() {
    return ctx;
  };

	/**
	 * Clear the complete canvas
	 */
	this.clear = function() {
		ctx.clearRect(options.size / -2, options.size / -2, options.size, options.size);
	};

	/**
	 * Draw the complete chart
	 * @param {number} percent Percent shown by the chart between -100 and 100
	 */
	this.draw = function(percent) {
		// do we need to render a background
		if (!!options.scaleColor || !!options.trackColor) {
			// getImageData and putImageData are supported
			if (ctx.getImageData && ctx.putImageData) {
				if (!cachedBackground) {
					drawBackground();
					cachedBackground = ctx.getImageData(0, 0, options.size * scaleBy, options.size * scaleBy);
				} else {
					ctx.putImageData(cachedBackground, 0, 0);
				}
			} else {
				this.clear();
				drawBackground();
			}
		} else {
			this.clear();
		}

		ctx.lineCap = options.lineCap;

		// if barcolor is a function execute it and pass the percent as a value
		var color;
		if (typeof(options.barColor) === 'function') {
			color = options.barColor(percent);
		} else {
			color = options.barColor;
		}

		// draw bar
		drawCircle(color, options.lineWidth, percent / 100);
	}.bind(this);

	/**
	 * Animate from some percent to some other percentage
	 * @param {number} from Starting percentage
	 * @param {number} to   Final percentage
	 */
	this.animate = function(from, to) {
		var startTime = Date.now();
		options.onStart(from, to);
		var animation = function() {
			var process = Math.min(Date.now() - startTime, options.animate.duration);
			var currentValue = options.easing(this, process, from, to - from, options.animate.duration);
			this.draw(currentValue);
			options.onStep(from, to, currentValue);
			if (process >= options.animate.duration) {
				options.onStop(from, to);
			} else {
				reqAnimationFrame(animation);
			}
		}.bind(this);

		reqAnimationFrame(animation);
	}.bind(this);
};

var EasyPieChart = function(el, opts) {
	var defaultOptions = {
		barColor: '#ef1e25',
		trackColor: '#f9f9f9',
		scaleColor: '#dfe0e0',
		scaleLength: 5,
		lineCap: 'round',
		lineWidth: 3,
		size: 110,
		rotate: 0,
		animate: {
			duration: 1000,
			enabled: true
		},
		easing: function (x, t, b, c, d) { // more can be found here: http://gsgd.co.uk/sandbox/jquery/easing/
			t = t / (d/2);
			if (t < 1) {
				return c / 2 * t * t + b;
			}
			return -c/2 * ((--t)*(t-2) - 1) + b;
		},
		onStart: function(from, to) {
			return;
		},
		onStep: function(from, to, currentValue) {
			return;
		},
		onStop: function(from, to) {
			return;
		}
	};

	// detect present renderer
	if (typeof(CanvasRenderer) !== 'undefined') {
		defaultOptions.renderer = CanvasRenderer;
	} else if (typeof(SVGRenderer) !== 'undefined') {
		defaultOptions.renderer = SVGRenderer;
	} else {
		throw new Error('Please load either the SVG- or the CanvasRenderer');
	}

	var options = {};
	var currentValue = 0;

	/**
	 * Initialize the plugin by creating the options object and initialize rendering
	 */
	var init = function() {
		this.el = el;
		this.options = options;

		// merge user options into default options
		for (var i in defaultOptions) {
			if (defaultOptions.hasOwnProperty(i)) {
				options[i] = opts && typeof(opts[i]) !== 'undefined' ? opts[i] : defaultOptions[i];
				if (typeof(options[i]) === 'function') {
					options[i] = options[i].bind(this);
				}
			}
		}

		// check for jQuery easing
		if (typeof(options.easing) === 'string' && typeof(jQuery) !== 'undefined' && jQuery.isFunction(jQuery.easing[options.easing])) {
			options.easing = jQuery.easing[options.easing];
		} else {
			options.easing = defaultOptions.easing;
		}

		// process earlier animate option to avoid bc breaks
		if (typeof(options.animate) === 'number') {
			options.animate = {
				duration: options.animate,
				enabled: true
			};
		}

		if (typeof(options.animate) === 'boolean' && !options.animate) {
			options.animate = {
				duration: 1000,
				enabled: options.animate
			};
		}

		// create renderer
		this.renderer = new options.renderer(el, options);

		// initial draw
		this.renderer.draw(currentValue);

		// initial update
		if (el.dataset && el.dataset.percent) {
			this.update(parseFloat(el.dataset.percent));
		} else if (el.getAttribute && el.getAttribute('data-percent')) {
			this.update(parseFloat(el.getAttribute('data-percent')));
		}
	}.bind(this);

	/**
	 * Update the value of the chart
	 * @param  {number} newValue Number between 0 and 100
	 * @return {object}          Instance of the plugin for method chaining
	 */
	this.update = function(newValue) {
		newValue = parseFloat(newValue);
		if (options.animate.enabled) {
			this.renderer.animate(currentValue, newValue);
		} else {
			this.renderer.draw(newValue);
		}
		currentValue = newValue;
		return this;
	}.bind(this);

	/**
	 * Disable animation
	 * @return {object} Instance of the plugin for method chaining
	 */
	this.disableAnimation = function() {
		options.animate.enabled = false;
		return this;
	};

	/**
	 * Enable animation
	 * @return {object} Instance of the plugin for method chaining
	 */
	this.enableAnimation = function() {
		options.animate.enabled = true;
		return this;
	};

	init();
};

$.fn.easyPieChart = function(options) {
	return this.each(function() {
		var instanceOptions;

		if (!$.data(this, 'easyPieChart')) {
			instanceOptions = $.extend({}, options, $(this).data());
			$.data(this, 'easyPieChart', new EasyPieChart(this, instanceOptions));
		}
	});
};


}));

$(function() {
    $('#easypiechart-teal').easyPieChart({
        scaleColor: false,
        barColor: '#1ebfae'
    });
});

$(function() {
    $('#easypiechart-orange').easyPieChart({
        scaleColor: false,
        barColor: '#ffb53e'
    });
});

$(function() {
    $('#easypiechart-red').easyPieChart({
        scaleColor: false,
        barColor: '#f9243f'
    });
});

$(function() {
   $('#easypiechart-blue').easyPieChart({
       scaleColor: false,
       barColor: '#30a5ff'
   });
});
/**
* @preserve HTML5 Shiv 3.7.2 | @afarkas @jdalton @jon_neal @rem | MIT/GPL2 Licensed
*/
!function(a,b){function c(a,b){var c=a.createElement("p"),d=a.getElementsByTagName("head")[0]||a.documentElement;return c.innerHTML="x<style>"+b+"</style>",d.insertBefore(c.lastChild,d.firstChild)}function d(){var a=t.elements;return"string"==typeof a?a.split(" "):a}function e(a,b){var c=t.elements;"string"!=typeof c&&(c=c.join(" ")),"string"!=typeof a&&(a=a.join(" ")),t.elements=c+" "+a,j(b)}function f(a){var b=s[a[q]];return b||(b={},r++,a[q]=r,s[r]=b),b}function g(a,c,d){if(c||(c=b),l)return c.createElement(a);d||(d=f(c));var e;return e=d.cache[a]?d.cache[a].cloneNode():p.test(a)?(d.cache[a]=d.createElem(a)).cloneNode():d.createElem(a),!e.canHaveChildren||o.test(a)||e.tagUrn?e:d.frag.appendChild(e)}function h(a,c){if(a||(a=b),l)return a.createDocumentFragment();c=c||f(a);for(var e=c.frag.cloneNode(),g=0,h=d(),i=h.length;i>g;g++)e.createElement(h[g]);return e}function i(a,b){b.cache||(b.cache={},b.createElem=a.createElement,b.createFrag=a.createDocumentFragment,b.frag=b.createFrag()),a.createElement=function(c){return t.shivMethods?g(c,a,b):b.createElem(c)},a.createDocumentFragment=Function("h,f","return function(){var n=f.cloneNode(),c=n.createElement;h.shivMethods&&("+d().join().replace(/[\w\-:]+/g,function(a){return b.createElem(a),b.frag.createElement(a),'c("'+a+'")'})+");return n}")(t,b.frag)}function j(a){a||(a=b);var d=f(a);return!t.shivCSS||k||d.hasCSS||(d.hasCSS=!!c(a,"article,aside,dialog,figcaption,figure,footer,header,hgroup,main,nav,section{display:block}mark{background:#FF0;color:#000}template{display:none}")),l||i(a,d),a}var k,l,m="3.7.2",n=a.html5||{},o=/^<|^(?:button|map|select|textarea|object|iframe|option|optgroup)$/i,p=/^(?:a|b|code|div|fieldset|h1|h2|h3|h4|h5|h6|i|label|li|ol|p|q|span|strong|style|table|tbody|td|th|tr|ul)$/i,q="_html5shiv",r=0,s={};!function(){try{var a=b.createElement("a");a.innerHTML="<xyz></xyz>",k="hidden"in a,l=1==a.childNodes.length||function(){b.createElement("a");var a=b.createDocumentFragment();return"undefined"==typeof a.cloneNode||"undefined"==typeof a.createDocumentFragment||"undefined"==typeof a.createElement}()}catch(c){k=!0,l=!0}}();var t={elements:n.elements||"abbr article aside audio bdi canvas data datalist details dialog figcaption figure footer header hgroup main mark meter nav output picture progress section summary template time video",version:m,shivCSS:n.shivCSS!==!1,supportsUnknownElements:l,shivMethods:n.shivMethods!==!1,type:"default",shivDocument:j,createElement:g,createDocumentFragment:h,addElements:e};a.html5=t,j(b)}(this,document);
var icons = '<svg id="glyphs-sheet" xmlns=\"http://www.w3.org/2000/svg\" style=\"display:none;\"><defs><symbol id=\"stroked-bacon-burger\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M41\x2018H3c\x2D.6\x200\x2D1\x2D.4\x2D1\x2D1v\x2D2C2\x208.9\x206.9\x204\x2013\x204h18c6\x200\x2011\x204.9\x2011\x2011v2c0\x20.6\x2D.4\x201\x2D1\x201zM39\x2037H5c\x2D1.7\x200\x2D3\x2D1.3\x2D3\x2D3v\x2D2c0\x2D.6.4\x2D1\x201\x2D1h38c.5\x200\x201\x20.5\x201\x201v2c0\x201.7\x2D1.3\x203\x2D3\x203zM1\x2027h42M1\x2022c3.5\x200\x203.5\x202\x207\x202s3.5\x2D2\x207\x2D2\x203.5\x202\x207\x202\x203.5\x2D2\x207\x2D2\x203.5\x202\x207\x202\x203.5\x2D2\x207\x2D2\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinecap\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-paper-coffee-cup\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M31.6\x2043H12.4L9\x209h26z\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M35\x206H9V2c0\x2D.6.4\x2D1\x201\x2D1h24c.6\x200\x201\x20.4\x201\x201v4z\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M7\x206h30v3H7zM9.8\x2017h24.4M11.6\x2035h20.8\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-round-coffee-mug\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M33\x2011v16c0\x208.8\x2D7.2\x2016\x2D16\x2016S1\x2035.8\x201\x2027V11h32zM37\x2027h\x2D4V15h4c3.3\x200\x206\x202.7\x206\x206s\x2D2.7\x206\x2D6\x206z\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-wireless-router\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M33\x2027v3h\x2D3M39\x2027v3h\x2D3\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M41\x2034H3c\x2D1.1\x200\x2D2\x2D.9\x2D2\x2D2v\x2D6c0\x2D1.1.9\x2D2\x202\x2D2h38c1.1\x200\x202\x20.9\x202\x202v6c0\x201.1\x2D.9\x202\x2D2\x202z\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M5\x2034h6v3H5zM33\x2034h6v3h\x2D6z\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M14\x2024L7\x2013.3M30\x2024l7\x2D10.7\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M25.4\x2015c\x2D.7\x2D1.2\x2D2\x2D2\x2D3.4\x2D2s\x2D2.7.8\x2D3.4\x201.9M29.4\x2010.3C27.6\x208.3\x2024.9\x207\x2022\x207c\x2D2.9\x200\x2D5.5\x201.3\x2D7.4\x203.3\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-pen-tip\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M26.7\x206L38\x2017.3l\x2D6.3\x2013.4L2\x2042l11.3\x2D29.7zM2\x2042l19.1\x2D19.1\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2223.2\x22\x20cy\x3D\x2220.8\x22\x20r\x3D\x223\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M30.5\x201.3l12.2\x2012.2c.5.5.4\x201.3\x2D.3\x201.6L38\x2017.3\x2026.7\x206l2.2\x2D4.4c.3\x2D.7\x201.1\x2D.8\x201.6\x2D.3z\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-usb-flash-drive\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M30\x2043H14c\x2D1.1\x200\x2D2\x2D.9\x2D2\x2D2V11h20v30c0\x201.1\x2D.9\x202\x2D2\x202zM15\x201h14v10H15z\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M20\x204v3h\x2D3M25\x204v3h\x2D3\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-toiler-paper\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M9.9\x201H33c3.9\x200\x207\x205.8\x207\x2013s\x2D3.1\x2013\x2D6.9\x2013H9.9C6.1\x2027\x203\x2021.2\x203\x2014S6.1\x201\x209.9\x201z\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cellipse\x20cx\x3D\x2233\x22\x20cy\x3D\x2214\x22\x20rx\x3D\x227\x22\x20ry\x3D\x2213\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cellipse\x20cx\x3D\x2233\x22\x20cy\x3D\x2214\x22\x20rx\x3D\x223\x22\x20ry\x3D\x227\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M33.1\x2027c3.8\x200\x206.9\x2D5.8\x206.9\x2D13v29l\x2D4\x2D2\x2D4\x202\x2D4\x2D2\x2D4\x202\x2D4\x2D2\x2D3\x202V27h16.1z\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-pencil\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M13.7\x2036.9l\x2D7.1\x2D7.1L34.9\x201.6c.8\x2D.8\x202\x2D.8\x202.8\x200L42\x205.8c.8.8.8\x202\x200\x202.8L13.7\x2036.9zM1\x2042.6l5.7\x2D12.7\x207\x207zM32.8\x203.7l7.1\x207.1\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-brush\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M18.6\x2030l\x2D3.9\x2D3.9c\x2D.4\x2D.4\x2D.4\x2D1\x200\x2D1.4L38.1\x202.5c1.1\x2D1.1\x203\x2D1.1\x204.1.1\x201.1\x201.1\x201.1\x202.9.1\x204.1L20.1\x2030c\x2D.4.4\x2D1.1.4\x2D1.5\x200z\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M1\x2039.9s4.1\x2D3.3\x205.4\x2D7.7c1.1\x2D3.7\x203.6\x2D6.2\x207.1\x2D5.6\x203.5.6\x205.7\x204.4\x204.2\x207.6\x2D1.6\x203.3\x2D8\x206.3\x2D16.7\x205.7z\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-email\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M1\x209h42v26H1z\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M17.1\x2022L1\x2035h42L26.9\x2022\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M22\x2026L1\x209h42z\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-open-letter\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M22\x2026l21\x2017H1z\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M1\x2017v26h42V17\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M26.9\x2030L43\x2017\x2022\x201\x201\x2017l16.1\x2013\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-laptop-computer-and-mobile\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M33\x2031H1v3c0\x20.6.4\x201\x201\x201h31\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M42\x2037h\x2D8c\x2D.6\x200\x2D1\x2D.4\x2D1\x2D1V18c0\x2D.6.4\x2D1\x201\x2D1h8c.6\x200\x201\x20.4\x201\x201v18c0\x20.6\x2D.4\x201\x2D1\x201zM33\x2021h10M33\x2033h10\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M39\x2017v\x2D7c0\x2D.6\x2D.4\x2D1\x2D1\x2D1H6c\x2D.6\x200\x2D1\x20.4\x2D1\x201v21h28\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-hourglass\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M21.7\x2022L12\x2011.7C9.7\x209.2\x2011.5\x205\x2015\x205h12.9c3.4\x200\x205.3\x204.1\x203\x206.6L21.7\x2022zM21.7\x2022L12\x2032.3c\x2D2.3\x202.5\x2D.5\x206.7\x203\x206.7h12.9c3.4\x200\x205.3\x2D4.1\x203\x2D6.6L21.7\x2022zM33.2\x205h\x2D24c\x2D.6\x200\x2D1\x2D.4\x2D1\x2D1V2c0\x2D.6.4\x2D1\x201\x2D1h24c.6\x200\x201\x20.4\x201\x201v2c0\x20.6\x2D.4\x201\x2D1\x201zM33.2\x2043h\x2D24c\x2D.6\x200\x2D1\x2D.4\x2D1\x2D1v\x2D2c0\x2D.6.4\x2D1\x201\x2D1h24c.6\x200\x201\x20.4\x201\x201v2c0\x20.6\x2D.4\x201\x2D1\x201z\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M14.1\x2013.5h15M11.6\x2034.5h4.8c.6\x200\x201.1\x2D.1\x201.6\x2D.3l2.1\x2D.9c1\x2D.5\x202.2\x2D.5\x203.2\x200l2.1.9c.5.2\x201.1.3\x201.6.3h4.5\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-internal-hard-drive\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M34.1\x207H9.9C8.2\x207\x206.6\x208.1\x206.1\x209.7L1.6\x2023.2c\x2D.4\x201.2\x2D.6\x202.5\x2D.6\x203.7V32c0\x202.2\x201.8\x204\x204\x204h34c2.2\x200\x204\x2D1.8\x204\x2D4v\x2D5.1c0\x2D1.3\x2D.2\x2D2.6\x2D.6\x2D3.8L37.9\x209.7C37.4\x208.1\x2035.8\x207\x2034.1\x207z\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M32.2\x2013.7c3\x203.4\x2D.6\x208\x2D10.2\x208s\x2D13.2\x2D4.7\x2D10.2\x2D8c1.9\x2D2.1\x206.2\x2D3.3\x2010.2\x2D3.3s8.3\x201.2\x2010.2\x203.3z\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M24.3\x2015.6c.7.7\x2D.1\x201.7\x2D2.3\x201.7s\x2D3\x2D1\x2D2.3\x2D1.7c.4\x2D.4\x201.4\x2D.7\x202.3\x2D.7s1.9.3\x202.3.7z\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M1\x2026h42\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinecap\x3D\x22round\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M14.3\x2019.6l3.3\x2D1.6\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M6\x2029v4M9\x2029v4M12\x2029v4M15\x2029v4\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinecap\x3D\x22round\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M33\x2031h6\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-external-hard-drive\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M34.1\x207H9.9C8.2\x207\x206.6\x208.1\x206.1\x209.7L1.6\x2023.2c\x2D.4\x201.2\x2D.6\x202.5\x2D.6\x203.7V32c0\x202.2\x201.8\x204\x204\x204h34c2.2\x200\x204\x2D1.8\x204\x2D4v\x2D5.1c0\x2D1.3\x2D.2\x2D2.6\x2D.6\x2D3.8L37.9\x209.7C37.4\x208.1\x2035.8\x207\x2034.1\x207zM1\x2026h42\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinecap\x3D\x22round\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M33\x2031h6M5\x2031h2\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-flag\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M9\x203v41M37\x2018.2C25.9\x2014\x2020.1\x2024\x209\x2019.8v\x2D16C20.1\x208\x2025.9\x2D2\x2037\x202.2v16z\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-desktop-computer-and-mobile\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M39\x2019V8c0\x2D1.1\x2D.9\x2D2\x2D2\x2D2H3c\x2D1.1\x200\x2D2\x20.9\x2D2\x202v22c0\x201.1.9\x202\x202\x202h30M27\x2032l1.3\x204.5c.4\x201.3\x2D.6\x202.5\x2D1.9\x202.5h\x2D8.7c\x2D1.3\x200\x2D2.3\x2D1.3\x2D1.9\x2D2.5L17\x2032M1\x2027h32\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M42\x2039h\x2D8c\x2D.6\x200\x2D1\x2D.4\x2D1\x2D1V20c0\x2D.6.4\x2D1\x201\x2D1h8c.6\x200\x201\x20.4\x201\x201v18c0\x20.6\x2D.4\x201\x2D1\x201zM33\x2023h10M33\x2035h10\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-database\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M42\x206c0\x2D2.8\x2D9\x2D5\x2D20\x2D5S2\x203.2\x202\x206v32c0\x202.8\x209\x205\x2020\x205s20\x2D2.2\x2020\x2D5V6z\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M42\x206c0\x202.8\x2D9\x205\x2D20\x205S2\x208.8\x202\x206M42\x2017c0\x202.8\x2D9\x205\x2D20\x205S2\x2019.8\x202\x2017M42\x2027c0\x202.8\x2D9\x205\x2D20\x205S2\x2029.8\x202\x2027\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-hand-cursor\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M33.1\x2018.3c\x2D.7\x200\x2D1.4.3\x2D2\x20.8\x2D.4\x2D1.3\x2D1.6\x2D2.2\x2D3\x2D2.2\x2D1\x200\x2D1.8.4\x2D2.4\x201.1\x2D.5\x2D1\x2D1.6\x2D1.7\x2D2.7\x2D1.7\x2D1.3\x200\x2D2.6.8\x2D3.1\x202V4c0\x2D1.7\x2D1.3\x2D3\x2D3\x2D3s\x2D3\x201.3\x2D3\x203v19.9c\x2D1.7\x2D2.1\x2D3.8\x2D3.7\x2D6.5\x2D4\x2D3.6\x2D.4\x2D4.2\x202.8\x2D2.9\x203.5\x203.6\x201.8\x206.9\x207\x208.5\x2010.4\x202.1\x205.2\x202.5\x209.3\x2011.3\x209.3\x204.8\x200\x207.9\x2D1.6\x209.7\x2D5.6\x201.5\x2D3.3\x202.1\x2D7.1\x202.1\x2D14v\x2D1.9c.2\x2D1.8\x2D1.3\x2D3.4\x2D3\x2D3.3z\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-arrow-cursor\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M6\x201l6.5\x2040.5\x207.9\x2D8.9L26.9\x2043l7.6\x2D4.8\x2D6.4\x2D10.3\x2011.4\x2D3.3z\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-chevron-up\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2222\x22\x20cy\x3D\x2222\x22\x20r\x3D\x2221\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M11.4\x2027.7L22\x2017.1l10.6\x2010.6\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-chevron-right\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2222\x22\x20cy\x3D\x2222\x22\x20r\x3D\x2221\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M16.7\x2011.4L27.3\x2022\x2016.7\x2032.6\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-chevron-left\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2222\x22\x20cy\x3D\x2222\x22\x20r\x3D\x2221\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M27.3\x2032.6L16.7\x2022l10.6\x2D10.6\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-chevron-down\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2222\x22\x20cy\x3D\x2222\x22\x20r\x3D\x2221\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M11.4\x2016.7L22\x2027.3l10.6\x2D10.6\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-arrow-up\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2222\x22\x20cy\x3D\x2222\x22\x20r\x3D\x2221\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M12.1\x2021.1l9.9\x2D9.9\x209.9\x209.9M22\x2034.2v\x2D23\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-arrow-right\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2222\x22\x20cy\x3D\x2222\x22\x20r\x3D\x2221\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M22.9\x2012.1l9.9\x209.9\x2D9.9\x209.9M9.8\x2022h23\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-arrow-left\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2222\x22\x20cy\x3D\x2222\x22\x20r\x3D\x2221\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M19.7\x2031.9L9.8\x2022l9.9\x2D9.9M32.8\x2022h\x2D23\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-arrow-down\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2222\x22\x20cy\x3D\x2222\x22\x20r\x3D\x2221\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M31.9\x2024.3L22\x2034.2l\x2D9.9\x2D9.9M22\x2011.2v23\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-video\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2036\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M1\x2033V3c0\x2D1.1.9\x2D2\x202\x2D2h38c1.1\x200\x202\x20.9\x202\x202v30c0\x201.1\x2D.9\x202\x2D2\x202H3c\x2D1.1\x200\x2D2\x2D.9\x2D2\x2D2zM43\x2027H1\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M25.653\x2015.832l\x2D6.197\x204.13c\x2D.665.444\x2D1.555\x2D.032\x2D1.555\x2D.83v\x2D8.264c0\x2D.8.89\x2D1.275\x201.557\x2D.832l6.197\x204.13c.594.398.594\x201.27\x200\x201.666z\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20d\x3D\x22M5\x2031h34\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-female-user\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2043.477\x2041.979\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M40.476\x2040.98c1.21\x200\x202.144\x2D1.068\x201.982\x2D2.267l\x2D.005\x2D.037c\x2D.273\x2D2.062\x2D1.634\x2D3.818\x2D3.58\x2D4.555\x2D3.146\x2D1.19\x2D7.507\x2D2.84\x2D8.05\x2D3.04\x2D.4\x2D.14\x2D1.08\x2D1.3\x2D1.32\x2D1.84\x2D.24\x2D.52\x2D1.86\x2D1.58\x2D2.28\x2D1.64l\x2D.06\x2D2.2\x207.26\x2D2.68s\x2D1.58\x2D2.94\x2D2.06\x2D4.58c\x2D.48\x2D1.64\x2D.78\x2D4.2\x2D.78\x2D4.44\x200\x2D.24\x2D.98\x2D6.12\x2D1.52\x2D7.26\x2D.52\x2D1.14\x2D1.26\x2D2.7\x2D2.5\x2D3.46\x2D1.22\x2D.76\x2D3.06\x2D1.84\x2D5.7\x2D1.98h\x2D.24c\x2D2.64.14\x2D4.48\x201.22\x2D5.7\x201.98\x2D1.24.76\x2D1.98\x202.32\x2D2.5\x203.46\x2D.54\x201.14\x2D1.52\x207.02\x2D1.52\x207.26\x200\x20.24\x2D.28\x202.9\x2D.74\x204.54\x2D.48\x201.64\x2D2.1\x204.48\x2D2.1\x204.48l7.26\x202.68\x2D.06\x202.2c\x2D.42.06\x2D2.04\x201.12\x2D2.28\x201.64\x2D.24.54\x2D.92\x201.7\x2D1.32\x201.84\x2D.53.197\x2D4.715\x201.704\x2D7.843\x202.83\x2D2.07.744\x2D3.523\x202.596\x2D3.8\x204.777l\x2D.005.038C.863\x2039.92\x201.795\x2040.98\x203\x2040.98h37.476z\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-film\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2042\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M39\x2043H3c\x2D1.1\x200\x2D2\x2D.9\x2D2\x2D2V3c0\x2D1.1.9\x2D2\x202\x2D2h36c1.1\x200\x202\x20.9\x202\x202v38c0\x201.1\x2D.9\x202\x2D2\x202zM9\x201v42M33\x201v42M33\x2022H9\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M3\x208h2.993V5M3\x2014h2.993v\x2D3M3\x2020h2.993v\x2D3M3\x2026h2.993v\x2D3M3\x2032h2.993v\x2D3M3\x2038h2.993v\x2D3M35\x208h2.993V5M35\x2014h2.993v\x2D3M35\x2020h2.993v\x2D3M35\x2026h2.993v\x2D3M35\x2032h2.993v\x2D3M35\x2038h2.993v\x2D3\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-male-user\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044.02\x2043\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M1\x2038.207c0\x2D1.983\x201.168\x2D3.777\x202.983\x2D4.575\x202.325\x2D1.022\x205.505\x2D2.42\x207.638\x2D3.366\x201.925\x2D.85\x202.34\x2D1.363\x204.28\x2D2.235\x200\x200\x20.2\x2D1.012.13\x2D1.615h1.516s.347.206\x200\x2D2.176c0\x200\x2D1.85\x2D.5\x2D1.936\x2D4.294\x200\x200\x2D1.39.476\x2D1.475\x2D1.823\x2D.058\x2D1.56\x2D1.243\x2D2.912.462\x2D4.03l\x2D.867\x2D2.38s\x2D1.733\x2D9.617\x203.25\x2D8.206c\x2D2.1\x2D2.56\x2011.92\x2D5.117\x2012.83\x203\x200\x200\x20.65\x204.38\x200\x207.38\x200\x200\x202.05\x2D.24.68\x203.765\x200\x200\x2D.75\x202.882\x2D1.907\x202.235\x200\x200\x20.19\x203.646\x2D1.632\x204.265\x200\x200\x20.13\x201.94.13\x202.073l1.736.265s\x2D.26\x201.588.043\x201.764c0\x200\x202.49\x201.29\x204.506\x202.074\x202.378.917\x204.86\x202.002\x206.714\x202.84\x201.788.81\x202.932\x202.592\x202.93\x204.555\x200\x20.847.003\x201.63.01\x202.007.023\x201.224\x2D.873\x202.27\x2D2.1\x202.27H3.105C1.943\x2042\x201\x2041.057\x201\x2039.895v\x2D1.688z\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-upload\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2028\x2041.414\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M17\x2014.414h8c1.105\x200\x202\x20.895\x202\x202v22c0\x201.105\x2D.895\x202\x2D2\x202H3c\x2D1.105\x200\x2D2\x2D.895\x2D2\x2D2v\x2D22c0\x2D1.105.895\x2D2\x202\x2D2h8M14\x2027.414v\x2D26M8.002\x207.412L14\x201.414l5.998\x205.998\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-monitor\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2034\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M1\x201h42v28H1z\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20d\x3D\x22M17\x2029v4M27\x2029v4M32\x2033H12\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M38\x2026h2M35\x2026h2\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-trash\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2040\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M4\x205l4\x2038h24l4\x2D38zM0\x205h40M12\x205V1h16v4\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-line-graph\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2033\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22currentColor\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M1\x200v32h43.004\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22currentColor\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x20d\x3D\x22M43\x2032H1v\x2D5l14\x2D14\x2014\x208L43\x204z\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-tag\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2042.143\x2042.15\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20clip\x2Drule\x3D\x22evenodd\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M40.555\x2025.002l\x2D15.56\x2015.56c\x2D.78.78\x2D2.04.785\x2D2.813.012L1.576\x2019.968c\x2D.373\x2D.374\x2D.58\x2D.882\x2D.576\x2D1.413l.143\x2D15.557C1.153\x201.9\x202.05\x201.01\x203.148\x201.01L18.558\x201c.525\x200\x201.027.207\x201.397.576L40.568\x2022.19c.772.772.767\x202.032\x2D.013\x202.812z\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x229.44\x22\x20cy\x3D\x229.447\x22\x20r\x3D\x223\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-tablet-1\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2032\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M29\x2043H3c\x2D1.105\x200\x2D2\x2D.895\x2D2\x2D2V3c0\x2D1.105.895\x2D2\x202\x2D2h26c1.105\x200\x202\x20.895\x202\x202v38c0\x201.105\x2D.895\x202\x2D2\x202zM1\x2037h30M1\x207h30M15\x2040h2\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-table\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2034\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M1\x201h42v32H1z\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20d\x3D\x22M43\x209H1M43\x2017H1M43\x2025H1M4\x205h8M4\x2013h8M4\x2021h8M4\x2029h8M18\x205h8M32\x205h8M15\x201v32M29\x201v32\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-star\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2041.681\x2041.585\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M22.652\x202.15l4.53\x209.666c.282.604.848\x201.027\x201.507\x201.128l10.29\x201.575c1.61.244\x202.265\x202.205\x201.13\x203.37l\x2D7.576\x207.78c\x2D.442.453\x2D.643\x201.09\x2D.54\x201.716l1.77\x2010.87c.267\x201.65\x2D1.483\x202.88\x2D2.944\x202.072l\x2D9.012\x2D4.99c\x2D.603\x2D.335\x2D1.335\x2D.335\x2D1.938\x200l\x2D9.013\x204.99c\x2D1.46.808\x2D3.21\x2D.424\x2D2.943\x2D2.072l1.77\x2D10.87c.102\x2D.627\x2D.1\x2D1.264\x2D.54\x2D1.718L1.567\x2017.89c\x2D1.135\x2D1.165\x2D.478\x2D3.126\x201.13\x2D3.373L12.99\x2012.94c.66\x2D.1\x201.223\x2D.523\x201.506\x2D1.127l4.53\x2D9.665c.722\x2D1.534\x202.905\x2D1.534\x203.625\x200z\x22\x20clip\x2Drule\x3D\x22evenodd\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-sound-on\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2037\x2031.135\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M9\x2023.002H2c\x2D.552\x200\x2D1\x2D.448\x2D1\x2D1v\x2D12c0\x2D.552.448\x2D1\x201\x2D1h7v14zM19.445\x2029.965L9\x2023.002v\x2D14l10.4\x2D7.8c.66\x2D.494\x201.6\x2D.024\x201.6.8v27.13c0\x20.8\x2D.89\x201.276\x2D1.555.833zM27\x2016.002h10M25.464\x2022.466l7.072\x207.07M25.464\x209.537l7.072\x2D7.07\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-printer\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2043\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M9\x2034H3c\x2D1.105\x200\x2D2\x2D.895\x2D2\x2D2V16c0\x2D1.105.895\x2D2\x202\x2D2h38c1.105\x200\x202\x20.895\x202\x202v16c0\x201.105\x2D.895\x202\x2D2\x202h\x2D6\x22\x20clip\x2Drule\x3D\x22evenodd\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20clip\x2Drule\x3D\x22evenodd\x22\x20d\x3D\x22M9\x2029h26v13H9zM9\x2014V1h26v13\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M1\x2022h42\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-plus-sign\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2222\x22\x20cy\x3D\x2222\x22\x20r\x3D\x2221\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M11\x2022h22M22\x2010v23\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-landscape\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2034\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M41\x2033H3c\x2D1.105\x200\x2D2\x2D.895\x2D2\x2D2V3c0\x2D1.105.895\x2D2\x202\x2D2h38c1.105\x200\x202\x20.895\x202\x202v28c0\x201.105\x2D.895\x202\x2D2\x202z\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20d\x3D\x22M1\x2022.417l13\x2D13\x2012.708\x2015.708\x209.25\x2D6.25L43.168\x2028\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2232.167\x22\x20cy\x3D\x2210\x22\x20r\x3D\x223\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-paperclip\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2039.918\x2044.292\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M39\x2019.872L18.588\x2040.285c\x2D4.01\x204.01\x2D10.57\x204.01\x2D14.58\x200s\x2D4.01\x2D10.57\x200\x2D14.58l22.6\x2D22.6c2.807\x2D2.807\x207.4\x2D2.807\x2010.206\x200\x202.807\x202.807\x202.807\x207.4\x200\x2010.206L16.4\x2033.726c\x2D1.604\x201.604\x2D4.228\x201.604\x2D5.832\x200s\x2D1.604\x2D4.228\x200\x2D5.832L28.794\x209.666\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-notepad\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M41\x2043H3c\x2D1.105\x200\x2D2\x2D.895\x2D2\x2D2V6c0\x2D1.105.895\x2D2\x202\x2D2h38c1.105\x200\x202\x20.895\x202\x202v35c0\x201.105\x2D.895\x202\x2D2\x202zM1\x2015h42M9\x200v8M35\x200v8M5\x2021h34M5\x2026h34M5\x2031h34M5\x2036h34\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-music\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2037\x2043.623\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M36\x2010.623l\x2D23\x204V6.305c0\x2D.972.7\x2D1.804\x201.657\x2D1.97l19\x2D3.304C34.88.82\x2036\x201.76\x2036\x203v7.623zM8\x2042.623H6c\x2D2.76\x200\x2D5\x2D2.24\x2D5\x2D5s2.24\x2D5\x205\x2D5h7v5c0\x202.76\x2D2.24\x205\x2D5\x205zM12.995\x2014.626v22.85M31\x2038.623h\x2D2c\x2D2.76\x200\x2D5\x2D2.24\x2D5\x2D5s2.24\x2D5\x205\x2D5h7v5c0\x202.76\x2D2.24\x205\x2D5\x205zM35.995\x2010.626v22.85\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-mobile-device\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2024\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M21\x2043H3c\x2D1.105\x200\x2D2\x2D.895\x2D2\x2D2V3c0\x2D1.105.895\x2D2\x202\x2D2h18c1.105\x200\x202\x20.895\x202\x202v38c0\x201.105\x2D.895\x202\x2D2\x202zM1\x2037h22M1\x207h22M10\x204h4M11\x2040h2\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-two-messages\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2039.035\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M40.962\x2018.79c.01\x2D.217.038\x2D.43.038\x2D.647C41\x208.675\x2032.046\x201\x2021\x201S1\x208.675\x201\x2018.143c0\x204.466\x202.01\x208.52\x205.275\x2011.572\x2D.612\x202.002\x2D1.97\x205.11\x2D4.83\x207.05\x200\x200\x206.747\x2D.76\x2011.067\x2D3.117\x202.58\x201.04\x205.45\x201.638\x208.49\x201.638.253\x200\x20.5\x2D.025.752\x2D.033\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M29\x2013c7.732\x200\x2014\x205.373\x2014\x2012\x200\x203.127\x2D1.407\x205.965\x2D3.692\x208.1.428\x201.4\x201.38\x203.577\x203.382\x204.935\x200\x200\x2D4.724\x2D.533\x2D7.748\x2D2.182C33.136\x2036.58\x2031.128\x2037\x2029\x2037c\x2D7.732\x200\x2D14\x2D5.373\x2D14\x2D12s6.268\x2D12\x2014\x2D12z\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2221\x22\x20cy\x3D\x2225\x22\x20r\x3D\x222\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2229\x22\x20cy\x3D\x2225\x22\x20r\x3D\x222\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2237\x22\x20cy\x3D\x2225\x22\x20r\x3D\x222\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-empty-message\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2039.553\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M22\x201C10.402\x201\x201\x209.06\x201\x2019c0\x204.69\x202.11\x208.947\x205.538\x2012.15\x2D.643\x202.102\x2D2.07\x205.365\x2D5.073\x207.403\x200\x200\x207.086\x2D.8\x2011.62\x2D3.273C15.795\x2036.372\x2018.81\x2037\x2022\x2037c11.598\x200\x2021\x2D8.06\x2021\x2D18S33.598\x201\x2022\x201z\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-map\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2038.838\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M43\x2032.42l\x2D14\x205\x2D14\x2D5\x2D14\x205v\x2D31l14\x2D5\x2014\x205\x2014\x2D5zM15\x201.42v31M29\x206.42v31\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-lock\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2034\x2040\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M1\x2014v24c0\x20.552.448\x201\x201\x201h30c.552\x200\x201\x2D.448\x201\x2D1V14c0\x2D.552\x2D.448\x2D1\x2D1\x2D1H2c\x2D.552\x200\x2D1\x20.448\x2D1\x201zM8\x2013V6c0\x2D2.76\x202.24\x2D5\x205\x2D5h8c2.76\x200\x205\x202.24\x205\x205v7\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2217\x22\x20cy\x3D\x2224\x22\x20r\x3D\x223\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M17\x2027v5\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-location-pin\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2030\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M29\x2015c0\x2011.58\x2D14\x2028\x2D14\x2028S1\x2027.024\x201\x2015C1\x207.268\x207.268\x201\x2015\x201s14\x206.268\x2014\x2014z\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2215\x22\x20cy\x3D\x2215\x22\x20r\x3D\x226\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-chain\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2039.689\x2039.689\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20clip\x2Drule\x3D\x22evenodd\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M18.43\x2021.26l2.828\x202.827c1.556\x201.556\x204.1\x201.556\x205.657\x200L37.522\x2013.48c1.556\x2D1.556\x201.556\x2D4.1\x200\x2D5.657l\x2D5.657\x2D5.657c\x2D1.556\x2D1.556\x2D4.1\x2D1.556\x2D5.657\x200l\x2D9.192\x209.192\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M21.26\x2018.43l\x2D2.83\x2D2.828c\x2D1.555\x2D1.556\x2D4.1\x2D1.556\x2D5.656\x200L2.167\x2026.208c\x2D1.556\x201.556\x2D1.556\x204.1\x200\x205.657l5.657\x205.657c1.556\x201.556\x204.1\x201.556\x205.657\x200l9.194\x2D9.192\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-key\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2041.284\x2044.113\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2228.284\x22\x20cy\x3D\x2213\x22\x20r\x3D\x2212\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M19.8\x2021.485L.706\x2040.577M2.828\x2038.456l7.07\x2D7.07\x204.244\x204.242\x2D7.07\x207.07z\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-heart\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2036.504\x22>\x0D\x0A\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M42.087\x2017.245C40.037\x2022.188\x2027.21\x2032.09\x2023.2\x2035.103c\x2D.712.535\x2D1.68.535\x2D2.393\x200\x2D4.01\x2D3.01\x2D16.843\x2D12.915\x2D18.894\x2D17.858C\x2D.543\x2011.323\x202.126\x204.47\x207.876\x201.94\x2013.126\x2D.37\x2019.126\x201.723\x2022\x206.61c2.874\x2D4.887\x208.874\x2D6.98\x2014.124\x2D4.67\x205.75\x202.53\x208.42\x209.383\x205.963\x2015.305z\x22\x20clip\x2Drule\x3D\x22evenodd\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x2F\x3E\x0D\x0A</symbol><symbol id=\"stroked-home\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2043.447\x2043.448\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M42.723\x2023.448l\x2D21\x2D22\x2D21\x2022\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M5.723\x2018.448v24h11v\x2D16h10v16h11v\x2D24\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-gear\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M41.803\x2018.1l\x2D3.013\x2D1.003c\x2D.36\x2D1.23\x2D.84\x2D2.408\x2D1.447\x2D3.51l1.416\x2D2.833c.335\x2D.674.203\x2D1.487\x2D.33\x2D2.02l\x2D3.166\x2D3.166c\x2D.533\x2D.533\x2D1.346\x2D.665\x2D2.02\x2D.328l\x2D2.832\x201.416c\x2D1.102\x2D.606\x2D2.28\x2D1.088\x2D3.51\x2D1.447l\x2D1.005\x2D3.015C25.66\x201.482\x2024.992\x201\x2024.237\x201h\x2D4.475c\x2D.753\x200\x2D1.422.482\x2D1.66\x201.197L17.098\x205.21c\x2D1.23.36\x2D2.408.84\x2D3.51\x201.447L10.753\x205.24c\x2D.674\x2D.337\x2D1.487\x2D.205\x2D2.02.328L5.568\x208.734c\x2D.533.533\x2D.665\x201.346\x2D.328\x202.02l1.416\x202.832c\x2D.606\x201.102\x2D1.088\x202.28\x2D1.447\x203.51L2.194\x2018.1C1.482\x2018.34\x201\x2019.01\x201\x2019.76v4.478c0\x20.753.482\x201.422\x201.197\x201.66l3.013\x201.004c.36\x201.23.84\x202.408\x201.447\x203.51L5.24\x2033.247c\x2D.337.674\x2D.205\x201.487.328\x202.02l3.166\x203.166c.533.533\x201.346.665\x202.02.328l2.832\x2D1.415c1.102.606\x202.28\x201.088\x203.51\x201.447l1.005\x203.014c.24.714.91\x201.196\x201.66\x201.196h4.48c.752\x200\x201.42\x2D.482\x201.66\x2D1.197l1.003\x2D3.013c1.23\x2D.36\x202.408\x2D.84\x203.51\x2D1.447l2.833\x201.416c.674.337\x201.487.205\x202.02\x2D.33l3.166\x2D3.164c.534\x2D.533.666\x2D1.346.33\x2D2.02l\x2D1.417\x2D2.832c.606\x2D1.102\x201.088\x2D2.28\x201.447\x2D3.51l3.013\x2D1.005c.715\x2D.238\x201.197\x2D.907\x201.197\x2D1.66v\x2D4.477c0\x2D.754\x2D.482\x2D1.423\x2D1.197\x2D1.66z\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2222\x22\x20cy\x3D\x2222\x22\x20r\x3D\x2211\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-folder\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2034\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M23\x203c0\x2D1.105\x2D.895\x2D2\x2D2\x2D2H3c\x2D1.105\x200\x2D2\x20.895\x2D2\x202v28c0\x201.105.895\x202\x202\x202h38c1.105\x200\x202\x2D.895\x202\x2D2V7c0\x2D1.105\x2D.895\x2D2\x2D2\x2D2H25c\x2D1.105\x200\x2D2\x2D.895\x2D2\x2D2zM1\x209h41.992\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-open-folder\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2043.62\x2034\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M22.81\x203c0\x2D1.105\x2D.895\x2D2\x2D2\x2D2h\x2D16c\x2D1.105\x200\x2D2\x20.895\x2D2\x202v8h38V7c0\x2D1.105\x2D.895\x2D2\x2D2\x2D2h\x2D14c\x2D1.104\x200\x2D2\x2D.895\x2D2\x2D2zM1.008\x2013.18l1.636\x2018c.094\x201.03.958\x201.82\x201.993\x201.82h34.347c1.034\x200\x201.898\x2D.79\x201.992\x2D1.82l1.636\x2D18c.106\x2D1.17\x2D.816\x2D2.18\x2D1.992\x2D2.18H3c\x2D1.176\x200\x2D2.098\x201.01\x2D1.992\x202.18z\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-eye\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044.409\x2030\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20clip\x2Drule\x3D\x22evenodd\x22\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M22.204\x201c\x2D11.603\x200\x2D21\x2014\x2D21\x2014s9.397\x2014\x2021\x2014\x2021\x2D14\x2021\x2D14\x2D9.397\x2D14\x2D21\x2D14z\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2222.204\x22\x20cy\x3D\x2215\x22\x20r\x3D\x228\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2222.204\x22\x20cy\x3D\x2215\x22\x20r\x3D\x222\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-download\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2028\x2040\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M17\x2013h8c1.105\x200\x202\x20.895\x202\x202v22c0\x201.105\x2D.895\x202\x2D2\x202H3c\x2D1.105\x200\x2D2\x2D.895\x2D2\x2D2V15c0\x2D1.105.895\x2D2\x202\x2D2h8M14\x200v26\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M19.998\x2020.002L14\x2026l\x2D5.998\x2D5.998\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-blank-document\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2034\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M31\x2043H3c\x2D1.105\x200\x2D2\x2D.895\x2D2\x2D2V3c0\x2D1.105.895\x2D2\x202\x2D2h17.172c.53\x200\x201.04.21\x201.414.586l10.828\x2010.828c.375.375.586.884.586\x201.414V41c0\x201.105\x2D.895\x202\x2D2\x202z\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M21\x201v9.952c0\x201.105.895\x202\x202\x202h10\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-desktop\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2037\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M41\x2029H3c\x2D1.105\x200\x2D2\x2D.895\x2D2\x2D2V3c0\x2D1.105.895\x2D2\x202\x2D2h38c1.105\x200\x202\x20.895\x202\x202v24c0\x201.105\x2D.895\x202\x2D2\x202zM27\x2029l1.272\x204.45c.365\x201.278\x2D.595\x202.55\x2D1.923\x202.55h\x2D8.7c\x2D1.33\x200\x2D2.288\x2D1.272\x2D1.923\x2D2.55L17\x2029M1\x2024h42\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-dashboard-dial\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2032\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M22\x2010v11\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2222\x22\x20cy\x3D\x2224\x22\x20r\x3D\x223\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M22\x204v3M13\x206.412l1.5\x202.598M6.412\x2013l2.598\x201.5M4\x2022h3M40\x2022h\x2D3M37.588\x2013l\x2D2.598\x201.5M31\x206.412L29.5\x209.01M41.514\x2029.714c1.134\x2D2.848\x201.677\x2D5.993\x201.426\x2D9.302C42.143\x209.907\x2033.437\x201.464\x2022.91\x201.02\x2010.9.51\x201\x2010.1\x201\x2022c0\x202.73.536\x205.327\x201.487\x207.716C2.794\x2030.486\x203.53\x2031\x204.36\x2031h35.28c.83\x200\x201.566\x2D.515\x201.874\x2D1.286z\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-clock\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M31\x2022h\x2D9V5\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2222\x22\x20cy\x3D\x2222\x22\x20r\x3D\x2221\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M22\x2036v3M39\x2022h\x2D3M8\x2022H5\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-clipboard-with-paper\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2032\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M23\x205h6c1.105\x200\x202\x20.895\x202\x202v34c0\x201.105\x2D.895\x202\x2D2\x202H3c\x2D1.105\x200\x2D2\x2D.895\x2D2\x2D2V7c0\x2D1.105.895\x2D2\x202\x2D2h6\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M20\x203c0\x2D1.105\x2D.895\x2D2\x2D2\x2D2h\x2D4c\x2D1.105\x200\x2D2\x20.895\x2D2\x202h\x2D2c\x2D.552\x200\x2D1\x20.448\x2D1\x201v2c0\x20.552.448\x201\x201\x201h12c.552\x200\x201\x2D.448\x201\x2D1V4c0\x2D.552\x2D.448\x2D1\x2D1\x2D1h\x2D2zM12\x2016h16M5\x2014h4v4H5zM12\x2024h16M5\x2022h4v4H5zM12\x2032h16M5\x2030h4v4H5z\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-checkmark\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2222\x22\x20cy\x3D\x2222\x22\x20r\x3D\x2221\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M34.58\x2014.11L17.61\x2031.08l\x2D9.19\x2D9.19\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-cancel\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2222\x22\x20cy\x3D\x2222\x22\x20r\x3D\x2221\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M13.868\x2014.075l15.557\x2015.557M30.132\x2013.368L13.868\x2029.632\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-camcorder\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2024\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M31\x2023H3c\x2D1.1\x200\x2D2\x2D.9\x2D2\x2D2V3c0\x2D1.1.9\x2D2\x202\x2D2h28c1.1\x200\x202\x20.9\x202\x202v18c0\x201.1\x2D.9\x202\x2D2\x202zM41.375\x2021.7L33\x2015V9l8.375\x2D6.7C42.03\x201.776\x2043\x202.242\x2043\x203.08v17.84c0\x20.838\x2D.97\x201.304\x2D1.625.78z\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-camera\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2033\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M30.497\x204.743l\x2D.994\x2D2.486C29.2\x201.497\x2028.463\x201\x2027.646\x201H16.354c\x2D.818\x200\x2D1.553.498\x2D1.857\x201.257l\x2D.994\x202.486C13.2\x205.503\x2012.463\x206\x2011.646\x206H3c\x2D1.105\x200\x2D2\x20.895\x2D2\x202v22c0\x201.105.895\x202\x202\x202h38c1.105\x200\x202\x2D.895\x202\x2D2V8c0\x2D1.105\x2D.895\x2D2\x2D2\x2D2h\x2D8.646c\x2D.818\x200\x2D1.553\x2D.498\x2D1.857\x2D1.257z\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Ccircle\x20cx\x3D\x2222\x22\x20cy\x3D\x2219\x22\x20r\x3D\x229\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M32\x2011h4\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-calendar\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M41\x2043H3c\x2D1.105\x200\x2D2\x2D.895\x2D2\x2D2V6c0\x2D1.105.895\x2D2\x202\x2D2h38c1.105\x200\x202\x20.895\x202\x202v35c0\x201.105\x2D.895\x202\x2D2\x202zM1\x2015h42M9\x200v8M35\x200v8\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M5\x2023h4v\x2D4M12\x2023h4v\x2D4M19\x2023h4v\x2D4M26\x2023h4v\x2D4M33\x2023h4v\x2D4M5\x2030h4v\x2D4M12\x2030h4v\x2D4M19\x2030h4v\x2D4M26\x2030h4v\x2D4M33\x2030h4v\x2D4M5\x2037h4v\x2D4M12\x2037h4v\x2D4M19\x2037h4v\x2D4M26\x2037h4v\x2D4M33\x2037h4v\x2D4\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-calendar-blank\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M41\x2043H3c\x2D1.105\x200\x2D2\x2D.895\x2D2\x2D2V6c0\x2D1.105.895\x2D2\x202\x2D2h38c1.105\x200\x202\x20.895\x202\x202v35c0\x201.105\x2D.895\x202\x2D2\x202zM1\x2015h42M9\x200v8M35\x200v8\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-basket\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2043\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M20\x2016V1h4v15M36.18\x2042H7.82c\x2D.477\x200\x2D.887\x2D.336\x2D.98\x2D.804L3\x2022h38l\x2D3.84\x2019.196c\x2D.093.468\x2D.503.804\x2D.98.804zM42\x2022H2c\x2D.552\x200\x2D1\x2D.448\x2D1\x2D1v\x2D4c0\x2D.552.448\x2D1\x201\x2D1h40c.552\x200\x201\x20.448\x201\x201v4c0\x20.552\x2D.448\x201\x2D1\x201z\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-bag\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2039.797\x2044\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M11.9\x2012V9c0\x2D4.418\x203.58\x2D8\x208\x2D8\x204.417\x200\x208\x203.582\x208\x208v3M34.083\x2043H5.713c\x2D1.03\x200\x2D1.89\x2D.782\x2D1.99\x2D1.807L1.005\x2013.096C.948\x2012.51\x201.41\x2012\x202\x2012h35.797c.59\x200\x201.052.51.995\x201.096l\x2D2.72\x2028.096c\x2D.098\x201.026\x2D.96\x201.808\x2D1.99\x201.808z\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-app-window\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2038\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M1\x2035V3c0\x2D1.1.9\x2D2\x202\x2D2h38c1.1\x200\x202\x20.9\x202\x202v32c0\x201.1\x2D.9\x202\x2D2\x202H3c\x2D1.1\x200\x2D2\x2D.9\x2D2\x2D2zM43\x209H1M4\x205h2M7\x205h2M10\x205h2\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol><symbol id=\"stroked-app-window-with-content\" class=\"glyph-svg stroked\" viewBox\x3D\x220\x200\x2044\x2038\x22>\x0D\x0A\x20\x20\x20\x20\x3Cg\x20class\x3D\x22line\x22\x20fill\x3D\x22none\x22\x20stroke\x3D\x22\x23000\x22\x20stroke\x2Dwidth\x3D\x222\x22\x20stroke\x2Dmiterlimit\x3D\x2210\x22\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M1\x2035V3c0\x2D1.1.9\x2D2\x202\x2D2h38c1.1\x200\x202\x20.9\x202\x202v32c0\x201.1\x2D.9\x202\x2D2\x202H3c\x2D1.1\x200\x2D2\x2D.9\x2D2\x2D2zM43\x209H1M4\x205h2M7\x205h2M10\x205h2M20\x2024h20M20\x2028h20M20\x2032h20\x22\x20stroke\x2Dlinejoin\x3D\x22round\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x20\x20\x20\x20\x3Cpath\x20d\x3D\x22M5\x2013h34.008v7H5zM5\x2024h12v8H5z\x22\x2F\x3E\x0D\x0A\x20\x20\x20\x20\x3C\x2Fg\x3E\x0D\x0A</symbol></defs></svg>';function out(){document.write( icons );document.write( styles );document.close();}var styles = '\x3Cstyle\x20id\x3D\x22glyphs\x2Dstyle\x22\x20type\x3D\x22text\x2Fcss\x22\x3E\x0A.glyph\x7B\x0A\x09fill\x3AcurrentColor\x3B\x0A\x09display\x3Ainline\x2Dblock\x3B\x0A\x09margin\x2Dleft\x3Aauto\x3B\x0A\x09margin\x2Dright\x3Aauto\x3B\x0A\x09position\x3Arelative\x3B\x0A\x09text\x2Dalign\x3Acenter\x3B\x0A\x09vertical\x2Dalign\x3Amiddle\x3B\x0A\x09width\x3A70\x25\x3B\x0A\x09height\x3A70\x25\x3B\x0A\x7D\x0A\x0A.glyph.sm\x7Bwidth\x3A30\x25\x3Bheight\x3A30\x25\x3B\x7D\x0A.glyph.md\x7Bwidth\x3A50\x25\x3Bheight\x3A50\x25\x3B\x7D\x0A.glyph.lg\x7Bheight\x3A100\x25\x3Bwidth\x3A100\x25\x3B\x7D\x0A.glyph\x2Dsvg\x7Bwidth\x3A100\x25\x3Bheight\x3A100\x25\x3B\x7D\x0A.glyph\x2Dsvg\x20.fill\x7Bfill\x3Ainherit\x3B\x7D\x0A.glyph\x2Dsvg\x20.line\x7Bstroke\x3AcurrentColor\x3Bstroke\x2Dwidth\x3Ainherit\x3B\x7D\x0A.glyph.spin\x7Banimation\x3A\x20spin\x201s\x20linear\x20infinite\x3B\x7D\x0A\x0A\x40\x2Dwebkit\x2Dkeyframes\x20spin\x20\x7B\x0A\x09from\x20\x7B\x20transform\x3Arotate\x280deg\x29\x3B\x20\x7D\x0A\x09to\x20\x7B\x20transform\x3Arotate\x28360deg\x29\x3B\x20\x7D\x0A\x7D\x0A\x40\x2Dmoz\x2Dkeyframes\x20spin\x20\x7B\x0A\x09from\x20\x7B\x20transform\x3Arotate\x280deg\x29\x3B\x20\x7D\x0A\x09to\x20\x7B\x20transform\x3Arotate\x28360deg\x29\x3B\x20\x7D\x0A\x7D\x0A\x40keyframes\x20spin\x20\x7B\x0A\x09from\x20\x7B\x20transform\x3Arotate\x280deg\x29\x3B\x20\x7D\x0A\x09to\x20\x7B\x20transform\x3Arotate\x28360deg\x29\x3B\x20\x7D\x0A\x7D\x0A\x3C\x2Fstyle\x3E';out();
/*! Respond.js v1.4.2: min/max-width media query polyfill
 * Copyright 2014 Scott Jehl
 * Licensed under MIT
 * http://j.mp/respondjs */

!function(a){"use strict";a.matchMedia=a.matchMedia||function(a){var b,c=a.documentElement,d=c.firstElementChild||c.firstChild,e=a.createElement("body"),f=a.createElement("div");return f.id="mq-test-1",f.style.cssText="position:absolute;top:-100em",e.style.background="none",e.appendChild(f),function(a){return f.innerHTML='&shy;<style media="'+a+'"> #mq-test-1 { width: 42px; }</style>',c.insertBefore(e,d),b=42===f.offsetWidth,c.removeChild(e),{matches:b,media:a}}}(a.document)}(this),function(a){"use strict";function b(){v(!0)}var c={};a.respond=c,c.update=function(){};var d=[],e=function(){var b=!1;try{b=new a.XMLHttpRequest}catch(c){b=new a.ActiveXObject("Microsoft.XMLHTTP")}return function(){return b}}(),f=function(a,b){var c=e();c&&(c.open("GET",a,!0),c.onreadystatechange=function(){4!==c.readyState||200!==c.status&&304!==c.status||b(c.responseText)},4!==c.readyState&&c.send(null))},g=function(a){return a.replace(c.regex.minmaxwh,"").match(c.regex.other)};if(c.ajax=f,c.queue=d,c.unsupportedmq=g,c.regex={media:/@media[^\{]+\{([^\{\}]*\{[^\}\{]*\})+/gi,keyframes:/@(?:\-(?:o|moz|webkit)\-)?keyframes[^\{]+\{(?:[^\{\}]*\{[^\}\{]*\})+[^\}]*\}/gi,comments:/\/\*[^*]*\*+([^/][^*]*\*+)*\//gi,urls:/(url\()['"]?([^\/\)'"][^:\)'"]+)['"]?(\))/g,findStyles:/@media *([^\{]+)\{([\S\s]+?)$/,only:/(only\s+)?([a-zA-Z]+)\s?/,minw:/\(\s*min\-width\s*:\s*(\s*[0-9\.]+)(px|em)\s*\)/,maxw:/\(\s*max\-width\s*:\s*(\s*[0-9\.]+)(px|em)\s*\)/,minmaxwh:/\(\s*m(in|ax)\-(height|width)\s*:\s*(\s*[0-9\.]+)(px|em)\s*\)/gi,other:/\([^\)]*\)/g},c.mediaQueriesSupported=a.matchMedia&&null!==a.matchMedia("only all")&&a.matchMedia("only all").matches,!c.mediaQueriesSupported){var h,i,j,k=a.document,l=k.documentElement,m=[],n=[],o=[],p={},q=30,r=k.getElementsByTagName("head")[0]||l,s=k.getElementsByTagName("base")[0],t=r.getElementsByTagName("link"),u=function(){var a,b=k.createElement("div"),c=k.body,d=l.style.fontSize,e=c&&c.style.fontSize,f=!1;return b.style.cssText="position:absolute;font-size:1em;width:1em",c||(c=f=k.createElement("body"),c.style.background="none"),l.style.fontSize="100%",c.style.fontSize="100%",c.appendChild(b),f&&l.insertBefore(c,l.firstChild),a=b.offsetWidth,f?l.removeChild(c):c.removeChild(b),l.style.fontSize=d,e&&(c.style.fontSize=e),a=j=parseFloat(a)},v=function(b){var c="clientWidth",d=l[c],e="CSS1Compat"===k.compatMode&&d||k.body[c]||d,f={},g=t[t.length-1],p=(new Date).getTime();if(b&&h&&q>p-h)return a.clearTimeout(i),i=a.setTimeout(v,q),void 0;h=p;for(var s in m)if(m.hasOwnProperty(s)){var w=m[s],x=w.minw,y=w.maxw,z=null===x,A=null===y,B="em";x&&(x=parseFloat(x)*(x.indexOf(B)>-1?j||u():1)),y&&(y=parseFloat(y)*(y.indexOf(B)>-1?j||u():1)),w.hasquery&&(z&&A||!(z||e>=x)||!(A||y>=e))||(f[w.media]||(f[w.media]=[]),f[w.media].push(n[w.rules]))}for(var C in o)o.hasOwnProperty(C)&&o[C]&&o[C].parentNode===r&&r.removeChild(o[C]);o.length=0;for(var D in f)if(f.hasOwnProperty(D)){var E=k.createElement("style"),F=f[D].join("\n");E.type="text/css",E.media=D,r.insertBefore(E,g.nextSibling),E.styleSheet?E.styleSheet.cssText=F:E.appendChild(k.createTextNode(F)),o.push(E)}},w=function(a,b,d){var e=a.replace(c.regex.comments,"").replace(c.regex.keyframes,"").match(c.regex.media),f=e&&e.length||0;b=b.substring(0,b.lastIndexOf("/"));var h=function(a){return a.replace(c.regex.urls,"$1"+b+"$2$3")},i=!f&&d;b.length&&(b+="/"),i&&(f=1);for(var j=0;f>j;j++){var k,l,o,p;i?(k=d,n.push(h(a))):(k=e[j].match(c.regex.findStyles)&&RegExp.$1,n.push(RegExp.$2&&h(RegExp.$2))),o=k.split(","),p=o.length;for(var q=0;p>q;q++)l=o[q],g(l)||m.push({media:l.split("(")[0].match(c.regex.only)&&RegExp.$2||"all",rules:n.length-1,hasquery:l.indexOf("(")>-1,minw:l.match(c.regex.minw)&&parseFloat(RegExp.$1)+(RegExp.$2||""),maxw:l.match(c.regex.maxw)&&parseFloat(RegExp.$1)+(RegExp.$2||"")})}v()},x=function(){if(d.length){var b=d.shift();f(b.href,function(c){w(c,b.href,b.media),p[b.href]=!0,a.setTimeout(function(){x()},0)})}},y=function(){for(var b=0;b<t.length;b++){var c=t[b],e=c.href,f=c.media,g=c.rel&&"stylesheet"===c.rel.toLowerCase();e&&g&&!p[e]&&(c.styleSheet&&c.styleSheet.rawCssText?(w(c.styleSheet.rawCssText,e,f),p[e]=!0):(!/^([a-zA-Z:]*\/\/)/.test(e)&&!s||e.replace(RegExp.$1,"").split("/")[0]===a.location.host)&&("//"===e.substring(0,2)&&(e=a.location.protocol+e),d.push({href:e,media:f})))}x()};y(),c.update=y,c.getEmValue=u,a.addEventListener?a.addEventListener("resize",b,!1):a.attachEvent&&a.attachEvent("onresize",b)}}(this);
$('#calendar').datepicker({
		});

!function ($) {
    $(document).on("click","ul.nav li.parent > a ", function(){          
        $(this).find('em').toggleClass("fa-minus");      
    }); 
    $(".sidebar span.icon").find('em:first').addClass("fa-plus");
}

(window.jQuery);
	$(window).on('resize', function () {
  if ($(window).width() > 768) $('#sidebar-collapse').collapse('show')
})
$(window).on('resize', function () {
  if ($(window).width() <= 767) $('#sidebar-collapse').collapse('hide')
})

$(document).on('click', '.panel-heading span.clickable', function(e){
    var $this = $(this);
	if(!$this.hasClass('panel-collapsed')) {
		$this.parents('.panel').find('.panel-body').slideUp();
		$this.addClass('panel-collapsed');
		$this.find('em').removeClass('fa-toggle-up').addClass('fa-toggle-down');
	} else {
		$this.parents('.panel').find('.panel-body').slideDown();
		$this.removeClass('panel-collapsed');
		$this.find('em').removeClass('fa-toggle-down').addClass('fa-toggle-up');
	}
})
