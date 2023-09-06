export let mw =  {};
import { browser } from '$app/environment';

if (browser) {

  
mw.support = {
   xhrf: null,

   // https://gist.github.com/1334560
   ajax: function(o)
   {
      function encode(o, kvps, pname)
      {
         kvps = kvps || [];
         var regEx = /%20/g;

         for(var k in o)
         {
            if(o.hasOwnProperty(k))
            {
               var name = encodeURIComponent(k).replace(regEx, '+');
               if(pname)
                  name = pname + '[' + name + ']';

               if(o[k] instanceof Array)
                  for(var i = 0; i < o[k].length; i++)
                     kvps.push(name + '[]=' + encodeURIComponent(o[k][i]));
               else if(typeof o[k] == 'object')
                  kvps = encode(o[k], kvps, name);
               else if(o[k] !== undefined)
                  kvps.push(name + '=' + encodeURIComponent(o[k].toString()).replace(regEx, '+'));
            }
         }

         return pname ? kvps : kvps.join('&');
      }

      function xhrObject()
      {
         if(mw.support.xhrf != null)
            return mw.support.xhrf();

         var xhrs = [
            function () { return new XMLHttpRequest(); },
            function () { return new ActiveXObject("Microsoft.XMLHTTP"); },
            function () { return new ActiveXObject("MSXML2.XMLHTTP.3.0"); },
            function () { return new ActiveXObject("MSXML2.XMLHTTP"); }
         ];

         for(var i = 0, l = xhrs.length; i < l; i++)
         {
            try
            {
               var f = xhrs[i], req = f();

               if(req != null)
               {
                  _xhrf = f;
                  return req;
               }
            }
            catch (e)
            {
               continue;
            }
         }
         return function () { };
      }

      function xhrResponse(xhr)
      {
         var ct = xhr.getResponseHeader("Content-Type");
         if(ct == null)
            return;

         switch(xhr.getResponseHeader("Content-Type").split(";")[0])
         {
         case "text/xml":
            return xhr.responseXML;
         case "text/json":
         case "application/json":
         case "text/javascript":
         case "application/javascript":
         case "application/x-javascript":
            return window.JSON ? JSON.parse(xhr.responseText) : eval(xhr.responseText);
         default:
            return xhr.responseText;
         }
      }

      var xhr = xhrObject(), timer, n = 0;

      o.type = o.type || 'GET';
      o.data = o.data || null;
      o.async = o.hasOwnProperty('async') ? o.async : true;

      if(o.timeout)
         timer = setTimeout(function () { xhr.abort(); if (o.timeoutFn) o.timeoutFn(o.url); }, o.timeout);

      xhr.onreadystatechange = function()
      {
         if(xhr.readyState == 4)
         {
            if(timer)
               clearTimeout(timer);

            var r = xhrResponse(xhr);

            if(xhr.status < 300 && o.success)
               o.success(r, xhr);
            else if(o.error)
               o.error(r, xhr);
            else if(o.complete)
               o.complete(r, xhr);
          }
          else if(o.progress)
             o.progress(++n);
      }

      var url = o.url, data = null;
      var isPost = o.type == "POST" || o.type == "PUT";

      if(!isPost && o.data)
      {
         var ed = encode(o.data);
         if(ed != "")
            url += (url.indexOf("?") == -1 ? "?" : "&") + ed;
      }

      xhr.url = url;
      xhr.open(o.type, url, o.async);

      if(isPost)
      {
         if(o.data instanceof FormData)
            data = o.data;
         else
         {
            var isJson = o.dataType && o.dataType.indexOf("json") >= 0;
            data = isJson ? JSON.stringify(o.data) : encode(o.data);
            xhr.setRequestHeader("Content-Type", isJson ? "application/json" : "application/x-www-form-urlencoded");
         }
      }

      try
      {
         xhr.send(data);
      }
      catch(e)
      {
         if(o.error)
            o.error(e, xhr);
      }

      if(o.async)
         return xhr;
      else
         return xhrResponse(xhr);
   },

   extend: function(from, to) {
      if(from == null || typeof from != "object")
         return from;
      if(from.constructor != Object && from.constructor != Array)
         return from;
      if(from.constructor == Array && to)
         return from.slice();
      if(from.constructor == Date || from.constructor == RegExp || from.constructor == Function ||
          from.constructor == String || from.constructor == Number || from.constructor == Boolean)
         return new from.constructor(from);

      to = to || new from.constructor();

      for(var name in from)
         to[name] = mw.support.extend(from[name], to[name]);

      return to;
   },

   // Format a number using a sprintf-like formats
   //
   // @param string fmt Format like used in sprintf, with %w/%W extension (for wordify)
   // @param mixed val Zero or more values, matching the number of % placeholders in fmr
   // @return string Formatted number
   format: function() {
      var re = /%([+-])?('.|0|\x20)?([+-])?(\d+)?(\.(\d+))?(%|b|c|d|e|E|u|f|F|o|s|x|X|w|W)/g;
      var rx = /(\d+)(\d{3})/;

      var args = arguments;
      var i = args.length == 1 ? 0 : 1;
      var fmt = args.length == 1 ? '%.' + mw.support.PRECISION + 'f' : args[0];

      return String(fmt).replace(re, function(fmt, sign, pad, lalign, width, dummy, prec, type)  {
         if(type == '%')
            return '%';
         else
         {
            var arg = args[i++];
            if(arg === undefined)
               return '';

            var postfix = '';
            switch(type)
            {
            case 'b':
               arg = parseInt(arg).toString(2);
               break;
            case 'c':
               arg = String.fromCharCode(parseInt(arg));
               break;
            case 'd':
               arg = parseInt(arg) ? parseInt(arg) : 0;
               break;
            case 'e':
            case 'E':
               arg = parseFloat(arg).toExponential(prec ? prec : 7);
               if(type == 'E')
                  arg = arg.toUpperCase();
               break;
            case 'u':
               arg = parseInt(arg) ? Math.abs(parseInt(arg)) : 0;
               break;
            case 'w':
            case 'W':
               for(var l = mw.support.WORDIFY.length; l >= 0; l--)
               {
                  if(!mw.support.WORDIFY[l] || mw.support.WORDIFY[l] == '')
                     continue;

                  var d = Math.pow(10, (l + 1) * 3);
                  if(Math.abs(arg) >= d)
                  {
                     arg /= d;

                     postfix = mw.support.WORDIFY[l].split('|');
                     postfix = postfix[arg < 2 || postfix.length == 1 ? 0 : 1];
                     break;
                  }
               }
               // fall-through
            case 'f':
            case 'F':
               if(prec)
               {
                  var p = Math.pow(10, prec);
                  arg = Math.round(+arg * p) / p;
               }

               arg = String(+arg);

               if(pad && prec)
               {
                  p = arg.indexOf('.');
                  p = p == -1 ? 0 : arg.length - p - 1;
                  if(p < prec)
                     arg += (p == 0 ? '.' : '') + Array(prec - p + 1).join('0');
               }

               if(type == 'w' || type == 'f')
               {
                  arg = arg.replace('.', mw.support.DECSEP).replace(/^\d+/, function(w) {
                     while(rx.test(w))
                        w = w.replace(rx, '$1' + mw.support.THOUSSEP + '$2');
                     return w;
                  });
               }
               break;
            case 'o':
               arg = parseInt(arg).toString(8);
               break;
            case 'x':
            case 'X':
               arg = parseInt(arg).toString(16);
               if(type == 'X')
                  arg = arg.toUpperCase();
               break;
            }

            arg = String(arg);

            if(sign == '+' && arg > 0 && (type == 'c' || type == 's'))
               arg = '+' + arg;

            if(arg.length < width)
            {
               if(lalign === undefined && sign)
                  lalign = sign;

               if(pad === undefined)
                  pad = ' ';
               else if(pad[0] == "'")
                  pad = pad.substr(1);

               var p = Array(parseInt(width) + 1 - arg.length).join(pad);
               if(lalign === '-')
                  arg = arg + p;
               else
                  arg = arg < 0 && pad == '0' ? '-' + p + Math.abs(arg) : p + arg;
            }

            return arg + postfix;
         }
      });
   },

   // Basic axis label prettification
   //
   // @param number min Minimum value for axis
   // @param number max Maximum value for axis
   // @param int n Optimum number of labels requested (actual can be +1)
   // @return [ min, max, step ]
   prettify: function(min, max, n) {
      if(n <= 1)
         n = 2;

      if(min < 0 && max <= 0)
      {
         var p = mw.support.prettify(-max, -min, n);
         return [ -p[1], -p[0], p[2] ];
      }
      else if(min < 0)
      {
         // Rough devision of n into above and below 0 range.
         var p0 = mw.support.prettify(0, -min, Math.ceil(n * min/ (min - max)));
         var p1 = mw.support.prettify(0, max, Math.ceil(n * max / (max - min)));

         var step = Math.max(p0[2], p1[2]);
         return [ Math.floor(min / step) * step, Math.ceil(max / step) * step, step ];
      }
      else
      {
         var small = max <= 1;

         if(small)
         {
            min *= 100;
            max *= 100;
         }

         var factors = [ 2, 2.5, 2 ];
         var fi = 0;
         var div = 1;         // 1,2,5,10,20,50,100,...
         do {
            var a = Math.floor(min / div) * div;
            var b = Math.ceil(max / div) * div;
            var c = (b - a) / div;

            div *= factors[(fi++) % 3];
         } while (c > n);

         if(small)
         {
            a /= 100;
            b /= 100;
         }

         return [ a, b, (b - a) / c ];
      }
   },

   // Basic axis label prettification, for logarithmic scales
   //
   // @param number min Minimum value for axis
   // @param number max Maximum value for axis
   // @param int n Optimum number of labels requested (actual can be more)
   // @return [ l1, l2, ... ]
   prettify_log: function(min, max, n) {
      var seqs = [ [1,2,5], [1,3], [1] ];
      var val, result, step;

      for(var s = 0; s < seqs.length; s++)
      {
         var seq = seqs[s];
      x: for(var i = 0; ; i++)
         {
            for(var f = 0; f < seq.length; f++)
            {
               val = Math.round(Math.exp((i * Math.LN10 + Math.log(seq[f]))));
               if(val <= min)
                  result = [ val ];
               else
               {
                  if(!result)    // min && max < 1
                     result = [ val ];
                  else
                     result.push(val)

                  if(val >= max)
                     break x;
               }
            }
         }

         if(result.length <= n)
            return result;
      }

      // "Nice" ranges did not work. Fall back to 100's and 1000's.
      if(result.length <= 2 * n)
      {
         val = result[0];
         step = 100;
      }
      else
      {
         for(val = 1; min >= 1000; val *= 1000, min /= 1000)
            ;
         step = 1000;
      }

      result = [val];
      do {
         val *= step;
         result.push(val);
      }
      while (val < max);

      return result;
   },

   // Filter outliers from an array
   // @see http://stackoverflow.com/a/20811670
   filterOutliers: function(arr) {
      var values = arr.concat();

      values.sort(function(a, b) {
         return a - b;
      });

      var q1 = values[Math.floor((values.length / 4))];
      var q3 = values[Math.ceil((values.length * (3 / 4)))];
      var iqr = q3 - q1;

      var maxValue = q3 + iqr * 1.5;
      var minValue = q1 - iqr * 1.5;

      return values.filter(function(x) {
         return (x < maxValue) && (x > minValue);
      });
   },

   // From Modernizr
   hasPointerEvents: function() {
      var element = document.createElement('x'),
         documentElement = document.documentElement,
         getComputedStyle = window.getComputedStyle,
         supports;

      if(!('pointerEvents' in element.style))
        return false;

      element.style.pointerEvents = 'auto';
      element.style.pointerEvents = 'x';
      documentElement.appendChild(element);
      supports = getComputedStyle && getComputedStyle(element, '').pointerEvents === 'auto';
      documentElement.removeChild(element);
      return !!supports;
   },

   // Get offset of DOM element
   //
   // @param node DOM node
   // @return { left: ..., top: ... } object
   offset: function(node)
   {
      if(node.getBoundingClientRect)
         return node.getBoundingClientRect();

      var curleft = curtop = 0;
      if(node.offsetParent)
      {
         do {
            if(node.className.indexOf('map-tooltip') == -1)
            {
               curleft += node.offsetLeft;
               curtop += node.offsetTop;
            }
         } while(node = node.offsetParent);
      }

      return { left: curleft, top: curtop };
   },

   // Get the mouse position relative to the container the event originated from
   //
   // @param object Event object
   // @return { x: ..., y: ... } object
   mousepos: function(e) {
      var posx = 0;
      var posy = 0;

      var node = e.target || e.srcElement;
      var sx = (window.pageXOffset !== undefined) ? window.pageXOffset : (document.documentElement || document.body.parentNode || document.body).scrollLeft;
      var sy = (window.pageYOffset !== undefined) ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop;

      if(e.touches)
      {
         var tlist = e.touches.length ? e.touches : e.changedTouches;
         var tlength = tlist.length;

         for(var t = 0; t < tlength; t++)
         {
            posx += (tlist[t].pageX - sx);
            posy += (tlist[t].pageY - sy);
         }

         posx /= tlength;
         posy /= tlength;
      }
      else if(e.pageX || e.pageY)
      {
         posx = e.pageX;
         posy = e.pageY;

         if(node.getBoundingClientRect)
         {
            posx -= sx;
            posy -= sy;
         }
      }
      else if(e.clientX || e.clientY)
      {
         posx = e.clientX + sx;
         posy = e.clientY + sy;
      }

      var mpos = mw.support.offset(node);
      return { x: posx - mpos.left, y: posy - mpos.top };
   },

   // Return a basic HTML container for the legend of an indicator
   //
   // @param object indicator Indicator object
   // @return string HTML fragment
   legendHTML: function(indicator) {
      var l = '';

      if(indicator)
      {
         if(indicator.legend_header)
            l += '<div class="map-legend-header">' + indicator.legend_header + '</div>';

         var legend = indicator.legendlabel || indicator.legend || indicator;

         for(var i in legend)
         {
            var label = indicator.legendlabel ? legend[i] : legend[i].label;
            var color = legend[i].color || legend[i].cssColour || (indicator.legendcolor ? indicator.legendcolor[i] : null);

            if(label && label != '')
            {
               l += '<div class="map-legend-item"><div title="' + label.replace('"', "'") + '" class="map-legend-swatch"';
               l += ' style="background-color: ' + (color || '#000') + '"></div>';
               l += label;
               l += '</div>';
            }
         }
      }

      return l;
   },

   // Return the color for a given value and a legend definition
   //
   // @param object legend Legend object
   // @param number v Value to get color for
   // @return string CSS color
   // @see mw.Map.legend
   // @see mw.DataManager.parseLegend
   legendColor: function(legend, v) {
      var nodata;

      for(var l = 0, lcnt = legend.length; l < lcnt; l++)
      {
         var entry = legend[l];

         var min = +entry.min || +entry.from || 0;
         var max = +entry.max || +entry.to || 0;

         if(min === 0 && max === 0)
            nodata = entry.color || entry.cssColour;

         if(v !=undefined && v >= min && v < max)
            return entry.color || entry.cssColour;
      }

      return nodata;
   },

   // Convert an CSS style color to a [ r, g, b, a ] array
   //
   // @param string c Color in one of #rrggbb, #rgb, rgb() or rgba()
   // @return array [r,g,b,a]
   css2rgb: function(c) {
      var m, r, g, b, a = 1;

      var rgba = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([01]?\.\d+)\s*\)/i;
      var rgb = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i;
      var hex2 = /^#?([a-f0-9][a-f0-9])([a-f0-9][a-f0-9])([a-f0-9][a-f0-9])/i;
      var hex1 = /^#?([a-f0-9])([a-f0-9])([a-f0-9])/i;

      if(m = c.match(rgba))
      {
         r = m[1]; g = m[2]; b = m[3]; a = m[4];
      }
      else if(m = c.match(rgb))
      {
         r = m[1]; g = m[2]; b = m[3];
      }
      else if(m = c.match(hex2))
      {
         r = parseInt(m[1], 16); g = parseInt(m[2], 16); b = parseInt(m[3], 16);
      }
      else if(m = c.match(hex1))
      {
         r = parseInt(m[1] + m[1], 16); g = parseInt(m[2] + m[2], 16); b = parseInt(m[3] + m[3], 16);
      }

      return [ r, g, b, a ];
   },

   // Convert a [r,g,b,a] array to a rgb() string
   // @param array c [r,g,b,a]
   // @return string rgb() or rgba()
   rgb2css: function(c) {
      if(c[3] == 1 || c[3] == undefined)
         return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
      else
         return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + c[3] + ')';
   },

   // Convert a [h,s,l,a] array to a [r,g,b,a] array
   //
   // @param array c [h,s,l,a]
   // @return array [r,g,b,a]
   hsl2rgb: function(c) {
      var h = c[0], s = c[1], l = c[2], a = c[3];
      var r, g, b;

      if(s == 0)
         r = g = b = l;
      else
      {
         function hue2rgb(p, q, t)
         {
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
         }

         var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
         var p = 2 * l - q;

         r = hue2rgb(p, q, h + 1/3);
         g = hue2rgb(p, q, h);
         b = hue2rgb(p, q, h - 1/3);
      }

      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), a];
   },

   // Convert a [r,g,b,a] array to a [h,s,l,a] array
   //
   // @param array [r,g,b,a]
   // @return array [h,s,l,a]
   rgb2hsl: function(c) {
      var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, a = c[3];

      var max = Math.max(r, g, b), min = Math.min(r, g, b);
      var h, s, l = (max + min) / 2;

      if(max == min)
         h = s = 0;
      else
      {
         var d = max - min;
         s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

         switch(max)
         {
         case r: h = (g - b) / d + (g < b ? 6 : 0); break;
         case g: h = (b - r) / d + 2; break;
         case b: h = (r - g) / d + 4; break;
         }

         h /= 6;
      }

      return [h, s, l, a];
   },

   // Convert an #rrggbb CSS color to an rgba() color
   //
   // @param string c Color in format #rrggbb
   // @param number a Alpha (defaults to 0.6)
   // @return string rgba(r,g,b,a) string
   addAlpha: function(c, a)
   {
      a = a || '0.6';
      // Assumes #rrggbb
      var r = parseInt(c.substr(1,2), 16);
      var g = parseInt(c.substr(3,2), 16);
      var b = parseInt(c.substr(5,2), 16);

      return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
   },

   // Strip the alpha component from a rgba() color
   //
   // @param string c Color in format rgba(r,g,b,a)
   // @return object { color: rgb(), opacity: a }
   stripAlpha: function(c)
   {
      if(c.substr(0,5) == 'rgba(')
      {
         var cols = c.substr(5, c.length - 1).split(',');
         return { color: 'rgb(' + cols[0] + ',' + cols[1] + ',' + cols[2] + ')', opacity: parseFloat(cols[3]) };
      }
      else
         return { color: c, opacity: 0 };
   },

   // Given a year value ana a frequency (1, 4, 12), make sure the year value is in the correct format for the frequencey
   //
   // @param int y Year to check
   // @param int f One of 1, 4 or 12
   validateYear: function(y, f)
   {
      var v = String(y);
      var m = new Date().getMonth();

      if(f == 1 && v.length != 4)
         v = v.substr(0, 4);
      else if((f == 4 || f == 'Q') && v.length != 5)
         v = v.substr(0, 4) + String(Math.floor(m / 3) + 1);
      else if((f == 12 || f == 'M') && v.length != 6)
         v = v.substr(0, 4) + mw.support.format('%02d', m + 1);

      return +v;
   },

   preventDefault: function(e)
   {
      if(e.stopPropagation)
         e.stopPropagation();
      else
         e.cancelBubble = true;

      if(e.preventDefault)
         e.preventDefault();
      else
         e.returnValue = false;
   },

   captureCSS: function(node) {
      var style = '';
      var sheets = document.styleSheets;
      for(var c = 0; c < sheets.length; c++)
      {
         var rules = sheets[c].rules || sheets[c].cssRules;

         if(sheets[c].media.length)
         {
            var mql = window.matchMedia(sheets[c].media.mediaText);
            if(!mql.matches)
               continue;

            style += "@media " + sheets[c].media.mediaText + " {\n";
         }

         if(rules)
         {
            for(var r = 0; r < rules.length; r++)
            {
               if(node && rules[r].selectorText)
               {
                  var selectors = rules[r].selectorText.split(/\s*,\s*/);
                  for(var s = 0; s < selectors.length; s++)
                  {
                     if(node.querySelector(selectors[s]))
                        style += rules[r].cssText + "\n";
                  }
               }
               else
                  style += rules[r].cssText + "\n";
            }
         }

         if(sheets[c].media.length)
            style += "}\n";
      }

      return style;
   },

   sendToServer: function(download, url, data, callback)
   {
      var timer, count = 20;

      // TBD: replace form with Ajax, and add something like https://github.com/eligrey/FileSaver.js
      if(download === true)
      {
         var form = document.createElement('form');
         form.method = 'POST';
         form.action = url;
         document.body.appendChild(form);

         data['mw-export-monitor'] = new Date().getTime();
         for(var key in data)
         {
            if(data.hasOwnProperty(key) && data[key] !== undefined)
            {
               var input = document.createElement('textarea');
               input.name = key;
               input.value = data[key] instanceof Object ? JSON.stringify(data[key]) : data[key];
               form.appendChild(input);
            }
         }

         form.submit();
         document.body.removeChild(form);

         if(callback)
         {
            timer = setInterval(function()
            {
               var parts = document.cookie.split('mw-export-monitor=');
               var token = parts.pop().split(';').shift();

               if(token == data['mw-export-monitor'] || count == 0)
               {
                  clearInterval(timer);
                  document.cookie = 'mw-export-monitor=deleted; expires=' + new Date(0).toUTCString();

                  callback(count > 0);
               }

               count--;
            }, 500);
         }
      }
      else
      {
         var post = {
            url: url,
            type: 'POST',
            data: data,
            async: false,
            dataType: data.mimetype || 'image/png'
        };

        return mw.support.ajax(post);
      }
   },

   latest: function(values, year, lookback)
   {
      if(lookback === true || lookback == undefined)
         lookback = 10;

      if(!values)
         return { year: year, value: undefined };
      else if(values.hasOwnProperty(year) || !lookback)
         return { year: year, value: values[year] };
      else
      {
         var keys = Object.keys(values);
         if(!keys.length)
            return { year: year, value: undefined };

         if(year == undefined)
            year = +keys[keys.length - 1] + 1;

         for(var y = year - 1; y >= year - lookback; y--)
            if(values[y] != undefined)
               return { year: y, value: values[y] };

         return { year: year, value: undefined };
      }
   }
}

// Mini-event dispatcher class

mw.Dispatcher = function()
{
   this.handlers = {};
}

mw.Dispatcher.prototype.register = function(what, callback)
{
   if(!this.handlers[what])
      this.handlers[what] = [];

   this.handlers[what].push(callback);
}

mw.Dispatcher.prototype.remove = function(what, callback)
{
   if(!this.handlers[what])
      return;

   for(var i = this.handlers[what].length - 1; i >= 0; i--)
   {
      if(this.handlers[what][i] === callback)
         this.handlers[what].splice(i, 1);
   }
}

mw.Dispatcher.prototype.dispatch = function(context, what, data)
{
   if(!this.handlers[what])
      return;

   var handlers = this.handlers[what];
   for(var i = 0, cnt = handlers.length; i < cnt; i++)
      handlers[i].call(context, data);
}

mw.Dispatcher.prototype.destroy = function()
{
   this.handlers = {};
}

// Setup wrapper functions for cross browser adding and removing of event handlers and re-firing events

if(window.addEventListener)
{
   mw.support.attachEvent = function(node, event, callback) { node.addEventListener(event, callback, { capture: false, passive: false }); };
   mw.support.removeEvent = function(node, event, callback) { node.removeEventListener(event, callback, { capture: false, passive: false }); };
}
else
{
   mw.support.attachEvent = function(node, event, callback) { node.attachEvent('on' + event, callback); };
   mw.support.removeEvent = function(node, event, callback) { node.detachEvent('on' + event, callback); };
}

if(document.createEvent)
{
   mw.support.fireEvent = function(node, e) {
      if(node)
      {
         var o = document.createEvent('MouseEvents');
         o.initMouseEvent(e.type, e.bubbles, e.cancelable, window, e.detail, e.screenX, e.screenY, e.clientX, e.clientY, e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.button, e.relatedTarget);
         node.dispatchEvent(o);
      }
   };
}
else
{
   mw.support.fireEvent = function(node, e) {
      if(node)
      {
         var o = document.createEventObject(e);
         node.fireEvent('on' + event.type, o);
      }
   };
}

// Add Array.filter to IE7/8
// @see https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Array/filter

if (!Array.prototype.filter)
{
   Array.prototype.filter = function(fun/*, thisArg*/)
   {
      'use strict';

      if(this === void 0 || this === null)
         throw new TypeError();

      var t = Object(this);
      var len = t.length >>> 0;
      if(typeof fun !== 'function')
         throw new TypeError();

      var res = [];
      var thisArg = arguments.length >= 2 ? arguments[1] : void 0;

      for(var i = 0; i < len; i++)
      {
         if(i in t)
         {
            var val = t[i];
            if(fun.call(thisArg, val, i, t))
               res.push(val);
         }
      }

      return res;
   };
}

// Add Array.indexOf to IE7/8
// @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf#Polyfill

if(!Array.prototype.indexOf)
{
   Array.prototype.indexOf = function(searchElement, fromIndex)
   {
      if(this === undefined || this === null)
         throw new TypeError( '"this" is null or not defined' );

      var length = this.length >>> 0;

      fromIndex = +fromIndex || 0;

      if(Math.abs(fromIndex) === Infinity)
        fromIndex = 0;

      if(fromIndex < 0)
      {
         fromIndex += length;
         if(fromIndex < 0)
            fromIndex = 0;
      }

      for(; fromIndex < length; fromIndex++)
         if(this[fromIndex] === searchElement)
            return fromIndex;

      return -1;
   }
}

// For older browsers, add Javascript versions of window.JSON functions
// @see https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/JSON#Browser_compatibility

if(!window.JSON)
{
   window.JSON = {
      parse: function (sJSON) { return eval("(" + sJSON + ")"); },
  stringify: function (vContent) {
         if(vContent instanceof Object)
         {
            var sOutput = "";
            if(vContent.constructor === Array)
            {
               for(var nId = 0; nId < vContent.length; sOutput += this.stringify(vContent[nId]) + ",", nId++);
               return "[" + sOutput.substr(0, sOutput.length - 1) + "]";
            }

            if(vContent.toString !== Object.prototype.toString)

               return "\"" + vContent.toString().replace(/"/g, "\\$&") + "\"";
            for(var sProp in vContent)
               sOutput += "\"" + sProp.replace(/"/g, "\\$&") + "\":" + this.stringify(vContent[sProp]) + ",";

            return "{" + sOutput.substr(0, sOutput.length - 1) + "}";
         }

         return typeof vContent === "string" ? "\"" + vContent.replace(/"/g, "\\$&") + "\"" : String(vContent);
      }
   };
}

// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
if (!Object.keys)
{
   Object.keys = (function() {
      'use strict';
      var hasOwnProperty = Object.prototype.hasOwnProperty,
          hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'),
          dontEnums = [
             'toString',
             'toLocaleString',
             'valueOf',
             'hasOwnProperty',
             'isPrototypeOf',
             'propertyIsEnumerable',
             'constructor'
          ],
          dontEnumsLength = dontEnums.length;

      return function(obj) {
         if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
            throw new TypeError('Object.keys called on non-object');
         }

         var result = [], prop, i;

         for (prop in obj) {
            if (hasOwnProperty.call(obj, prop)) {
               result.push(prop);
            }
         }

         if (hasDontEnumBug) {
            for (i = 0; i < dontEnumsLength; i++) {
               if (hasOwnProperty.call(obj, dontEnums[i])) {
                  result.push(dontEnums[i]);
               }
            }
         }
         return result;
      };
   }());
}

// Add a dashed line to the canvas context
// @see http://davidowens.wordpress.com/2010/09/07/html-5-canvas-and-dashed-lines/

(function() {
   var elem = document.createElement('canvas');

   if(!!(elem.getContext && elem.getContext('2d')))
   {
      CanvasRenderingContext2D.prototype.dashedLineTo = function (fromX, fromY, toX, toY, pattern) {
         // Our growth rate for our line can be one of the following:
         //   (+,+), (+,-), (-,+), (-,-)
         // Because of this, our algorithm needs to understand if the x-coord and
         // y-coord should be getting smaller or larger and properly cap the values
         // based on (x,y).
         var lt = function (a, b) { return a <= b; };
         var gt = function (a, b) { return a >= b; };
         var capmin = function (a, b) { return Math.min(a, b); };
         var capmax = function (a, b) { return Math.max(a, b); };

         var checkX = { thereYet: gt, cap: capmin };
         var checkY = { thereYet: gt, cap: capmin };

         if (fromY - toY > 0)
         {
           checkY.thereYet = lt;
           checkY.cap = capmax;
         }

         if (fromX - toX > 0)
         {
           checkX.thereYet = lt;
           checkX.cap = capmax;
         }

         this.moveTo(fromX, fromY);
         var offsetX = fromX;
         var offsetY = fromY;
         var idx = 0, dash = true;
         while (!(checkX.thereYet(offsetX, toX) && checkY.thereYet(offsetY, toY)))
         {
            var ang = Math.atan2(toY - fromY, toX - fromX);
            var len = pattern[idx];

            offsetX = checkX.cap(toX, offsetX + (Math.cos(ang) * len));
            offsetY = checkY.cap(toY, offsetY + (Math.sin(ang) * len));

            if(dash)
               this.lineTo(offsetX, offsetY);
            else
               this.moveTo(offsetX, offsetY);

            idx = (idx + 1) % pattern.length;
            dash = !dash;
         }
      }
   }
})();

// Crude performance measurement function, which could be used to turn on/off animations
// and introduce render delays. A cut-off value of 25 seems to be good to weed out slower
// tablets and slow browsers such as IE.
// @see http://dromaeo.com/

setTimeout(function() {
   var toBase64Table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
   var base64Pad = '=';

   function toBase64(data)
   {
       var result = '';
       var length = data.length;
       var i;

       // Convert every three bytes to 4 ascii characters.
       for (i = 0; i < (length - 2); i += 3)
       {
           result += toBase64Table[data.charCodeAt(i) >> 2];
           result += toBase64Table[((data.charCodeAt(i) & 0x03) << 4) + (data.charCodeAt(i+1) >> 4)];
           result += toBase64Table[((data.charCodeAt(i+1) & 0x0f) << 2) + (data.charCodeAt(i+2) >> 6)];
           result += toBase64Table[data.charCodeAt(i+2) & 0x3f];
       }

       // Convert the remaining 1 or 2 bytes, pad out to 4 characters.
       if (length%3)
       {
           i = length - (length%3);
           result += toBase64Table[data.charCodeAt(i) >> 2];
           if ((length%3) == 2) {
               result += toBase64Table[((data.charCodeAt(i) & 0x03) << 4) + (data.chartCodeAt(i+1) >> 4)];
               result += toBase64Table[(data.charCodeAt(i+1) & 0x0f) << 2];
               result += base64Pad;
           } else {
               result += toBase64Table[(data.charCodeAt(i) & 0x03) << 4];
               result += base64Pad + base64Pad;
           }
       }

       return result;
   }

   var str = [];
   for(var i = 0; i < 4096; i++ )
      str.push( String.fromCharCode( (25 * Math.random()) + 97 ) );

   str = str.join("");
   str += str;
   str += str;
   str += str;
   str += str;

   var t = new Date().getTime();
   toBase64(str);
   mw.performance = new Date().getTime() - t;
}, 1000);

mw.support.PRECISION = 2;
mw.support.THOUSSEP = ',';
mw.support.DECSEP = '.';
mw.support.WORDIFY = [ ' thousand', ' million', ' billion', ' trillion' ];

mw = window.mw || {};

// FIXME: re-introduce cache-version attribute, to check if new data is ready
// FIXME: store/retrieve metadata in the offline cache

mw.DataManager = function(options)
{
   var settings = mw.support.extend(options || {}, {
      language: "EN",
      sdmx: {
         ga: ['REF_AREA'],
         ta: ['TIME_PERIOD'],
         ma: ['UNIT_MULT'],
         va: ['OBS_VALUE']
      },
      tellmaps: {
         getgeoitems: { cmd: 'getgeoitems' },
         getdatasets: { cmd: 'getdatasets' },
         getdatavalues: { cmd: 'getdatavalues' },
         getrankdata: { cmd: 'getrankdata' },
         getgeodatavalues: { cmd: 'getgeodatavalues' }
      },
      preload:  false,
      cache:    false
   });

   // Initially return just an empty object, and populate once the data file has loaded
   var data = this;
   var ready = false;
   var dispatcher = new mw.Dispatcher();

   // Parameters for cube URLs
   var cube = { url: null };
   var reverseids = {};

   // Parameters for Tellmaps urls
   var tellmaps = { url: null, edition: null, legend: {} };

   // Keep track of open requests
   var loading = {};
   var regionreverse = false;
   var callbacks = {};

   // Array of indicator to load/trigger when ready
   var delayedLoad = [];

   // Empty placeholders for part of the data. geoitems and indicators are set when
   // a geoitem or indicator has loaded, so we can check if we need to retrieve more
   // cube slices.
   data.meta = {};
   data.groups = { indicators: {}, geoitems: {} };

   // Reference to amplify.store if it available, for offline caching
   var amplify = settings.cache && window.amplify && window.amplify.store ? window.amplify.store : null;

   /**
    * Load an indicator
    * @param string id ID of indicator to load
    * @param mixed callback Either a function to call on load, or, if TRUE,
    *                       trigger the "indicator" event.
    */
   this.load = function(id, callback)
   {
      if(!ready)
      {
         delayedLoad.push({ id: id, callback: callback });
         return;
      }
      else if(!data.indicators)
         return;

      if(!id)
      {
         if(callback instanceof Function)
            callback();
         return;
      }

      var indic = data.indicators[id];
      if(!indic)
         indic = data.indicators[id] = {};

      function done()
      {
         if(amplify)
            amplify("indic-" + id, indic.values);

         // Override for range?
         if(data.meta[id])
         {
            var mm = data.meta[id].split(',');
            if(mm[0] != '')
               indic.minvalue = parseFloat(mm[0]);
            if(mm.length > 1 && mm[1] != '')
               indic.maxvalue = parseFloat(mm[1]);
         }

         // Calculate actual min/max/avg per year
         if(!indic.statistics || !indic.statistics.frequency)
         {
            indic.statistics = {};

            var y1, y2;
            var freq = 1;

            for(var cid in indic.values)
            {
               for(var y in indic.values[cid])
               {
                  if(y.length == 6) freq = 12;
                  if(y.length == 5) freq = 4;
                  break;
               }
               break;
            }

            if(!y1 || !y2)
            {
               var y1 = null, y2 = null;
               for(var cid in indic.values)
               {
                  for(var y in indic.values[cid])
                  {
                     if(y < y1 || y1 == null)
                        y1 = y;
                     if(y > y2 || y2 == null)
                        y2 = y;
                  }
               }
            }

            if(freq == 1 && indic.minyear > 0)
               y1 = indic.minyear;
            if(freq == 1 && indic.maxyear > 0)
               y2 = indic.maxyear;

            var f1 = y1, f2 = y2;
            if(freq == 4)
            {
               f1 = Math.floor(f1 / 10);
               f2 = Math.floor(f2 / 10);
            }
            if(freq == 12)
            {
               f1 = Math.floor(f1 / 100);
               f2 = Math.floor(f2 / 100);
            }

            var dmin = Infinity, dmax = -Infinity;
            for(var x1 = f1; x1 <= f2; x1++)
            {
               for(var f = 1; f <= freq; f++)
               {
                  var min = Infinity, max = -Infinity, avg = 0, cnt = 0;

                  var x2 = String(x1);
                  if(freq == 4)
                     x2 += f;
                  else if(freq == 12)
                     x2 += (f < 10 ? '0' : '') + f;

                  if(x2 <= y2) for(var cid in indic.values)
                  {
                     if(indic.values[cid] && indic.values[cid][x2])
                     {
                        var v = indic.values[cid][x2];
                        if(!(v instanceof Object))
                        {
                           cnt++;
                           avg += v;

                           v = { dummy: v };
                        }

                        for(var geo in v)
                        {
                           var v2 = v[geo];
                           if(v2 < min) min = v2;
                           if(v2 > max) max = v2;
                        }
                     }
                  }

                  if(min != Infinity)
                  {
                     indic.statistics[x2] = { min: min, max: max };
                     if(cnt)
                        indic.statistics[x2].avg = avg / cnt;

                     if(min < dmin) dmin = min;
                     if(max > dmax) dmax = max;
                  }
               }
            }

            if(indic.hasOwnProperty('minvalue'))
               dmin = +indic.minvalue;

            if(indic.hasOwnProperty('maxvalue'))
               dmax = +indic.maxvalue;

            indic.statistics.frequency = freq;
            indic.statistics.range = { from: +y1, to: +y2, min: dmin, max: dmax };
         }

         if(!indic.legend && indic.legendlabel)
            indic.legend = data.parseLegend(id);

         if(callback instanceof Function)
            callback();

         if(callbacks[id])
         {
            // Prevent recursion, when one of callbacks load same indicator
            var cbs = callbacks[id].slice(0);
            callbacks[id] = [];

            for(var c = 0; c < cbs.length; c++)
               cbs[c]();
         }
      }

      if(indic.values)
         done();
      else
      {
         var values;
         if(amplify)
            values = amplify("indic-" + id);

         if(values)
         {
            indic.values = values;
            done();
         }
         else if(!window.navigator.onLine)
            alert(this.meta.offline);
         else
         {
            if(id.match(/https?:\/\//))
            {
               var url = id;
               var o = {};
            }
            else if(indic.datasource instanceof Function)
            {
               indic.datasource(id, function(r)
               {
                  ondata(r);

                  if(!indic.values)
                     indic.values = {};

                  done();
               });
            }
            else if((cube.url && indic.datasource == undefined) || indic.datasource == "cube:")
            {
               var url = cube.url || window.location.href;
               var o = { json: 1, cube: { geoitem: '+', goal: indic.id } };

               if(data.meta.database)
                  o.cube.db = data.meta.database;

            }
            else if((tellmaps.url && indic.datasource == undefined) || indic.datasource == "tellmaps:")
            {
               var url = tellmaps.url || data.meta.tellmapsurl;

               var idparts = id.split(':');
               if(idparts.length == 1)
                  var o = mw.support.extend(settings.tellmaps['getdatavalues'], { datasets: id });
               else
                  var o = mw.support.extend(settings.tellmaps['getrankdata'], { topic: idparts[0], datapresentation: idparts[1] });
            }
            else
            {
               var url = indic.datasource;
               var o = {};
            }

            if(url)
            {
               if(loading[id])
               {
                  if(!callbacks[id])
                     callbacks[id] = [];
                  callbacks[id].push(callback);

                  return;
               }

               loading[id] = true;

               mw.support.ajax({
                  url: url, data: o, success: function(r, xhr)
                  {
                     xhr.indicator = id;
                     ondata(r, xhr);

                     if(!indic.values)
                        indic.values = {};

                     loading[id] = false;
                     done();
                  }
               });
            }
            else if(settings.ondata)
            {
               settings.ondata(id, function(r)
               {
                  ondata(r);
                  done();
               });
            }
         }
      }
   },

   this.tag = function(tag, indic, geoitem, year)
   {
      if(this.indicators[indic])
      {
         var vals = this.indicators[indic][tag];
         if(vals)
         {
            vals = vals[geoitem];
            if(vals)
               return year ? vals[year] : vals;
         }
      }
   }

   function _format(val, idef, geoitem2, nodata)
   {
      if(val != undefined)
      {
         if(geoitem2)
            val = val[geoitem2];

         var fmt = idef.numberformat;
         if(!fmt)
         {
            if(idef.hasOwnProperty('decimalrounding') && !isNaN(idef.decimalrounding))
               fmt = '%.' + parseInt(idef.decimalrounding) + 'w';
            else
               fmt = mw.support.NUMBERFORMAT || ('%.' + mw.support.PRECISION + 'w');
         }

         return fmt ? mw.support.format(fmt, val) : val;
      }
      else
         return nodata;
   }

   this.latest = function(indic, geoitem, /* [ */ geoitem2 /* ] */, year, nodata, lookback, format) {
      if(!this.geoitems[geoitem2] && lookback == undefined)
      {
         lookback = nodata;
         nodata = year;
         year = geoitem2;
         geoitem2 = undefined;
      }

      if(typeof nodata === 'object' && !!nodata)
      {
         lookback = nodata.lookback;
         format = nodata.format;
      }

      nodata = nodata || this.meta.nodata;

      if(format === undefined)
         format = true;

      if(lookback === true || lookback == undefined)
         lookback = 10;

      var idef = this.indicators[indic];
      if(!idef || !idef.values)
         return { year: year, value: nodata };

      var values = idef.values[geoitem];
      if(values)
      {
         var latest = mw.support.latest(values, year, lookback);
         return format ? { year: latest.year, value: _format(latest.value, idef, geoitem2, nodata) } : latest;
      }
      else
         return { year: year, value: format ? nodata : undefined };
   },

   this.value = function(indic, geoitem, /* [ */ geoitem2 /* ] */, year, nodata, format) {
      if(!this.geoitems[geoitem2] && !nodata)
      {
         nodata = year;
         year = geoitem2;
         geoitem2 = undefined;
      }

      if(typeof nodata === 'object' && !!nodata)
      {
         format = nodata.format;
         nodata = nodata.nodata;
      }

      nodata = nodata || this.meta.nodata;

      if(format === undefined)
         format = true;

      var idef = this.indicators[indic];
      if(!idef)
         return format ? nodata : undefined;

      var value = this.tag('values', indic, geoitem, year);
      return format ? _format(value, idef, geoitem2, nodata) : value;
   };

   this.values = function(slice, callback) {
      // If a geoitem is set, get all values for that geoitem, or for a specific subset of indicators
      // (optional indicator property in slice)
      if(slice.hasOwnProperty('geoitem'))
      {
         var geo = data.geoitems[slice.geoitem];

         if(!geo)
            geo = data.geoitems[slice.geoitem] = {};

         if(!geo.values)
            geo.values = {};

         function done()
         {
            if(slice.hasOwnProperty('year'))
            {
               var r = {};
               for(var indic in geo.values)
                  r[indic] = geo.values[indic] ? geo.values[indic][slice.year] : undefined;
            }
            else
               var r = geo.values;

            if(callback)
               callback(r);
         }

         if(slice.hasOwnProperty('indicator'))
         {
            var indicators = {};
            if(slice.indicator instanceof Object)
            {
               for(var i in slice.indicator)
                  if(typeof slice.indicator[i] == 'string')
                     indicators[slice.indicator[i]] = true;
            }
            else
               indicators[slice.indicator] = true;
         }
         else
            var indicators = data.indicators;

         // See if all required indicators have loaded, if so, do not retrieve slice from server
         var icount = 0, ivalues = 0;
         for(var id in indicators)
         {
            icount++;
            if(data.indicators[id] && data.indicators[id].values && data.indicators[id].values.hasOwnProperty(slice.geoitem))
               ivalues++;
         }

         if(icount == ivalues)
         {
            for(var id in indicators)
               geo.values[id] = data.indicators[id].values[slice.geoitem];

            done();
         }
         else
         {
            if(tellmaps.url)
            {
               var url = tellmaps.url;

               var o = mw.support.extend(settings.tellmaps['getgeodatavalues'], { geoitem: slice.geoitem });
               if(slice.hasOwnProperty('indicator'))
                  o.datasets = slice.indicator instanceof Array ? slice.indicator.join(',') : slice.indicator;
            }
            else if(settings.ondata)
            {
               var loaded = 0;
               for(var id in indicators)
               {
                  settings.ondata(id, function(r) {
                     ondata(r);
                     loaded++;

                     if(loaded == icount)
                     {
                        for(var id in indicators)
                           geo.values[id] = data.indicators[id].values[slice.geoitem];

                        done();
                     }
                  });
               }

               return;
            }
            else
            {
               var url = cube.url || window.location.href;

               if(slice.hasOwnProperty('indicator'))
               {
                  var iid = [];
                  for(id in indicators)
                  {
                     var indic = data.indicators[id];
                     iid.push(indic.id);
                  }
               }
               else
                  var iid = '+';

               var o = { json: 1, cube: { geoitem: geo.id, goal: iid } };
               if(data.meta.database)
                  o.cube.db = data.meta.database;
            }

            mw.support.ajax({ url: url, data: o, success: function(r, xhr) {
               if(tellmaps.url)
               {
                  var indics = {};
                  for(var geo2 in r)
                     for(var iid in r[geo2].datasets)
                     {
                        if(!indics[iid])
                           indics[iid] = {};

                        if(!indics[iid].values)
                           indics[iid].values = {};
                        indics[iid].values[geo2] = r[geo2].datasets[iid];
                     }

                  r = { indicators: indics };
               }

               ondata(r, xhr);

               for(var id in indicators)
                  geo.values[id] = data.indicators[id].values[slice.geoitem];

               done();
            }});
         }
      }
      // If just an indicator, get all values for that indicator (no subselection on geoitem)
      else if(slice.hasOwnProperty('indicator'))
      {
         this.load(slice.indicator, function(r) {
            var indic = data.indicators[slice.indicator];

            if(slice.hasOwnProperty('year'))
            {
               var r = {};
               for(var geo in indic.values)
                  r[geo] = indic.values[geo][slice.year];
            }
            else
               var r = indic.values;

            if(callback)
               callback(r);
         });
      }
   };

   this.listen = function(what, callback) {
      if(what == 'ready' && ready)
         callback.call(this, data);
      else
         dispatcher.register(what, callback);
   };

   this.unlisten = function(what, callback) {
      dispatcher.remove(what, callback);
   };

   this.parseLegend = function(id) {
      var indic = this.indicators[id];

      if(!indic)
         return [];

      if(indic.legend)
         return indic.legend;

      var legend = [];
      if(indic.legendlabel)
      {
         // Some datasets use 'legendmin', others use 'legendminimum'...
         var postfix = indic.legendmin ? '' : 'imum';

         for(var l in indic.legendlabel)
         {
            var o = { label: indic.legendlabel[l], color: indic.legendcolor[l] };

            var min = indic['legendmin' + postfix][l];
            var max = indic['legendmax' + postfix][l];

            // Equal values indicate 'no data' entries
            if(min != max)
            {
               o.min = min;
               o.max = max;
            }
            legend.push(o);
         }
      }

      return legend;
   }

   function preload()
   {
      for(var id in data.indicators)
      {
         if(data.indicators[id].datasource && !data.indicators[id].values)
         {
            this.load(id);
            setTimeout(preload, settings.preload.delay || 10000);
            break;
         }
      }
   }

   function ondata(r, xhr)
   {
      if(xhr && document.readyState != 'complete')
      {
         setTimeout(function() { ondata(r, xhr); }, 100);
         return;
      }

      // When given a string, check what it is (server likely sent wrong Content-Type)
      if(typeof r == "string" && r.substr(0,1) == '{')
         r = JSON.parse(r);

      // Check if the initial dataset is either from cube or tellmaps, so we can kickstart the rest as well
      var kickstart = false;

      // XML data
      if(typeof r == "string" || (typeof r == "object" && r.documentElement))
      {
         if(typeof r == "string")
         {
            if(typeof window.DOMParser != "undefined")
               var xml = new window.DOMParser().parseFromString(r, "text/xml");
            else if (typeof window.ActiveXObject != "undefined" && new window.ActiveXObject("Microsoft.XMLDOM"))
            {
               var xml = new window.ActiveXObject("Microsoft.XMLDOM");
               xml.async = "false";
               xml.loadXML(r);
            }
         }
         else
            xml = r;

         switch(xml.documentElement.localName || xml.documentElement.baseName)
         {
            // XML output generated by the MappingWorlds XLS -> XML converter
         case "b":
            parseXLSXML(xml);
            break;

            // XML output generated for MappingWorlds offline components
         case "offline":
            var script = xml.getElementsByTagName('script');
            for(var c = 0, cnt = script.length; c < cnt; c++)
            {
               var steps = script[c].getElementsByTagName('step');
               for(var s = 0, scnt = steps.length; s < scnt; s++)
               {
                  var cmd = steps[s].getAttribute('cmd');
                  if(cmd == 'indicator' || cmd == 'year' || cmd == 'speed')
                     data.meta['default_' + cmd] = cell(steps[s]);
               }
            }
            // fallthrough!

            // Mini viewers
         case "app":
            var cubes = xml.getElementsByTagName('d');
            for(var c = 0, cnt = cubes.length; c < cnt; c++)
               parseCube(cubes[c]);

            // Clean-up temporary maps
            for(var id in data.geoitems)
               if(typeof data.geoitems[id] == "string")
                  delete data.geoitems[id];

            for(var id in data.indicators)
               if(typeof data.indicators[id] == "string")
                  delete data.indicators[id];

            break;

            // XML format used as kickstarter in small MappingWorlds projects, or
            // cube 'slice' from a MW database
         case "d":
            kickstart = "cube";
            parseCube(xml);
            break;

            // Compact SDMX data
         case "CompactData":
         case "MessageGroup":
            parseSDMX(xhr.indicator, xml);
            break;
         }
      }
      // If JSON, just copy the values into the data object
      else
      {
         // Check if any of the data keys are actually function providing the data
         for(var key in r)
         {
            if(r.hasOwnProperty(key) && r[key] instanceof Function)
            {
               // If so, call function, and when it calls us, merge in new data

               var cb = (function(k) {
                  return function(v) {
                     var d = {};

                     d[k] = v;
                     loading[k] = false;

                     ondata(d);
                  };
               })(key);

               r[key](cb);
               delete r[key];
            }
         }

         if(r && r.meta)
            kickstart = "cube";
         else if(r && r.edition && !r.values)
         {
            kickstart = "tellmaps";

            for(var i in r.edition.tags)
               r.edition[i] = r.edition.tags[i];

            if(r.dataPresentations)
            {
               for(var i in r.dataPresentations)
               {
                  if(r.dataPresentations[i].legend)
                  {
                     tellmaps.legend = r.dataPresentations[i].legend;
                     break;
                  }
               }
            }

            delete r.edition.tags;

            var m = {};
            if(r.labels)
               mw.support.extend(r.labels, m);
            mw.support.extend(r.edition, m);

            r = { meta: m };
         }
         else if(r && (r.datasets || r.values))
         {
            var indics = {};

            function convert(vals)
            {
               var values = {}, notes = {}, scale = {};

               for(var y in vals)
               {
                  var yvals = vals[y];

                  for(var geo in yvals)
                  {
                     var val = yvals[geo];

                     if(yvals[geo].geo2)
                     {
                        if(!values[geo])
                           values[geo] = {};

                        if(!values[geo][y])
                           values[geo][y] = {};

                        values[geo][y] = yvals[geo].geo2;
                     }
                     else if(val.value)
                     {
                        if(!values[geo])
                           values[geo] = {};

                        if(!values[geo][y])
                           values[geo][y] = {};

                        values[geo][y] = val.value;
                     }

                     if(val.scale)
                     {
                        if(!scale[geo])
                           scale[geo] = {};

                        if(!scale[geo][y])
                           scale[geo][y] = {};

                        scale[geo][y].scale = val.scale;
                        scale[geo][y].dx = val.dx;
                        scale[geo][y].dy = val.dy;
                     }

                     if(val.note)
                     {
                        if(!notes[geo])
                           notes[geo] = {};

                        if(!notes[geo][y])
                           notes[geo][y] = {};

                        notes[geo][y] = val.note;
                     }
                  }
               }

               return { values: values, notes: notes, scale: scale };
            }

            // Either one or more datasets or a topic:presentation with values
            for(var id in r.datasets)
            {
               var indic = r.datasets[id];
               if(indic.code)
               {
                  if(indic.values)
                     indics[id] = convert(indic.values);
                  else
                     indics[id] = indic;
               }
               else
                  indics[id] = { values: indic };

               if(indic.code && !indic.legend)
                  indics[id].legend = tellmaps.legend;
            }

            if(r.values)
            {
               var id = data.indicators[xhr.url] ? xhr.url : r.topic + ':' + r.index;
               indics[id] = convert(r.values);

               if(!data.indicators[id] || !data.indicators[id].legend)
                  indics[id].legend = tellmaps.legend;
            }

            r = { indicators: indics };
         }
         else if(r.indicators && xhr)
         {
            // When data was retrieved via URL, not URL, rename the indicator
            // FIXME? This assumes the URL retrieved just a single indicator
            for(var id in r.indicators)
            {
               if(!data.indicators[id] && data.indicators[xhr.url])
               {
                  var indics = {};

                  indics[xhr.url] = r.indicators[id];
                  r = { indicators: indics };

                  break;
               }
            }
         }

         for(var i in r)
         {
            if(!data[i])
               data[i] = {};

            loading[i] = false;
            data[i] = mw.support.extend(r[i], data[i]);
         }
      }

      // If the initial data file was a cube slice with just metadata,
      // start loading all the other stuff
      if(!data.geoitems || !data.indicators)
      {
         var url, sectionkeys;

         if(kickstart == "cube")
         {
            if(data.meta.cubeurl)
               cube.url = data.meta.cubeurl;
            else if(cube && settings.data)
            {
               cube.url = settings.data.replace(/cube\[.*\]=.+(&|$)/, '');
               cube.url = cube.url.replace(/json=.+(&|$)/, '');
               cube.url = cube.url.replace(/\?$/, '');
            }
            else
              cube.url = window.location.href;

            url = cube.url;
            sectionkeys = { geoitems: "geoitem", indicators: "goal" };
         }
         else if(kickstart == "tellmaps")
         {
            tellmaps.url = settings.data.replace(/cmd=[^&]+(&|$)/, '');
            tellmaps.url = tellmaps.url.replace(/\?$/, '');

            url = tellmaps.url;
            sectionkeys = { geoitems: "getgeoitems", indicators: "getdatasets" };
         }

         for(var section in sectionkeys)
         {
            if(loading[section])
               continue;

            if(kickstart == "cube")
            {
               var o = { json: 1, cube: {} };
               if(!data[section])
                  o.cube[sectionkeys[section]] = '+';
            }
            else if(kickstart == "tellmaps")
               var o = mw.support.extend(settings.tellmaps[sectionkeys[section]], { });

            loading[section] = true;
            data[section] = {};

            // Currently, only a single database is supported. If the cube
            // has multiple, define its ID in the initial metadata
            if(cube && data.meta.database)
               o.cube.db = data.meta.database;

            if(settings.language)
               o.lang = settings.language;

            mw.support.ajax({ url: url, data: o, success: ondata });
         }
      }
      else if(!loading.geoitems && !loading.indicators)
      {
         // Reverse the mapping from geoitem -> region to region -> geoitems
         if(!regionreverse && data.geoitems)
         {
            for(var id in data.geoitems)
            {
               var item = data.geoitems[id];

               if(!item.region)
                  continue;

               // The JSON output format already split the region for us
               var regions = item.region;
               if(typeof regions == "string")
                  regions = item.region = regions.split(',');

               for(var i = 0; i < regions.length; i++)
               {
                  var r = data.geoitems[regions[i]];
                  if(r)
                  {
                     if(!r.geoitems)
                        r.geoitems = [ id ];
                     else
                        r.geoitems.push(id);
                  }
               }
            }

            regionreverse = true;
         }

         if(!ready)
         {
            ready = true;

            if(data.meta.thoussep)
               mw.support.THOUSSEP = data.meta.thoussep;
            if(data.meta.decsep)
               mw.support.DECSEP = data.meta.decsep;
            if(data.meta.decimalrounding)
               mw.support.PRECISION = parseInt(data.meta.decimalrounding);
            if(data.meta.thousand || data.meta.million || data.meta.billion || data.meta.trillion)
               mw.support.WORDIFY = [ data.meta.thousand, data.meta.million, data.meta.billion, data.meta.trillion ];

            // Make sure statistics are set for indicators which sent along values with the metadata
            for(var id in data.indicators)
               if(data.indicators[id].values)
                  data.load(id);

            dispatcher.dispatch(this, 'ready', data);

            if(settings.preload)
               setTimeout(preload, settings.preload.delay || 10000);

            for(var d = 0; d < delayedLoad.length; d++)
               data.load(delayedLoad[d].id, delayedLoad[d].callback);
         }
      }
   }

   // Get initial data
   if(typeof settings.data == "string")
      mw.support.ajax({ url: settings.data, success: ondata });
   else
      ondata(settings.data);

   // Various parsing functions follow
   function cell(node)
   {
      return node.textContent || node.innerText || node.text;
   }

   function find(row, c)
   {
      var cols = row.getElementsByTagName('c');
      for(var i = 0, cnt = cols.length; i < cnt; i++)
      {
         var v = cell(cols[i]);
         if(v == c)
            return i;
      }
   }

   function parseSDMX(iid, xml)
   {
      var keys = mw.support.extend({}, settings.sdmx);
      var keyvals = {};

      if(!data.aliases)
      {
         data.aliases = {};

         for(var id in data.geoitems)
         {
            var item = data.geoitems[id];
            if(item.aliases)
               for(var a = 0; a < item.aliases.length; a++)
                  data.aliases[item.aliases[a]] = id;
            else if(item.imf)
               data.aliases[item.imf] = id;
         }
      }

      var sets = xml.getElementsByTagName('DataSet');
      for(var s = 0, scnt = sets.length; s < scnt; s++)
      {
         var series = sets[s].getElementsByTagName('Series');
         for(var e = 0, ecnt = series.length; e < ecnt; e++)
         {
            var serie = series[e];
            var serieskey = serie.getElementsByTagName('SeriesKey');

            if(serieskey.length)
            {
               var skeys = serieskey[0].getElementsByTagName('Value');
               for(var k = 0, kcnt = skeys.length; k < kcnt; k++)
                  keyvals[skeys[k].getAttribute('concept')] = skeys[k].getAttribute('value');
            }
            else
            {
               for(var k = 0, kcnt = serie.attributes.length; k < kcnt; k++)
                  keyvals[serie.attributes[k].name] = serie.attributes[k].value;

               var obs = serie.getElementsByTagName('Obs');
               if(obs.length)
               {
                  for(var k = 0, kcnt = obs[0].attributes.length; k < kcnt; k++)
                     keyvals[obs[0].attributes[k].name] = obs[0].attributes[k].name;
               }
            }

            var keys = {};
            for(var k in settings.sdmx)
            {
               for(var l = 0; l < settings.sdmx[k].length; l++)
               {
                  var kname = settings.sdmx[k][l];
                  if(keyvals.hasOwnProperty(kname))
                     keys[k] = keyvals[kname];
               }
            }

            if(data.aliases && data.aliases[keys.ga])
               keys.ga = data.aliases[keys.ga];

            var values = data.indicators[iid].values;
            if(!values)
               values = data.indicators[iid].values = {};

            if(!values[keys.ga])
               values[keys.ga] = {};

            var obs = serie.getElementsByTagName('Obs');
            var mult = keys.ma ? Math.pow(10, keys.ma) : 1;

            for(var o = 0, ocnt = obs.length; o < ocnt; o++)
            {
               if(serieskey.length)
               {
                  var y = obs[o].getElementsByTagName('Time')[0].textContent;
                  var v = obs[o].getElementsByTagName('ObsValue')[0].getAttribute('value');
               }
               else
               {
                  var y = obs[o].getAttribute(keys.ta);
                  var v = obs[o].getAttribute(keys.va);
               }

               y = y.replace(/-Q?/, '');
               values[keys.ga][y] = +v * mult;
            }
         }
      }
   }

   function parseCube(xml)
   {
      var items = xml.getElementsByTagName('i');
      var groups = {};

      for(var i = 0, icnt = items.length; i < icnt; i++)
      {
         var item = items[i];

         var geo = item.getAttribute('geoitem');
         var goal = item.getAttribute('goal');
         var group = item.getAttribute('group');

         var vals = {};
         for(var c = 0, ccnt = item.childNodes.length; c < ccnt; c++)
         {
            var child = item.childNodes[c];
            vals[child.nodeName] = cell(child);
         }

         if(geo && goal)
         {
            var goalcode = data.indicators[goal];
            var geocode = data.geoitems[geo];

            var values = data.indicators[goalcode].values;
            if(!values)
               values = data.indicators[goalcode].values = {};

            if(!values[geocode])
               values[geocode] = {};

            if(item.getAttribute("geo2"))
            {
               var geo2 = data.geoitems[item.getAttribute("geo2")];
               if(!values[geocode][item.getAttribute('seq')])
                  values[geocode][item.getAttribute('seq')] = {};

               values[geocode][item.getAttribute('seq')][geo2] = parseFloat(vals.value);
            }
            else
               values[geocode][item.getAttribute('seq')] = parseFloat(vals.value);

            if(vals.scale)
            {
               var scale = data.indicators[goalcode].scale;
               if(!scale)
                  scale = data.indicators[goalcode].scale = {};

               if(!scale[geocode])
                  scale[geocode] = {};

               scale[geocode][item.getAttribute('seq')] = {
                  scale: parseFloat(vals.scale),
                     dx: parseFloat(vals.dx),
                     dy: parseFloat(vals.dy)
               };
            }
         }
         else if(group)
         {
            if(item.getAttribute('seq'))
            {
               var gdef = groups[group];

               if(vals.geoitem)
               {
                  if(!data.groups['geoitems'][gdef.code])
                     data.groups['geoitems'][gdef.code] = gdef;

                  if(!gdef['geoitem'])
                     gdef['geoitem'] = [];

                  gdef['geoitem'][item.getAttribute('seq')] = reverseids[vals.geoitem];
               }
               else if(vals.goal)
               {
                  if(!data.groups['indicators'][gdef.code])
                     data.groups['indicators'][gdef.code] = gdef;

                  if(!gdef['goal'])
                     gdef['goal'] = [];

                  gdef['goal'][item.getAttribute('seq')] = reverseids[vals.goal];
               }
            }
            else
            {
               if(vals.geoitem)
               {
                  vals.geoitem = [ reverseids[vals.geoitem] ];
                  data.groups['geoitems'][vals.code] = groups[group] = vals;
               }
               else if(vals.goal)
               {
                  vals.goal = [ reverseids[vals.goal] ];
                  data.groups['indicators'][vals.code] = groups[group] = vals;
               }
               else
                  groups[group] = vals;
            }
         }
         else if(geo)
         {
            if(!data.geoitems)
            {
               loading.geoitems = false;
               data.geoitems = {};
            }

            reverseids[geo] = vals.code;

            if(data.geoitems[vals.code])
            {
               for(var k in vals)
                  if(vals.hasOwnProperty(k))
                     data.geoitems[vals.code][k] = vals[k];
            }
            else
            {
               data.geoitems[vals.code] = vals;
               data.geoitems[geo] = vals.code;

               if(vals.imf)
               {
                  // IMF specific code: map their internal geocodes to ISO3
                  if(!data.imf2geo)
                     data.imf2geo = {};
                  data.imf2geo[vals.imf] = vals.code;
               }
            }
         }
         else if(goal)
         {
            if(!data.indicators)
            {
               loading.indicators = false;
               data.indicators = {};
            }

            reverseids[goal] = vals.code;

            // Legends use sequences
            if(item.getAttribute('seq'))
            {
               var code = data.indicators[goal];
               for(var k in vals)
               {
                  if(!data.indicators[code][k])
                     data.indicators[code][k] = [];
                  data.indicators[code][k][item.getAttribute('seq')] = vals[k];
               }
            }
            else if(vals.code)
            {
               vals.id = goal;

               data.indicators[vals.code] = vals;
               data.indicators[goal] = vals.code;
            }
            else
            {
               var code = data.indicators[goal];
               for(var k in vals)
                  data.indicators[code][k] = vals[k];
            }
         }
         else
            for(var k in vals)
               data.meta[k] = vals[k];
      }
   }

   function parseXLSXML(xml)
   {
      var sheets = xml.getElementsByTagName('s');
      for(var i = 0, cnt = sheets.length; i < cnt; i++)
      {
         var sheet = sheets[i];
         var name = sheet.getAttribute('n').toUpperCase();

         var rows = sheet.getElementsByTagName('r');
         var header = rows[0].getElementsByTagName('c');

         if(name == "GENERAL")
         {
            var col = find(rows[0], settings.language);
            for(var r = 1, rcnt = rows.length; r < rcnt; r++)
            {
               var row = rows[r];
               var cols = row.getElementsByTagName('c');

               if(cols.length)
                  data.meta[cell(cols[0]).toLowerCase()] = cell(cols[col]);
            }
         }
         else if(name == "MENU" || name == "INDICATORS")
         {
            // TBD
         }
         else if(name == "COUNTRIES" || name == "COUNTRYINFO")
         {
            var label = (name == "COUNTRIES" ? "label" : "description");

            if(!data.geoitems)
            {
               loading.geoitems = false;
               data.geoitems = {};
            }

            for(var r = 1, rcnt = rows.length; r < rcnt; r++)
            {
               var row = rows[r];
               var cols = row.getElementsByTagName('c');

               var ccnt = cols.length;
               if(ccnt)
               {
                  var code = cell(cols[0]).toUpperCase();
                  if(!data.geoitems[code])
                     data.geoitems[code] = { code: code };

                  for(var c = 1; c < ccnt; c++)
                  {
                     var l = cell(header[c]);
                     var v = cell(cols[c]);

                     if(l == settings.language)
                        data.geoitems[code][label] = v;
                     // FIXME: distinguish between language codes and e.g. DX/DY
                     else if(l.length != 2)
                        data.geoitems[code][l.toLowerCase()] = v;
                  }
               }
            }
         }
         else if(name.substr(name.length - 5, 5) == "_DATA")
         {
            var code = name.substr(0, name.length - 5);

            if(!data.indicators)
            {
               loading.indicators = false;
               data.indicators = {};
            }

            if(!data.indicators[code])
               data.indicators[code] = {};

            var vals = data.indicators[code].values;
            if(!vals)
               vals = data.indicators[code].values = {};

            var lang = find(rows[0], settings.language);
            if(lang > 0)
               data.indicators[code].geoitems = {};

            for(var r = 1, rcnt = rows.length; r < rcnt; r++)
            {
               var row = rows[r];
               var cols = row.getElementsByTagName('c');

               var geo = cell(cols[0]);
               if(!vals[geo])
                  vals[geo] = {};

               for(var c = 1, ccnt = cols.length; c < ccnt; c++)
               {
                  var year = parseInt(cell(header[c]));
                  if(!isNaN(year))
                     vals[geo][year] = parseFloat(cell(cols[c]));
               }

               if(lang > 0)
               {
                  if(!data.indicators[code].geoitems[geo])
                     data.indicators[code].geoitems[geo] = {};

                  data.indicators[code].geoitems[geo].description = cell(cols[lang]);
               }
            }
         }
         else
         {
            var inlegend = false, min, max, color;
            var lang = find(rows[0], settings.language);

            var tl = cell(header[0]).toUpperCase();
            if(tl == 'INDICATOR')
            {
               if(!data.indicators)
               {
                  loading.indicators = false;
                  data.indicators = {};
               }

               if(!data.indicators[name])
                  data.indicators[name] = { code: name };

               for(var r = 1, rcnt = rows.length; r < rcnt; r++)
               {
                  var row = rows[r];
                  var cols = row.getElementsByTagName('c');

                  if(cols.length)
                  {
                     var item = cell(cols[0]).toLowerCase();
                     if(item == "legend")
                     {
                        inlegend = true;
                        lang = find(row, settings.language);
                        min = find(row, 'MIN');
                        max = find(row, 'MAX');
                        color = find(row, 'COLOR');

                        data.indicators[name].legendlabel = new Array();
                        data.indicators[name].legendcolor = new Array();
                        data.indicators[name].legendminimum = new Array();
                        data.indicators[name].legendmaximum = new Array();
                     }
                     else if(inlegend)
                     {
                        if(cols.length >= 5)
                        {
                           data.indicators[name].legendlabel.push(cell(cols[lang]));
                           data.indicators[name].legendcolor.push(cell(cols[color]));
                           data.indicators[name].legendminimum.push(parseFloat(cell(cols[min])));
                           data.indicators[name].legendmaximum.push(parseFloat(cell(cols[max])));
                        }
                     }
                     else
                        data.indicators[name][item] = cell(cols[lang]);
                  }
               }
            }
         }
      }
   }
};
mw = window.mw || {};

mw.StateManager = function(options)
{
   var state = {};
   var dispatcher = new mw.Dispatcher();

   var settings = mw.support.extend(options || {}, {
      kickstart: true
   });

   this.data = function() {
      return settings.data;
   }

   this.get = function(key) {
      return state[key];
   }

   this.set = function(key, value) {
      if(key instanceof Object)
      {
         for(var i in key)
         {
            if(key.hasOwnProperty(i))
               this.set(i, key[i]);
         }
         return;
      }

      function propagate()
      {
         state[key] = value;
         dispatcher.dispatch(this, key, value);
      }

      if(key == 'indicator')
      {
         if(settings.data instanceof mw.DataManager)
         {
            var that = this;
            state[key] = value;

            var iid = value instanceof Array ? value[0] : value;
            if(iid)
            {
               var iids = value instanceof Array ? value : [ value ];
               var icnt = iids.length;

               function loaded()
               {
                  icnt--;

                  // Do not propagate values from an earlier requested indicator

                  var current = state.indicator instanceof Array ? state.indicator[0] : state.indicator;
                  if(icnt == 0 && current == iid)
                  {
                     propagate();

                     var indic = settings.data.indicators[iid];

                     if(state.year)
                     {
                        var y = mw.support.validateYear(state.year, indic.statistics.frequency);

                        if(y < indic.statistics.range.from)
                           y = indic.statistics.range.from;
                        else if(y > indic.statistics.range.to)
                           y = indic.statistics.range.to;

                        if(y != state.year)
                           that.set('year', y);
                     }
                     else if(settings.kickstart)
                     {
                        if(indic.startyear)
                           that.set('year', indic.startyear);
                        else if(settings.data.meta.default_year)
                           that.set('year', settings.data.meta.default_year);
                        else if(indic.statistics.range.to > 0)
                           that.set('year', indic.statistics.range.to);
                     }
                  }
               }

               for(var i = 0; i < iids.length; i++)
                  settings.data.load(iids[i], loaded);
            }
            else
               propagate();
         }
         else
            propagate();
      }
      else
         propagate();
   }

   this.listen = function(key, callback) {
      dispatcher.register(key, callback);
   }

   this.unlisten = function(key, callback) {
      dispatcher.remove(key, callback);
   }

   if(settings.data)
   {
      if(typeof settings.data == "string")
         settings.data = new mw.DataManager({ data: settings.data });

      if(settings.data instanceof mw.DataManager)
      {
         var that = this;
         settings.data.listen('ready', function() {
            if(settings.kickstart && !state.indicator)
            {
               if(settings.data.meta.default_indicator)
                  that.set('indicator', settings.data.meta.default_indicator)
               else if(settings.data.meta.default_ind)
                  that.set('indicator', settings.data.meta.default_ind);
               else for(id in settings.data.indicators)
               {
                  that.set('indicator', id);
                  break;
               }
            }
         });
      }
   }
}
mw = window.mw || {};

mw.Slider = function(element, options)
{
   var me;
   var node;                                                // DOM node to put slider in
   var handles = [];                                        // DOM nodes for slider handles
   var bar;                                                 // DOM node for bar between handles
   var labels;                                              // DOM node for labels
   var zoomin, zoomout;
   var dragging;

   var hasTouch = 'ontouchstart' in document.documentElement || navigator.maxTouchPoints > 0;
   var transformAttr;                                       // Name of CSS property to use for transforms

   var currentVal;                                          // Current values
   var lastVal;                                             // Values when last triggered

   var range;                                               // Valid width of slider in value units
   var ppVal;                                               // Pixels per value unit
   var maxPerc;                                             // Rightmost position of handle in percentage of parent
   var minPos,maxPos;                                       // Left/rightmost position of handle in pixels
   var lastHandlePos;
   var lastEventPos;

   var triggerTimer = null;                                 // Propagate new value after slight delay
   var dispatcher = new mw.Dispatcher();

   var settings = mw.support.extend(options || {}, {
      orientation: "horizontal",
      handle: "<div class='slider-handle'>{VAL}</div>",     // HTML fragment to use for slider handle
      handles: 1,                                           // Number of handles (1 or 2)
      inverted: false,                                      // Do right-to-left or bottom-to-top
      sticky: false,
      range: {
         minimum: 1980,
         maximum: 2010,
         step: 1
      },
      trigger: {
         delay: null
      },
      padding: {
         before: 0,
         after: 0
      },
      percentages: false,
      labels: {
         multiples: false,
         number: false,
         every: false,
         minor: true,
         quarters: [ 'Q1', 'Q2', 'Q3', 'Q4' ],
         months: [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ]
      }
   });

   node = typeof element == "string" ? document.getElementById(element) : element;

   // Find a supported CSS transform attribute
   var prefixes = 'transform WebkitTransform MozTransform OTransform msTransform'.split(' ');
   var el = document.createElement('div');
   for(var i = 0; i < prefixes.length; i++)
      if(el.style[prefixes[i]] != undefined)
         break;
   transformAttr = prefixes[i];

   node.className += ' slider slider-' + settings.orientation;

   if(node.currentStyle)
      var p = node.currentStyle.position;
   else if(window.getComputedStyle)
      var p = document.defaultView.getComputedStyle(node, null).getPropertyValue('position');

   if(p == 'static' || p == '')
      node.style.position = 'relative';

   if(settings.handle)
      node.innerHTML = settings.handle.replace(/{VAL}/, '<span class="slider-value"></span>');
   else
      settings.handles = 0;

   for(var h = 0; h < settings.handles; h++)
   {
      if(h)
         node.appendChild(node.firstChild.cloneNode(true));

      handles.push(node.childNodes[h]);

      handles[h].style.position = 'absolute';
      handles[h].style.cursor = 'pointer';
      handles[h].setAttribute('data-handle', '');
   }

   if(handles.length > 1)
   {
      bar = document.createElement('div');
      bar.className = 'slider-bar';
      bar.style.position = 'absolute';
      bar.style.cursor = 'pointer';

      node.insertBefore(bar, handles[1]);
   }

   node.setAttribute('data-frequency', settings.range.step);

   if(settings.percentages)
      settings.padding = { before: 0, after: 0 };

   labels = document.createElement('div');
   labels.className = 'slider-labels';

   node.insertBefore(labels, node.firstChild);

   zoomin = document.createElement('div');
   zoomin.className = 'slider-button zoom-in';

   zoomout = document.createElement('div');
   zoomout.className = 'slider-button zoom-out';

   node.insertBefore(zoomin, node.firstChild);
   node.insertBefore(zoomout, node.firstChild);

   if(settings.handles == 1)
   {
      if(hasTouch)
      {
         mw.support.attachEvent(zoomin, 'touchstart', onZoomStep);
         mw.support.attachEvent(zoomout, 'touchstart', onZoomStep);
      }
      mw.support.attachEvent(zoomin, 'mousedown', onZoomStep);
      mw.support.attachEvent(zoomout, 'mousedown', onZoomStep);
   }

   currentVal = [ settings.value || settings.handles == 1 ? settings.range.maximum : settings.range.minimum, settings.range.maximum ];

   for(var h = 0; h < settings.handles; h++)
   {
      if(settings.range.step == 'M' || settings.range.step == 'Q')
         currentVal[h] = mw.support.validateYear(currentVal[h], settings.range.step);

      if(hasTouch)
         mw.support.attachEvent(handles[h], 'touchstart', onStartDrag);
      mw.support.attachEvent(handles[h], 'mousedown', onStartDrag);

      if(bar)
      {
         if(hasTouch)
            mw.support.attachEvent(bar, 'touchstart', onStartDrag);
         mw.support.attachEvent(bar, 'mousedown', onStartDrag);
      }
   }

   setRange(settings.range.minimum, settings.range.maximum, settings.range.step)

   // Public methods
   return me = {
      range: function(min, max, step) {
         if(!min && !max && !step)
            return settings.range;
         else
            setRange(min, max, step);
      },

      value: function() {
         return settings.handles == 1 ? currentVal[0] : currentVal;
      },

      set: function(val) {
         if(dragging)
            return;

         if(!(val instanceof Array))
         {
            if(settings.handles == 1)
               val = [ val, currentVal[1] ];
            else
               val = [ currentVal[0], val ];
         }

         if(currentVal.join(',') != val.join(','))
         {
            currentVal = val.slice();
            lastVal = val.slice();

            update();
         }
      },

      listen: function(what, callback) {
         dispatcher.register(what, callback);
      },

      unlisten: function(what, callback) {
         dispatcher.remove(what, callback);
      },

      destroy: function() {
         for(var h = 0; h < settings.handles; h++)
         {
            mw.support.removeEvent(handles[h], 'touchstart', onStartDrag);
            mw.support.removeEvent(handles[h], 'mousedown', onStartDrag);
         }

         if(settings.handles == 1)
         {
            mw.support.removeEvent(zoomin, 'touchstart', onZoomStep);
            mw.support.removeEvent(zoomout, 'touchstart', onZoomStep);
            mw.support.removeEvent(zoomin, 'mousedown', onZoomStep);
            mw.support.removeEvent(zoomout, 'mousedown', onZoomStep);
         }

         node.parentNode.removeChild(node);
         dispatcher.destroy();

         // Tony: removed for strict mode (consequences?) delete node;
      }
   };

   // Private methods
   function update()
   {
      for(var h = 0; h < settings.handles; h++)
         currentVal[h] = Math.min(settings.range.maximum, Math.max(settings.range.minimum, currentVal[h]));

      if(settings.handles == 1)
      {
         zoomin.className = zoomin.className.replace(' slider-button-disabled', '');
         if(settings.handles == 1)
         {
            if(currentVal[0] == settings.range.maximum)
               zoomin.className += ' slider-button-disabled';

            zoomout.className = zoomout.className.replace(' slider-button-disabled', '');
            if(currentVal[0] == settings.range.minimum)
               zoomout.className += ' slider-button-disabled';
         }
      }

      setLabel();
      if(settings.handle)
         alignHandle();
   }

   function setRange(min, max, step)
   {
      step = step === undefined ? 1 : step;

      settings.range.minimum = parseInt(min);
      settings.range.maximum = parseInt(max);
      settings.range.step = step;

      for(var h = 0; h < settings.handles; h++)
         currentVal[h] = Math.min(max, Math.max(min, currentVal[h]));

      if(step == 'Q')
         range = 4 * (Math.floor(max / 10) - Math.floor(min / 10)) + (max % 10) - (min % 10);
      else if(step == 'M')
         range = 12 * (Math.floor(max / 100) - Math.floor(min / 100)) + (max % 100) - (min % 100);
      else
         range = settings.range.maximum - settings.range.minimum;

      node.className = node.className.replace(' slider-handle-fixed', '');
      node.setAttribute('data-frequency', step);

      node.setAttribute('data-min', settings.range.minimum);
      node.setAttribute('data-max', settings.range.maximum);

      update();
      updateLabels();
   }

   function updateLabels()
   {
      var r = '';

      function add(l, v, major)
      {
         r += '<div class="slider-label';
         if(v == settings.range.minimum)
            r += ' first';
         else if(v == settings.range.maximum)
            r += ' last';

         if(!major && settings.labels.minor)
            r += ' minor';

         r += '" style="position: absolute; left: ';

         var p = range == 0 ? 1 : val2delta(v);
         if(settings.percentages)
            r += (p / range * maxPerc) + '%';
         else
            r += (p * ppVal + settings.padding.before) + 'px';

         r += '">' + (major ? l : '') + '</div>';
      }

      if(settings.labels.values)
      {
         for(var i in settings.labels.values)
            add(settings.labels.values[i], settings.labels.values[i], true);
      }
      else if((settings.labels.number || settings.labels.every) && settings.range.minimum < settings.range.maximum)
      {
         var min = settings.range.minimum;
         var max = settings.range.maximum;
         var freq = step = settings.range.step;

         if(freq == 'Q')
         {
            min = Math.floor(min / 10);
            max = Math.floor(max / 10);
            freq = 4;
         }
         else if(freq == 'M')
         {
            min = Math.floor(min / 100);
            max = Math.floor(max / 100);
            freq = 12;
         }

         var every = settings.labels.number ? range / (settings.labels.number - 1) : settings.labels.every;
         for(var y = min; Math.round(y) <= max; y++)
         {
            for(var f = 1; f <= freq; f++)
            {
               var l = Math.round(y), v = l, major;
               if(step == 'M' || step == 'Q')
               {
                  v += (step == 'M' && f < 10 ? '0' : '') + f;
                  major = f == 1;
               }
               else
                  major = Math.floor((l - settings.range.minimum) % every) == 0 || (!settings.labels.multiple && l == settings.range.maximum);

               if(v <= settings.range.maximum)
                  add(l, v, major)
            }
         }
      }

      labels.innerHTML = r;
   }

   function setLabel()
   {
      if(settings.handles == 1)
         node.setAttribute('data-value', currentVal[0]);
      else
      {
         node.setAttribute('data-value-min', currentVal[0]);
         node.setAttribute('data-value-max', currentVal[1]);
      }

      for(var h = 0; h < settings.handles; h++)
      {
         var span = handles[h].querySelector('span.slider-value');
         if(!span)
            continue;

         if(isNaN(currentVal[h]))
            span.innerHTML = '';
         else if(settings.labels.format instanceof Function)
            span.innerHTML = settings.labels.format(currentVal[h]);
         else if(settings.range.step == 'Q')
         {
            var y = Math.floor(currentVal[h] / 10);
            var q = cv % 10;
            span.innerHTML = settings.labels.quarters[q - 1] + ' ' + y;
         }
         else if(settings.range.step == 'M')
         {
            var y = Math.floor(currentVal[h] / 100);
            var m = currentVal[h] % 100;

            span.innerHTML = settings.labels.months[m - 1] + ' ' + y;
         }
         else
            span.innerHTML = currentVal[h];
      }
   }

   function val2delta(v)
   {
      if(settings.range.step == 'Q' || settings.range.step == 'M')
      {
         var f = settings.range.step == 'Q' ? 4 : 12;
         var d = settings.range.step == 'Q' ? 10 : 100;

         return f * (Math.floor(v / d) - Math.floor(settings.range.minimum / d)) + (v % d) - (settings.range.minimum % d);
      }
      else
         return v - settings.range.minimum;
   }

   function alignBar()
   {
      if(bar)
      {
         var sp = settings.orientation == "horizontal" ? "left" : "top";
         bar.style[sp] = handles[0].style[sp];

         if(dragging == bar)
            handles[1].style[sp] = 'calc(' + handles[0].style[sp] + ' + ' + bar.style.width + ')';
         else
            bar.style.width = 'calc(' + handles[1].style[sp] + ' - ' + handles[0].style[sp] + ')';
      }
   }

   function alignHandle()
   {
      var horizontal = settings.orientation == "horizontal";
      var ss = parseInt(horizontal ? node.clientWidth : node.clientHeight);

      if(!ss)
      {
         setTimeout(alignHandle, 150);
         return;
      }

      if(dragging && !settings.sticky)
         return;

      for(var h = 0; h < settings.handles; h++)
      {
         var handle = handles[h];
         var hs = parseInt(horizontal ? handle.clientWidth : handle.clientHeight);

         // If scrollbar size is less than handle size, we've not rendered yet
         // Try again later
         if(!hs || ss < hs)
         {
            setTimeout(alignHandle, 150);
            return;
         }

         var sp = horizontal ? "left" : "top";
         var v = val2delta(currentVal[h]);
         var p = v / range;

         if(settings.inverted)
         {
            p = 1 - p;
            v = settings.range.maximum - currentVal[h];
         }

         var mp = (ss - hs) / ss * 100;
         if(mp != maxPerc)
         {
            maxPerc = mp;
            update();
         }

         ppVal = ss - hs - settings.padding.after;

         node.className = node.className.replace(' slider-handle-fixed', '');
         if(settings.range.minimum == settings.range.maximum)
         {
            v = p = 1;
            node.className += ' slider-handle-fixed';
         }
         else
            ppVal /= range;

         if(settings.percentages)
            handle.style[sp] = (p * maxPerc) + "%";
         else
            handle.style[sp] = (v * ppVal + settings.padding.before) + "px";
      }

      alignBar();
      updateLabels();
   }

   function trigger()
   {
      if(!lastVal || lastVal.join(',') != currentVal.join(','))
      {
         lastVal = currentVal.slice();
         dispatcher.dispatch(me, "update", settings.handles == 1 ? currentVal[0] : currentVal);
      }
   }

   function onZoomStep(e)
   {
      e = e || window.event;
      var target = e.target || e.srcElement;

      currentVal[0] += (target == zoomin ? 1 : -1);
      currentVal[0] = Math.min(Math.max(currentVal[0], settings.range.minimum), settings.range.maximum);

      update();
      trigger();

      mw.support.preventDefault(e);
   }

   function onStartDrag(e)
   {
      if(settings.range.minimum == settings.range.maximum)
         return;

      e = e || window.event;

      alignHandle();

      var target = e.target || e.srcElement;
      if(target == bar)
         dragging = bar;
      else for(dragging = target; !dragging.hasAttribute('data-handle'); dragging = dragging.parentNode)
         ;

      var handle = target == bar ? handles[0] : dragging;
      var horizontal = settings.orientation == "horizontal";

      var ss = parseInt(horizontal ? node.clientWidth : node.clientHeight);
      var hs = parseInt(horizontal ? handle.clientWidth : handle.clientHeight);
      var sp = horizontal ? "left" : "top";
      var ep = horizontal ? "X" : "Y";

      if(e.touches && e.touches.length)
         lastEventPos = e.touches[0]["client" + ep];
      else
         lastEventPos = (e["page" + ep] ? e["page" + ep] : e["client" + ep]);

      minPos = settings.padding.before;
      if(settings.handles == 2 && handle == handles[1])
         minPos = handles[0].offsetLeft + hs;

      maxPos = ss - hs + settings.padding.before;
      if(settings.handles == 2 && target == bar)
         maxPos = Math.min(maxPos, ss - handles[1].offsetLeft + handles[0].offsetLeft - hs);
      else if(settings.handles == 2 && handle == handles[0])
         maxPos = Math.min(maxPos, handles[1].offsetLeft - hs);

      if(settings.percentages)
      {
         lastHandlePos = parseFloat(handle.style[sp]) / 100 * ss;
         maxPos += 5;
      }
      else
         lastHandlePos = parseFloat(handle.style[sp]);

      // During drag, use pixels
      handle.style[sp] = lastHandlePos + "px";
      if(target == node)
      {
         var o = mw.support.offset(node);

         lastHandlePos = -hs / 2;
         lastEventPos = o[horizontal ? "left" : "top"];

         onDrag(e);
         alignHandle();
      }
      else if(e.touches && e.touches.length)
      {
         mw.support.attachEvent(document, 'touchmove', onDrag);
         mw.support.attachEvent(document, 'touchend', onEndDrag);
         dragging.className += ' slider-handle-active';
      }
      else
      {
         mw.support.attachEvent(document, 'mousemove', onDrag);
         mw.support.attachEvent(document, 'mouseup', onEndDrag);
         mw.support.attachEvent(document, 'selectstart', mw.support.preventDefault);
         dragging.className += ' slider-handle-active';
      }

      mw.support.preventDefault(e);
   }

   function onDrag(e)
   {
      e = e || window.event;

      var handle = dragging == bar ? handles[0] : dragging;
      var horizontal = settings.orientation == "horizontal";

      var ss = parseInt(horizontal ? node.clientWidth : node.clientHeight);
      var hs = parseInt(horizontal ? handle.clientWidth : handle.clientHeight);
      var sp = horizontal ? "left" : "top";
      var ep = horizontal ? "X" : "Y";

      var p = lastHandlePos - lastEventPos;
      if(e.touches && e.touches.length)
         p += e.touches[0]["client" + ep];
      else
         p += e["page" + ep] ? e["page" + ep] : e["client" + ep];

      p = Math.max(minPos, Math.min(p, maxPos + 1));

      handle.style[sp] = p + "px";
      if(settings.sticky)
         alignHandle();
      alignBar();

      if(settings.inverted)
         p = Math.max(0, ss - hs - p);

      var f = settings.range.step == 'Q' ? 4 : 12;
      var d = settings.range.step == 'Q' ? 10 : 100;

      var val = (p + 0.5 * ppVal - settings.padding.before) / ppVal;
      if(settings.range.step == 'Q' || settings.range.step == 'M')
      {
         var r = String(Math.floor(val % f) + 1);
         if(f == 12 && r < 10)
            r = '0' + r;
         val = Math.floor(settings.range.minimum / d) +  Math.floor(val / f) + r;
      }
      else
         val = Math.floor(val + settings.range.minimum);

      val = Math.min(val, settings.range.maximum);

      if(!settings.labels.values || settings.labels.values[val])
      {
         var hi = handles.indexOf(handle);
         if(val != currentVal[hi])
         {
            if(dragging == bar)
            {
               if(settings.range.step == 'Q' || settings.range.step == 'M')
               {
                  var y1 = Math.floor(currentVal[0] / d);
                  var y2 = Math.floor(currentVal[1] / d);
                  var r1 = Math.floor(currentVal[0] % d);
                  var r2 = Math.floor(currentVal[1] % d);
                  var yc = Math.floor(val / d);
                  var rc = Math.floor(val % d);

                  currentVal[1] = yc + y2 - y1;

                  if(r1 > r2)
                     currentVal[1] -= 1;

                  var rd = (r2 > r1 ? r2 - r1 : r2 + f - r1);
                  var rn = rc + rd;
                  if(rn > 12)
                  {
                     currentVal[1] += 1;
                     rn = rn % f;
                  }

                  currentVal[1] = String(currentVal[1]) + (f == 12 && rn < 10 ? '0' : '') + rn;
               }
               else
                  currentVal[1] = val + currentVal[1] - currentVal[0];
            }

            currentVal[hi] = val;

            setLabel();

            if(triggerTimer)
               clearTimeout(triggerTimer);

            var delay = settings.trigger.delay;
            // Set trigger delay depending on rough performance estimate
            if(delay === null)
               delay = mw.performance > 40 ? 500 : 0;

            triggerTimer = setTimeout(trigger, delay);
         }
      }

      mw.support.preventDefault(e);
   }

   function onEndDrag(e)
   {
      e = e || window.event;

      dragging.className = dragging.className.replace(' slider-handle-active', '');

      if(e.type == 'touchend')
      {
         mw.support.removeEvent(document, 'touchmove', onDrag);
         mw.support.removeEvent(document, 'touchend', onEndDrag);
      }
      else
      {
         mw.support.removeEvent(document, 'mousemove', onDrag);
         mw.support.removeEvent(document, 'mouseup', onEndDrag);
         mw.support.removeEvent(document, 'selectstart', mw.support.preventDefault);
      }

      dragging = false;
      alignHandle();

      if(triggerTimer)
         clearTimeout(triggerTimer);
      trigger();

      mw.support.preventDefault(e);
   }
}
/*
TODO:
- browser resize: allow resize map
- highlight country by dropshadow
- hover label align (randen van map)
- use SVG as primary drawing format for layers

FIXME:
- clean up (almost) indentical code for canvas hit-test detection in map, circles and arrows
- idem, hover/click detection
- base canvas and vml drawing function on some common class?
*/

mw = window.mw || {};

mw.Map = function(element, options)
{
   var me;
   var node;                                          // DOM node to put map in
   var container;                                     // Container for the maplayers above the actual map
   var bcontainer;                                    // Container for the maplayers below the actual map
   var map;                                           // DIV containing actual map items

   var statemanager;
   var datamanager;

   var mapdata;                                       // Copy of map data, for when map is being resized
   var mapready = false;                              // Is map ready for external calls?
   var dataready = true;                              // If datamanager, is it ready? TRUE if no datamanager

   var hasTouch = 'ontouchstart' in document.documentElement || navigator.maxTouchPoints > 0;           // Use touch handlers?
   var ie9 = navigator.userAgent.match(/MSIE 9/);     // Work around bug in event targets
   var transformAttr;                                 // Name of CSS property to use for transforms
   var has3dTransform = false;

   var draw;                                          // Function used to draw map
   var coord2geo;                                     // Function used to map x,y to id

   var hasCanvas;                                     // Use canvas?
   var canvas;                                        // Canvas and drawing context
   var ctx;

   var zoomctx;                                       // Secondary canvas context used for fast zoom/pan

   var hitctx;                                        // Canvas context for mouse hit tests
   var hitmap = {};                                   // Map from hitctx color value to ID
   var lasthit;                                       // Keep track of last hit item

   var hasVML;                                        // Use VML?

   var borders = [];                                  // Array containing all borders, as { geo1, geo2, coords }
   var geoitems = {};                                 // Object containing all countries and their data
   var regions = {};                                  // Object with values for non-map-items (e.g. regions)
   var idlist = [ [], [], [], [], [], [] ];           // Array of geoitem IDs in use, per map level
   var currentIndicator;                              // If using a datamanager, the current indicator ID
   var currentYear;                                   // If using data with years, the year to use

   var dynamiccolors;

   var minYear, maxYear;                              // Range of available years for animations
   var playTimer;                                     // If animating, active timer

   var resized = false;                               // Either FALSE or ID of resize indicator
   var resizing = false;                              // Whether the map is currently resizing
   var resizeStep = 1;                                // When resizing, current fraction of animation
   var tickHandler;                                   // Function used for updating a resize animation

   var regionmode = 0;                                // Current map level (0 = geoitems, 1+ = regions)
   var explodecnt = 0;
   var exploded = {};                                 // Set of exploded regions

   var zoomslider;
   var lastzoom;
   var maxzoom;                                       // Maximum real zoom level (==settings.zoom.maximum for linear, or 2^max else)

   var offsetX = 0, offsetY = 0;                      // Translation of map
   var mapX = 0, mapY = 0;                            // Zoom-in location on map
   var lastX = 0, lastY = 0;                          // Last position on the screen (to determine drag distances)
   var scale = 1;                                     // Scaling factor for map
   var currentScale = 1;                              // Scale during zoom

   var lasthover;                                     // Last hovered item

   var bigMap = false;                                // Do we need to switch to hw-accelarated map?
   var mouseevents = true;                            // Are we allowed to handle mouse events?
   var panning = false;                               // Did touch start result in a pan or a click?
   var zooming = false;                               // Are we zooming using gestures?
   var coloronzoomend = null;                         // Was color() called during pan or zoom?
   var startDist;                                     // Helper var to polyfill gesturechange

   var locked = false;

   var shortlongTimer;                                // Timers to distinguish short, long and double touch taps
   var doubleclickTimer;

   var dispatcher = new mw.Dispatcher();
   var layerevents = {
      mouseout: [],
      mouseover: [],
      mousedown: [],
      mousemove: [],
      mouseup: [],
      mousewheel: [],
      touchstart: [],
      touchend: []
   };

   var userSelectAttr;                                // User select CSS property to use, if any
   var userSelectVal;                                 // Original value

   var projection;                                    // Optional projection function

   var editing;                                       // In edit mode ?
   var editlasthighlight;
   var editselection = {};
   var editdxdy = {};
   var editcaption = 'Ctrl-click to toggle single countries, drag rectangles for multi-select.';

   var settings = mw.support.extend(options || {}, {
      map: {                                          // Map data settings
         url: 'map.xml',                              // URL of data file (either .json or .xml)
         offset: { x: 0, y: 0 },                      // Offset to add to coordinates in map file
         scale: null,                                 // Scalefactor for coordinates in map file
         nodata: '#d5d7da',
         noregion: '#d5d7da',
         selected: '#39b852',
         opacity: 1,
         padding: 0,
         fillgaps: false,
         resize: false,
         retina: false,
         aspect: true,
         bounds: "all"                                // One of "all" or "scale"
      },
      state: {
         manager: false,
         data: false,
         indicator: true,
         year: true,
         geoitem: true
      },
      circles: true,                                  // If TRUE, draw circles for geoitems resized to zero size
      latest: false,                                  // If TRUE and using the default coloring based on legend values, use the latest year with a value for years without value
      explode: {
         siblings: '#d5d7da'                          // Color of sibling of exploded regions
      },
      borders: {                                      // Border definitions
         width: 1,
         color: '#ffffff',
         patterns: {
            DISP_UNR: [1, 1],
            DISP_UNL: [0.2, 0.2],
            DISP_IMR: [1, 1],
            DISP_IML: [0.2, 0.2]
         }
      },
      busy: null,                                     // TRUE to use default busy indicator, FALSE if no busy indicator,
                                                      // or DOM node for custom one. The default indicator is a <div> with
                                                      // @id='busy', added to <body> of HTML. Default setting (null)
                                                      // will evaluate to TRUE if map creates own datamanager, else FALSE
      layers: [],                                     // Array of layers to add to map
      zoom: {                                         // Zoom settings. Set handle to false to disable
         handle: "<div class='slider-handle'></div>", // HTML fragment to use for slider handle
         minimum: 1,
         maximum: 5,                                  // Maximum zoom level
         padding: {                                   // For zoom-to-geoitem, padding to keep at end
            x: 10,
            y: 10
         },
         type: 'linear',                              // One of 'linear' or 'exponential' -- increment zoom linearly of by factors of 2 respectively
         wheel: true,                                 // Whether to allow zoom using mouse wheel
         touch: true,                                 // Whether to allow any touch gestures (pan, zoom)
         pinch: true                                  // Whether to allow zoom using pinch gestures
      },
      center: null,                                   // Optional callback for providing center points of unknown (non-map) geoitems
      speed: {
         play: 5,                                     // Duration of a play animation
         resize: 3,                                   // Duration of a resize animation
         zoom: 1                                      // Duration of zoom-to-country animation
      },
      events: {                                       // Which events to trigger
         hover: "follow",                             // Either false (off) or one of 'follow' or 'center'
         click: true,                                 // Either false (off) or true (on, trigger event) or
                                                      // 'zoom', in which case the selected item is zoomed to
         touch: "hover click" ,                       // If both hover and click are registered, define which
                                                      // is used for short and long touches
         move: false                                  // Assign callback for when using edit mode of map; gets called for each geoitem which has moved during edit
      },
      'export': {
         renderer: 'https://www.mappingworlds.nl/export/',
                                                      // PNG renderer to use (will also allow download of SVG)
         size: undefined,                             // Optional page size overrides -- allowed formats are like "1280", "1000x400", "1280@2"
         delay: 1,                                    // Delay before chart is rendered on server (to accomodate animations, etc)
         template: undefined,                         // Optional template to wrap chart in (PNG and XLS only)
         selector: undefined,                         // Optional querySelector() compatible selector for getting content from template (PNG)
         parameters: {                                // Optional search/replace parameters for template (use {NAME} in template, and set name: "value" here)
         }
      }
   });

   if(options.borders instanceof Array)
      settings.borders = options.borders;

   expandBorderSettings();

   node = typeof element == "string" ? document.getElementById(element) : element;

   // Test for canvas support
   var elem = document.createElement('canvas');
   hasCanvas = !!(elem.getContext && elem.getContext('2d'));

   // Test for VML support
   var elem = document.body.appendChild(document.createElement('div'));
   elem.innerHTML = '<v:shape id="vml_flag1" adj="1" />';

   var child = elem.firstChild;
   child.style.behavior = "url(#default#VML)";
   hasVML = child ? typeof child.adj == "object" : true;
   elem.parentNode.removeChild(elem);

   // Find a supported CSS transform attribute, and test for 3D support
   var prefixes = {
      webkitTransform: '-webkit-transform',
      OTransform: '-o-transform',
      msTransform: '-ms-transform',
      MozTransform: '-moz-transform',
      transform: 'transform'
   };

   var el = document.createElement('div');
   document.body.insertBefore(el, null);

   for(var p in prefixes)
   {
      if(el.style[p] != undefined)
      {
         el.style[p] = "translate3d(1px,1px,1px)";

         var pv = window.getComputedStyle(el).getPropertyValue(prefixes[p]);
         has3dTransform = (pv !== undefined && pv.length > 0 && pv !== "none");

         break;
      }
   }
   document.body.removeChild(el);

   transformAttr = p;

   // Try and see if can disable user select
   var prefixes = 'userSelect WebkitUserSelect MozUserSelect'.split(' ');
   for(var i = 0; i < prefixes.length; i++)
      if(el.style[prefixes[i]] != undefined)
         break;
   userSelectAttr = prefixes[i];

   if(userSelectAttr)
      userSelectVal = document.getElementsByTagName('body')[0].style[userSelectAttr];

   // Find most appropiate tick handler
   if(window.requestAnimationFrame)
      tickHandler = window.requestAnimationFrame;
   else if(window.webkitRequestAnimationFrame)
      tickHandler = window.webkitRequestAnimationFrame;
   else if(window.mozRequestAnimationFrame)
      tickHandler = window.mozRequestAnimationFrame;
   else if(window.msRequestAnimationFrame)
      tickHandler = window.msRequestAnimationFrame;
   else
      tickHandler = function(cb) { setTimeout(cb, 30); };

   if(!hasCanvas && !hasVML)
   {
      node.innerHTML = "This browser supports neither &lt;canvas&gt; nor VML."
      return;
   }
   else
   {
      node.className += ' map-loading';

      bcontainer = document.createElement('div');
      bcontainer.style.position = 'absolute';
      bcontainer.style.top = 0;
      bcontainer.style.width = '100%';
      bcontainer.style.height = '100%';
      bcontainer.style.display = 'none';

      node.appendChild(bcontainer);

      container = document.createElement('div');
      container.style.position = 'relative';
      container.style.width = '100%';
      container.style.height = '100%';
      container.className = 'map-wrapper map-zoom-1';
      if(hasTouch)
      {
         container.className += ' has-touch';

         mw.support.attachEvent(window, 'touchstart', function detectActualTouch() {
            container.className += ' has-touched';
            mw.support.removeEvent(window, 'touchstart', detectActualTouch);
         });
      }

      if(!hasCanvas && hasVML)
      {
         if(settings.events.hover == "center")
            settings.events.hover = "follow";
         if(settings.zoom)
            container.style.overflow = "hidden";
      }

      node.appendChild(container);

      map = document.createElement('div');
      map.style.position = 'relative';
      map.style.width = '100%';
      map.style.height = '100%';
      map.className = 'map-container';

      if(settings.map.retina)
      {
         map.style[transformAttr] = 'scale(' + (1 / settings.map.retina) + ')';
         map.style[transformAttr + "Origin"] = '0 0';
      }
      else
         map.style.overflow = 'hidden';

      container.appendChild(map);

      // Layers based on canvas block all mouse events, so let them
      // listen to our events instead
      for(type in layerevents)
         mw.support.attachEvent(container, type, dispatchToLayer);

      if(settings.events.hover)
      {
         layerevents['mouseout'].push(doHover);
         layerevents['mousemove'].push(doHover);
      }

      if(hasTouch)
      {
         var lastPos;

         layerevents['touchstart'].push(function(event) {
            if(zooming || panning)
               return;

            if(doubleclickTimer)
            {
               var newPos = mw.support.mousepos(event);
               if(Math.abs(lastPos.x - newPos.x) < 20 && Math.abs(lastPos.y - newPos.y) < 20)
               {
                  doubleclickTimer = null;
                  doClick(event);
                  return;
               }
            }

            lastPos = mw.support.mousepos(event);

            doubleclickTimer = setTimeout(function() {
               doubleclickTimer = null;
            }, 2000);

            shortlongTimer = setTimeout(function() {
               if(zooming || panning)
                  return;

               // Long click
               if(settings.events.hover && settings.events.click)
               {
                  if(settings.events.touch.split(' ')[0] == "hover")
                     doClick(event);
                  else
                     doHover(event);
               }
               else if(settings.events.click)
                  doClick(event);
               else if(settings.events.hover)
                  doHover(event);

               if(settings.zoom && settings.zoom.touch === false)
                  mw.support.preventDefault(event);

               shortlongTimer = null;
            }, 1000);
         });

         layerevents['touchend'].push(function(event) {
            if(zooming || panning)
               return;

            if(shortlongTimer)
            {
               // Short click
               if(settings.events.hover && settings.events.click)
               {
                  if(settings.events.touch.split(' ')[0] == "click")
                     doClick(event);
                  else
                     doHover(event);
               }
               else if(settings.events.click)
                  doClick(event);
               else if(settings.events.hover)
                  doHover(event);
            }

            if(settings.zoom && settings.zoom.touch === false)
               mw.support.preventDefault(event);

            clearTimeout(shortlongTimer);
            shortlongTimer = null;
         });
      }
   }

   if(hasCanvas)
   {
      draw = drawCanvas;
      coord2geo = coordCanvas;

      canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style[transformAttr + "Origin"] = "0 0";
      transform(1, 0, 0, false);

      ctx = canvas.getContext('2d');
      ctx.lineWidth = 1;

      map.appendChild(canvas);

      // Canvas mode uses a hidden canvas for hit testing mouse events:
      // each country is drawn in a distinct color, making a quick lookup
      // possible
      var hc = document.createElement('canvas');
      hitctx = hc.getContext('2d');
      hitctx.lineWidth = 0;

      // To be able to quickly zoom/pan without having a huge canvas during zoom
      // keep a copy of the 1:1 map, which will be scaled when starting a zoom
      var zc = document.createElement('canvas');
      zoomctx = zc.getContext('2d');

      hc.width = settings.map.width || map.clientWidth || map.offsetWidth;
      hc.height = settings.map.height || map.clientHeight || map.offsetHeight;

      var f = settings.map.retina || 1;
      canvas.width = zc.width = f * hc.width;
      canvas.height = zc.height = f * hc.height;

      if(settings.map.resize)
      {
         var resizetimer;

         mw.support.attachEvent(window, 'resize', function() {
            clearTimeout(resizetimer);

            // If map is hidden on resize, do not listen
            var width = f * (map.clientWidth || map.offsetWidth);
            if(width == 0 || width == canvas.width)
               return;

            resizetimer = setTimeout(resizeMap, 100);
         });
      }
   }
   else if(hasVML)
   {
      draw = drawVML;
      coord2geo = coordVML;

      if(document.namespaces)
         document.namespaces.add('v', 'urn:schemas-microsoft-com:vml', "#default#VML");

      var s = document.createElement('style');
      s.setAttribute('type', 'text/css');
      document.getElementsByTagName('head')[0].appendChild(s);

      var css = "v\\:* { behavior: url(#default#VML); }";
      if(s.styleSheet && !s.sheet)
         s.styleSheet.cssText = css;
      else
         s.appendChild(document.createTextNode(css));

      if(settings.map.resize)
      {
         var resizetimer;
         mw.support.attachEvent(window, 'resize', function() {
            clearTimeout(resizetimer);

            resizetimer = setTimeout(function() {
               scaleMapData(false);
               map.innerHTML = '';
               drawVML();

               dispatcher.dispatch(me, "size", { width: map.clientWidth || map.offsetWidth, height: map.clientHeight || map.offsetHeight });
            }, 100);
         });
      }
   }

   // Zoom handlers
   if(hasTouch && settings.zoom && settings.zoom.touch)
      mw.support.attachEvent(map, 'touchstart', onTouchStart);
   else
      container.className += ' touch-disabled';

   if(settings.zoom && settings.zoom.wheel)
      layerevents['mousewheel'].push(onMouseWheel);

   layerevents['mousedown'].push(onMouseDown);

   mw.support.attachEvent(map, 'mouseout', onMouseLeave);

   createZoomSlider();
   createPanButtons();

   // Kickstart the map by loading the map data
   if(options.map && options.map.url instanceof Object)
      setTimeout(function() { onMapLoaded(options.map.url); }, 0);
   else
      mw.support.ajax({ url: settings.map.url, success: onMapLoaded });

   if(settings.state.manager instanceof mw.StateManager)
      statemanager = settings.state.manager;
   else
   {
      var dm = settings.state.data || settings.data;

      if(dm instanceof mw.StateManager)
         statemanager = dm;
      else
         statemanager = new mw.StateManager({ data: dm });

      if(settings.busy === null && dm && !(dm instanceof mw.DataManager))
         settings.busy = true;
   }

   datamanager = statemanager.data();

   if(settings.busy)
   {
      if(settings.busy === true)
      {
         settings.busy = document.getElementById('busy');
         if(!settings.busy)
         {
            settings.busy = document.body.appendChild(document.createElement('div'));
            settings.busy.id = 'busy';
         }
      }

      settings.busy.style.display = 'block';
   }

   if(datamanager && datamanager.listen instanceof Function)
   {
      dataready = false;

      datamanager.listen('ready', function(r) {
         // Separate regions from geoitems
         for(var id in r.geoitems)
         {
            var item = r.geoitems[id];
            if(item.type != 'C')
               regions[id] = { id: id, region: item.region ? item.region[0] : undefined, values: {}, bbox: [ 999, 999, 0, 0 ], ldx: 0, ldy: 0 };
         }

         dataready = true;
         kickstart();
      });
   }

   if(settings.state.year)
      statemanager.listen('year', onYear);

   if(settings.state.indicator)
      statemanager.listen('indicator', onIndicator);

   if(settings.state.geoitem)
      statemanager.listen('geoitem', onGeoItem);

   // Public methods
   return me = {
      /**
       * Is the map ready for interactions?
       * @return boolean
       */
      ready: function() { return mapready && dataready; },

      /**
       * Lock/unlock the map -- if locked, do no drawing at all
       */
      lock: function() { locked = true; },
      unlock: function(redraw) { locked = false; if(redraw) me.redraw(true); },

      /**
       * Destroy map contents and all listeners
       **/
      destroy: function() {
         if(settings.state.year)
            statemanager.unlisten('year', onYear);

         if(settings.state.indicator)
            statemanager.unlisten('indicator', onIndicator);

         dispatcher.destroy();

         if(hasTouch)
            mw.support.removeEvent(map, 'touchstart', onTouchStart);

         mw.support.removeEvent(map, 'mouseout', onMouseLeave);

         for(type in layerevents)
            mw.support.removeEvent(container, type, dispatchToLayer);

         for(var l = 0, lcnt = settings.layers.length; l < lcnt; l++)
         {
            var layer = settings.layers[l];
            if(layer && layer.destroy)
               layer.destroy();
         }

         node.innerHTML = '';
      },

      /**
       * Update settings. Not all settings will have effect once the map is instantiated
       * @param object values Settings to merge into current settings
       */
      set: function(values) {
         mw.support.extend(values, settings);

         if(values.hasOwnProperty('zoom'))
         {
            if(zoomslider)
               zoomslider.destroy();

            createZoomSlider();
         }

         expandBorderSettings();

         if(draw)
            draw();
      },

      /**
       * Get a map-setting, or all settings
       * @param mixed key If not defined, return all keys, else single value
       * @return object
       */
      settings: function(key) {
         return key ? settings[key] : settings;
      },

      /**
       * Type of map
       * @return string Currently one of "vml", "canvas" or "unknown"
       */
      type: function() {
         return hasCanvas ? "canvas" : (hasVML ? "vml" : "unknown");
      },

      /**
       * Returns array of available geoitems in map
       * @return array Array of ISO3 IDs
       */
      items: function() {
         var items = idlist[regionmode].slice(0);

         if(regionmode && !settings.map.noregion)
         {
            for(var i = 0, cnt = idlist[0].length; i < cnt; i++)
            {
               if(!geoitems[idlist[0][i]].region)
                  items.push(idlist[0][i]);
            }
         }

         return items;
      },

      /**
       * Get the weighted centerpoint for a geoitem, taking into
       * account label displacement
       * @param string item Geoitem ID
       * @return object { x, y }
       */
      center: function(id) {
         var item = geoitems[id] || regions[id];

         if(item)
         {
            var x = item.cx;
            var y = item.cy;

            var scale = item.scale ? item.scale.to : undefined;
            if(scale)
            {
               var ox = settings.map.offset.x + settings.map.padding;
               var oy = settings.map.offset.y + settings.map.padding;

               x = (x - ox) * scale.scale + settings.map.scale * scale.dx + ox;
               y = (y - oy) * scale.scale + settings.map.scale * scale.dy + oy;
            }

            if(projection)
               return projection(y, x);
            else
               return {
                  x: currentScale * (x + offsetX),
                  y: currentScale * (y + offsetY)
               };
         }
         else if(settings.center)
            return settings.center(id);
         else
            return { x: 0, y: 0 };
      },

      /**
       * Get bounding box of item
       * @param string item Geoitem ID
       * @return array [ minx, miny, maxx, maxy ]
       */
      box: function(item) {
         if(geoitems[item])
            return geoitems[item].bbox;
         else if(regions[item])
            return regions[item].bbox;
      },

      /**
       * Get the current map scale
       * @return float Map scale
       */
      scale: function() {
         return scale;
      },

      /**
       * Colorize map. Use either this function, or use values and a
       * legend.
       * @param object colors Object with geoID => value pairs, a
       *               CSS color code or a function which returns a
       *               color for a given ID
       */
      color: function(colors) {
         if(dynamiccolors && colors instanceof Function)
            dynamiccolors = colors;

         if(zooming || panning)
            coloronzoomend = colors;
         else
            colorizeMap(colors, true);
      },

      /**
       * Draw specific geoitem onto a separate canvas.
       * @param string id ID of geoitem
       * @param string color Color to draw shape in
       * @param HTMLCanvas canvas Optional canvas (function creates
       *                   new canvas if none is passed in)
       * @return Passed-in or newly created canvas
       */
      clone: function(id, color, canvas) {
         cloneCountryShape(id, color, canvas);
      },

      /**
       * Export the map.
       * @param string type One of "png" (default) or "svg".
       * @param string download Optional ID of window/tab to show results in, or TRUE
       *                        if export is to be presented as downloadable file.
       * @param object Optional parameters to send to renderer (PNG only)
       * @return If download was either TRUE or window ID, TRUE if export type was supported,
       *         FALSE otherwise. Else, SVG string or base64 encoded PNG if succesful, FALSE otherwise
       */
      'export': function(type, download, parameters) {
         type = type || "png";

         if(type == 'png' && !settings['export'].renderer)
            return false;

         if(parameters == undefined && download instanceof Object)
         {
            parameters = download;
            download = undefined;
         }
         else
            parameters = parameters || {};

         if(type == "png")
            return exportPNG(download, parameters);
         else
            return exportSVG(download, parameters, type);
      },

      /**
       * Set values for geoitems, used to colorize map.
       * Needs a legend set in the map settings.
       * @param int year Optional year for which the values are valid
       *                 If used, year() can be used to switch
       * @param object values Object with geoID => value pairs, or a
       *               function which returns a value for a given ID
       * @param boolean Optional boolean to suppress redraw after setting values
       */
      values: function(year, values, suppress) {
         setValues(year, values, suppress);
      },

      /**
       * Loop through all set years, colorizing map on the way
       * @param float Optional speed in seconds for whole animation
       *              If not set, use speed.play from settings
       */
      play: function(speed) {
         if(!minYear || !maxYear)
         {
            if(resized && datamanager)
            {
               if(datamanager.indicators[resized])
               {
                  var stats = datamanager.indicators[resized].statistics;
                  minYear = stats.range.from;
                  maxYear = stats.range.to;
               }
            }

            if(!minYear || !maxYear)
               return;
         }

         speed = speed || (datamanager.meta.speed ? datamanager.meta.speed : settings.speed.play);
         speed /= (maxYear - minYear + 1);

         if(currentYear == maxYear)
            currentYear = minYear - 1;

         function step() {
            if(currentYear < maxYear)
            {
               if(settings.state.year)
                  statemanager.set('year', currentYear + 1);
               else
                  onYear(currentYear + 1);

               playTimer = setTimeout(step, speed * 1000);
            }
            else
               dispatcher.dispatch(me, 'playend');
         };

         dispatcher.dispatch(me, 'playstart');
         step();
      },

      /**
       * Stop any animations
       */
      stop: function() {
         clearTimeout(playTimer);
      },

      /**
       * Set a new legend
       * @param array legend Legend array, with objects
       *                     { min: ..., max: ..., label: ..., color: ... }
       */
      legend: function(legend) {
         settings.legend = legend;
         dispatcher.dispatch(me, "legend", legend);

         if(draw)
            colorizeMap(legendColor, true);
      },

      /**
       * Force a redraw of the map
       */
      redraw: function(checksize) {
         if(checksize)
            resizeMap();
         else if(draw)
            colorizeMap(null, true);
      },

      /**
       * Resize the map.
       * @param string id Code of indicator to use for scale data
       * @param float Optional speed in seconds for whole animation
       *              If not set, use speed.resize from settings
       */
      resize: function(id, speed) {
         if(!id && !resized)
           return;

         resized = id;

         for(var gid in geoitems)
         {
            var item = geoitems[gid];

            if(resizing)
               item.scale.from = item.scale.current;

            if(resized)
            {
               item.scale.to = getScaleData(gid);

               if(!item.scale.to)
               {
                  if(item.scale.zero)
                     item.scale.to = item.scale.zero;
                  else
                  {
                     var cx = item.cx / settings.map.scale;
                     var cy = item.cy / settings.map.scale;

                     // FIXME: this is wrong, does not take into account any padding on the map (try GRL in both very wide and very high map...)
                     item.scale.to = {
                        scale: 0, dx: cx * item.scale.from.scale + item.scale.from.dx,
                        dy:    cy * item.scale.from.scale + item.scale.from.dy
                     }
                  }
               }
            }
            else
               item.scale.to = { scale: 1, dx: 0, dy: 0 }

            if(item.scale.to.scale == 0 || item.scale.to.scale == -1)
               item.scale.zero = { scale: 0, dx: item.scale.to.dx, dy: item.scale.to.dy }
         }

         function done()
         {
            resizing = false;
            dispatcher.dispatch(me, 'resizeend', !!resized);

            for(var id in geoitems)
            {
               var item = geoitems[id];
               item.scale.from = item.scale.to;
            }

            draw();
         }

         dispatcher.dispatch(me, 'resizestart', !!resized);

         speed = 1000 * (speed == undefined ? settings.speed.resize : speed);

         // When speed == 0, just redraw, no animation
         if(speed == 0)
         {
            resizeStep = 1;
            done();
         }
         else
         {
            var start;
            function tick()
            {
               if(!resizeStep)
                  start = new Date().getTime() - 1;

               resizeStep = Math.min(1, (new Date().getTime() - start) / speed);

               draw();

               if(resizeStep < 1)
                  tickHandler(tick);
               else
               {
                  done();

                  if(hasCanvas)
                     cloneCanvas(ctx, zoomctx);
               }
            }

            resizeStep = 0;

            if(!resizing)
            {
               resizing = true;

               if(draw)
                  tick();
               else map.listen("ready", function() {
                  tick();
               });
            }
         }
      },

      /**
       * Toggle regions mode.
       * @param mixed showorid Either an object with region
       *              definitions, or an integer for the region level
       *              to show (0 is no regions, show all borders).
       */
      region: function(showordef) {
         if(showordef === true)
            showordef = 1;
         else if(showordef === false)
            showordef = 0;

         if(isNaN(showordef))
            defineRegions(showordef);
         else
         {
            regionmode = showordef;
            if(regionmode)
            {
               var seen = {};
               var collect = idlist[showordef].length == 0;

               for(var id in geoitems)
               {
                  var item = geoitems[id];
                  if(item.regions && item.regions.length)
                  {
                     item.region = item.regions[showordef - 1];

                     if(collect && !seen[item.region])
                     {
                        idlist[showordef].push(item.region);
                        seen[item.region] = true;
                     }
                  }
               }
            }

            dispatcher.dispatch(me, "region");

            if(draw)
            {
               colorizeMap(null, false);
               draw(true);
            }
         }
      },

      /**
       * Zoom to a specific geoitem
       * @param string id ID of item to zoom to, or zoom-delta
       * @param float duration Optional zoom speed (if not set, use
       *              settings.speed.zoom)
       */
      zoom: function(id, duration) {
         if(zooming)
            return;

         me.highlight();

         if(typeof id == "number")
         {
            scale = doZoom(scale + id, map.clientWidth / 2, map.clientHeight / 2, 0, 0, true);
            revertBigMap();

            return;
         }

         if(!geoitems[id] && !regions[id])
         {
            var s = 1;

            var mx = map.clientWidth / 2;
            var my = map.clientHeight / 2;

            var ox = 0;
            var oy = 0;
         }
         else
         {
            var bbox = geoitems[id] ? geoitems[id].bbox : regions[id].bbox;
            if(projection)
            {
               var tl = latlng2xy(bbox[1], bbox[0]);
               var br = latlng2xy(bbox[3], bbox[2]);

               bbox = [ tl.x / currentScale - offsetX, br.y / currentScale - offsetY, br.x / currentScale - offsetX, tl.y / currentScale - offsetY ];
            }

            var sd = getScaleData(id);
            if(sd)
            {
               var ox = settings.map.offset.x + settings.map.padding;
               var oy = settings.map.offset.y + settings.map.padding;

               bbox[0] = (bbox[0] - ox) * sd.scale + settings.map.scale * sd.dx + ox;
               bbox[1] = (bbox[1] - oy) * sd.scale + settings.map.scale * sd.dy + oy;
               bbox[2] = (bbox[2] - ox) * sd.scale + settings.map.scale * sd.dx + ox;
               bbox[3] = (bbox[3] - oy) * sd.scale + settings.map.scale * sd.dy + oy;
            }

            var w = bbox[2] - bbox[0] + settings.zoom.padding.x;
            var h = bbox[3] - bbox[1] + settings.zoom.padding.y;

            if(w / h < map.clientWidth / map.clientHeight)
               var s = map.clientHeight / h;
            else
               var s = map.clientWidth / w;

            s = Math.max(settings.zoom.minimum, Math.min(maxzoom, s));

            // Center of country in current map
            var mx = mapX = (bbox[0] + 0.5 * w + offsetX) * currentScale;
            var my = mapY = (bbox[1] + 0.5 * h + offsetY) * currentScale;

            // Offset when zoomed country is centered
            var ox = -bbox[0] + 0.5 * (map.clientWidth / s - w + settings.zoom.padding.x);
            var oy = -bbox[1] + 0.5 * (map.clientHeight / s - h + settings.zoom.padding.y);
         }

         if(isNaN(s))
            return;

         var sxy = zoomcenter2offset(s, mx, my, true);

         var dx = sxy[1] - ox;
         var dy = sxy[2] - oy;

         var start;
         var speed = 1000 * (duration === undefined ? settings.speed.zoom : duration);

         var ss = currentScale;

         useBigMap();

         dispatcher.dispatch(me, 'zoomstart');

         var f = 0;
         zooming = true;

         function tick()
         {
            if(!start)
               start = new Date().getTime();

            f = speed ? Math.min(1, (new Date().getTime() - start) / speed) : 1;

            scale = doZoom(ss * Math.exp(Math.log(s / ss) * f), mx, my, f * dx, f * dy, false, true);

            if(f < 1)
               tickHandler(tick);

            if(f == 1)
            {
               offsetX -= dx;
               offsetY -= dy;

               revertBigMap();
               dispatcher.dispatch(me, "bounds", { zoom: currentScale, offset: { x: offsetX, y: offsetY } });

               dispatcher.dispatch(me, "zoomend", id);
               zooming = false;
               lastzoom = id;

               if(coloronzoomend !== null)
               {
                  colorizeMap(coloronzoomend, true)
                  coloronzoomend = null;
               }
            }
            else if(mw.performance <= 40 || ie9)
            {
               offsetX -= f * dx;
               offsetY -= f * dy;

               revertBigMap();
               dispatcher.dispatch(me, "bounds", { zoom: currentScale, offset: { x: offsetX, y: offsetY } });

               offsetX += f * dx;
               offsetY += f * dy;
            }
         }

         tick();
      },

      /**
       * Set specific year
       * @param int year Year
       */
      year: function(year) {
         if(settings.state.year)
            statemanager.set('year', year);
         else
            onYear(year);
      },

      /**
       * Return country at specified map coordinates
       * @param int x X coordinate
       * @param int y Y coordinate
       * @return string ID if match, undefined else.
       */
      at: function(x, y) {
         var event = { clientX: x, clientY: y, target: { offsetParent: null } };
         return coord2geo(event);
      },

      /**
       * When in region mode, explode a region into its subparts
       * @param string id ID of region to explode
       */
      explode: function(id) {
         if(id instanceof Object)
         {
            for(var i in id)
               if(id[i] === true && exploded[i] !== true)
               {
                  explodecnt++;
                  exploded[i] = true;
               }
               else if(id[i] === false && exploded[i] === true)
               {
                  explodecnt--;
                  exploded[i] = false;
               }
         }
         else if(!exploded.hasOwnProperty(id) || exploded[id] === false)
         {
            explodecnt++;
            exploded[id] = true;
         }

         if(draw)
         {
            colorizeMap(null, false);
            draw(true);
         }
      },

      /**
       * Collapse an exploded region
      * @param string id ID of region to collapse
       */
      implode: function(id) {
         if(exploded.hasOwnProperty(id))
         {
            explodecnt--;
            exploded[id] = false;
         }
         else
         {
            explodecnt = 0;
            exploded = {};
         }

         if(draw)
         {
            colorizeMap(null, false);
            draw(true);
         }
      },

      /**
       * Add a layer to the map. Layer prototype:
       *
       * function Layer(map, options);
       * Layer.prototype.update = function();
       *
       * @param class layer Layer to add
       */
      layer: function(layer) {
         if(layer instanceof Function)
            layer = new layer({});

         settings.layers.push(layer);

         if(mapready && dataready)
         {
            if(isNode(layer))
               container.appendChild(layer);
            else if(layer.init)
               layer.init(me);
         }
      },

      /**
       * Returns statemanager used by map.
       * @return class StateManager object
       */
      state: function() {
         return statemanager;
      },

      /**
       * Highlight a geoitem (as if the user hovered over it)
       *
       * @param string id ID of geoitem (or undefined/null to remove highlight)
       */
      highlight: function(id) {
         if(id)
         {
            var e = { geoitem: id };
            var c = me.center(id);

            e.x = c.x;
            e.y = c.y;

            if(e.x < 0 || e.y < 0 || e.x > map.clientWidth || e.y > map.clientHeight)
               return;

            dispatcher.dispatch(me, 'hover', e);
         }
         else
            dispatcher.dispatch(me, 'hover', null);
      },

      /**
       * Return a specific pane (DOM node) to which a layer can attached.
       * @param int Pane to which layer should be attached, one of mw.map.layers.BELOW or mw.map.layers.ABOVE
       * @param DOMNode pane HTML element to which to add layers
       */
      panes: function(layer) {
         layer = layer || mw.map.layers.ABOVE;

         if(layer == mw.map.layers.BELOW)
            bcontainer.style.display = 'block';

         return layer == mw.map.layers.ABOVE ? container : bcontainer;
      },

      /**
       * Return width/height of actual map, or individual item (in pixels)
       */
      width: function(id) {
         if(id)
         {
            var bbox = me.box(id);
            if(projection)
            {
               var tl = projection(bbox[1], bbox[0]);
               var br = projection(bbox[3], bbox[2]);

               return br.x - tl.x;
            }
            else
               return bbox[2] - bbox[0];
         }
         else
            return hasCanvas ? (canvas.width / (settings.map.retina || 1)) : (map.clientWidth || map.offsetWidth);
      },

      height: function(id) {
         if(id)
         {
            var bbox = me.box(id);
            if(projection)
            {
               var tl = projection(bbox[1], bbox[0]);
               var br = projection(bbox[3], bbox[2]);

               return tl.y - br.y;
            }
            else
               return bbox[3] - bbox[1];
         }
         else
            return hasCanvas ? (canvas.height / (settings.map.retina || 1)) : (map.clientHeight || map.offsetHeight);
      },

      area: function(id) {
         if(id)
         {
            var bbox = me.box(id);
            if(projection)
            {
               var tl = projection(bbox[1], bbox[0]);
               var br = projection(bbox[3], bbox[2]);

               return (br.x - tl.x) * (tl.y - br.y);
            }
            else
               return (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]);
         }
         else
            return me.width() * me.height();
      },

      /**
       * Function to enable/disable mouse events on map
       * @param bool v If TRUE, allow map to handle mouse events
       */
      mouse: function(v) {
         mouseevents = v;
      },

      /**
       * Convert mouse coordinates in map container to pixel coordinates for un-zoomed map
       */
      xy2xy: function(x, y) {
         return { x: x / currentScale - offsetX, y: y / currentScale - offsetY };
      },

      /**
       * Convert lat/lng to map coordinates
       * (if no specific projection is set, use Gall projection, see http://www.digiwis.com/dwi_thm1.htm)
       * @param @float lat Latitude
       * @param @float lng Longitude
       * @return object Object width x/y members
       */
      latlng2xy: function(lat, lng) {
         if(projection)
            return projection(lat, lng);
         else
            return latlng2xy(lat, lng);
      },

      /**
       * Convert x/y to lat/lng coordinates
       * @param int x x coordinate
       * @param int y y coordinate
       * @param bool constrain If TRUE, make sure lat/lng is within overall map bounds
       * @returns object Object with lat/lng members
       */
      xy2latlng: function(x, y, constrain) {
         x = x / currentScale - offsetX;
         y = y / currentScale - offsetY;

         var mp = settings.map.padding;
         var mo = settings.map.offset;

         var mw = map.clientWidth - 2 * (mo.x + mp);
         var mh = map.clientHeight - 2 * (mo.y + mp);

         var degrad2 = Math.PI / 360;
         var rad2deg = 360 / Math.PI;

         var mb = settings.map.bbox;
         if(settings.map.origin)
         {}
         else if(mb)
         {
            var fb = Math.tan(mb.bottom * degrad2);
            var ft = Math.tan(mb.top * degrad2);

            var lng = (x - mo.x - mp) * (mb.right - mb.left) / mw + mb.left;
            var lat = Math.atan(ft - (y - mo.y - mp) / mh * (ft - fb)) * rad2deg;
         }
         else
            return { lat: undefined, lng: undefined };

         if(constrain && mb)
         {
            lng = Math.max(Math.min(lng, mb.right), mb.left);
            lat = Math.max(Math.min(lat, mb.top), mb.bottom);
         }

         return { lat: lat, lng: lng };
      },

      /**
       * Add custom map projection to map.
       * @param function callback Supply a callback to the map on the initial call,
       *                          the callback should accept lat, lng as arguments, and
       *                          return an { x: .., y: .. } object.
       *                          Call without argument for all subsequent times the
       *                          map bounds may have changed (in which case map will
       *                          redraw and publish bounds-update to all layers)
       * @return bool Returns FALSE if new bounds are not accepted (i.e. larger than max zoom)
       */
      projection: function(callback) {
         if(callback instanceof Function || callback === false)
         {
            currentScale = 1; offsetX = 0; offsetY = 0;

            projection = callback;
            scaleMapData(false);
         }
         else
         {
            var tl = projection(settings.map.bbox.top, settings.map.bbox.left);
            var br = projection(settings.map.bbox.bottom, settings.map.bbox.right);

            var zoom = (br.x - tl.x) / map.clientWidth;

            if(zoom > maxzoom)
               return false;
            else
            {
               if(zoomslider)
                  zoomslider.set(settings.zoom.type == 'exponential' ? Math.ceil(Math.log(zoom)/Math.log(2)) + 2 : zoom);

               draw();
               dispatcher.dispatch(me, "bounds", { zoom: currentScale, offset: { x: offsetX, y: offsetY } });
            }
         }

         return true;
      },

      listen: function(what, callback) {
         if(what == "ready" && mapready && dataready)
            callback();
         else if(layerevents[what])
            layerevents[what].push(callback);
         else
            dispatcher.register(what, callback);
      },

      unlisten: function(what, callback) {
         if(layerevents[what])
         {
            for(var i = layerevents[what].length - 1; i >= 0; i--)
            {
               if(layerevents[what][i] === callback)
                  layerevents[what].splice(i, 1);
            }
         }
         else
            dispatcher.remove(what, callback);
      },

      toggleClass: function(name, state) {
         if(state)
         {
            if(container.className.indexOf(name) == -1)
               container.className += ' ' + name;
         }
         else
            container.className = container.className.replace(' ' + name, '');
      },

      edit: function(edit) {
         editing = edit;

         if(editing)
         {
            if(!resized)
            {
               alert('Map needs to be resized to enable edit mode');
               return;
            }

            mw.support.attachEvent(document.body, 'mousedown', onEdit);
            mw.support.attachEvent(node, 'mousemove', onEditHighlight);

            map.classList.add('map-editing');
            map.setAttribute('caption', editcaption);

            for(var id in geoitems)
               editdxdy[id] = { dx: 0, dy: 0 };

            colorizeMap(settings.map.nodata, true);
         }
         else
         {
            mw.support.removeEvent(document.body, 'mousedown', onEdit);
            mw.support.removeEvent(node, 'mousemove', onEditHighlight);

            map.classList.remove('map-editing');
            map.setAttribute('caption', '');

            if(settings.events.move)
            {
               var data = {}, changed = false;
               for(var id in editdxdy)
               {
                  var dxdy = editdxdy[id];
                  if(dxdy.dx || dxdy.dy)
                  {
                     data[id] = dxdy;
                     changed = true;
                  }
               }

               if(changed)
                  settings.events.move(data);
            }
         }
      }
   };

   // Private methods

   function onEditHighlight(e)
   {
      e = e || window.event;

      var geo = getTarget(coord2geo(e));

      if(geo != editlasthighlight)
      {
         map.setAttribute('caption', geo ? (datamanager ? datamanager.geoitems[geo].label : geo) : editcaption);
         editlasthighlight = geo;
      }
   }

   function onEdit(e)
   {
      e = e || window.event;

      var dragged = false, moved = false;

      function colorSelected(id)
      {
         return editselection[id] ? settings.map.selected : settings.map.nodata;
      }

      var sx = e.clientX;
      var sy = e.clientY;

      var vw = map.clientWidth;
      var vh = map.clientHeight;

      var dx = (window.pageXOffset !== undefined) ? window.pageXOffset : (document.documentElement || document.body.parentNode || document.body).scrollLeft;
      var dy = (window.pageYOffset !== undefined) ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop;

      var rect = document.createElement('div');
      rect.className = 'drag-rectangle';

      rect.style.border = 'border: 1px dotted #2a78b8';
      rect.style.backgroundColor = 'rgba(42,120,184,0.2)';
      rect.style.position = 'absolute';
      rect.style.zIndex = 1000000;

      rect.style.left = (sx + dx) + 'px';
      rect.style.top = (sy + dy) + 'px';

      var fromgeo = getTarget(coord2geo(e));
      if(fromgeo)
      {
         if(e.shiftKey)
            editselection[fromgeo] = true;
         else if(e.ctrlKey)
            editselection[fromgeo] = editselection[fromgeo] ? false : true;
         else
            editselection[fromgeo] = true;
      }
      else
      {
         editselection = {};
         document.body.appendChild(rect);
      }

      colorizeMap(colorSelected, true);

      function onEditMove(e)
      {
         if(!fromgeo)
         {
            var w = Math.abs(e.clientX - sx);
            var h = Math.abs(e.clientY - sy);

            if(e.clientX < sx)
               rect.style.left = (e.clientX + dx) + 'px';

            if(e.clientY < sy)
               rect.style.top = (e.clientY + dy) + 'px';

            rect.style.width = w + 'px';
            rect.style.height = h + 'px';
         }
         else
         {
            var x = (e.clientX - sx) / settings.map.scale;
            var y = (e.clientY - sy) / settings.map.scale;

            for(var id in editselection)
            {
               if(editselection[id] && geoitems[id].scale)
               {
                  editdxdy[id].dx += x; 
                  editdxdy[id].dy += y;

                  geoitems[id].scale.to.dx += x;
                  geoitems[id].scale.to.dy += y;

                  moved = true;
               }
            }

            colorizeMap(colorSelected, true);

            sx = e.clientX;
            sy = e.clientY;
         }

         dragged = true;
         mw.support.preventDefault(e);
      }

      function onEditEnd(e)
      {
         if(dragged && !fromgeo)
         {
            var ro = mw.support.offset(rect);
            var mo = mw.support.offset(map);

            var x1 = ro.left - mo.left;
            var y1 = ro.top - mo.top;

            var x2 = x1 + rect.clientWidth;
            var y2 = y1 + rect.clientHeight;

            for(var i in idlist[0])
            {
               var id = idlist[0][i];
               var center = me.center(id);

               editselection[id] = center.x > x1 && center.y > y1 && center.x < x2 && center.y < y2;
            }
         }
         else if(!e.ctrlKey && !e.shiftKey)
            editselection = {}
        
         colorizeMap(colorSelected, true);

         if(rect.parentNode)
            rect.parentNode.removeChild(rect);
 
         mw.support.removeEvent(document.body, 'mousemove', onEditMove);
         mw.support.removeEvent(document.body, 'mouseup', onEditEnd);

         mw.support.preventDefault(e);

         if(moved)
            dispatcher.dispatch(me, "modified");
      }
 
      mw.support.attachEvent(document.body, 'mousemove', onEditMove);
      mw.support.attachEvent(document.body, 'mouseup', onEditEnd);
   }

   function expandBorderSettings()
   {
      function expand(o)
      {
         if(!o)
            return;
         if(!o.hasOwnProperty('color'))
            o.color = '#fff';
         if(!o.hasOwnProperty('width'))
            o.width = 1;
         if(!o.hasOwnProperty('patterns'))
            o.patterns = { };
      }

      if(settings.borders instanceof Array)
      {
         for(var i = 0; i < settings.borders.length; i++)
            for(var j = 0; j < settings.borders[i].length; j++)
               expand(settings.borders[i][j]);
      }
      else
         expand(settings.borders);
   }

   function createZoomSlider()
   {
      if(settings.zoom)
      {
         var sdiv = document.createElement('div');
         sdiv.className = 'zoom-slider';
         container.appendChild(sdiv);

         mw.support.attachEvent(sdiv, 'mouseover', onMouseLeave);

         mw.support.attachEvent(sdiv, 'touchend', function detectActualTouch() {
            container.className += ' has-touched';
            mw.support.removeEvent(sdiv, 'touchend', detectActualTouch);
         });

         var zoomopts = {
            orientation: settings.zoom.orientation || "vertical",
            inverted:    true,
            handle:      settings.zoom.handle,
            labels:      0,
            range:       {
               minimum: settings.zoom.minimum,
               step:    0,
               maximum: settings.zoom.maximum
            }
         };

         maxzoom = settings.zoom.type == 'linear' ? settings.zoom.maximum : Math.pow(2, settings.zoom.maximum - 1);

         if(settings.zoom.trigger)
            zoomopts.trigger = settings.zoom.trigger;

         zoomslider = new mw.Slider(sdiv, zoomopts);

         zoomslider.set(currentScale);

         zoomslider.listen('update', function(zoom)
         {
            var z = zoom;
            if(settings.zoom.type == 'exponential')
               z = Math.pow(2, Math.round(zoom) - 1);

            scale = doZoom(z, map.clientWidth / 2, map.clientHeight / 2, 0, 0, true);

            if(settings.zoom.type == 'exponential')
               zoomslider.set(zoom);

            revertBigMap();
         });
      }
      else
         maxzoom = settings.zoom.maximum;
   }

   function onPanButton(e)
   {
      var types = { left: [ 0.1, 0 ], top: [ 0, 0.1 ], right: [ -0.1, 0 ], bottom: [ 0, -0.1 ]};

      var w = map.clientWidth || map.offsetWidth;
      var h = map.clientHeight || map.offsetHeight;
      var d = types[e.target.getAttribute('data-pan')];

      lastX = offsetX; lastY = offsetY;
      doPan(offsetX + d[0] * w, offsetY + d[1] * h);
      container.click();
   }

   function createPanButtons()
   {
      var types = [ 'left', 'right', 'top', 'bottom' ];
      for(var t in types)
      {
         var pdiv = document.createElement('div');
         pdiv.className = 'pan-button ' + types[t];
         pdiv.setAttribute('data-pan', types[t]);
         map.appendChild(pdiv);

         mw.support.attachEvent(pdiv, 'touchstart', onPanButton);
         mw.support.attachEvent(pdiv, 'mousedown', onPanButton);
      }
   }

   function latlng2xy(lat, lng)
   {
      var mp = settings.map.padding;
      var mo = settings.map.offset;

      var mw = map.clientWidth - 2 * (mo.x + mp);
      var mh = map.clientHeight - 2 * (mo.y + mp);

      if(settings.map.origin)
      {
         var degrad = Math.PI / 180;

         lng *= degrad;
         lat *= degrad;

         var XF = 0.70710678118654752440 / 4.44;
         var YF = 1.70710678118654752440 / 4.44;

         var x = settings.map.origin.x + mw * XF * lng;
         var y = settings.map.origin.y - mw * YF * Math.tan(lat / 2);
      }
      else if(settings.map.bbox)
      {
         var degrad2 = Math.PI / 360;
         var mb = settings.map.bbox;

         if(lng < mb.left)
            lng += 360;

         var fb = Math.tan(mb.bottom * degrad2);
         var ft = Math.tan(mb.top * degrad2);

         var x = (lng - mb.left) / (mb.right - mb.left) * mw + mo.x + mp;
         var y = (ft - Math.tan(lat * degrad2)) / (ft - fb) * mh + mo.y + mp;
      }
      else
         return { x: undefined, y: undefined };

      return { x: currentScale * (x + offsetX), y: currentScale * (y + offsetY) };
   }

   function resizeMap()
   {
      if(mapdata.aspect && settings.map.aspect)
      {
         var h = node.clientWidth / mapdata.aspect;

         var style = window.getComputedStyle(map, null);
         var mh = parseInt(style.getPropertyValue('max-height'));
         if(mh > 0)
            h = Math.min(mh, h);

         map.style.height = h + 'px';
      }

      if(canvas)
      {
         hc.width = map.clientWidth || map.offsetWidth;
         hc.height = map.clientHeight || map.offsetHeight;

         var f = settings.map.retina || 1;
         canvas.width = zc.width = f * hc.width;
         canvas.height = zc.height = f * hc.height;
      }

      if(!projection)
         scaleMapData(false);

      var ct = container.getBoundingClientRect().top;
      var mt = map.getBoundingClientRect().top;

      for(var c = 0; c < container.children.length; c++)
         if(container.children[c] !== map)
            container.children[c].style.top = (mt - ct) + 'px';

      if(draw)
         draw();

      if(ctx)
         cloneCanvas(ctx, zoomctx);

      dispatcher.dispatch(me, "size", { width: map.clientWidth || map.offsetWidth, height: map.clientHeight || map.offsetHeight });
   }

   function scaleMapData(initial)
   {
      var px = settings.map.padding;
      var py = settings.map.padding;

      if(!initial)
         borders = [];

      if(!initial || !settings.map.scale)
      {
         var maxwidth = (map.clientWidth || settings.map.width) - 2 * px;
         var maxheight = (map.clientHeight || settings.map.height) - 2 * py;

         var aspect1 = maxwidth / maxheight;
         var aspect2 = mapdata.aspect || aspect1;

         if(aspect2 > aspect1)
         {
            var mapwidth = maxwidth;
            var mapheight = mapwidth / aspect2;
         }
         else
         {
            var mapheight = maxheight;
            var mapwidth = mapheight * aspect2;
         }

         settings.map.scale = Math.max(mapwidth / 200, mapheight / 200);

         settings.map.offset = {
            x: (maxwidth - mapwidth) / 2,
            y: (maxheight - mapheight) / 2
         };

         px += settings.map.offset.x;
         py += settings.map.offset.y;
      }

      var two30 = Math.pow(2,30);

      for(var id in mapdata.items)
      {
         var item = mapdata.items[id];

         if(!item.m)
            continue;

         // We need two sets: one for overall bbox (used for label displacement calculations), and one
         // when settings.map.bounds == 'scale'
         var minx1 = 99999, maxx1 = -99999, miny1 = 99999, maxy1 = -99999;
         var minx2 = 99999, maxx2 = -99999, miny2 = 99999, maxy2 = -99999;
         var coords = [];

         for(var i = 0, ic = item.m.length; i < ic; i++)
         {
            var poly = mapdata.masses[item.m[i]].poly;
            if(!poly)
               continue;

            var mass = [ mapdata.masses[item.m[i]].scale == 1 ];

            var xy;
            for(var j = 0, jc = poly.length; j < jc; j++)
            {
               var x = poly[j][0] * settings.map.scale + px;
               var y = poly[j][1] * settings.map.scale + py;

               if(projection)
               {
                  var latlng = me.xy2latlng(x, y);
                  xy = [ x = latlng.lng, y = latlng.lat ];
               }
               else
                  xy = [ x, y ];

               minx1 = Math.min(minx1, x);
               miny1 = Math.min(miny1, y);
               maxx1 = Math.max(maxx1, x);
               maxy1 = Math.max(maxy1, y);

               if(settings.map.bounds == 'all' || mass[0])
               {
                  minx2 = Math.min(minx2, x);
                  miny2 = Math.min(miny2, y);
                  maxx2 = Math.max(maxx2, x);
                  maxy2 = Math.max(maxy2, y);
               }

               mass.push(xy);
            }

            coords.push(mass);
         }

         var ldx = item.ldx ? parseFloat(item.ldx) : 0;
         var ldy = item.ldy ? parseFloat(item.ldy) : 0;

         // PHP Excel import with small negative numbers sometimes return large positive ones. Fix.
         if(ldx > 200) ldx -= two30;
         if(ldy > 200) ldy -= two30;

         var cx = parseFloat((minx1 + maxx1) / 2 + ldx * (projection ? 1 : settings.map.scale));
         var cy = parseFloat((miny1 + maxy1) / 2 + ldy * (projection ? 1 : settings.map.scale));

         if(!projection)
         {
            if(maxx2 - minx2 < 1)
               maxx2++;
            if(maxy2 - miny2 < 1)
               maxy2++;
         }

         if(initial)
         {
            geoitems[id] = {
               values: {},
               scale: { from: { scale: 1, dx: 0, dy: 0 } },
               color: settings.map.nodata
            };

            idlist[0].push(id);
         }

         geoitems[id].coords = coords;
         geoitems[id].bbox = [ minx2, miny2, maxx2, maxy2 ];
         geoitems[id].ldx = ldx;
         geoitems[id].ldy = ldy;
         geoitems[id].cx = cx;
         geoitems[id].cy = cy;
      }

      updateRegionBounds();

      for(var id in mapdata.borders)
      {
         var item = mapdata.borders[id];
         var poly = mapdata.borders[id].poly;

         if(!poly)
            continue;

         var coords = [];
         for(var j = 0, jc = poly.length; j < jc; j++)
         {
            var x = poly[j][0] * settings.map.scale + px;
            var y = poly[j][1] * settings.map.scale + py;

            if(projection)
            {
               var latlng = me.xy2latlng(x, y);
               xy = [ latlng.lng, latlng.lat ];
            }
            else
               xy = [ x, y ];

            coords.push(xy);
         }

         borders.push({ geo1: item.geo1, geo2: item.geo2, type: item.type, coords: coords });
      }

      if(mapdata.bbox)
      {
         var bbox = mapdata.bbox.split(" ");
         var tl = bbox[0].split(",");
         var br = bbox[1].split(",");

         settings.map.bbox = {
            top: parseFloat(tl[0]),
            bottom: parseFloat(br[0]),
            left: parseFloat(tl[1]),
            right: parseFloat(br[1])
         }

         if(settings.map.bbox.right < settings.map.bbox.left)
            settings.map.bbox.right += 360;
      }
      else if(mapdata.cx)
         settings.map.origin = {
            x: mapdata.cx * settings.map.scale + px,
            y: mapdata.cy * settings.map.scale + py
         };
   }

   function onMapLoaded(r)
   {
      if(document.readyState != 'complete')
      {
         setTimeout(function() { onMapLoaded(r); }, 100);
         return;
      }

      // When given a string, check what it is (server likely sent wrong Content-Type)
      if(typeof r == "string" && r.substr(0,1) == '{')
         r = JSON.parse(r);

      // XML data
      if(typeof r == "string" || (typeof r == "object" && r.documentElement))
      {
         if(typeof r == "string")
         {
            if(typeof window.DOMParser != "undefined")
               var xml = new window.DOMParser().parseFromString(r, "text/xml");
            else if (typeof window.ActiveXObject != "undefined" && new window.ActiveXObject("Microsoft.XMLDOM"))
            {
               var xml = new window.ActiveXObject("Microsoft.XMLDOM");
               xml.async = "false";
               xml.loadXML(r);
            }
         }
         else
            xml = r;

         r = { items: {}, masses: {}, borders: {} };

         var de = xml.documentElement;
         if(de.localName == "app")
            de = de.getElementsByTagName("data")[0];

         var bbox = de.getAttribute("bbox");
         if(bbox)
            r.bbox = bbox;
         else
         {
            var cx = de.getAttribute("cx");
            var cy = de.getAttribute("cy");

            if(cx || cy)
            {
               r.cx = parseFloat(cx);
               r.cy = parseFloat(cy);
            }
         }

         var aspect = de.getAttribute("aspect");
         if(aspect)
            r.aspect = parseFloat(aspect);

         var items = xml.getElementsByTagName('i');
         for(var i = 0, cnt = items.length; i < cnt; i++)
         {
            var item = items[i];
            var o = {};

            for(var j = 0, jcnt = item.childNodes.length; j < jcnt; j++)
            {
               var child = item.childNodes[j];

               var indices = (child.textContent || child.innerText || child.text).split(',');
               for(var k = 0, kcnt = indices.length; k < kcnt; k++)
                  indices[k] = parseInt(indices[k]);

               if(child.nodeType == 1)
                  o[child.localName || child.nodeName] = indices;
            }

            for(var a in { ldx: 1, ldy: 1 })
               if(v = item.getAttribute(a))
                  o[a] = parseFloat(v);

            r.items[item.getAttribute('id')] = o;
         }

         for(var type in { masses: 1, borders: 1 })
         {
            var root = xml.getElementsByTagName(type)[0];
            var polys = root.getElementsByTagName('p');

            for(var p = 0, pcnt = polys.length; p < pcnt; p++)
            {
               var poly = polys[p];
               var v, o = { poly: [] };

               for(var a in { type: 1, geo1: 1, geo2: 1, scale: 1 })
                  if(v = poly.getAttribute(a))
                     o[a] = v;

               var coords = (poly.textContent || poly.innerText || poly.text).split(' ');
               for(var c = 0, ccnt = coords.length; c < ccnt; c++)
               {
                  var xy = coords[c].split(',');
                  if(xy[0] != '')
                     o.poly.push([ parseFloat(xy[0]), parseFloat(xy[1]) ]);
               }

               r[type][poly.getAttribute('id')] = o;
            }
         }
      }

      var nh = settings.map.height ? settings.map.height : map.clientHeight;
      if(canvas)
      {
         var style = window.getComputedStyle(map, null);
         nh -= parseInt(style.getPropertyValue('padding-top')) + parseInt(style.getPropertyValue('padding-bottom'));
      }

      if(!nh && r.aspect)
      {
         var h = node.clientWidth / r.aspect;
         map.style.height = h + 'px';

         if(canvas)
         {
            var f = settings.map.retina || 1;

            hitctx.canvas.height = h;
            zoomctx.canvas.height = f * h;
            canvas.height = f * h;
         }
      }

      mapdata = r;
      scaleMapData(true);

      if(settings.values)
         setValues(settings.values);

      if(hasCanvas)
      {
         var c = mw.Map.HITCOLORSTEP;
         for(var id in geoitems)
         {
            hitmap[c] = id;

            var col = c.toString(16);
            geoitems[id].hitcolor = '#000000'.slice(0, 7 - col.length) + col;

            c += mw.Map.HITCOLORSTEP;
         }
      }

      mapready = true;
      kickstart();
   }

   function dispatchToLayer(event)
   {
      if(!mouseevents || zooming || panning)
         return;

      event = event || window.event;
      for(var i = layerevents[event.type].length - 1; i >= 0; i--)
      {
         if(layerevents[event.type][i](event))
         {
            if(event.type == 'mousemove')
               lasthover = null;

            mw.support.preventDefault(event);
            break;
         }
      }
   }

   function setRegions()
   {
      var items = datamanager ? datamanager.geoitems : geoitems;

      function getRegion(region)
      {
         // Region may be CSV value, with optional first scaling cluster first.
         // If one element: use that, if more than one, use second if first is not
         // defined as geoitem, and discard rest (usually used for grouping, not geographical regions)

         if(region)
         {
            var r = region instanceof Array ? region : region.split(',');
            for(var i = 0, rcnt = r.length; i < rcnt; i++)
               if(items[r[i]] || regions[r[i]])
                  return r[i];

            return undefined;
         }

         return region;
      }

      // Set hierarchy of regions per geoitem
      for(var id in items)
      {
         var item = items[id];

         if(geoitems[id])
         {
            geoitems[id].regions = [];

            var parent = getRegion(item.region);
            while(parent)
            {
               parent = regions[parent];
               if(parent)
               {
                  geoitems[id].regions.push(parent.id);
                  parent = getRegion(parent.region);
               }
            }
         }
      }

      updateRegionBounds();

      if(regionmode)
         draw(true);
   }

   function kickstart()
   {
      if(!mapready || !dataready)
         return;

      if(canvas && !canvas.height)
         resizeMap();
      
      if(settings.busy)
         settings.busy.style.display = 'none';

      setRegions();
      initLayers();

      dispatcher.dispatch(me, 'bounds', { zoom: 1, offset: { x: 0, y: 0 }});

      if(typeof settings.color == 'string')
      {
         if(settings.color.match(/^((rgb|hsl)a?\(.*\))|(#[0-9a-f]{3,})$/i))
            colorizeMap(null, true);
         else if(settings.state.indicator)
            statemanager.set('indicator', settings.color);
         else if(datamanager)
            datamanager.load(settings.color, function() {
               onIndicator(settings.color);
            });
      }
      else if(settings.color)
         colorizeMap(null, true);
      else if(settings.legend && settings.values)
         colorizeMap(null, true);
      else if(settings.state.indicator)
         onIndicator(statemanager.get('indicator'));

      node.className = node.className.replace(' map-loading', '');
      dispatcher.dispatch(me, 'ready');
   }

   function isNode(o)
   {
      return typeof Node === "object" ? o instanceof Node : o && typeof o === "object" && typeof o.nodeType === "number" && typeof o.nodeName === "string";
   }

   function initLayers()
   {
      // Initialize any pre-defined layers
      for(var l = 0, lcnt = settings.layers.length; l < lcnt; l++)
      {
         if(!settings.layers[l])
            continue;

         if(settings.layers[l] instanceof Function)
            settings.layers[l] = new settings.layers[l]({});

         if(isNode(settings.layers[l]))
            container.appendChild(settings.layers[l]);
         else if(settings.layers[l].init)
            settings.layers[l].init(me);

         if(settings.events.hover && settings.layers[l].listen)
         {
            settings.layers[l].listen("hover", function(e) {
               dispatcher.dispatch(me, "hover", e);
            });
         }
      }

      if(currentYear)
         dispatcher.dispatch(me, 'year', currentYear);

      if(currentIndicator)
         dispatcher.dispatch(me, 'indicator', currentIndicator);
   }

   function defineRegions(def)
   {
      regions = {};
      idlist[1] = [];

      for(var id in geoitems)
         geoitems[id].region = undefined;

      for(var id in def)
      {
         var region = regions[id] = { id: id, values: {}, ldx: 0, ldy: 0, bbox: [ 999, 999, 0, 0 ] };
         idlist[1].push(id);

         if(def[id] instanceof Array)
            var members = def[id];
         else
         {
            var members = def[id].geoitems;
            if(def[id].ldx)
               region.ldx = def[id].ldx;
            if(def[id].ldy)
               region.ldy = def[id].ldy;
         }

         for(var m = 0, cnt = members.length; m < cnt; m++)
         {
            var item = geoitems[members[m]];

            if(item)
            {
               item.region = id;

               region.bbox[0] = Math.min(region.bbox[0], item.bbox[0]);
               region.bbox[1] = Math.min(region.bbox[1], item.bbox[1]);
               region.bbox[2] = Math.max(region.bbox[2], item.bbox[2]);
               region.bbox[3] = Math.max(region.bbox[3], item.bbox[3]);
            }
         }

         region.cx = parseInt((region.bbox[0] + region.bbox[2]) / 2 + region.ldx);
         region.cy = parseInt((region.bbox[1] + region.bbox[3]) / 2 + region.ldy);
      }
   }

   // Set bounding boxes of regions
   function updateRegionBounds()
   {
      for(var id in regions)
         regions[id].bbox = [ 999, 999, 0, 0 ];

      for(var id in geoitems)
      {
         var item = geoitems[id];
         if(item.regions)
         {
            for(var r = 0, rcnt = item.regions.length; r < rcnt; r++)
            {
               var region = regions[item.regions[r]];

               region.bbox[0] = Math.min(region.bbox[0], item.bbox[0]);
               region.bbox[1] = Math.min(region.bbox[1], item.bbox[1]);
               region.bbox[2] = Math.max(region.bbox[2], item.bbox[2]);
               region.bbox[3] = Math.max(region.bbox[3], item.bbox[3]);
            }
         }
      }

      for(var id in regions)
      {
         var region = regions[id];
         if(region.bbox)
         {
            region.cx = (region.bbox[0] + region.bbox[2]) / 2 + region.ldx;
            region.cy = (region.bbox[1] + region.bbox[3]) / 2 + region.ldy;

            if(!projection)
            {
               region.cx = parseInt(region.cx);
               region.cy = parseInt(region.cy);
            }
         }
      }
   }

   function onYear(year)
   {
      currentYear = year;

      if(resized)
         me.resize(resized);
      else if(draw && dynamiccolors)
         colorizeMap(dynamiccolors, true);

      dispatcher.dispatch(me, 'year', year);
   }

   function onGeoItem(id)
   {
      if(settings.events.click == 'zoom')
      {
         if(lastzoom == id)
            me.zoom();
         else
            me.zoom(id);
      }
      else
         dispatcher.dispatch(me, 'click', { target: me, geoitem: id });
   }

   function onIndicator(id)
   {
      if(!id)
         return;

      if(settings.busy)
         settings.busy.style.display = 'block';

      var indic = datamanager.indicators[id];
      if(!indic.values)
         return;

      var legend = datamanager.parseLegend(id);
      if(legend.length)
         settings.legend = legend;

      dispatcher.dispatch(me, 'legend', legend);

      minYear = indic.statistics.range.from;
      maxYear = indic.statistics.range.to;

      for(var geo in geoitems)
         geoitems[geo].values = {};

      for(var geo in indic.values)
      {
         var ivalues = indic.values[geo];

         var geoitem = geoitems[geo] ? geoitems[geo] : regions[geo];
         if(!geoitem)
            continue;

         for(var y in ivalues)
            geoitem.values[y] = ivalues[y];
      }

      if(settings.busy)
         settings.busy.style.display = 'none';

      currentIndicator = id;

      if(legend.length)
         colorizeMap(null, true);

      dispatcher.dispatch(me, 'indicator', id);
   }

   function setValues(year, values, suppress)
   {
      if(values === undefined && suppress === undefined)
      {
         values = year;
         year = new Date().getFullYear();
      }
      else if(typeof values == 'boolean' && suppress === undefined)
      {
         suppress = values;
         values = year;
         year = new Date().getFullYear();
      }
      else
      {
         minYear = minYear ? Math.min(minYear, year) : year;
         maxYear = maxYear ? Math.max(maxYear, year) : year;
      }

      if(values instanceof Function)
      {
         for(var id in geoitems)
            geoitems[id].values[year] = values(id);
      }
      else
      {
         settings.values = values;

         for(var id in geoitems)
            geoitems[id].values[year] = {};

         for(var id in values)
         {
            if(geoitems[id])
               geoitems[id].values[year] = values[id];
            else
            {
               if(!regions[id])
                  regions[id] = { id: id, values: {}, ldx: 0, ldy: 0, bbox: [999,999,0,0] };

               regions[id].values[year] = values[id];
            }
         }
      }

      if(!suppress)
      {
         if(settings.state.year)
            statemanager.set('year', year);
         else
            onYear(year);
      }
   }

   function legendColor(id)
   {
      var vals;
      var legend = settings.legend;

      if(!legend)
         return settings.map.nodata;

      if(!currentYear && settings.state.year)
      {
         currentYear = statemanager.get('year');
         if(currentYear)
            dispatcher.dispatch(me, 'year', currentYear);
      }

      var hasexploded = 0;
      if(regionmode)
      {
         if(explodecnt)
         {
            var georegions = geoitems[id].regions;
            var dx = explodecnt == regionmode && regionmode < georegions.length - 1 ? 0 : 1;

            for(var l = regionmode - dx; l >= 0; l--)
            {
               var r = georegions[l];

               if(!exploded[r])
               {
                  if(regions[r])
                     vals = regions[r].values;
               }
               else if(l == 0)
               {
                  vals = geoitems[id].values;

                  if(exploded[r])
                     hasexploded++;

                  break;
               }
               else
                  hasexploded++;
            }
         }

         // This assumes that the list of exploded is a single chain, no sibling regions
         if(hasexploded != explodecnt && settings.explode.siblings)
            return settings.explode.siblings;

         if(!vals)
         {
            var r = geoitems[id].region;
            if(!r)
            {
               if(settings.map.noregion)
                  return settings.map.noregion;

               vals = geoitems[id].values;
            }
            else
               vals = regions[r].values;
         }
      }
      else
      {
         if(explodecnt)
         {
            var georegions = geoitems[id].regions;

            for(var r = 0, rcnt = georegions.length; r < rcnt; r++)
               if(exploded[georegions[r]])
                  hasexploded++;

            if(!hasexploded)
               return settings.explode.siblings;
         }

         vals = geoitems[id].values;
      }

      var v;
      if(settings.latest)
      {
         var latest = mw.support.latest(vals, currentYear, settings.latest);
         v = latest.value;
      }
      else
         v = vals[currentYear];

      var color =  mw.support.legendColor(legend, v);

      if(color && settings.map.opacity < 1)
      {
         color = mw.support.css2rgb(color);
         color[3] = settings.map.opacity;

         return mw.support.rgb2css(color);
      }
      else
         return color;
   }

   function getScaleData(id)
   {
      if(datamanager)
      {
         if(resized instanceof Object)
            var scaledata = resized;
         else if(datamanager.indicators[resized])
            var scaledata = datamanager.indicators[resized].scale;
         else
         {
            var scaledata = {};
            resized = false;
         }
      }
      else if(resized instanceof Object)
         var scaledata = resized;

      if(scaledata)
         scaledata = scaledata[id];

      if(scaledata && scaledata.scale == undefined)
         scaledata = scaledata[currentYear];

      return scaledata;
   }

   function drawCanvas(drawRegionBorder, skiphit)
   {
      if((zooming && projection) || locked)
         return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if(!skiphit)
         skiphit = !(resizeStep == 0 || resizeStep == 1);

      if(!skiphit)
         hitctx.clearRect(0, 0, canvas.width, canvas.height);

      // If we are in region mode, we don't show inner borders, but some map data might have
      // 'gaps', so stroke the items in region mode to close those gaps when fillgaps is true
      var stroke = settings.map.fillgaps && regionmode && !resized && resizeStep == 1;

      var ox = settings.map.offset.x + settings.map.padding;
      var oy = settings.map.offset.y + settings.map.padding;

      var smh = settings.map.highlight;
      var smhf = smh instanceof Function;

      var f = settings.map.retina || 1;
      for(var id in geoitems)
      {
         var item = geoitems[id];

         if(resizing || resized)
         {
            var scale1 = item.scale.from;
            var scale2 = item.scale.to;

            var s1 = scale1.scale == -1 ? 0 : scale1.scale;
            var s2 = scale2.scale == -1 ? 0 : scale2.scale;

            var s  = s1 + (s2 - s1) * resizeStep;
            var dx = scale1.dx + (scale2.dx - scale1.dx) * resizeStep;
            var dy = scale1.dy + (scale2.dy - scale1.dy) * resizeStep;

            item.scale.current = { scale: s, dx: dx, dy: dy };
         }

         if(lasthover == id && smh)
            var color = (smhf ? smh(id) : smh) || item.color;
         else
            var color = item.color;

         if(color == undefined)
            color = settings.map.nodata;

         ctx.lineWidth = stroke ? 1 : 0;
         ctx.fillStyle = color;
         ctx.strokeStyle = color;

         if(!skiphit)
            hitctx.fillStyle = item.hitcolor;

         ctx.beginPath();

         if(!skiphit)
            hitctx.beginPath();

         var circle = false;
         for(var i = 0, ic = item.coords.length; i < ic; i++)
         {
            var coords = item.coords[i];

            if((resized || resizeStep < 1) && !coords[0])
               continue;

            for(var j = 1, jc = coords.length; j < jc; j++)
            {
               var x = coords[j][0];
               var y = coords[j][1];

               if(scale1)
               {
                  x = (x - ox) * s + settings.map.scale * dx + ox;
                  y = (y - oy) * s + settings.map.scale * dy + oy;

                  circle = settings.circles && scale1 && resizeStep == 1 && scale2.scale == 0;
               }

               if(projection)
               {
                  var xy = projection(y, x);
                  x = xy.x; y = xy.y;
               }
               else
               {
                  x = currentScale * (x + offsetX);
                  y = currentScale * (y + offsetY);
               }

               if(circle)
               {
                  ctx.lineWidth = 0.25;

                  ctx.arc(f * x, f * y, 2, 0, 360, false);
                  hitctx.arc(f * x, f * y, 2, 0, 360, false);
               }
               else
               {
                  ctx[j == 1 ? 'moveTo' : 'lineTo'](f * x, f * y);

                  if(!skiphit)
                     hitctx[j == 1 ? 'moveTo' : 'lineTo'](x, y);
               }
            }
         }

         if(!circle)
            ctx.fill();

         if(color && (stroke || circle))
            ctx.stroke();

         if(!skiphit)
            hitctx.fill();
      }

      // Draw actual borders
      if(!resizing && !resized)
      {
         var styles = settings.borders[regionmode] || settings.borders;

         for(var b = 0, bcnt = borders.length; b < bcnt; b++)
         {
            var border = borders[b];
            var geo1 = geoitems[border.geo1];
            var geo2 = geoitems[border.geo2];

            if(!geo1 || !geo2)
               continue;

            var style = undefined;
            if(!explodecnt && styles instanceof Array)
            {
               if(geo1.regions)
               {
                  for(var s = styles.length; s > 0; s--)
                  {
                     if(geo1.regions[s-1] != geo2.regions[s-1])
                     {
                        style = styles[s];
                        break;
                     }
                  }
               }

               if(!style)
                  style = styles[0];

               if(!style)
                  continue;
            }
            else if(!regionmode)
            {
               if(styles instanceof Array)
                  style = styles[0];
               else
                  style = styles;
            }
            else
            {
               if(explodecnt)
               {
                  var regions1 = geoitems[border.geo1].regions;
                  var regions2 = geoitems[border.geo2].regions;
                  for(var l = regionmode - 1; l >= 0; l--)
                  {
                     var r1 = regions1[l];
                     var r2 = regions2[l];

                     if(r1 != r2)
                     {
                        style = styles;
                        break;
                     }
                     else if(!exploded[r1])
                        break;
                     else if(l == 0)
                        style = styles;
                  }

                  if(style instanceof Array)
                  {
                     while(!style[++l])
                        ;
                     style = style[l];
                  }

                  if(!style)
                     continue;
               }
               else if(geo1.region && geo1.region == geo2.region)
                  continue;
               else
                  style = styles;
            }

            var type = border.type || 'regular';
            var coords = border.coords;
            var pattern = style.patterns[type];

            if(ctx.setLineDash)
               ctx.setLineDash(pattern ? pattern : []);

            ctx.beginPath();

            if(style instanceof Function)
               style = style(border.geo1, border.geo2);

            ctx.strokeStyle = style.color;
            ctx.lineWidth = style.width;

            var lx, ly;
            for(var j = 0, jc = coords.length; j < jc; j++)
            {
               var x = coords[j][0];
               var y = coords[j][1];

               if(projection)
               {
                  var xy = projection(y, x);
                  x = xy.x; y = xy.y;
               }
               else
               {
                  x = currentScale * (x + offsetX);
                  y = currentScale * (y + offsetY);
               }

               if(j == 0)
                  ctx.moveTo(f * x, f * y);
               else if(!pattern || ctx.setLineDash)
                  ctx.lineTo(f * x, f * y);
               else
                  ctx.dashedLineTo(f * lx, f * ly, f * x, f * y, pattern);

               lx = x; ly = y;
            }

            ctx.stroke();
         }
      }
   }

   function coordCanvas(event)
   {
      var pos = mw.support.mousepos(event);

      // Each polygon in hitctx has its own distinct color. However, if the
      // canvas is anti-aliasing, pixels on edges can get a inbetween-color.
      // Try to find a close-by exact match of a known hitctx color, starting
      // at the mouse position

      var data = hitctx.getImageData(pos.x - 2, pos.y - 2, 5, 5);
      var pixels = data.data;

      var center = (2 * data.width + 3) * 4;
      for(var d = 0; d <= center; d += 4)
      {
         var pos = center + d;
         var col = (pixels[pos] << 16) | (pixels[pos + 1] << 8) | pixels[pos + 2];

         if(hitmap[col])
            return hitmap[col];

         if(d)
         {
            pos = center - d;
            col = (pixels[pos] << 16) | (pixels[pos + 1] << 8) | pixels[pos + 2];

            if(hitmap[col])
               return hitmap[col];
         }
      }

      return undefined;
   }

   function drawVML(drawRegionBorder)
   {
      var mr = Math.round;
      var sp = mw.Map.VMLSUBPIXEL;

      var ox = settings.map.offset.x + settings.map.padding;
      var oy = settings.map.offset.y + settings.map.padding;

      var stroke = settings.map.fillgaps && regionmode && !resized && resizeStep == 1 ? "true" : "false";

      var smh = settings.map.highlight;
      var smhf = smh instanceof Function;

      for(var id in geoitems)
      {
         var item = geoitems[id];

         if(lasthover == id && smh)
            var color = smhf ? smh(id) : smh;
         else
            var color = item.color;

         var scalepaths = [];
         var noscalepaths = [];

         for(var i = 0, ic = item.coords.length; i < ic; i++)
         {
            var coords = item.coords[i];

            for(var j = 1, jc = coords.length; j < jc; j++)
            {
               if(coords[0])
                  scalepaths.push(j == 1 ? ' m ' : ' l ', mr(sp * (coords[j][0] - ox)), ',', mr(sp * (coords[j][1] - oy)));
               else
                  noscalepaths.push(j == 1 ? ' m ' : ' l ', mr(sp * (coords[j][0] - ox)), ',', mr(sp * (coords[j][1] - oy)));
            }
         }

         if(scalepaths.length)
         {
            var s = '<v:shape id="' + id + '" filled="true" stroked="true" style="left: ' + ox + 'px; top: ' + oy + 'px; position:absolute; width:10px; height:10px"';
            s += ' coordorigin="0 0" coordsize="' + (10 * sp)+ ' ' + (10 * sp) + '" path="' + scalepaths.join('') + '"><v:fill color="' + color + '"></v:fill><v:stroke on="' + stroke + '" color="' + color + '"></v:stroke></v:shape>';
            map.insertAdjacentHTML('BeforeEnd', s);
         }

         if(noscalepaths.length)
         {
            var s = '<v:shape id="' + id + '" class="noscale" filled="true" stroked="true" style="left: ' + ox + 'px; top: ' + oy + 'px; position:absolute; width:10px; height:10px"';
            s += ' coordorigin="0 0" coordsize="' + (10 * sp)+ ' ' + (10 * sp) + '" path="' + noscalepaths.join('') + '"><v:fill color="' + color + '"></v:fill><v:stroke on="' + stroke + '" color="' + color + '"></v:stroke></v:shape>';
            map.insertAdjacentHTML('BeforeEnd', s);
         }
      }

      drawVMLBorder(false);

      if(drawRegionBorder && regionmode)
      {
         drawVMLBorder(true);
         document.getElementById('borders-geo').style.display = 'none';
      }

      // From now on, manipulate the existing shapes
      draw = drawVML2;
   }

   function drawVMLBorder(drawRegionBorder)
   {
      var mr = Math.round;
      var sp = mw.Map.VMLSUBPIXEL;

      var parts = {}, sdefs = {};
      var styles = settings.borders[regionmode] || settings.borders;

      for(var b = 0, bcnt = borders.length; b < bcnt; b++)
      {
         var border = borders[b];
         var geo1 = geoitems[border.geo1];
         var geo2 = geoitems[border.geo2];

         if(!geo1 || !geo2)
            continue;

         var style = undefined;
         if(!explodecnt && styles instanceof Array)
         {
            if(geo1.regions)
            {
               for(var s = styles.length; s > 0; s--)
               {
                  if(geo1.regions[s-1] != geo2.regions[s-1])
                  {
                     style = styles[s];
                     break;
                  }
               }
            }

            if(!style)
               style = styles[0];

            if(!style)
               continue;
         }
         else if(!regionmode)
         {
            if(styles instanceof Array)
               style = styles[0];
            else
               style = styles;
         }
         else
         {
            if(explodecnt)
            {
               var regions1 = geoitems[border.geo1].regions;
               var regions2 = geoitems[border.geo2].regions;
               for(var l = regionmode - 1; l >= 0; l--)
               {
                  var r1 = regions1[l];
                  var r2 = regions2[l];

                  if(r1 != r2)
                  {
                     style = styles;
                     break;
                  }
                  else if(!exploded[r1])
                     break;
                  else if(l == 0)
                     style = styles;
               }

               if(style instanceof Array)
               {
                  while(!style[++l])
                     ;
                  style = style[l];
               }

               if(!style)
                  continue;
            }
            else if(geo1.region && geo1.region == geo2.region)
               continue;
            else
               style = styles;
         }

         var type = border.type || 'regular';
         var coords = border.coords;

         if(!parts[type])
            parts[type] = [];

         for(var j = 0, jc = coords.length; j < jc; j++)
            if(!drawRegionBorder || (geo1.region != geo2.region))
               parts[type].push(j == 0 ? ' m ' : ' l ', mr(sp * coords[j][0]), ',', mr(sp * coords[j][1]));

         sdefs[type] = style;
      }

      var b = '<v:group id="borders-' + (drawRegionBorder ? 'region' : 'geo') + '" coordorigin="0 0" coordsize="100 100" style="position:absolute; width:100px; height:100px">';

      for(var type in parts)
      {
         var style = sdefs[type];

         var c = style.color;
         var w = style.width;
         var pattern = style.patterns[type];

         b += '<v:shape filled="false" stroked="true" style="position:absolute; width:10px; height:10px"';
         b += ' coordorigin="0 0" coordsize="' + (10 * sp)+ ' ' + (10 * sp) + '" path="' + parts[type].join('') + '"><v:stroke weight="' + w + '" color="' + c + '"';
         if(pattern)
            b += ' dashstyle="' + (sp * pattern[0]) + ' ' + (sp * pattern[1]) + '"';
         b += '></v:stroke></v:shape>';
      }
      b += '</v:group>';

      map.insertAdjacentHTML('BeforeEnd', b);
   }

   function drawVML2(drawRegionBorder)
   {
      var sp = mw.Map.VMLSUBPIXEL;

      var stroke = settings.map.fillgaps && regionmode && !resized && resizeStep == 1 ? "true" : "false";

      var smh = settings.map.highlight;
      var smhf = smh instanceof Function;

      for(var i = 0, cnt = map.childNodes.length; i < cnt; i++)
      {
         var shape = map.childNodes[i];
         var id = shape.id;
         var item = geoitems[id];

         if(!item)
            continue;

         if(resizing || resized)
         {
            var scale1 = item.scale.from;
            var scale2 = item.scale.to;

            if(!scale2 || scale2.scale == -1 || shape.className == 'noscale')
               shape.style.display = 'none';
            else
            {
               var s  = scale1.scale + (scale2.scale - scale1.scale) * resizeStep;
               var dx = scale1.dx + (scale2.dx - scale1.dx) * resizeStep;
               var dy = scale1.dy + (scale2.dy - scale1.dy) * resizeStep;

               item.scale.current = { scale: s, dx: dx, dy: dy };

               var cox = (sp * -dx * resizeStep) / s * settings.map.scale;
               var coy = (sp * -dy * resizeStep) / s * settings.map.scale;

               shape.style.display = 'block';
               shape.coordsize = (10 * sp / s) + ' ' + (10 * sp / s);
               shape.coordorigin = cox + ' ' + coy;
            }
         }
         else
            shape.style.display = 'block';

         if(lasthover == id && smh)
            var color = smhf ? smh(id) : smh;
         else
            var color = item.color;

         shape.childNodes[0].color = color;
         shape.childNodes[1].color = color;
         shape.childNodes[1].on = stroke;
      }

      var bregion = document.getElementById('borders-region');
      if(drawRegionBorder && regionmode)
      {
         if(bregion)
            bregion.parentNode.removeChild(bregion);

         drawVMLBorder(true);
      }

      document.getElementById('borders-geo').style.display = resized || resizeStep < 1 || regionmode ? 'none' : 'block';

      if(document.getElementById('borders-region'))
         document.getElementById('borders-region').style.display = !scale1 && regionmode ? 'block' : 'none';
   }

   function coordVML(event)
   {
      return event.srcElement.id;
   }

   // FIXME use for on-screen SVG later on
   function drawSVG(drawRegionBorder, accuracy, animation)
   {
      var oldresized = resized;
      if(animation)
         resized = animation;

      var stroke = settings.map.fillgaps && regionmode && !resized && resizeStep == 1;
      var transform = '<animateTransform attributeName="transform" attributeType="XML" repeatCount="1" fill="freeze" ';
      var duration = settings.speed.resize;

      var ox = settings.map.offset.x + settings.map.padding;
      var oy = settings.map.offset.y + settings.map.padding;

      var smh = settings.map.highlight;
      var smhf = smh instanceof Function;

      var svg = '<g id="map">';
      for(var id in geoitems)
      {
         var item = geoitems[id];
         var circle = false;

         if(animation)
         {
            var scale = getScaleData(id) || { scale: 0, dx: 0, dy: 0 };
            circle = settings.circles && scale.scale == 0;
         }
         else if(resizing || resized)
         {
            var scale1 = item.scale.from;
            var scale2 = item.scale.to;

            if((scale1 && scale1.scale == -1) || (scale2 && scale2.scale == -1))
               continue;

            circle = settings.circles && scale1 && resizeStep == 1 && scale2.scale == 0;
         }

         svg += '<g id="' + id + '">';

         if(lasthover == id && smh)
            var color = smhf ? smh(id) : smh;
         else
            var color = item.color;

         // Adobe Illustrator does not like rgba()
         color = mw.support.stripAlpha(color);

circle:
         for(var i = 0, ic = item.coords.length; i < ic; i++)
         {
            var path = [];
            var coords = item.coords[i];

            if(!animation && (resized || resizeStep < 1) && !coords[0])
               continue;

            var lx, ly;
            for(var j = 1, jc = coords.length; j < jc; j++)
            {
               var x = coords[j][0];
               var y = coords[j][1];

               if(scale1 && scale2)
               {
                  var s  = scale1.scale + (scale2.scale - scale1.scale) * resizeStep;
                  var dx = scale1.dx + (scale2.dx - scale1.dx) * resizeStep;
                  var dy = scale1.dy + (scale2.dy - scale1.dy) * resizeStep;

                  x = (x - ox) * s + settings.map.scale * dx + ox;
                  y = (y - oy) * s + settings.map.scale * dy + oy;
               }
               else if(animation)
               {
                  x -= ox;
                  y -= oy;
               }

               x = currentScale * (x + offsetX);
               y = currentScale * (y + offsetY);

               x = Math.round(x * accuracy) / accuracy;
               y = Math.round(y * accuracy) / accuracy;

               if(circle)
               {
                  svg += '<circle cx="0" cy="0" transform="translate(' + x + ' ' + y + ')" r="2" ';
                  svg += 'stroke-width="1" fill="none" stroke="' + color.color + '"';
                  if(color.opacity)
                     svg += ' stroke-opacity="' + color.opacity + '"';

                  if(animation)
                     svg += '>' + transform + 'dur="' + duration + 's" additive="sum" type="scale" from="0" to="1"/></circle>';
                  else
                     svg += '/>';

                  break circle;
               }
               else if(j == 1 || !lx || !ly)
                  path.push(j == 1 ? 'M' : 'L', x, ',', y);
               else
               {
                  var dx = Math.round((x - lx) * accuracy) / accuracy;
                  var dy = Math.round((y - ly) * accuracy) / accuracy;

                  if(dx == 0)
                     path.push('v', dy);
                  else if(dy == 0)
                     path.push('h', dx);
                  else
                  {
                     if(dx >= 0 && dx < 1)
                        dx = String(dx).substr(1);
                     if(dy >= 0 && dy < 1)
                        dy = String(dy).substr(1);
                     if(dx < 0 && dx > -1)
                        dx = '-' + String(dx).substr(2);
                     if(dy < 0 && dy > -1)
                        dy = '-' + String(dy).substr(2);

                     path.push('l', dx, ',', dy);
                  }
               }

               lx = x; ly = y;
            }

            if(animation)
               svg += '<g>';

            svg += '<path fill="' + color.color + '" ' + (stroke ? 'stroke="' + color.color + '" ' : '')
            if(color.opacity)
               svg += ' opacity="' + color.opacity + '" ';
            svg += 'd="' + path.join('') + 'Z"';

            if(animation)
               svg += '>' + transform + 'dur="' + (coords[0] ? duration : 0.01) + 's" type="scale" from="1" to="' + (coords[0] && scale.scale != -1 ? scale.scale : 0) + '"/></path>';
            else
               svg += '/>';

            if(animation)
            {
               svg += transform + 'dur="' + duration + 's" type="translate" from="0 0" to="' + (settings.map.scale * scale.dx) + ' ' + (settings.map.scale * scale.dy) + '"/>';
               svg += '</g>';
            }
         }

         svg += '</g>';
      }

      if(!resized || animation)
      {
         if(regionmode)
            svg += drawSVGBorder(true, accuracy, animation);
         else
            svg += drawSVGBorder(false, accuracy, animation);
      }

      svg += '</g>';

      resized = oldresized;

      return svg;
   }

   function drawSVGBorder(drawRegionBorder, accuracy, animation)
   {
      var parts = {};
      var styles = settings.borders[regionmode] || settings.borders;

      var ox = settings.map.offset.x + settings.map.padding;
      var oy = settings.map.offset.y + settings.map.padding;

      for(var b = 0, bcnt = borders.length; b < bcnt; b++)
      {
         var border = borders[b];
         var geo1 = geoitems[border.geo1];
         var geo2 = geoitems[border.geo2];

         if(!geo1 || !geo2)
            continue;

         var style = undefined;
         if(!explodecnt && styles instanceof Array)
         {
            if(geo1.regions)
            {
               for(var s = styles.length; s > 0; s--)
               {
                  if(geo1.regions[s-1] != geo2.regions[s-1])
                  {
                     style = styles[s];
                     break;
                  }
               }
            }

            if(!style)
               style = styles[0];

            if(!style)
               continue;
         }
         else if(!regionmode)
            style = styles;
         else
         {
            if(explodecnt)
            {
               var regions1 = geoitems[border.geo1].regions;
               var regions2 = geoitems[border.geo2].regions;
               for(var l = regionmode - 1; l >= 0; l--)
               {
                  var r1 = regions1[l];
                  var r2 = regions2[l];

                  if(r1 != r2)
                  {
                     style = styles;
                     break;
                  }
                  else if(!exploded[r1])
                     break;
                  else if(l == 0)
                     style = styles;
               }

               if(style instanceof Array)
               {
                  while(!style[++l])
                     ;
                  style = style[l];
               }

               if(!style)
                  continue;
            }
            else if(geo1.region && geo1.region == geo2.region)
               continue;
            else
               style = styles;
         }

         var type = border.type || 'regular';
         var coords = border.coords;

         if(!parts[type])
            parts[type] = [];

         for(var j = 0, jc = coords.length; j < jc; j++)
         {
            if(!drawRegionBorder || (geo1.region != geo2.region))
            {
               var x = coords[j][0];
               var y = coords[j][1];
               if(animation)
               {
                  x -= ox;
                  y -= oy;
               }

               x = currentScale * (x + offsetX);
               y = currentScale * (y + offsetY);

               parts[type].push(j == 0 ? 'M' : 'L', Math.round(x * accuracy) / accuracy, ',', Math.round(y * accuracy) / accuracy);
            }
         }
      }

      // Adobe Illustrator does not like rgba()
      var c = mw.support.stripAlpha(style.color);
      var w = style.width / (settings.map.retina || 1);

      var svg = '<g id="' + (drawRegionBorder ? 'region' : 'country') + '-borders">';
      for(var type in parts)
      {
         var pattern = style.patterns[type];
         svg += '<path id="' + type + '" fill="none" stroke-width="' + w + '" stroke="' + c.color + '" d="' + parts[type].join('') + '"';
         if(c.opacity)
            svg += ' stroke-opacity="' + c.opacity + '" ';
         if(pattern)
            svg += ' style="stroke-dasharray: ' + pattern[0] + ',' + pattern[1] + '"';

         if(animation)
            svg += '><animateTransform attributeName="transform" attributeType="XML" dur="0.1s" repeatCount="1" fill="freeze" type="scale" from="1" to="0"/></path>';
         else
            svg += '/>';
      }
      svg += '</g>';

      return svg;
   }

   function cloneCanvas(src, dst)
   {
      if(canvas.width && canvas.height)
      {
         // The copy should be 1:1, not at current scale
         if(src === ctx && currentScale > 1)
         {
            var _s = currentScale, _x = offsetX, _y = offsetY, _c = ctx;
            currentScale = 1; offsetX = offsetY = 0; ctx = zoomctx;
            drawCanvas(true, true);
            currentScale = _s; offsetX = _x; offsetY = _y; ctx = _c;
         }
         else
         {
            var img = src.getImageData(0, 0, canvas.width, canvas.height);
            dst.putImageData(img, 0, 0);
         }
      }
   };

   function useBigMap()
   {
      if(hasCanvas)
         cloneCanvas(zoomctx, ctx);

      transform(scale, offsetX, offsetY, false);
      bigMap = false;
   }

   function revertBigMap()
   {
      draw();

      if(hasCanvas)
         transform(1, 0, 0, false);
   }

   function colorizeMap(colors, redraw)
   {
      var haslegend = (settings.legend && settings.values) || datamanager;
      var backup;

      if(settings.color instanceof Function && colors !== dynamiccolors)
         backup = settings.color;
      else if(haslegend)
         backup = legendColor;

      if(!colors)
      {
         if(dynamiccolors && legendColor !== dynamiccolors)
            colors = dynamiccolors;
         else if(typeof settings.color == 'string' && settings.color.match(/^((rgb|hsl)a?\(.*\))|(#[0-9a-f]{3,})$/i))
            colors = settings.color;
         else
         {
            colors = backup;
            if(haslegend)
               backup = legendColor;
         }
      }

      dynamiccolors = false;
      if(colors instanceof Function)
      {
         dynamiccolors = colors;

         for(var id in geoitems)
         {
            var color = colors(id);
            if(!color && backup)
               color = backup(id);

            if(!color && haslegend)
               color = legendColor(id);

            geoitems[id].color = color;
         }
      }
      else if(typeof colors == "string")
      {
         if(colors.match(/^((rgb|hsl)a?\(.*\))|(#[0-9a-f]{3,})$/i))
         {
            for(var id in geoitems)
               geoitems[id].color = colors;
         }
         else if(!settings.state.indicator && datamanager)
         {
            datamanager.load(colors, function() {
               onIndicator(colors);
            });
            return;
         }
      }
      else
      {
         for(var id in geoitems)
            geoitems[id].color = colors && colors[id] ? colors[id] : settings.map.nodata;
      }

      if(redraw && mapready)
         draw();

      if(hasCanvas)
         cloneCanvas(ctx, zoomctx);
   }

   function transform(scale, tx, ty, dispatch)
   {
      var sp = mw.Map.VMLSUBPIXEL;

      // Force the values to a string representation *without* scientific notation
      var ma = Math.abs;

      if(ma(scale) < 0.01) scale = 0;
      if(ma(tx) < 0.01) tx = 0;
      if(ma(ty) < 0.01) ty = 0;

      if(dispatch)
         dispatcher.dispatch(me, "bounds", { zoom: scale, offset: { x: tx, y: ty } });

      if(hasCanvas && transformAttr)
      {
         if(has3dTransform)
            canvas.style[transformAttr] = 'scale3d(' + scale + ',' + scale + ',1) translate(' + tx + 'px,' + ty + 'px)';
         else
            canvas.style[transformAttr] = 'scale(' + scale + ',' + scale + ') translate(' + tx + 'px,' + ty + 'px)';
      }
      else if(hasVML)
      {
         for(var i = 0, cnt = map.childNodes.length; i < cnt; i++)
         {
            var shape = map.childNodes[i];

            if(shape.id.substr(0,8) == "borders-")
            {
               shape.coordorigin = (scale - 1) * (settings.map.offset.x + settings.map.padding) + " " + (scale - 1) * (settings.map.offset.y + settings.map.padding);
               shape = shape.childNodes[0];
            }

            var s = 1 + (scale - 1);
            shape.coordsize = (10 * sp / s) + ' ' + (10 * sp / s);

            var ox = sp * -tx;
            var oy = sp * -ty;

            shape.coordorigin = ox + ' ' + oy;
         }
      }
   }

   function cloneCountryShape(id, color, canvas)
   {
      var item = geoitems[id];
      if(!item)
         return;

      var scale;
      if(!canvas)
      {
         if(!hasCanvas)
            return;

         canvas = document.createElement('canvas');
         canvas.width = item.bbox[2] - item.bbox[0];
         canvas.height = item.bbox[3] - item.bbox[1];
         scale = 1;
      }
      else
         scale = Math.min(canvas.width / (item.bbox[2] - item.bbox[0]), canvas.height / (item.bbox[3] - item.bbox[1]));

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for(var i = 0, ic = item.coords.length; i < ic; i++)
      {
         var coords = item.coords[i];

         ctx.beginPath();
         ctx.lineWidth = 0;
         ctx.fillStyle = color;

         for(var j = 0, jc = coords.length; j < jc; j++)
            ctx[j == 0 ? 'moveTo' : 'lineTo'](scale * coords[j][0], scale * coords[j][1]);

         ctx.fill();
      }

      return canvas;
   }

   function onMouseLeave(e)
   {
      dispatcher.dispatch(me, 'hover', null);
   }

   function onMouseDown(e)
   {
      if(!mouseevents)
         return;

      e = e || window.event;

      if(document.elementFromPoint)
      {
         var p = document.elementFromPoint(e.clientX, e.clientY);
         if(p.parentNode !== map && p.parentNode !== container && !ie9)
            return;
      }

      if(hasCanvas)
      {
         var pos = mw.support.mousepos(e);

         lastX = pos.x;
         lastY = pos.y;
      }
      else if(hasVML)
      {
         lastX = e.screenX;
         lastY = e.screenY;
      }

      if(scale > 1)
         bigMap = true;

      if(userSelectAttr)
         document.getElementsByTagName('body')[0].style[userSelectAttr] = "none";

      mw.support.attachEvent(document, 'mousemove', onDrag);
      mw.support.attachEvent(document, 'mouseup', onEndDrag);
      mw.support.attachEvent(document, 'selectstart', mw.support.preventDefault);
   }

   function onMouseWheel(e)
   {
      if(!settings.zoom.wheel)
         return;
      
      e = e || window.event;

      if(document.elementFromPoint)
      {
         var p = document.elementFromPoint(e.clientX, e.clientY);
         if(p.parentNode !== map && p.parentNode !== container)
            return;
      }

      mw.support.preventDefault(e);

      useBigMap();

      var pos = mw.support.mousepos(e);
      scale = doZoom((e.wheelDelta > 0 ? 1.111111111111111111 : 0.9) * scale, pos.x, pos.y, 0, 0, true);

      revertBigMap();
   }

   function onTouchStart(e)
   {
      var pos = mw.support.mousepos(e);
      if(e.touches.length == 2 && settings.zoom && settings.zoom.pinch)
      {
         zooming = true;

         mapX = pos.x;
         mapY = pos.y;

         if('ongesturechange' in window)
         {
            mw.support.attachEvent(window, 'gesturechange', onGestureChange);
            mw.support.attachEvent(window, 'gestureend', onGestureEnd);

            mw.support.removeEvent(window, 'touchmove', onDrag);
            mw.support.removeEvent(window, 'touchend', onEndDrag);
         }
         else
         {
            var t1 = e.touches[0];
            var t2 = e.touches[1];
            var dx = t1.clientX - t2.clientX;
            var dy = t1.clientY - t2.clientY;

            startDist = Math.sqrt(dx * dx + dy * dy) / currentScale;

            var dtimer;
            mw.support.attachEvent(window, 'touchmove', function(e) {
               if(dtimer)
                  clearTimeout(dtimer);

               dtimer = setTimeout(function() {
                  onDrag(e);
               }, 5);
            });
            mw.support.attachEvent(window, 'touchend', onEndDrag);
         }
      }
      else if(e.touches.length == 1)
      {
         lastX = pos.x;
         lastY = pos.y;

         var dtimer;
         mw.support.attachEvent(window, 'touchmove', function(e) {
            if(dtimer)
               clearTimeout(dtimer);

            dtimer = setTimeout(function() {
               onDrag(e);
            }, 5);
         });
         mw.support.attachEvent(window, 'touchend', onEndDrag);
      }

      if(e.touches.length)
         bigMap = true;
   }

   function onDrag(e)
   {
      if(!mouseevents)
         return;

      e = e || window.event;
      var target = e.target || e.srcElement;

      if(canvas && target != canvas && !ie9)
         return;

      if(e.touches && e.touches.length > 1)
      {
         var t1 = e.touches[0];
         var t2 = e.touches[1];
         var dx = t1.clientX - t2.clientX;
         var dy = t1.clientY - t2.clientY;

         e.scale = Math.sqrt(dx * dx + dy * dy) / startDist;
         onGestureChange(e);
      }
      else
      {
         mw.support.preventDefault(e);

         if(hasCanvas && bigMap)
            useBigMap();

         if(mw.performance <= 40)
            revertBigMap();

         if(hasCanvas)
         {
            var pos = mw.support.mousepos(e);
            doPan(pos.x, pos.y);
         }
         else if(hasVML)
            doPan(e.screenX, e.screenY);
      }
   }

   function onEndDrag(e)
   {
      if(!mouseevents)
         return;

      e = e || window.event;
      mw.support.preventDefault(e);

      if(panning)
         revertBigMap();

      if(userSelectAttr)
         document.getElementsByTagName('body')[0].style[userSelectAttr] = userSelectVal;

      if(e.type == 'touchend')
      {
         if(zooming)
         {
            onGestureEnd(e);
            scale = currentScale;
         }
         else if(panning)
         {
            clearTimeout(shortlongTimer);
            shortlongTimer = null;
         }

         mw.support.removeEvent(window, 'touchmove', onDrag);
         mw.support.removeEvent(window, 'touchend', onEndDrag);
      }
      else
      {
         if(!panning && settings.events.click)
            doClick(e);

         mw.support.removeEvent(document, 'mousemove', onDrag);
         mw.support.removeEvent(document, 'mouseup', onEndDrag);
         mw.support.removeEvent(document, 'selectstart', mw.support.preventDefault);
      }

      panning = false;

      if(coloronzoomend !== null)
      {
         colorizeMap(coloronzoomend, true)
         coloronzoomend = null;
      }
   }

   function onGestureChange(e)
   {
      mw.support.preventDefault(e);
      if(bigMap)
         useBigMap();

      doZoom(e.scale * scale, mapX, mapY, 0, 0, true);
   }

   function onGestureEnd(e)
   {
      mw.support.preventDefault(e);

      revertBigMap();

      mw.support.removeEvent(window, 'gesturechange', onGestureChange);
      mw.support.removeEvent(window, 'gestureend', onGestureEnd);

      zooming = false;

      if(coloronzoomend !== null)
      {
         colorizeMap(coloronzoomend, true)
         coloronzoomend = null;
      }
   }

   function getTarget(id)
   {
      if(regionmode && id)
      {
         if(explodecnt)
         {
            var georegions = geoitems[id].regions;
            for(var l = regionmode - 1; l >= 0; l--)
            {
               var r = georegions[l];

               if(!exploded[r])
                  return r;
            }
         }
         else if(geoitems[id] && (geoitems[id].region || settings.map.noregion))
            return geoitems[id].region;
      }

      return id;
   }

   function doHover(event)
   {
      if(!event || editing)
         return;

      var target = event.target || event.srcElement;

      // IE9 has some difficulties with the event model - targets are not what they should be...
      if(target.parentNode !== map && !ie9)
         return;

      var id;
      if(event && event.type !== 'mouseout')
         id = getTarget(coord2geo(event));

      var item = geoitems[id] ? geoitems[id] : regions[id];

      var follow = settings.events.hover == "follow";
      if(lasthover != id || (id && follow))
      {
         var e;

         if(id && item)
         {
            e = {
               target: me,
               geoitem: id,
               indicator: settings.color !== false && currentIndicator ? currentIndicator : (typeof resized == "string" ? resized : undefined)
            };

            if(follow)
            {
               if(!hasCanvas && hasVML)
               {
                  e.x = event.x;
                  e.y = event.y;

                  // Sometimes IE serves us with a coordinate value which is too high
                  if(event.y == event.clientY)
                  {
                     var o = mw.support.offset(map)
                     e.y -= o.top;
                  }
               }
               else
               {
                  var pos = mw.support.mousepos(event);
                  e.x = pos.x;
                  e.y = pos.y;
               }
            }
            else
            {
               var c = me.center(id);
               e.x = c.x;
               e.y = c.y;
            }
         }
         else
            e = null;

         if(lasthover != id || (follow && lasthover))
            dispatcher.dispatch(me, "hover", e);

         var smh = settings.map.highlight;

         if(smh && lasthover != id)
         {
            var smhf = smh instanceof Function;

            // Optimize IE VML a bit further...
            if(lasthover && !hasCanvas && hasVML)
            {
               var shape = document.getElementById(lasthover);
               if(shape)
                  shape.childNodes[0].color = shape.childNodes[1].color = geoitems[lasthover].color;
            }

            if(!hasCanvas && hasVML)
            {
               if(id)
               {
                  var shape = document.getElementById(id);
                  if(shape)
                     shape.childNodes[0].color = shape.childNodes[1].color = smhf ? smh(id) : smh;
               }
            }
            else
            {
               lasthover = id;
               draw();
            }
         }

         lasthover = id;
      }
   }

   function doClick(event)
   {
      if(editing)
         return;

      var target = event.target || event.srcElement;

      var hit = target.parentNode == map || target == map;
      // IE9/10 don't support pointer-events in HTML - layers may refire
      if(!hit && navigator.appName == 'Microsoft Internet Explorer')
         hit = target.parentNode.parentNode == map.parentNode;

      var id = getTarget(coord2geo(event));
      if((event.button == undefined || event.button <= 1) && hit)
      {
         if(settings.state.geoitem)
            statemanager.set('geoitem', id);
         else
            onGeoItem(id);
      }
   }

   function zoomcenter2offset(newScale, newX, newY, unconstrained)
   {
      // Constrain zoom to allowed range
      newScale = Math.max(settings.zoom.minimum, Math.min(maxzoom, newScale));

      // Constrain mouse coordinates to size of map
      var mX = Math.min(map.clientWidth, Math.max(0, newX));
      var mY = Math.min(map.clientHeight, Math.max(0, newY));

      // Calculate required offset for given scale and zoom center
      var oX = (mX / newScale) - (mX / currentScale - offsetX);
      var oY = (mY / newScale) - (mY / currentScale - offsetY);

      // Constrain offset such that zoomed map respects edges
      if(!unconstrained)
      {
         oX = Math.max((1 - newScale) * map.clientWidth / newScale, Math.min(0, oX));
         oY = Math.max((1 - newScale) * map.clientHeight / newScale, Math.min(0, oY));
      }

      return [ newScale, oX, oY ];
   }

   function doZoom(newScale, newX, newY, dx, dy, dispatch, unconstrained)
   {
      var sxy = zoomcenter2offset(newScale, newX, newY, unconstrained);
      currentScale = sxy[0]; offsetX = sxy[1]; offsetY = sxy[2];

      transform(currentScale, offsetX - dx, offsetY - dy, dispatch);

      var z = settings.zoom.type == 'exponential' ? Math.ceil(Math.log(currentScale)/Math.log(2)) + 1 : currentScale;

      if(zoomslider)
         zoomslider.set(z);

      container.className = container.className.replace(/ ?map-zoom-\d+/, '');
      container.className += " map-zoom-" + Math.round(z);

      if(dispatch)
         dispatcher.dispatch(me, "zoomend");

      return currentScale;
   }

   function doPan(x, y)
   {
      if(x != lastX || y != lastY)
      {
         panning = true;

         if(offsetX || offsetY)
            dispatcher.dispatch(me, "pan", { x: x - lastX, y: y - lastY });

         offsetX += (x - lastX) / scale;
         offsetY += (y - lastY) / scale;

         offsetX = Math.max((1 - scale) * map.clientWidth / scale, Math.min(0, offsetX));
         offsetY = Math.max((1 - scale) * map.clientHeight / scale, Math.min(0, offsetY));

         transform(scale, offsetX, offsetY, true);

         if(mw.performance <= 40 || ie9)
            revertBigMap();

         lastX = x;
         lastY = y;
      }
   }

   function getSVG(accuracy, animation)
   {
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="' + map.clientWidth + 'px" height="' + map.clientHeight + 'px" viewBox="0 0 ' + map.clientWidth + ' ' + map.clientHeight + '">';
      svg += drawSVG(false, Math.pow(10, accuracy), animation);

      for(var l = 0, lcnt = settings.layers.length; l < lcnt; l++)
      {
         var layer = settings.layers[l];
         if(layer && layer.exportSVG)
         {
            var o = layer.exportSVG();
            if(o)
               svg += o;
         }
      }
      svg += '</svg>';

      return svg;
   }

   function exportSVG(download, parameters, format)
   {
      var options = mw.support.extend(settings['export'], {});
      mw.support.extend(parameters, options);

      var oldduration = settings.speed.resize;
      settings.speed.resize = parameters.duration || settings.speed.resize;

      var svg = getSVG(parameters.accuracy == undefined ? 1 : parameters.accuracy, parameters.resize);

      settings.speed.resize = oldduration;

      if(download === true)
      {
         options.download = true;
         options.format = format || svg;
         options.content = svg;

         mw.support.sendToServer(true, settings['export'].renderer, options);
         return true;
      }
      else if(download)
      {
         var w = window.open('', download);
         var cd = w.document;

         cd.body.innerHTML = svg;
         return true;
      }
      else
         return svg;
   }

   function exportPNG(download, parameters)
   {
      var options = mw.support.extend(settings['export'], {});
      mw.support.extend(parameters, options);

      options.download = true;
      options.format = 'png';
      options.content = getSVG(parameters.accuracy == undefined ? 1 : parameters.accuracy);

      if(settings.legend || (datamanager && currentIndicator))
         options.content += mw.support.legendHTML(settings.legend ? settings.legend : datamanager.indicators[currentIndicator]);

      if(!download || download !== true)
      {
         options.encoding = 'base64';

         var png = mw.support.sendToServer(false, settings['export'].renderer, options);

         if(download)
         {
            var w = window.open('', download);
            var cd = w.document;

            var img = cd.createElement('img');
            img.src = 'data:image/png;base64,' + png;

            cd.body.appendChild(img);
         }
         else
            return png;
      }
      else
      {
         mw.support.sendToServer(true, settings['export'].renderer, options);
         return true;
      }
   }
};

// Nice prime number which gives us ca 4200 unique colors
mw.Map.HITCOLORSTEP = 4001;
mw.Map.VMLSUBPIXEL = 100;

mw.map  = mw.map || {};
mw.map.layers = mw.map.layers || {};

mw.map.layers.BELOW = 1;
mw.map.layers.ABOVE = 2;
mw = window.mw || {};

mw.map  = mw.map || {};
mw.map.layers = mw.map.layers || {};

mw.map.layers.Arrows = function(options)
{
   var me;
   var map;
   var layer;
   var geoitems = {};
   var maxValues = {};
   var crossRefs = {};
   var valueYears = {};
   var currentYear;
   var currentItem;
   var drawArrow;
   var coord2geo;
   var mapinmotion = 0;
   var zoom = 1;

   var statemanager;
   var datamanager;

   var canvas;                                        // Canvas and drawing context
   var ctx;

   var hitctx;                                        // Canvas context for mouse hit tests
   var hitmap = {};                                   // Map from hitctx color value to ID
   var lasthit;                                       // Keep track of last hit item

   var busy;

   var dispatcher = new mw.Dispatcher();

   var settings = mw.support.extend(options || {}, {
      indicator: false,                               // Dot not listen to state; if TRUE: listen, if string: fixed indicator
      color: {
         incoming: 'rgba(255,0,0,0.5)',
         outgoing: 'rgba(0,0,255,0.5)'
      },
      stroke: {
         width: 1,
         incoming: 'rgb(255,255,255)',
         outgoing: 'rgb(255,255,255)'
      },

      incoming: true,                                 // Show incoming arrows
      outgoing: true,                                 // Show outgoing arrows

      items: null,                                    // If set, use as list of geoitems to use, else ask map

      count: {
         number: 5,                                   // Maximum number of arrows
         type: "countries"                            // "countries", "direction", "overall"
      },

      bend: 3,                                        // Bend factor
      gap: 5,                                         // Gap between arrows
      symmetry: 0.7,                                  // (A)Symmetry of arrows
      minwidth: 2,                                    // Minimum width of arrow
      maxwidth: 40,                                   // Maximum width of arrow. If a single value, arrows are same width
                                                      // all along arrow length; if an array value, [0] is maximum width at start
                                                      // of arrow, and [1] is maximum width of arrow at end of arrow. If [0] < 1, it
                                                      // is interpreted as fraction of intended arrow width.
      maximum: 'dataset',                             // If 'dataset', use maximum over all years; if 'year' use maximum in current year, else value to use

      arrowhead: {                                    // Arrow heads
         minimum: 2,                                  // Minimum, in pixels
         fraction: 0.02,                              // Length, as fraction of length of arrow
         maximum: 40,                                 // Maximum, in pixels
         serif: false                                 // If TRUE, draw serifs on arrow heads
      },

      offset: {                                       // Range of offset at start of arrows:
         minimum: 5,                                  // Minimum, in pixels
         fraction: 0.2,                               // Target, as fraction of bounding box
         maximum: 100                                 // Maximum, in pixels
      },

      events: {                                       // Which events to trigger
         hover: false,                                // Either false (off) or one of 'follow' or 'center'
         click: true                                  // Either false (off) or true (on)
      },

      visible: true
   });

   return me = {
      init: initialize,

      toggle: function(state) {
         if(state === undefined)
            state = !(layer.style.display != 'none');

         if(settings.visible == state)
            return;

         settings.visible = state;

         if(layer)
         {
            layer.style.display = state ? 'block' : 'none';

            if(state && drawArrow)
               draw();
         }

         map.toggleClass('arrow-layer-active', state);

         return state;
      },

      set: function(values) {
         mw.support.extend(values, settings);

         if(drawArrow)
            draw();
      },

      incoming: function(state) {
         if(state === undefined)
            state = !(settings.incoming === true);

         settings.incoming = state;
         if(drawArrow)
            draw();

         return state;
      },

      outgoing: function(state) {
         if(state === undefined)
            state = !(settings.outgoing === true);

         settings.outgoing = state;
         if(drawArrow)
            draw();

         return state;
      },

      show: function(id) {
         if(currentItem != id)
         {
            currentItem = id;
            if(drawArrow)
               draw();
         }
      },

      destroy: function() {
         dispatcher.destroy();
      },

      values: function(year, values) {
         if(year == undefined && values == undefined)
            clearData();
         else
            setValues(year, values);
      },

      listen: function(what, callback) {
         dispatcher.register(what, callback);
      },

      unlisten: function(what, callback) {
         dispatcher.remove(what, callback);
      },

      exportPNG: function(dst) {
         if(settings.visible && canvas)
            dst.drawImage(canvas, 0, 0)
      },

      exportSVG: function() {
         var current = drawArrow;
         drawArrow = drawSVG;

         var svg = draw();

         drawArrow = current;
         return svg;
      }
   }

   function initialize(m)
   {
      map = m;

      layer = document.createElement('div');
      layer.className = 'map-arrow-layer';
      layer.style.position = 'absolute';
      layer.style.top = 0;
      layer.style.left = 0;

      busy = m.settings.busy;

      if(!settings.visible)
         layer.style.display = 'none';
      else
         map.toggleClass('arrow-layer-active', true);

      if(settings.parent)
         settings.parent.appendChild(layer);
      else
         map.panes().appendChild(layer);

      settings.latest = map.settings()['latest'];

      statemanager = map.state();
      datamanager = statemanager.data();

      switch(map.type())
      {
      case "canvas":
         drawArrow = drawCanvas;
         coord2geo = coordCanvas;

         canvas = document.createElement('canvas');
         canvas.width = map.width();
         canvas.height = map.height();
         canvas.style.position = 'absolute';
         canvas.style.pointerEvents = 'none';

         ctx = canvas.getContext('2d');

         layer.appendChild(canvas);

         // Canvas mode uses a hidden canvas for hit testing mouse events:
         // each country is drawn in a distinct color, making a quick lookup
         // possible
         var c = document.createElement('canvas');
         c.width = canvas.width;
         c.height = canvas.height;

         hitctx = c.getContext('2d');
         hitctx.lineWidth = 0;
         break;

      case "vml":
         drawArrow = drawVML;
         coord2geo = coordVML;
         break;
      }

      map.listen('bounds', onBounds);
      map.listen('size', onSize);
      map.listen('region', onRegion);
      map.listen('year', onYear);

      if(settings.indicator === true)
      {
         statemanager.listen('indicator', function(id) {
            setIndicValues(id);
         });
      }
      else if(settings.indicator)
         setIndicValues(settings.indicator);

      map.listen('resizestart', function() {
         layer.style.display = 'none';
         mapinmotion++;
      });

      map.listen('resizeend', onResize);

      if(mw.performance > 40)
      {
         map.listen('zoomstart', function() {
            layer.style.display = 'none';
            mapinmotion++;
         });

         map.listen('zoomend', onResize);
      }

      if(settings.events.hover)
      {
         var lastid;
         map.listen('mouseout', function(event) {
            if(layer.style.display == 'none')
               return;

            if(lastid)
            {
               dispatcher.dispatch(me, "hover", null);
               lastid = null;

               return true;
            }
         });

         map.listen('mousemove', function(event) {
            if(layer.style.display == 'none')
               return;

            var id = coord2geo(event);
            var follow = settings.events.hover == "follow";

            if(lastid != id || (id && follow))
            {
               var e;
               if(id)
               {
                  e = {
                     target: me,
                     from: id.from,
                     to: id.to
                  }

                  if(id.from == currentItem)
                  {
                     var item = geoitems[id.from];
                     if(item.outgoing[currentYear] && item.outgoing[currentYear][id.to])
                        e.value = item.outgoing[currentYear][id.to];
                  }
                  else
                  {
                     var item = geoitems[id.to];
                     if(item.incoming[currentYear] && item.incoming[currentYear][id.from])
                        e.value = item.incoming[currentYear][id.from];
                  }

                  if(follow)
                  {
                     var pos = mw.support.mousepos(event);
                     e.x = pos.x + (!canvas ? currentScale * (item.bbox[0] + offsetX) : 0);
                     e.y = pos.y + (!canvas ? currentScale * (item.bbox[1] + offsetY) : 0);
                  }
                  else
                  {
                     var item1 = map.center(e.from);
                     var item2 = map.center(e.to);

                     e.x = (item1.x + item2.x) / 2;
                     e.y = (item1.y + item2.y) / 2;
                  }
               }
               else
                  e = null;

               dispatcher.dispatch(me, "hover", e);
               lastid = id;
            }

            return id && lastid == id;
         });
      }

      if(settings.events.click)
      {
         map.listen('mousedown', function(event) {
            var arrow = coord2geo(event);
            if(arrow)
            {
               dispatcher.dispatch(me, "click", { target: me, from: arrow.from, to: arrow.to });
               return true;
            }
         });
      }
   }

   function onYear(year)
   {
      currentYear = year;

      if(drawArrow)
      {
         sort();
         draw();
      }
   }

   function onResize()
   {
      mapinmotion = Math.max(0, mapinmotion - 1);

      if(settings.visible && !mapinmotion)
         layer.style.display = 'block';

      draw();
   }

   function defaultItem(id)
   {
      var bbox = map ? map.box(id) : false;

      var r = bbox instanceof Array ? Math.min(bbox[2] - bbox[0], bbox[3] - bbox[1]) * settings.offset.fraction : 0;
      r = Math.min(settings.offset.maximum, Math.max(settings.offset.minimum, r));

      return {
         incoming: {},
         outgoing: {},
         r: r
      };
   }

   function updateCrossRefs(reset)
   {
      if(reset)
      {
         crossRefs = {};
         valueYears = {};
      }

      for(var id in geoitems)
      {
         crossRefs[id] = {};

         var item = geoitems[id];
         for(var d in { incoming: 1, outgoing: 1})
         {
            crossRefs[id][d] = {};

            var yvals = item[d];
            for(var y in yvals)
            {
               for(var geo2 in yvals[y])
                  crossRefs[id][d][geo2] = true;
            }
         }
      }
   }

   function clearData(year)
   {
      if(year)
      {
         maxValues[year] = +settings.maximum;
         if(isNaN(maxValues[year]))
            maxValues[year] = 0;
      }
      else
         maxValues = {};

      for(var id in geoitems)
      {
         if(year)
         {
            if(geoitems[id].incoming[year])
               geoitems[id].incoming[year] = {};
            if(geoitems[id].outgoing[year])
               geoitems[id].outgoing[year] = {};
         }
         else
         {
            geoitems[id].incoming = {};
            geoitems[id].outgoing = {};
         }
      }
   }

   function setValues(year, values)
   {
      if(!values)
      {
         values = year;
         year = new Date().getFullYear();
      }

      var newdata = settings.visible && year == currentYear || !currentYear;

      if(!currentYear)
         currentYear = year;

      if(values instanceof Function)
      {
         clearData(year);

         var items = settings.items || map.items();

         for(var i = 0, cnt = items.length; i < cnt; i++)
         {
            var id = items[i];
            if(!geoitems[id])
               geoitems[id] = defaultItem(id);

            var vals = values(id);
            for(var geo2 in vals)
            {
               geoitems[id].outgoing[year][geo2] = vals[geo2];
               geoitems[geo2].incoming[year][id] = vals[geo2];
            }
         }

         if(settings.latest)
            updateCrossRefs(valueYears[year]);

         if(newdata && drawArrow)
         {
            sort();
            draw();
         }
      }
      else if(typeof values == 'string')
         setIndicValues(values);
      else
      {
         clearData(year);

         for(var id in values)
         {
            if(!geoitems[id])
               geoitems[id] = defaultItem(id);

            for(var geo2 in values[id])
            {
               if(!geoitems[geo2])
                  geoitems[geo2] = defaultItem(geo2);

               if(!geoitems[id].outgoing[year])
                  geoitems[id].outgoing[year] = {};

               if(!geoitems[geo2].incoming[year])
                  geoitems[geo2].incoming[year] = {};

               geoitems[id].outgoing[year][geo2] = values[id][geo2];
               geoitems[geo2].incoming[year][id] = values[id][geo2];
            }
         }

         if(settings.latest)
            updateCrossRefs(valueYears[year]);

         if(newdata && drawArrow)
         {
            sort();
            draw();
         }
      }
      
      valueYears[year] = true;
   }

   function setIndicValues(id)
   {
      clearData();

      if(!datamanager)
         return;

      if(busy)
         busy.style.display = 'block';

      datamanager.load(id, function() {
         if(busy)
            busy.style.display = 'none';

         var indic = datamanager.indicators[id];
         if(!indic)
            return;

         for(var geo in indic.values)
         {
            if(!geoitems[geo])
               geoitems[geo] = defaultItem(geo);

            geoitems[geo].outgoing = indic.values[geo];
            for(var year in indic.values[geo])
            {
               var vals = indic.values[geo][year];
               for(var geo2 in vals)
               {
                  if(!geoitems[geo2])
                     geoitems[geo2] = defaultItem(geo2);

                  if(!geoitems[geo2].incoming[year])
                     geoitems[geo2].incoming[year] = {};

                  geoitems[geo2].incoming[year][geo] = vals[geo2];
               }
            }
         }

         if(settings.maximum == 'dataset')
            for(var y = indic.statistics.range.from; y <= indic.statistics.range.to; y++)
               maxValues[y] = indic.statistics.range.max;

         if(settings.latest)
            updateCrossRefs(true);

         sort();

         if(drawArrow)
            draw();
      });
   }

   function onSize(e)
   {
      if(canvas)
      {
         canvas.width = e.width;
         hitctx.canvas.width = e.width;
         canvas.height = e.height;
         hitctx.canvas.height = e.height;
      }

      if(draw)
         draw();
   }

   function onBounds(e)
   {
      zoom = e.zoom;
      draw();
   }

   function onRegion(e)
   {
      sort();
      draw();
   }

   function sort()
   {
      if(!maxValues[currentYear])
      {
         maxValues[currentYear] = +settings.maximum;
         if(isNaN(maxValues[currentYear]))
            maxValues[currentYear] = 0;
      }

      var items = settings.items || map.items();
      for(var i = 0, cnt = items.length; i < cnt; i++)
      {
         var id = items[i];
         var item = geoitems[id];

         if(!item)
            continue;

         item.sorted = [];

         if(!settings.latest && !item.incoming[currentYear] && !item.outgoing[currentYear])
            continue;

         for(var d in { incoming: 1, outgoing: 1})
         {
            var value, values = item[d];

            if(settings.latest)
               value = crossRefs[id][d];
            else
               value = values[currentYear];

            if(value)
            {
               for(var geo2 in value)
               {
                  var val = undefined;
                  if(settings.latest)
                  {
                     for(var y = currentYear; y >= currentYear - settings.latest; y--)
                     {
                        val = values[y];
                        if(val == undefined)
                           continue;

                        val = val[geo2];
                        if(val != undefined)
                           break;
                     }

                     if(val == undefined)
                        continue;
                  }
                  else
                     val = value[geo2];

                  var o = { value: val };
                  o[d] = geo2;

                  if(settings.maximum == 'year' || settings.maximum == 'dataset')
                     maxValues[currentYear] = Math.max(maxValues[currentYear], val);

                  item.sorted.push(o);
               }
            }
         }

         item.sorted.sort(function(a,b) { return a.value > b.value ? -1 : 1 });
      }
   }

   function hypot(a,b)
   {
      return Math.sqrt(a * a + b * b);
   }

   function arcpt(x0, y0, x1, y1, x2, y2, t, dev)
   {
      dev = dev || 0;

      var p1x = x0 + (x1 - x0) * t;
      var p1y = y0 + (y1 - y0) * t;
      var p2x = x1 + (x2 - x1) * t;
      var p2y = y1 + (y2 - y1) * t;
      var dx  = p2x - p1x;
      var dy  = p2y - p1y;
      var px  = p1x + dx * t;
      var py  = p1y + dy * t;
      var len = hypot(dx, dy);

      dx /= len;
      dy /= len;

      return [ px - dev * dy, py + dev * dx ];
   }

   function getShape(x1, y1, sx, sy, x2, y2, t0, t1, o, v)
   {
      var pt = [];

      if(v > 0)
      {
         var minw = settings.maxwidth instanceof Array ? settings.maxwidth[0] : v / 2;
         if(minw < 1)
            minw = v * minw;
         var maxw = v / 2;

         var hyp = hypot(x1 - x2, y1 - y2);
         var len = hyp * (t1 - t0);

         var l = settings.arrowhead.fraction * len;
         l = Math.min(settings.arrowhead.maximum, Math.max(settings.arrowhead.minimum, l));

         var ext = l / len;
         var inc = 10 / hyp;

         if(t1 - ext < 0)
            ext = t1 / 2;

         if(t0 > t1 - ext)
            t0 = t1 - ext;

         for(var f = t0; f < t1 - ext; f += inc)
         {
            var hv = (f - t0) / (t1 - ext - t0) * (maxw - minw) + minw;
            pt.push(arcpt(x1, y1, sx, sy, x2, y2, f, o + hv));
         }

         pt.push(arcpt(x1, y1, sx, sy, x2, y2, t1 - ext, o + maxw));
         if(settings.arrowhead.serif)
            pt.push(arcpt(x1, y1, sx, sy, x2, y2, t1 - ext, o + v));

         pt.push(arcpt(x1, y1, sx, sy, x2, y2, t1, o));
         if(settings.arrowhead.serif)
            pt.push(arcpt(x1, y1, sx, sy, x2, y2, t1 - ext, o - v));

         for(f = t1 - ext; f > t0; f -= inc)
         {
            var hv = (f - t0) / (t1 - ext - t0) * (maxw - minw) + minw;
            pt.push(arcpt(x1, y1, sx, sy, x2, y2, f, o - hv));
         }

         pt.push(arcpt(x1, y1, sx, sy, x2, y2, t0, o - minw));
         pt.push(arcpt(x1, y1, sx, sy, x2, y2, t0, o + minw));
      }

      return pt;
   }

   function getShapes(x1, y1, x2, y2, r1, r2, v1, v2)
   {
      var max = maxValues[currentYear];
      var maxw = settings.maxwidth instanceof Array ? settings.maxwidth[1] : settings.maxwidth;

      v1 = v1 / max * (maxw - settings.minwidth);
      if(v1)
         v1 += settings.minwidth;

      v2 = v2 / max * (maxw - settings.minwidth);
      if(v2)
         v2 += settings.minwidth;

      var s = settings.symmetry;
      var h = map.height();

      var hyp = hypot(x1 - x2, y1 - y2);
      var b = hyp < 50 ? 0 : settings.bend;

      var sx = s * x1 + (1 - s) * x2;
      var sy = s * y1 + (1 - s) * y2 + Math.abs(x1 - x2) * ((y1 / h - 0.5) * b);

      // Total width of arrow incl. gap (if any)
      var w = v1 + v2 + ((v1 * v2) ? settings.gap : 0);

      // Offset of centre of arrow to center of arrow pair
      var o1 = (w - v1) / 2;
      var o2 = (w - v2) / 2;

      // Offset at start to prevent arrows colliding at one point
      var s1 = r1 + r2 > hyp ? 0 : Math.sqrt(r1 * r1) / hyp;
      var s2 = r1 + r2 > hyp ? 0 : Math.sqrt(r2 * r2) / hyp;

      return [ getShape(x2, y2, sx, sy, x1, y1, s2, 1 - s1, o1, v1),
               getShape(x1, y1, sx, sy, x2, y2, s1, 1 - s2, o2, v2) ];
   }

   function draw()
   {
      if(layer.style.display == 'none')
         return;

      var arrows = [];

      if(currentItem)
         var item = geoitems[currentItem];

      if(item && item.sorted)
      {
         // Find the correct maximum number of arrows and create incoming and outgoing shapes for these
         var maxtype = settings.count.type;
         var maxval = settings.count.number;

         var props = { incoming: "value1", outgoing: "value2" };
         var num = { arrows: 0, neighbours: 0, incoming: 0, outgoing: 0 };
         var seen = {};

         for(var s = 0, cnt = item.sorted.length; s < cnt; s++)
         {
            var sorted = item.sorted[s];

            for(var d in props)
            {
               if(settings[d] && sorted[d])
               {
                  if(maxtype == "overall")
                     var allow = num.arrows < maxval;
                  else if(maxtype == "countries")
                     var allow = (num.neighbours < maxval) || seen[sorted[d]];
                  else
                     var allow = num[d] < maxval;

                  if(allow)
                  {
                     if(!seen[sorted[d]])
                     {
                        seen[sorted[d]] = { value1: 0, value2: 0 };
                        num.neighbours++;
                     }

                     seen[sorted[d]][props[d]] = sorted.value;

                     num.arrows++;
                     num[d]++;
                  }
               }
            }
         }

         var c = 0;
         hitmap = {};

         var c1 = map.center(currentItem);
         for(var geo2 in seen)
         {
            var item2 = geoitems[geo2];
            var c2 = map.center(geo2);

            var shapes = getShapes(c1.x, c1.y, c2.x, c2.y, zoom * item.r, zoom * item2.r, seen[geo2].value1, seen[geo2].value2);

            c += mw.Map.HITCOLORSTEP;
            hitmap[c] = { to: currentItem, from: geo2 };

            if(canvas)
            {
               var col = c.toString(16);
               shapes[0].push('#000000'.slice(0, 7 - col.length) + col);
            }
            else
               shapes[0].push(c);

            c += mw.Map.HITCOLORSTEP;
            hitmap[c] = { to: geo2, from: currentItem };

            if(canvas)
            {
               var col = c.toString(16);
               shapes[1].push('#000000'.slice(0, 7 - col.length) + col);
            }
            else
               shapes[1].push(c);

            arrows.push(shapes);
         }
      }

      return drawArrow(arrows);
   }

   function drawCanvas(arrows)
   {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hitctx.clearRect(0, 0, canvas.width, canvas.height);

      for(var a = 0, acnt = arrows.length; a < acnt; a++)
      {
         for(var i = 0; i < 2; i++)
         {
            var polys = arrows[a][i];
            if(!polys.length)
               continue;

            ctx.fillStyle = settings.color[i ? 'outgoing' : 'incoming'];
            ctx.strokeStyle = settings.stroke[i ? 'outgoing' : 'incoming'];
            hitctx.fillStyle = polys.pop();

            ctx.beginPath();
            hitctx.beginPath();

            for(var p = 0, pc = polys.length; p < pc; p++)
            {
               var x = polys[p][0];
               var y = polys[p][1];

               ctx[p == 0 ? 'moveTo' : 'lineTo'](x, y);
               hitctx[p == 0 ? 'moveTo' : 'lineTo'](x, y);
            }

            ctx.fill();
            hitctx.fill();

            if(settings.stroke.width)
               ctx.stroke();
         }
      }
   }

   function coordCanvas(event)
   {
      var pos = mw.support.mousepos(event);

      // Each polygon in hitctx has its own distinct color. However, if the
      // canvas is anti-aliasing, pixels on edges can get a inbetween-color.
      // Try to find a close-by exact match of a known hitctx color, starting
      // at the mouse position

      var data = hitctx.getImageData(pos.x - 2, pos.y - 2, 5, 5);
      var pixels = data.data;

      var center = (2 * data.width + 3) * 4;
      for(var d = 0; d <= center; d += 4)
      {
         var pos = center + d;
         var col = (pixels[pos] << 16) | (pixels[pos + 1] << 8) | pixels[pos + 2];

         if(hitmap[col])
            return hitmap[col];

         if(d)
         {
            pos = center - d;
            col = (pixels[pos] << 16) | (pixels[pos + 1] << 8) | pixels[pos + 2];

            if(hitmap[col])
               return hitmap[col];
         }
      }

      return undefined;
   }

   // FIXME: use for on-screen SVG later on
   // FIXME: no zoom/translate yet
   function drawSVG(arrows)
   {
      var svg = '<g id="arrows">';

      for(var a = 0, acnt = arrows.length; a < acnt; a++)
      {
         for(var i = 0; i < 2; i++)
         {
            var polys = arrows[a][i];
            if(!polys.length)
               continue;

            var idx = polys.pop();
            idx = parseInt(idx.substr(1), 16);

            // Adobe Illustrator does not like rgba() colors
            var fill = mw.support.stripAlpha(settings.color[i ? 'outgoing' : 'incoming']);
            var stroke = mw.support.stripAlpha(settings.stroke[i ? 'outgoing' : 'incoming']);

            var path = [];
            for(var p = 0, pc = polys.length; p < pc - 1; p++)
               path.push(p == 0 ? 'M' : 'L', polys[p][0], ',', polys[p][1]);

            var id = hitmap[idx].from + '-' + hitmap[idx].to;

            if(path.length)
            {
               svg += '<path id="' + id + '" fill="' + fill.color + '" stroke="' + stroke.color + '" ';

               if(fill.opacity)
                  svg += ' fill-opacity="' + fill.opacity + '"';
               if(stroke.opacity)
                  svg += ' stroke-opacity="' + stroke.opacity + '"';

               svg += ' d="' + path.join('') + 'Z"/>';
            }
         }
      }

      svg += '</g>';
      return svg;
   }

   function drawVML(arrows)
   {
      var sp = mw.Map.VMLSUBPIXEL;
      var mr = Math.round;

      layer.innerHTML = '';

      for(var a = 0, acnt = arrows.length; a < acnt; a++)
      {
         for(var i = 0; i < 2; i++)
         {
            var polys = arrows[a][i];
            if(!polys.length)
               continue;

            var idx = polys.pop();

            var fill = settings.color[i ? 'outgoing' : 'incoming'];
            if(fill.substr(0,4) == 'rgba')
            {
               var p = fill.lastIndexOf(',');
               fill = 'rgb' + fill.substr(4, p - 4) + ')" opacity="' + fill.substr(p + 1, fill.length - p - 2);
            }

            var stroke = settings.stroke[i ? 'outgoing' : 'incoming'];
            if(stroke.substr(0,4) == 'rgba')
            {
               var p = stroke.lastIndexOf(',');
               stroke = 'rgb' + stroke.substr(4, p - 4) + ')" opacity="' + stroke.substr(p + 1, stroke.length - p - 2);
            }

            var path = [];
            for(var p = 0, pc = polys.length; p < pc - 1; p++)
               path.push(p == 0 ? ' m ' : ' l ', mr(sp * polys[p][0]), ',', mr(sp * polys[p][1]));

            var id = hitmap[idx].from + hitmap[idx].to;

            var s = '<v:shape id="' + id + '" filled="true" ';
            if(settings.stroke.width)
               s += 'stroked="true" ';
            s += 'style="position:absolute; width:10px; height:10px" ';
            s += 'coordorigin="0 0" coordsize="' + (10 * sp) + ' ' + (10 * sp) + '" path="' + path.join('') + '">';
            s += '<v:fill color="' + fill + '"/>';
            if(settings.stroke.width)
               s += '<v:stroke color="' + stroke + '"/>';
            s += '</v:shape>';

            layer.insertAdjacentHTML('BeforeEnd', s);
         }
      }
   }

   function coordVML(event)
   {
      if(event.srcElement.parentNode == layer)
      {
         var id = event.srcElement.id;
         return { from: id.substr(0, id.length / 2), to: id.substr(id.length / 2) };
      }
   }
}
mw = window.mw || {};

mw.map  = mw.map || {};
mw.map.layers = mw.map.layers || {};

mw.map.layers.Circles = function(options)
{
   var me;
   var map;
   var layer;
   var geoitems = {};                                 // Values and color per geoitem
   var sorted;                                        // Array of item details, reverse sorted on size
   var max;
   var currentYear;
   var mapinmotion = 0;

   var statemanager;
   var datamanager;

   var busy;

   var drawCircle;
   var coord2geo;
   var canvas, ctx;

   var hitctx;                                        // Canvas context for mouse hit tests
   var hitcolor;
   var hitmap = {};                                   // Map from hitctx color value to ID
   var lasthit;                                       // Keep track of last hit item

   var playTimer;                                     // If animating, active timer

   var tickHandler;
   var locked = false;
   var locked = false;

   var dispatcher = new mw.Dispatcher();

   var settings = mw.support.extend(options || {}, {
      color: 'rgba(255,255,255,0.5)',                 // If TRUE, listen to indicator changes for color, else fixed color
      size: false,                                    // If TRUE, listen to indicator changes for size, else indicator ID
      nodata: '#d5d7da',
      stroke: {
         width: 1,
         color: 'rgb(255,255,255)'
      },
      speed: {
         play: 5,                                     // Duration of a play animation
      },
      events: {
         hover: 'follow',
         click: false
      },
      items: null,                                    // If set, use as list of geoitems to use, else ask map
      sizefactor: 10,                                 // Size factor to have a nice spread of circles
      totalsurface: 1500,                             // Total circle surface to be divided amongst all circles
      maximum: 'dataset',                             // If 'dataset', use maximum over all years; if 'year' use maximum in current year, else value to use
      visible: true
   });

   return me = {
      init: initialize,

      lock: function() { locked = true; },
      unlock: function(redraw) { locked = false; if(redraw) draw(); },

      toggle: function(state) {
         if(state === undefined)
            state = !(layer.style.display != 'none');

         if(settings.visible == state)
            return;

         settings.visible = state;

         if(layer)
            layer.style.display = state ? 'block' : 'none';

         if(state && !sorted)
            sort();

         if(state && draw)
            draw();

         if(map)
            map.toggleClass('circle-layer-active', state);

         return state;
      },

      set: function(values, redraw) {
         mw.support.extend(values, settings);

         if((redraw || redraw === undefined) && draw)
         {
            sort();
            draw();
         }
      },

      color: function(colors) {
         colorizeCircles(colors);
      },

      size: function(year, values) {
         if(year == undefined && values == undefined)
            resetValues();
         else
            setValues(year, values);
      },

      animate: function(speed) {
         if(!sorted)
            sort();

         var si = 1, _sorted = sorted.slice();
         for(var scnt = 0; scnt < _sorted.length && _sorted[scnt].radius; scnt++)
            ;

         speed = speed || (datamanager.meta.speed ? datamanager.meta.speed : settings.speed.play);
         speed /= scnt;

         function step() {
            if(si < scnt)
            {
               sorted = _sorted.slice(0, si++)
               draw();
               playTimer =  setTimeout(step, speed * 1000);
            }
            else
            {
               sorted = _sorted;
               dispatcher.dispatch(me, 'animationend');
            }
         };

         dispatcher.dispatch(me, 'animationstart');
         step();
      },

      /**
       * Stop any animations
       */
      stop: function() {
         clearTimeout(playTimer);
      },

      listen: function(what, callback) {
         dispatcher.register(what, callback);
      },

      unlisten: function(what, callback) {
         dispatcher.remove(what, callback);
      },

      exportPNG: function(dst) {
         if(settings.visible && canvas)
            dst.drawImage(canvas, 0, 0)
      },

      exportSVG: function() {
         return drawSVG();
      }
   }

   function initialize(m)
   {
      map = m;

      busy = m.settings.busy;

      layer = document.createElement('div');
      layer.className = 'map-circle-layer';
      layer.style.position = 'absolute';

      layer.style.top = 0;
      layer.style.left = 0;

      if(!settings.visible)
         layer.style.display = 'none';
      else
         map.toggleClass('circle-layer-active', true);

      settings.latest = map.settings()['latest'];

      // Find most appropiate tick handler
      if(window.requestAnimationFrame)
         tickHandler = window.requestAnimationFrame;
      else if(window.webkitRequestAnimationFrame)
         tickHandler = window.webkitRequestAnimationFrame;
      else if(window.mozRequestAnimationFrame)
         tickHandler = window.mozRequestAnimationFrame;
      else if(window.msRequestAnimationFrame)
         tickHandler = window.msRequestAnimationFrame;
      else
         tickHandler = function(cb) { setTimeout(cb, 20); };

      if(settings.parent)
         settings.parent.appendChild(layer);
      else
         map.panes().appendChild(layer);

      statemanager = map.state();
      datamanager = statemanager.data();

      switch(map.type())
      {
      case "canvas":
         drawCircle = drawCanvas;
         coord2geo = coordCanvas;

         canvas = document.createElement('canvas');
         canvas.width = map.width();
         canvas.height = map.height();
         canvas.style.position = 'absolute';
         canvas.style.pointerEvents = 'none';

         // IE9/10 don't support pointer-events in HTML
         if(navigator.appName == 'Microsoft Internet Explorer')
         {
            mw.support.attachEvent(canvas, 'click', function(e) {
               mw.support.fireEvent(canvas.parentNode, e);
            });
         }

         ctx = canvas.getContext('2d');
         layer.appendChild(canvas);

         // Canvas mode uses a hidden canvas for hit testing mouse events:
         // each country is drawn in a distinct color, making a quick lookup
         // possible
         var c = document.createElement('canvas');
         c.width = canvas.width;
         c.height = canvas.height;

         hitctx = c.getContext('2d');
         hitctx.lineWidth = 0;
         break;

      case "vml":
         drawCircle = drawVML;
         coord2geo = coordVML;
         break;
      }

      if(settings.color === true)
      {
         statemanager.listen('indicator', function(id) {
            setIndicValues(id, 'colors');
         });
      }
      else if(settings.color)
         colorizeCircles(settings.color);

      if(settings.indicator === true)
      {
         statemanager.listen('indicator', function(id) {
            setIndicValues(id, 'sizes');
         });
      }
      else if(settings.indicator)
         setIndicValues(settings.indicator, 'sizes');

      map.listen('bounds', onBounds);
      map.listen('size', onSize);
      map.listen('region', onRegion);
      map.listen('year', onYear);

      map.listen('resizestart', function() {
         layer.style.display = 'none';
         mapinmotion++;
      });

      map.listen('resizeend', onResize);

      if(mw.performance > 40)
      {
         map.listen('zoomstart', function() {
            layer.style.display = 'none';
            mapinmotion++;
         });

         map.listen('zoomend', onResize);
      }

      if(settings.events.hover)
      {
         var lastid;
         map.listen('mouseout', function(event) {
            if(layer.style.display == 'none')
               return;

            if(lastid)
            {
               dispatcher.dispatch(me, "hover", null);
               lastid = null;

               return true;
            }
         });

         map.listen('mousemove', function(event) {
            if(layer.style.display == 'none')
               return;

            var id = coord2geo(event);
            var follow = settings.events.hover == "follow";

            if(lastid != id || (id && follow))
            {
               if(id)
               {
                  var e = { target: me, geoitem: id, indicator: settings.indicator };

                  if(follow)
                  {
                     var pos = mw.support.mousepos(event);
                     e.x = pos.x + (!canvas ? currentScale * (item.bbox[0] + offsetX) : 0);
                     e.y = pos.y + (!canvas ? currentScale * (item.bbox[1] + offsetY) : 0);
                  }
                  else
                  {
                     var item = map.center(id);

                     e.x = item.x;
                     e.y = item.y;
                  }

                  dispatcher.dispatch(me, "hover", e);
               }
               else
                  dispatcher.dispatch(me, "hover", null);

               lastid = id;

               return true;
            }
         });
      }

      if(settings.events.click)
      {
         map.listen('mousedown', function(event) {
            var id = coord2geo(event);
            if(id)
            {
               dispatcher.dispatch(me, "click", { target: me, geoitem: id });
               return true;
            }
         });
      }
   }

   function onYear(year)
   {
      currentYear = year;

      if(draw)
      {
         sort();
         colorizeCircles(settings.legend ? legendColor : settings.color);
      }
   }

   function onSize(e)
   {
      if(canvas)
      {
         canvas.width = e.width;
         hitctx.canvas.width = e.width;
         canvas.height = e.height;
         hitctx.canvas.height = e.height;
      }

      if(sorted && settings.sizefactor instanceof Function)
         setRadius();

      if(draw)
         draw();
   }

   function onResize()
   {
      mapinmotion = Math.max(0, mapinmotion - 1);

      if(settings.visible && !mapinmotion)
         layer.style.display = 'block';

      if(draw)
      {
         sort();
         draw();
      }
   }

   function legendColor(id)
   {
      var legend = settings.legend;
      var c = geoitems[id].colors;

      if(!c || !legend)
         return settings.nodata;

      var v;
      if(settings.latest)
      {
         v = mw.support.latest(c, currentYear, settings.latest);
         v = v.value;
      }
      else
         v = c[currentYear];

      return mw.support.legendColor(legend, v);
   }

   function defaultItem(id)
   {
      return {
         color: "",
         sizes: {}
      };
   }

   function colorizeCircles(colors)
   {
      if(colors instanceof Function || typeof colors == "string")
      {
         var items = settings.items || (map ? map.items() : []);
         for(var i = 0, cnt = items.length; i < cnt; i++)
         {
            var id = items[i];

            if(!geoitems[id])
               geoitems[id] = defaultItem(id);

            geoitems[id].color = colors instanceof Function ? colors(id) : colors;
         }
      }
      else
      {
         for(var id in colors)
            if(geoitems[id])
               geoitems[id].color = colors[id];
      }

      if(draw)
         draw();
   }

   function setValues(year, values)
   {
      if(!values)
      {
         values = year;
         year = new Date().getFullYear();
      }

      var newdata = settings.visible && (year == currentYear || !currentYear);

      if(!currentYear)
         currentYear = year;

      if(values instanceof Function)
      {
         var items = settings.items || map.items();
         for(var i = 0, cnt = items.length; i < cnt; i++)
         {
            var id = items[i];
            if(!geoitems[id])
               geoitems[id] = defaultItem(id);

            geoitems[id].sizes[year] = values(id);
         }

         if(newdata && draw)
         {
            sort();
            draw();
         }
      }
      else if(typeof values == 'string')
         setIndicValues(values, 'sizes');
      else
      {
         for(var id in values)
         {
            if(!geoitems[id])
               geoitems[id] = defaultItem(id);

            geoitems[id].sizes[year] = values[id];
         }

         if(newdata && draw)
         {
            sort();
            draw();
         }
      }
   }

   function resetValues()
   {
      for(var id in geoitems)
         geoitems[id].sizes = {};
   }

   function setIndicValues(id, prop)
   {
      if(busy)
         busy.style.display = 'block';

      datamanager.load(id, function() {
         if(busy)
            busy.style.display = 'none';

         var indic = datamanager.indicators[id];
         if(!indic)
            return;

         if(prop == 'colors')
            settings.legend = datamanager.parseLegend(id);

         for(var geo in indic.values)
         {
            if(!geoitems[geo])
               geoitems[geo] = defaultItem(geo);

            geoitems[geo][prop] = indic.values[geo];
         }

         if(prop == 'sizes')
            sort();

         if(draw)
            colorizeCircles(settings.legend ? legendColor : settings.color);
      });
   }

   function onBounds(e)
   {
      draw();
   }

   function onRegion(e)
   {
      sort();
      draw();
   }

   function setRadius()
   {
      var Msqrt = Math.sqrt;

      var size = settings.sizefactor instanceof Function ? settings.sizefactor() : settings.sizefactor;
      for(var i = 0, cnt = sorted.length; i < cnt; i++)
         sorted[i].pxradius = Msqrt(sorted[i].radius / max * size * settings.totalsurface);
   }

   function sort()
   {
      if(!map)
         return;

      var Mmax = Math.max;

      sorted = [];
      max = 0;

      var sum = {};
      var items = settings.items || map.items();

      for(var i = 0, cnt = items.length; i < cnt; i++)
      {
         var id = items[i];
         var item = geoitems[id];

         if(!item)
            continue;

         for(var y in item.sizes)
         {
            if(!sum[y])
               sum[y] = item.sizes[y];
            else
               sum[y] += item.sizes[y];
         }
      }

      if(!isNaN(+settings.maximum))
         max = +settings.maximum;
      else if(settings.maximum == 'year')
      {
         if(settings.latest)
         {
            var latest = mw.support.latest(sum, currentYear, settings.latest);
            max = latest.value;
         }
         else
            max = sum[currentYear];
      }
      else
         for(var y in sum)
            max = Mmax(max, sum[y]);

      for(var i = 0, cnt = items.length; i < cnt; i++)
      {
         var id = items[i];
         var item = geoitems[id];

         if(!item)
            continue;

         var r;
         if(settings.latest && item.sizes)
         {
            var latest = mw.support.latest(item.sizes, currentYear, settings.latest);
            r = latest.value || 0;
         }
         else
            r = item.sizes && item.sizes[currentYear] ? item.sizes[currentYear] : 0;

         var o = { id: id, radius: r };

         sorted.push(o);
      }

      sorted.sort(function(a,b) { return a.radius > b.radius ? -1 : 1 });

      setRadius();
   }

   function draw()
   {
      if(!drawCircle || layer.style.display == 'none' || !sorted || locked)
         return;

      if(canvas)
      {
         ctx.clearRect(0, 0, canvas.width, canvas.height);
         hitctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      else
         layer.innerHTML = '';

      hitcolor = 0;
      hitmap = {};

      var stroke = settings.stroke && settings.stroke.width ? settings.stroke.color || '#ffffff' : null;
      for(var i = 0, cnt = sorted.length; i < cnt; i++)
      {
         var item = sorted[i];
         var id = item.id;

         var center = map.center(id);
         var color = geoitems[id].color;

         drawCircle(id, stroke, color || settings.color, center.x, center.y, item.pxradius);
      }
   }

   function drawCanvas(id, stroke, fill, x, y, r)
   {
      if(stroke)
      {
         ctx.strokeStyle = settings.stroke.color || '#ffffff';
         ctx.lineWidth = 1;
      }

      hitcolor += mw.Map.HITCOLORSTEP;
      hitmap[hitcolor] = id;

      ctx.fillStyle = fill;

      var col = hitcolor.toString(16);
      hitctx.fillStyle = '#000000'.slice(0, 7 - col.length) + col;

      ctx.beginPath();
      hitctx.beginPath();

      ctx.arc(x, y, r, 0, Math.PI * 2, true);
      ctx.closePath();

      hitctx.arc(x, y, r, 0, Math.PI * 2, true);
      hitctx.closePath();

      if(stroke)
         ctx.stroke();

      ctx.fill();
      hitctx.fill();
   }

   function coordCanvas(event)
   {
      var pos = mw.support.mousepos(event);

      // Each polygon in hitctx has its own distinct color. However, if the
      // canvas is anti-aliasing, pixels on edges can get a inbetween-color.
      // Try to find a close-by exact match of a known hitctx color, starting
      // at the mouse position

      var data = hitctx.getImageData(pos.x - 2, pos.y - 2, 5, 5);
      var pixels = data.data;

      var center = (2 * data.width + 3) * 4;
      for(var d = 0; d <= center; d += 4)
      {
         var pos = center + d;
         var col = (pixels[pos] << 16) | (pixels[pos + 1] << 8) | pixels[pos + 2];

         if(hitmap[col])
            return hitmap[col];

         if(d)
         {
            pos = center - d;
            col = (pixels[pos] << 16) | (pixels[pos + 1] << 8) | pixels[pos + 2];

            if(hitmap[col])
               return hitmap[col];
         }
      }

      return undefined;
   }

   // FIXME: use for on-screen SVG later on
   // FIXME: no zoom/translate yet
   function drawSVG()
   {
      if(layer.style.display == 'none')
         return;

      var svg = '';
      var stroke = settings.stroke && settings.stroke.width ? settings.stroke.color || '#ffffff' : null;
      for(var i = 0, cnt = sorted.length; i < cnt; i++)
      {
         var item = sorted[i];
         var color = geoitems[item.id].color;
         var center = map.center(item.id);

         // Adobe Illustrator does not like rgba() colors
         var fcol = mw.support.stripAlpha(color || settings.color);
         var scol = mw.support.stripAlpha(stroke);

         svg += '<circle id="c-' + item.id + '" cx="' + center.x + '" cy="' + center.y + '" r="' + item.pxradius + '" ';
         svg += 'fill="' + fcol.color + '" stroke="' + scol.color + '"';
         if(fcol.opacity)
            svg += ' fill-opacity="' + fcol.opacity + '"';
         if(scol.opacity)
            svg += ' stroke-opacity="' + scol.opacity + '"';
         svg += '/>';
      }

      return '<g id="circles">' + svg + '</g>';
   }

   function drawVML(id, stroke, fill, x, y, r)
   {
      var mr = Math.round;
      var sp = mw.Map.VMLSUBPIXEL;

      if(fill.substr(0,4) == 'rgba')
      {
         var p = fill.lastIndexOf(',');
         fill = 'rgb' + fill.substr(4, p - 4) + ')" opacity="' + fill.substr(p + 1, fill.length - p - 2);
      }

      var path = 'ae ' + mr(sp * x) + ',' + mr(sp * y) + ' ' + mr(sp * r) + ' ' + mr(sp * r) + ' 0 23592960 x e';
      var s = '<v:shape id="' + id + '" filled="true"';
      if(stroke)
         s += ' stroked="true"';
      s += ' style="position:absolute;width:10px;height:10px"';
      s += ' coordorigin="0 0" coordsize="' + (10 * sp)+ ' ' + (10 * sp) + '" path="' + path + '">';
      s += '<v:fill color="' + fill + '"/>';
      if(stroke)
         s += '<v:stroke color="' + stroke + '"/>';
      s += '</v:shape>';

      layer.insertAdjacentHTML('BeforeEnd', s);
   }

   function coordVML(event)
   {
      if(event.srcElement.parentNode == layer)
      {
         var id = event.srcElement.id;
         return { from: id.substr(0, id.length / 2), to: id.substr(id.length / 2) };
      }
   }
}
mw = window.mw || {};

mw.map  = mw.map || {};
mw.map.layers = mw.map.layers || {};

mw.map.layers.Highlight = function(options)
{
   var me;
   var map;
   var layer;
   var tooltip;

   var settings = mw.support.extend(options || {}, {
      constrain: true,
      persist: false,      // Do not remove tooltip on hover without geoitem
      template: "<div class='label'>{GEOITEM}</div><div class='value'>{VALUE}</div>"
   });

   var currentYear;
   var currentIndicator;
   var currentEvent;
   var currentHoverKey;

   var datamanager;
   var adx,ady;

   return me = {
      init: initialize,

      toggle: function(state) {
         if(state === undefined)
            state = !(tooltip.style.display != 'none');

         tooltip.style.display = state ? 'block' : 'none';

         return state;
      },

      show: function(x, y, label) {
         currentHoverKey = null;

         tooltip.innerHTML = '<div class="map-tooltip-anchor"></div><div class="map-tooltip-tip"></div>' + label;
         tooltip.className = 'map-tooltip';

         position(x, y);
      },

      hide: function() {
         currentHoverKey = null;

         if(tooltip)
            tooltip.className = tooltip.className.replace('map-tooltip', 'map-hidden-tooltip map-tooltip');
      },

      set: function(values) {
         mw.support.extend(values, settings);
      }
   }

   function position(x, y)
   {
      var anchor = tooltip.firstChild;

      if(anchor && settings.constrain)
      {
         // Determine relative position of anchor before showing tooltip for the first time
         if(adx == undefined)
         {
            adx = 1 - anchor.offsetLeft / tooltip.clientWidth;
            ady = anchor.offsetTop / tooltip.clientHeight;
         }

         // Use these to see if default tooltip would fall outside of viewport
         var w = tooltip.clientWidth * adx;
         var h = tooltip.clientHeight * ady;
         var pw  = tooltip.parentNode.clientWidth || tooltip.parentNode.parentNode.clientWidth;

         var c = 'map-tooltip ';
         if(y - h < 0)
            c += 'anchor-top ';
         if(x - w < 0)
            c += 'anchor-left';
         else if(x + w > pw)
            c += 'anchor-right';

         tooltip.className = c;
      }

      if(anchor)
      {
         x -= anchor.offsetLeft;
         y -= anchor.offsetTop;
      }

      tooltip.style.left = x + 'px';
      tooltip.style.top = y + 'px';
   }

   function onHover(e)
   {
      if(!e)
      {
         if(!settings.persist)
         {
            if(currentHoverKey)
               tooltip.className = tooltip.className.replace('map-tooltip', 'map-hidden-tooltip map-tooltip');

            currentEvent = currentHoverKey = null;
         }
         return;
      }

      var item1 = datamanager ? datamanager.geoitems[e.geoitem || e.from] : {};
      var item2 = datamanager ? datamanager.geoitems[e.to] : {};
      var hasdm = datamanager && datamanager.value instanceof Function;

      var geokey = (e.geoitem || e.from) + "-" + e.to;
      var indic = e.indicator || currentIndicator;
      var year  = e.year || currentYear;

      var t;
      if(geokey + '-' + year + '-' + indic != currentHoverKey)
      {
         t = settings.template instanceof Function ? settings.template.call(tooltip, e) : settings.template;

         if(t === false)
            return onHover(null);

         var val = e.value;
         if(!val && hasdm)
         {
            if(settings.format)
            {
               var latest;
               if(settings.latest)
               {
                  latest = mw.support.latest(datamanager.tag('values', indic, e.geoitem), year, settings.latest);
                  val = latest.value;
               }
               else
                  val = datamanager.tag('values', indic, e.geoitem, year);

               if(val != undefined)
               {
                  val = mw.support.format(settings.format, val);

                  if(settings.latest && year != latest.year && t.indexOf('{YEAR}') == -1)
                     val += ' (' + latest.year + ')';

                  if(settings.latest)
                     year = latest.year;
               }
            }
            else if(settings.latest)
            {
               var latest = datamanager.latest(indic, e.geoitem, year, datamanager.meta.nodata, settings.latest)
               val = latest.value;

               if(year != latest.year && val != undefined && t.indexOf('{YEAR}') == -1)
                  val += ' (' + latest.year + ')';

               year = latest.year;
            }
            else
               val = datamanager.value(indic, e.geoitem, year);

            if(val == undefined)
               val = datamanager.meta.nodata ? datamanager.meta.nodata : "";
         }

         var pattern = /\{([^}]+)\}/g;
         var replacements = {};

         var match;
         while(match = pattern.exec(t))
         {
            if(match[1] == "FROM" && item1)
               replacements[match[0]] = item1.label;
            else if(match[1] == "TO" && item2)
               replacements[match[0]] = item2.label;
            else if(match[1] == "INDICATOR")
               replacements[match[0]] = datamanager.indicators[indic].label;
            else if(match[1].substr(0, 7) == "GEOITEM" && item1)
            {
               var g = match[1].split(':');
               replacements[match[0]] = item1[g[1] || 'label'];
               if(item2)
                  replacements[match[0]] += ' - ' + item2[g[1] || 'label'];
            }
            else if(match[1] == "YEAR")
               replacements[match[0]] = year;
            else if(match[1].substr(0, 5) == "VALUE")
            {
               var iid = match[1].split(':');
               if(iid.length == 2)
               {
                  var v = datamanager.value(iid[1], e.geoitem, year, 0);

                  if(settings.format)
                     v = mw.support.format(settings.format, v);

                  replacements[match[0]] = v;
               }
               else
                  replacements[match[0]] = val;
            }
            else if(match[1] == "UNIT")
               replacements[match[0]] = indic ? datamanager.indicators[indic].unit : '';
            else if(match[1] == "PERCENT")
               replacements[match[0]] = e.hasOwnProperty('percent') ? mw.support.format(e.percent) : '';
            else if(match[1] == "TOTAL")
               replacements[match[0]] = e.hasOwnProperty('total') ? mw.support.format(e.total) : '';
            else if(match[1] == "NOTE")
               replacements[match[0]] = datamanager.tag('notes', indic, e.geoitem, year) || 'no note';
            else if(e.geoitem && hasdm)
            {
               var indics = /[A-Za-z0-9_\.]+/g;
               var expr = match[1];
               while(match2 = indics.exec(match[1]))
               {
                  var v = datamanager.value(match2[0], e.geoitem, year, 0);

                  if(settings.format)
                     v = mw.support.format(settings.format, v);

                  expr = expr.replace(match2[0], v);

                  if(match[1] == match2[0])
                     break;
               }

               if(match2 && match[1] == match2[0])
                  replacements[match[0]] = expr;
               else
                  replacements[match[0]] = eval(expr);
            }
         }

         for(var key in replacements)
            t = t.replace(key, replacements[key] === undefined ? '' : replacements[key]);
      }
      else
         t = true;

      currentEvent = e;
      currentHoverKey = geokey + '-' + year + '-' + indic;

      if(t !== true)
      {
         tooltip.innerHTML = '<div class="map-tooltip-anchor"></div><div class="map-tooltip-tip"></div>' + t;
         tooltip.className = 'map-tooltip';
      }

      position(e.x, e.y);
   }

   function initialize(m)
   {
      map = m;

      layer = document.createElement('div');
      layer.className = 'map-highlight-layer';
      layer.style.position = 'absolute';

      layer.style.top = 0;
      layer.style.left = 0;

      tooltip = document.createElement('div');
      tooltip.className = 'map-hidden-tooltip map-tooltip';
      tooltip.style.position = 'absolute';
      tooltip.style.pointerEvents = 'none';

      layer.appendChild(tooltip);

      datamanager = map.state().data();

      if(settings.parent)
         settings.parent.appendChild(layer);
      else
         map.panes().appendChild(layer);

      settings.latest = map.settings()['latest'];

      map.listen('indicator', function(id) {
         var indic = datamanager.indicators[id];

         if(indic && indic.hover_label)
            settings.template = indic.hover_label;

         currentIndicator = id;
      });

      map.listen('year', function(year) {
         currentYear = year;

         if(tooltip.style.display != 'none' && currentEvent)
            onHover(currentEvent);
      });

      map.listen('bounds', function() {
         currentHoverKey = currentEvent = null;
         tooltip.className = 'map-hidden-tooltip map-tooltip';
      });

      map.listen('hover', onHover);
   }
}
mw = window.mw || {};

mw.map  = mw.map || {};
mw.map.layers = mw.map.layers || {};

mw.map.layers.Info = function(options)
{
   var me;
   var map;
   var layer;
   var pins = {};
   var nodes = {};
   var lid = 0;
   var todo = [];
   var lastId;
   var busy;
   var zoom = 1;
   var tx = 0;
   var ty = 0;
   var iw = 0;
   var ih = 0;
   var mapstate = { resizing: false, zooming: false, resized: false };

   var editing;

   var dispatcher = new mw.Dispatcher();

   var settings = mw.support.extend(options || {}, {
      pin: "<div class='pin'></div>",
      events: {
         click: true,
         hover: false,
         add: false,
         'delete': false,
         move: false
      },
      visible: true,
      width: null,
      height: null
   });

   return me = {
      init: initialize,

      toggle: function(state) {
         if(state === undefined)
            state = !settings.visible;

         settings.visible = state;

         if(layer)
            layer.style.display = state ? 'block' : 'none';

         return state;
      },

      set: function(values) {
         mw.support.extend(values, settings);
      },

      destroy: function() {
         dispatcher.destroy();

         if(settings.events.click)
            mw.support.removeEvent(layer, 'click', onClick);

         if(settings.events.hover)
         {
            mw.support.removeEvent(layer, 'mouseover', onHover);
            mw.support.removeEvent(layer, 'mouseout', onHoverOut);
         }
      },

      add: addPin,

      clear: function() {
         if(layer)
            layer.innerHTML = '';

         pins = {};
         nodes = {};
         todo = [];
      },

      listen: function(what, callback) {
         dispatcher.register(what, callback);
      },

      unlisten: function(what, callback) {
         dispatcher.remove(what, callback);
      },

      edit: function(edit) {
         editing = edit;

         if(editing)
         {
            if(!layer)
               console.log("Info-layer: cannot enable editing on un-initialized layer");

            if(layer)
               mw.support.attachEvent(layer, 'mousedown', onEdit);

            layer.style.width = '100%';
            layer.style.height = '100%';
         }
         else
         {
            if(layer)
               mw.support.removeEvent(layer, 'mousedown', onEdit);

            layer.style.width = '';
            layer.style.height = '';
         }
      }
   }

   function initialize(m)
   {
      map = m;

      layer = document.createElement('div');
      layer.className = 'map-info-layer';
      layer.style.position = 'absolute';
      layer.style.top = 0;
      layer.style.left = 0;

      busy = m.settings.busy;

      if(!settings.visible)
         layer.style.display = 'none';

      if(settings.events.click)
         mw.support.attachEvent(layer, 'click', onClick);

      if(settings.events.hover)
      {
         mw.support.attachEvent(layer, 'mouseout', onHoverOut);
         mw.support.attachEvent(layer, 'mouseover', onHover);
      }

      if(settings.parent)
         settings.parent.appendChild(layer);
      else
         map.panes().appendChild(layer);

      map.listen('bounds', onBounds);
      map.listen('size', onSize);

      map.listen('ready', function() {
         for(var i in todo)
            addPin(todo[i]);
      });

      map.listen('resizestart', function(resized) {
         mapstate.resizing = true;
         mapstate.resized = resized !== false;

         if(mapstate.resized)
            layer.style.display = 'none';
      });

      map.listen('resizeend', function(resized) {
         mapstate.resizing = false;

         if(settings.visible && !mapstate.resized && !mapstate.zooming)
            layer.style.display = 'block';
      });

      map.listen('zoomstart', function() {
         mapstate.zooming = true;

         layer.style.display = 'none';
      });

      map.listen('zoomend', function() {
         mapstate.zooming = false;

         if(settings.visible && !mapstate.resizing && !mapstate.resized)
            layer.style.display = 'block';
      });
   }

   function onEdit(event)
   {
      event = event || window.event;
      var target = event.target || event.srcElement;
      var id = target.id;

      if(target.className == 'map-info-layer')
      {
         if(settings.events.add instanceof Function)
         {
            var xy = map.xy2xy(event.offsetX, event.offsetY);
            mw.support.extend(map.xy2latlng(event.offsetX, event.offsetY), xy);

            settings.events.add({ position: xy }, map);
         }
      }
      else if(event.ctrlKey)
      {
         if(pins[id] && settings.events['delete'] instanceof Function)
         {
            if(settings.events['delete'](pins[id]), map)
            {
               layer.removeChild(nodes[id]);

               delete nodes[id];
               delete pins[id];
            }
         }
      }
      else if(settings.events.move instanceof Function)
      {
         var node = nodes[id];
         var rx = event.pageX - node.offsetLeft - event.offsetX;
         var ry = event.pageY - node.offsetTop - event.offsetY;

         function onDrag(event)
         {
            event = event || window.event;
            node.style.left = (event.pageX - rx) + 'px';
            node.style.top = (event.pageY - ry) + 'px';

            mw.support.preventDefault(event);
         }

         function onEndDrag(event)
         {
            event = event || window.event;

            mw.support.removeEvent(document, 'mousemove', onDrag);
            mw.support.removeEvent(document, 'mouseup', onEndDrag);
            mw.support.removeEvent(document, 'selectstart', mw.support.preventDefault);

            mw.support.preventDefault(event);

            var pin = pins[id];
            var x = event.pageX - rx, y = event.pageY - ry;
            pin.position = pin.position.hasOwnProperty('lat') ? map.xy2latlng(x, y) : map.xy2xy(x, y);

            settings.events.move(pin, map);
         }

         mw.support.attachEvent(document, 'mousemove', onDrag);
         mw.support.attachEvent(document, 'mouseup', onEndDrag);
         mw.support.attachEvent(document, 'selectstart', mw.support.preventDefault);
      }
   }

   function onClick(event)
   {
      event = event || window.event;
      var target = event.target || event.srcElement;

      if(target != layer)
      {
         var id = target.getAttribute('id');
         dispatcher.dispatch(me, "click", id);
      }
   }

   function onHover(event)
   {
      event = event || window.event;
      var target = event.target || event.srcElement;

      if(target != layer)
      {
         var id = target.getAttribute('id');
         var follow = settings.events.hover == "follow";

         if(id != lastId || (id && follow))
         {
            var e = { target: me, pin: id };

            if(follow)
            {
               var pos = mw.support.mousepos(event);
               e.x = pos.x;
               e.y = pos.y;
            }
            else
            {
               e.x = target.offsetLeft + 0.5 * target.offsetWidth;
               e.y = target.offsetTop + 0.5 * target.offsetHeight;
            }

            dispatcher.dispatch(me, "hover", e);
            lastId = id;
         }
      }
   }

   function onHoverOut(event)
   {
      lastId = null;
      dispatcher.dispatch(me, "hover", null);
   }

   function onSize()
   {
      if(iw == 0)
      {
         iw = settings.width || map.width();
         ih = settings.height || map.height();
      }

      var mw = map.width();
      var mh = map.height();

      for(var id in pins)
      {
         var pin = pins[id];
         var node = nodes[id];

         if(pin.position.x)
            var xy = { x: zoom * (pin.position.x / iw * mw + tx), y: zoom * (pin.position.y / ih * mh + ty) };
         else
            var xy = map.latlng2xy(pin.position.lat, pin.position.lng || pin.position.lon);

         node.style.display = (xy.x > 0 && xy.y > 0 && xy.x < mw && xy.y < mh) ? 'block' : 'none';

         node.style.left = xy.x + 'px';
         node.style.top = xy.y + 'px';
      }
   }

   function onBounds(e)
   {
      zoom = e.zoom;
      tx = e.offset.x;
      ty = e.offset.y;

      onSize();
   }

   function onPinsLoaded(r)
   {
      for(var i in r)
         addPin(r[i]);
   }

   function addPin(pin)
   {
      if(!map || !map.ready())
      {
         todo.push(pin);
         return;
      }

      if(typeof pin == 'string')
      {
         mw.support.ajax({ url: pin, success: onPinsLoaded });
         return;
      }

      var html = pin.pin || settings.pin;

      var node = document.createElement('div');
      node.innerHTML = html;

      if(node.firstChild.nodeType != 1)
         layer.appendChild(node);
      else
         layer.appendChild(node = node.firstChild);

      node.id = pin.id || ('pin' + lid++);

      if(pin.title)
         node.title = pin.title;

      node.style.position = 'absolute';

      if(pin.position.x)
      {
         node.style.left = zoom * (pin.position.x + tx) + 'px';
         node.style.top = zoom * (pin.position.y + ty) + 'px';
      }
      else
      {
         var xy = map.latlng2xy(pin.position.lat, pin.position.lng || pin.position.lon);
         node.style.left = xy.x +'px';
         node.style.top = xy.y +'px';
      }

      pins[node.id] = pin;
      nodes[node.id] = node;
   }
}
mw = window.mw || {};

mw.map  = mw.map || {};
mw.map.layers = mw.map.layers || {};

mw.map.layers.Labels = function(options)
{
   var me;
   var map;
   var layer;
   var labels = {};

   var datamanager;

   var mapstate = { resizing: false, zooming: false, resized: false };

   var settings = mw.support.extend(options || {}, {
      type: 'width',
      items: null,                                    // If set, use as list of geoitems to use, else ask map
      sizes: [ 100, 150 ],
      visible: true
   });

   return me = {
      init: initialize,

      toggle: function(state) {
         if(state === undefined)
            state = !settings.visible;

         settings.visible = state;

         if(layer)
            layer.style.display = state ? 'block' : 'none';

         return state;
      },

      set: function(values) {
         mw.support.extend(values, settings);
      }
   }

   function rebuildLabels()
   {
      var items = settings.items || map.items();

      layer.innerHTML = '';
      labels = {};

      for(var i = 0; i < items.length; i++)
      {
         var id = items[i];
         var item = datamanager ? datamanager.geoitems[id] : { label: id };

         var node = document.createElement('div');
         node.className = 'map-label';
         node.style.position = 'absolute';
         node.style.pointerEvents = 'none';

         node.setAttribute('data-label', item.label);
         node.setAttribute('data-id', id);

         layer.appendChild(node);
         labels[id] = node;
      }
   }

   function initialize(m)
   {
      map = m;
      datamanager = map.state().data();

      layer = document.createElement('div');
      layer.className = 'map-label-layer';
      layer.style.position = 'absolute';
      layer.style.top = 0;
      layer.style.left = 0;

      if(!settings.visible)
         layer.style.display = 'none';

      if(settings.parent)
         settings.parent.appendChild(layer);
      else
         map.panes().appendChild(layer);

      map.listen('bounds', onBounds);
      map.listen('size', onBounds);

      map.listen('region', rebuildLabels);
      map.listen('ready', rebuildLabels);

      map.listen('resizestart', function(resized) {
         mapstate.resizing = true;
         mapstate.resized = resized !== false;

         layer.style.display = 'none';
      });

      map.listen('resizeend', function(resized) {
         mapstate.resizing = false;

         if(settings.visible && !mapstate.zooming)
         {
            onBounds();
            layer.style.display = 'block';
         }
      });

      map.listen('zoomstart', function() {
         mapstate.zooming = true;

         layer.style.display = 'none';
      });

      map.listen('zoomend', function() {
         mapstate.zooming = false;

         if(settings.visible && !mapstate.resizing)
            layer.style.display = 'block';
      });
   }

   function onBounds(e)
   {
      var mw = map.width();
      var mh = map.height();

      var sizes = settings.sizes;
      var slen = sizes.length;
      var sizefunc = settings.type instanceof Function ? settings.type : map[settings.type];

      for(var id in labels)
      {
         var node = labels[id];

         var center = map.center(id);
         var size = sizefunc(id);

         node.style.display = (!isNaN(size) && size !== false && size !== undefined && center.x > 0 && center.y > 0 && center.x < mw && center.y < mh) ? 'block' : 'none';
         for(var s = 0; s < slen; s++)
            if(sizes[s] > size)
               break;

         node.setAttribute('data-size', s);
         node.style.left = center.x + 'px';
         node.style.top = center.y + 'px';
      }
   }
}
mw = window.mw || {};

mw.map  = mw.map || {};
mw.map.layers = mw.map.layers || {};

mw.map.layers.Legend = function(options)
{
   var legend;

   return {
      init: function(map) {
         legend = document.createElement('div');
         legend.className = 'map-legend';

         if(options.parent)
            options.parent.appendChild(legend);
         else
            map.panes().appendChild(legend);

         map.listen('legend', function(val) {
            var l = '';
            for(var i in val)
            {
               if(val[i].label && val[i].label != '')
               {
                  var color = val[i].color || val[i].cssColour;

                  l += '<div class="map-legend-item"><div class="map-legend-swatch"';
                  l += ' style="background-color: ' + color + '"></div>';

                  l += val[i].label;
                  l += '</div>';
               }
            }
            legend.innerHTML = l;
         });
      }
   }
}
mw = window.mw || {};

mw.map  = mw.map || {};
mw.map.layers = mw.map.layers || {};

mw.map.layers.Slider = function(options)
{
   var hasTouch = 'ontouchstart' in document.documentElement || navigator.maxTouchPoints > 0;

   var node;
   var slider;

   var datamanager;
   var hasrangeset = options && options.hasOwnProperty('range');

   var settings = mw.support.extend(options || {}, {
      indicator: true,
      orientation: 'horizontal',
      play: false,
      padding: {
         before: 0,
         after: 0
      },
      range: {
         minimum: 1980,
         maximum: new Date().getFullYear()
      }
   });

   return {
      init: function(map)
      {
         node = document.createElement('div');
         node.className = 'year-slider';

         datamanager = map.state().data();

         if(settings.parent)
            settings.parent.appendChild(node);
         else
            map.panes().appendChild(node);

         slider = new mw.Slider(node, settings);

         var play, playTimer;
         if(settings.play)
         {
            play = document.createElement('div');
            play.className = 'play-button';
            node.appendChild(play);

            function togglePlay()
            {
               var speed = settings.play === true ? 5 : settings.play;

               function step()
               {
                  if(settings.value < settings.range.maximum)
                  {
                     settings.value++;

                     map.year(settings.value);
                     slider.set(settings.value)

                     playTimer = setTimeout(step, speed * 1000);
                  }
                  else
                     play.className = 'play-button';
               };

               if(play.className == 'play-button')
               {
                  if(map.play)
                     map.play();
                  else
                  {
                     if(settings.range.minimum == Infinity)
                        return;

                     if(settings.value == settings.range.maximum)
                        settings.value = settings.range.minimum - 1;

                     step();
                  }

                  play.className = 'stop-button';
               }
               else
               {
                  if(map.stop)
                     map.stop();
                  else
                     clearTimeout(playTimer);

                  play.className = 'play-button';
               }
            }

            mw.support.attachEvent(play, 'mousedown', togglePlay);
            mw.support.attachEvent(play, 'touchstart', togglePlay);
         }

         slider.listen('update', function(year) {
            map.year(year);
         });

         if(settings.value)
            map.year(settings.value);
         else
            map.year(slider.value());

         if(settings.indicator)
         {
            map.listen('indicator', function(id) {
               var indic = datamanager.indicators[id];

               if(indic)
               {
                  var from = settings.range.minimum;
                  var to = settings.range.maximum;
                  var step = 1;

                  if(!hasrangeset || indic.statistics.range.from < from)
                     from = indic.statistics.range.from;

                  if(!hasrangeset || indic.statistics.range.to > to)
                     to = indic.statistics.range.to;

                  if(indic.statistics.frequency > 1)
                     step = indic.statistics.frequency == 4 ? 'Q' : 'M';

                  slider.range(from, to, step);
               }
            });
         }

         map.listen('year', function(year) {
            slider.set(year);

            if(play && year == settings.range.maximum)
               play.className = 'play-button';
         });
      },

      range: function(min, max, step) {
         settings.range.minimum = min;
         settings.range.maximum = max;
         if(step)
            settings.range.step = step;

         if(slider)
            slider.range(min, max, step);
      },

      value: function() {
         return slider ? slider.value() : settings.range.maximum;
      },

      destroy: function() {
         slider.destroy();

         if(node)
         {
            if(node.parentNode)
               node.parentNode.removeChild(node);

            // Tony remove: delete node;
         }
      }
   };
}
mw = window.mw || {};

mw.map  = mw.map || {};
mw.map.layers = mw.map.layers || {};

mw.map.layers.Tiles = function(options)
{
   var me;
   var map;
   var layer;
   var zoomspeed;

   var gmap;                        // Google Maps object
   var tp = 0, tl = { x: 0, y: 0 }; // For latlng2xy calculations
   var wrapoverlay;                 // Overlay to test for map wrapping

   var dispatcher = new mw.Dispatcher();

   var settings = mw.support.extend(options || {}, {
      visible:    true,
      zoom:       2,
      style:      null,
      fade:       true,
      background: '#b3d1ff',
      center:     { lat: 0, lng: 0 }
   });

   return me = {
      init: initialize,

      toggle: function(state) {
         if(state === undefined)
            state = !(layer.style.display != 'none');

         if(settings.visible == state)
            return;

         settings.visible = state;

         if(layer)
            layer.style.display = state ? 'block' : 'none';

         if(map)
         {
            map.toggleClass('tile-layer-active', state);
            map.set({ speed: { zoom: settings.visible ? 0.001 : zoomspeed } });

            if(settings.visible)
            {
               if(!gmap)
                  initializeMap();
               else
               {
                  map.projection(latlng2xy);
                  onZoomEnd();
               }
            }
            else
               map.projection(false);
         }

         return state;
      },

      set: function(values) {
         mw.support.extend(values, settings);
      },

      listen: function(what, callback) {
         dispatcher.register(what, callback);
      },

      unlisten: function(what, callback) {
         dispatcher.remove(what, callback);
      }
   }

   function latlng2xy(lat, lng)
   {
      var exp = Math.sin(lat * Math.PI / 180);
      if(exp < -.9999) exp = -.9999;
      if(exp > .9999) exp = .9999;

      var x = tp + (lng * ((2 * tp) / 360));
      var y = tp + (0.5 * Math.log((1 + exp) / (1 - exp))) * ((-2 * tp) / (2 * Math.PI));

      return { x: x - tl.x, y: y - tl.y };
   }

   function initializeMap()
   {
      gmap = new google.maps.Map(layer, {
         disableDefaultUI: true,
         backgroundColor:  settings.background,
         minZoom:          1,
         center:           settings.center,
         zoom:             settings.zoom
      });

      if(settings.style)
      {
         if(settings.style instanceof Object)
         {
            gmap.mapTypes.set('custom', new google.maps.StyledMapType(settings.style, { name: 'Custom' }));
            gmap.setMapTypeId('custom');
         }
         else
         {
            mw.support.ajax({
               url: settings.style, success: function(r)
               {
                  if(typeof r == "string" && r.substr(0, 1) == '{')
                     r = JSON.parse(r);

                  gmap.mapTypes.set('custom', new google.maps.StyledMapType(r, { name: 'Custom' }));
                  gmap.setMapTypeId('custom');
               }
            });
         }
      }

      wrapoverlay = new WrapOverlay();
      wrapoverlay.setMap(gmap);

      google.maps.event.addListenerOnce(gmap, 'bounds_changed', updateCorner);
      google.maps.event.addListener(gmap, 'resize', function() { setTimeout(function() { updateCorner(true) }, 0) });

      map.set({ speed: { zoom: settings.visible ? 0.001 : zoomspeed } });
      map.projection(latlng2xy);

      if(settings.parent)
         settings.parent.appendChild(layer);
      else
         map.panes(mw.map.layers.BELOW).appendChild(layer);

      map.listen('zoomstart', onZoomStart);
      map.listen('zoomend', onZoomEnd);
      map.listen('pan', onPan);
   }

   function initialize(m)
   {
      map = m;

      layer = document.createElement('div');
      layer.className = 'map-tile-layer';
      layer.style.position = 'absolute';

      layer.style.top = 0;
      layer.style.left = 0;
      layer.style.width = '100%';
      layer.style.height = '100%';

      zoomspeed = map.settings('speed')['zoom'];

      if(!settings.visible)
         layer.style.display = 'none';
      else
      {
         map.toggleClass('tile-layer-active', true);
         initializeMap();
      }
   }

   function updateCorner(onresize)
   {
      if(!settings.visible)
         return;

      // Determine top left of current viewport
      tp = 256 * Math.pow(2, gmap.getZoom() - 1);

      tl = { x: 0, y: 0 };

      var bbox = gmap.getBounds();
      if(!bbox)
         return;

      tl = latlng2xy(bbox.getNorthEast().lat(), bbox.getSouthWest().lng());

      // Check if Google map is actually wrapped, if so, make sure we're using the actual "middle" part
      var projection = wrapoverlay.getProjection();
      if(projection)
      {
         var wwidth = projection.getWorldWidth();

         var swx = projection.fromLatLngToContainerPixel(bbox.getSouthWest()).x;
         var nex = projection.fromLatLngToContainerPixel(bbox.getNorthEast()).x;

         if(swx < 0 && tl.x + layer.clientWidth > wwidth)
            tl.x -= wwidth;
         else if(wwidth < layer.clientWidth)
         {
            if(nex + wwidth > layer.clientWidth && swx > wwidth / 2)
               nex -= wwidth;
            tl.x -= nex;
         }
      }

      if(!map.projection())
      {
         gmap.setZoom(gmap.getZoom() - 1);
         google.maps.event.addListenerOnce(gmap, 'bounds_changed', updateCorner);
      }
      else if(!onresize)
         google.maps.event.trigger(gmap, 'resize');
   }

   function onPan(e)
   {
      gmap.panBy(-e.x, -e.y);

      tl.x -= e.x;
      tl.y -= e.y;
   }

   function onZoomStart()
   {
      if(!settings.visible)
         return;

      if(settings.fade)
         map.panes().style.opacity = 0;
   }

   // Somehow sometimes this function is called too-soon, and Google Maps returns a bounding box not quite correct
   // (maybe some zooming happening in the background?) Mainly in Tellmaps where Tiles is created/destroyed on demand.
   function doZoomEnd(id)
   {
      // Determine bbox of current MW map
      var sw, ne;
      if(id)
      {
         var bbox = map.box(id);
         sw = { lat: bbox[3], lng: bbox[0] };
         ne = { lat: bbox[1], lng: bbox[2] };
      }
      else
      {
         sw = map.xy2latlng(0, layer.clientHeight, true);
         ne = map.xy2latlng(layer.clientWidth, 0, true);
      }

      sw = new google.maps.LatLng(sw.lat, sw.lng, true);
      ne = new google.maps.LatLng(ne.lat, ne.lng, true);

      var bounds = new google.maps.LatLngBounds(sw, ne);
      gmap.fitBounds(bounds);

      updateCorner();

      if(settings.fade)
      {
         google.maps.event.addListenerOnce(gmap, 'idle', function() {
            map.panes().style.opacity = 1;
         });
      }
   }

   function onZoomEnd(id)
   {
      setTimeout(function() { doZoomEnd(id), 0 });
   }
}

if(window.google instanceof Object)
{
   function WrapOverlay() {}

   WrapOverlay.prototype = new google.maps.OverlayView();
   WrapOverlay.prototype.onAdd = function() {};
   WrapOverlay.prototype.draw = function() {};
   WrapOverlay.prototype.onRemove = function() {};
}

/**
 * TODO
 * [ ] geoitem + [indicator] chart (load data, ....)
 */

mw = window.mw || {};
mw.chart = mw.chart || {};

mw.Chart = function(element, options)
{
   var me;
   var node;                                          // DOM node to put chart in
   var container;                                     // Container for chart layers
   var chart;                                         // Chart container
   var highchart;                                     // Highcharts object
   var hover;                                         // Highlight layer
   var legend;                                        // Legend layer
   var slider;

   var lasthover, lastfuture, lastsecondary, timer;

   var statemanager;
   var datamanager;
   var currentYear;
   var currentIndic;
   var currentGeo;
   var currentWidth;
   var currentHeight;

   var holddraw;

   var dataready = true;                              // If datamanager, is it ready? TRUE if no datamanager
   var chartready = false;
   var trigger;                                       // If set, initial set of series to dispatch once highchart is ready

   var values = {};                                   // Timeseries values used for drawing the chart
   var series = {};                                   // Current series IDs
   var range;                                         // Ranges for x and y
   var labels = { x: {}, y: {} };
   var future;                                        // Whether there are lines split into solid and dashed parts

   var chartOptions = {                               // Global highchart settings (could be overridden through settings.options)
      title: null,
      exporting: {
         enabled: false
      },
      chart: {
         animation: false,
         spacingTop: 10,
         spacingRight: 12,
         spacingBottom: 25
      },
      credits: {
         enabled: false
      },
      tooltip: {
         enabled: false
      },
      legend: {
         enabled: false
      },
      plotOptions: {
         pie: {},
         column: {
            minPointLength: 1
         },
         series: {
            center: ['50%', '50%'],
            connectNulls: true,
            dataLabels: {
               enabled: false
            },
            stickyTracking: false,
            states: {
            },
            marker: {
               enabled: false
            },
            point: {
               events: {
                  mouseOver: onHover,
                  mouseOut: onHover
               }
            }
         }
      },
      xAxis: {
         title: null,
         startOnTick: false,
         endOnTick: false,
         lineWidth: 0,
         minorGridLineWidth: 0,
         gridLineWidth: 0,
         minorTickInterval: null,
         tickWidth: 0,
         labels: {
            enabled: false
         }
      },
      yAxis: {
         title: null,
         startOnTick: false,
         reversedStacks: false,
         endOnTick: false,
         lineWidth: 0,
         gridLineWidth: 0,
         tickWidth: 0,
         labels: {
            enabled: false
         }
      }
   };

   var charttypes = {
      line: 'line',
      bar: 'bar',
      column: 'column',
      donut: 'pie',
      pie: 'pie',
      pyramid: 'bar',
      bubble: 'bubble'
   };

   var dispatcher = new mw.Dispatcher();

   var defaults = mw.support.extend(mw.chart.defaults || {});
   defaults = mw.support.extend(options || {}, defaults);

   var settings = mw.support.extend(defaults, {
      type: 'line',                          // One of 'line', 'bar', 'column', ...
      indicator: false,                      // Set one of these to array for initial series (or empty array) and
      geoitem: false,                        // the other to the datasource (so either 1 geoitem with indicator
                                             // series, or 1 indicator with geoitem series).
      year: false,                           // Either TRUE to automatically add yearslider, or a mw.map.layers.Slider object
      legend: false,                         // One of: FALSE for no chart legend, a mw.chart.Legend object, TRUE for a
                                             // automatically generated chart.Legend, or a chart.Legend settings object
      hover:                                 // One of: template for hover labels (string), function returning template, or a
                                             // mw.map.layers.Highlight object
         "<div class='label'>{LABEL}</div><div class='value'>{VALUE}</div>",
      format: '%.02w',                       // Default format for hover label values. mw.support.format() supported
                                             // string, or a callback function
      state: {                               // Options for the StateManager to use
         manager: undefined,                 // Can be set to use an external StateManager (so one can be re-used
                                             // amongst components. If not set, Chart will create one.
         data: undefined,                    // If the chart should create its own StateManager, reference to data
                                             // file or external DataManager
         indicator: true,                    // Whether the chart should listen for indicator state changes
         year: true,                         // Whether the chart should listen for year state changes
         geoitem: true                       // Whether the chart should set the geoitem state on click
      },
      latest: false,                         // If TRUE non-timeseries charts will use the latest year with a value for years without value
      busy: null,                            // If NULL, create busy indicator if using datamanager, else ID or node of existing one
      background: '#ffffff',                 // Background color for chart area
      text: {
         charwidth: 8.5,                     // Guestimate for character width when chart cannot determine width of a label
         color: '#000000',                   // Default text color
         font: 'Arial',                      // Default font family
         size: '10px',                       // Default font size
         weight: 'normal'                    // Default font weight ('normal', 'bold')
      },
      xaxis: {
         type: 'timeseries',                 // One of 'timeseries' (line, column, bar), 'geoitem', 'indicator' (column, bar), 'linear', 'logarithmic' (bubble)
         labels: 5,                          // One of FALSE (no labels), numeric (every N ticks), 'minmax' string, array of values, or { x: label } object
         multiples: false,                   // If every N ticks, only show exact multiples of N (i.e. mainly for last label)
         overlap: "hide",                    // What to do with overlapping labels: one of "hide", "rotate", "show", "updown"
         range: {
            minimum: "series",               // One of "dataset", "series" or a specific value
            maximum: "series" ,              // Idem,
            extend: true                     // If TRUE, extend range to be multiple of xaxis.labels
         },
         format: null,                       // Format for x-axis labels. If NULL, do not format.
         text: null,                         // Optional text overrides
         offset: 0                           // Additional offset for the labels (to move them in or out of the chart)
      },
      yaxis: {
         width: "auto",                      // Width of y-axis to use for labels
         position: "left",                   // One of "left" or "right" - side of chart to show axis on
         labels: {                           // Can also be set to FALSE (no labels) or array of values, or { y: label } object
            prettify: true,                  // One of TRUE (prettify), FALSE (do not) or callback function for formatting
            maximum: 5,                      // When using prettified labels, maximum number of labels
            align: "default"                 // How to align the yaxis labels, one of "default" (right aligned for an axis with position "left",
                                             // or left aligned for an axis with position "right"), "left", or "right"
         },
         range: {
            minimum: "series",               // One of "dataset", "series" or a specific value
            maximum: "series",               // Idem
            zero: true                       // Force 0 into y-axis range when using automatic range
         },
         format: null,                       // Format for y-axis labels. If NULL, use chart default
         text: null,                         // Optional text overrides
         offset: 0,                           // Additional offset for the labels (to move them in or out of the chart)
         count: 1                             // Number of y-axis (mostly tested with linecharts...)
      },
      future: {
         from: false,                        // If set to an x value, format future data differently
         background: '#f0f0f0',              // Color background differently for future years
         style: "dash"                       // Line charts: one of "solid", "dash", "dot"
      },
      colors: false,                         // If FALSE, use random colors, else array of color, or callback function.
      stacked: false,                        // For bar and column charts, one of FALSE, "normal", or "percent"
      line: {                                // Line specific settings
         width: 1,                           // Line width
         style: "solid",                     // One of "solid", "dash", "dot"
         marker: false,                      // One of "circle", "disc", FALSE
         radius: 3,                          // For circle/disc marker, radius
         secondary: '#cccccc',
         hover: {                            // Overrides for hovered lines
            width: 2,
            marker: "circle",                // If TRUE, same marker, else if line.marker == FALSE,
                                             // one of "circle", "disc" or FALSE
            radius: 3                        // For circle/disc marker, radius
         }
      },
      column: {                              // Column specific overrides
         gradient: false,                    // One of FALSE (no gradient), "lighten", "darken"
         hover: {
            color: "blue",                   // Color for hovered columns - CSS color, or one of FALSE, "lighten" or "darken"
            background: '#f0f0f0'            // When hovering column, color full background of column
         }
      },
      bar: {                                 // Bar specific overrides
         gradient: false,                    // One of FALSE (no gradient), "lighten", "darken"
         hover: {
            color: "lighten",                // Color for hovered bars - CSS color, or one of FALSE, "lighten" or "darken"
            background: '#f0f0f0'            // When hovering bar, color full background of bar
         }
      },
      donut: {
         radius: '60%'
      },
      pyramid: {
      },
      bubble: {
         radius: {                           // For bubble charts, range of circle radii. For scatter plots, minimum is used as fixed value
            minimum: 5,
            maximum: '40%'
         },
         color: "region"                     // If set to "region", color by region, else CSS color value, or if set to FALSE use global colors
      },
      grid: {
         horizontal: {                       // Horizontal grid lines
            first: true,                     // Whether to draw first line
            last: true,                      // Whether to draw last line
            major: {                         // Style of lines at labeled values
               width: 1,
               color: '#dadada',
               style: 'solid'
            },
            minor: {                         // Style of lines at other values
               width: 0,
               major: 5,                     // Number of minor lines per major interval
               color: '#dadada',
               style: 'solid'
            }
         },
         vertical: {                         // Vertical grid lines
            first: true,                     // Whether to draw first line
            last: true,                      // Whether to draw last line
            major: {                         // Style of lines at labeled values
               width: 1,
               color: '#dadada',
               style: 'solid'
            },
            minor: {                         // Style of lines at other values
               width: 0,
               major: 10,                    // Number of minor lines per major interval
               color: '#dadada',
               style: 'solid'
            }
         }
      },
      ticks: {                               // Set to FALSE for no tick
         width: 1,
         color: '#dadada',
         length: 7,
         major: false,                       // Ticks at labels?
         minor: false,                       // Ticks at minor grid intervals?
         offset: 0
      },
      'export': {
         renderer: 'https://www.mappingworlds.nl/export/',
                                             // PNG renderer to use (will also allow download of SVG)
         size: undefined,                    // Optional page size overrides -- allowed formats are like "1280", "1000x400", "1280@2"
         delay: 1,                           // Delay before chart is rendered on server (to accomodate animations, etc)
         template: undefined,                // Optional template to wrap chart in (PNG and XLS only)
         selector: undefined,                // Optional querySelector() compatible selector for getting content from template (PNG)
         sheet: {                            // XLS specific options:
            type: 'indicator',               // - preference which type of data goes per sheet
            title: 'id'                      // - which property to use as sheet title (one of 'id' or 'label')
         },
         parameters: {                       // Optional search/replace parameters for template (use {NAME} in template, and set name: "value" here)
         }
      },
      options: {                             // Highcharts specific options, will be merged
      }                                      // into options just before rendering chart
   });

   node = typeof element == "string" ? document.getElementById(element) : element;

   container = document.createElement('div');
   container.style.position = 'relative';
   container.style.width = '100%';
   container.style.height = '100%';
   container.className = 'chart-wrapper';

   node.appendChild(container);
   node.setAttribute('data-chart-type', options.type);

   chart = document.createElement('div');
   chart.style.overflow = 'hidden';
   chart.style.position = 'relative';
   chart.className = 'chart-container';
   container.appendChild(chart);

   if(settings.state.manager instanceof mw.StateManager)
      statemanager = settings.state.manager;
   else
   {
      var dm = settings.state.data || settings.data;

      if(dm instanceof mw.StateManager)
         statemanager = dm;
      else
         statemanager = new mw.StateManager({ data: dm });

      if(settings.busy === null && dm && !(dm instanceof mw.DataManager))
         settings.busy = true;
   }

   if(settings.busy)
   {
      if(settings.busy === true)
      {
         settings.busy = document.getElementById('busy');
         if(!settings.busy)
         {
            settings.busy = document.body.appendChild(document.createElement('div'));
            settings.busy.id = 'busy';
         }
      }

      settings.busy.style.display = 'block';
   }

   var keys = { geoitem: 'indicator', indicator: 'geoitem' };
   for(var k in keys)
   {
      if(settings.type == 'bubble' && k == 'indicator')
         continue;

      if(settings[k] instanceof Array)
      {
         if(settings.xaxis.type == 'timeseries' || settings.xaxis.type == keys[k])
         {
            for(var i = 0; i < settings[k].length; i++)
               series[settings[k][i]] = true;

            trigger = series;
         }

         if(typeof settings.hover == 'string')
            settings.hover = settings.hover.replace('{LABEL}', '{' + k.toUpperCase() + '}');
      }
   }

   if(settings.hover)
   {
      if(settings.hover.init instanceof Function)
         hover = settings.hover;
      else
      {
         var o = { template: settings.hover };
         if(settings.format)
            o.format = settings.format;
         hover = new mw.map.layers.Highlight(o);
      }
   }

   if(settings.legend)
   {
      if(settings.legend.init instanceof Function)
         legend = settings.legend;
      else
      {
         var opts;
         if(settings.legend instanceof Object)
            opts = mw.support.extend(settings.legend, {});
         else
            opts = { interactive: settings.legend };

         if(opts.state)
            opts.state = settings.state;

         legend = new mw.chart.Legend(opts);
      }
   }

   if(settings.type == 'bubble')
   {
      if(settings.xaxis.type == 'timeseries')
         settings.xaxis.type == 'linear';

      if(settings.grid)
      {
         settings.grid.horizontal.first = true;
         settings.grid.horizontal.last = true;
         settings.grid.vertical.first = true;
         settings.grid.vertical.last = true;
      }
   }

   if(settings.values)
      values = settings.values;

   if(charttypes[settings.type] != 'bar' && charttypes[settings.type] != 'column')
      settings.stacked = false;

   // If labels is set to object or array, it won't merge over into the default numeric value
   if(options.xaxis && options.xaxis.labels && settings.xaxis.labels !== options.xaxis.labels)
      settings.xaxis.labels = options.xaxis.labels;

   setOptions();

   // Temporarily exclude bubble until it can handle multi-years
   if(settings.state.year && !settings.year && settings.type != 'bubble')
      statemanager.listen('year', onYear);

   if(settings.year && settings.year !== true && !settings.year.init)
      currentYear = settings.year;

   if(settings.state.indicator)
      statemanager.listen('indicator', onIndicator);

   if(settings.state.geoitem)
      statemanager.listen('geoitem', onGeoItem);

   datamanager = statemanager.data();

   if(datamanager && datamanager.listen instanceof Function)
   {
      dataready = false;

      datamanager.listen('ready', function(r) {
         dataready = true;
         // Allow 'me' to be set if everything is already ready now
         setTimeout(kickstart, 0);
      });
   }
   else
      setTimeout(kickstart, 0);

   if(settings.resize)
   {
      var resizetimer;

      mw.support.attachEvent(window, 'resize', function() {
         clearTimeout(resizetimer);

         if((chart.clientWidth || chart.offsetWidth) == currentWidth && (chart.clientHeight || chart.offsetHeight) == currentHeight)
            return;

         resizetimer = setTimeout(resizeChart, 100);
      });
   }


   // Public methods
   return me = {
      /**
       * Is the chart ready for interactions?
       * @return boolean
       */
      ready: function() { return dataready; },

      /**
       * Destroy chart contents and all listeners
       **/
      destroy: function() {
         if(settings.state.year)
            statemanager.unlisten('year', onYear);

         if(settings.state.indicator)
            statemanager.unlisten('indicator', onIndicator);

         if(settings.state.geoitem)
            statemanager.unlisten('geoitem', onGeoItem);

         dispatcher.destroy();

         if(highchart)
            highchart.destroy();

         if(hover && hover.destroy)
            hover.destroy();

         if(legend && legend.destroy)
            legend.destroy();

         if(slider && slider.destroy)
            slider.destroy();

         node.innerHTML = '';
      },

      /**
       * Return a specific pane (DOM node) to which a layer can attached.
       * Currently supports just a single pane
       * @param DOMNode pane HTML element to which to add layers
       */
      panes: function() {
         return container;
      },

      /**
       * Return width/height of chart
       */
      width: function() { return highchart ? highchart.chartWidth : (chart.clientWidth || chart.offsetWidth); },
      height: function() { return highchart ? highchart.chartHeight : (chart.clientHeight || chart.offsetHeight); },

      /**
       * Set values for chart items
       * @param object vals For timeseries based charts: { id: { year:
       *               value }, ... } object, or function which will
       *               return a timeseries for a given ID. For
       *               category based charts, { cat: value } object.
       */
      values: function(vals) {
         values = vals;
      },

      /**
       * Set year to use for a chart-type which is not based on a timeseries
       * @param int year Year
       */
      year: function(year) {
         // Temporarily exclude bubble until it can handle multi-years
         if(settings.state.year && !settings.year && settings.type != 'bubble')
            statemanager.set('year', year);
         else
            onYear(year);
      },

      /**
       * Force a redraw of the chart
       */
      redraw: function(checksize) {
         if(checksize)
            resizeChart(true);

         draw();
      },

      /**
       * Add a series to the chart
       * @param string id ID of series to add to chart. If using a datamanager, ID should be of geoitem if
       *               settings.geoitem is array, else of indicator.
       *               If not using datamanager, ID should be key in previously set values
       * @param object data Optional object of data for this ID
       * @param redraw If FALSE, do not redraw chart (call redraw() explicitly)
       */
      add: function(id, data, redraw) {
         if((data === true || data === false) && redraw === undefined)
         {
            redraw = data;
            data = null;
         }

         var key;
         if(settings.type == 'bubble')
            key = 'geoitem';
         else if(settings.indicator instanceof Array && settings.xaxis.type != 'indicator')
            key = 'indicator';
         else
            key = 'geoitem';

         if(settings.state[key] && !data)
            statemanager.set(key, id);
         else
         {
            if(data)
               values[id] = data;
            // When using a single geoitem and multiple indicators, the new indicator might not have loaded yet
            else if(!values[id] && key == 'indicator')
            {
               settings.indicator.push(id)
               onGeoItem(settings.geoitem);
            }

            series[id] = true;

            if(redraw || redraw === undefined)
               draw();
         }
      },

      /**
       * Remove a series from the chart
       * @param string id ID of series currently in chart.
       * @param redraw If FALSE, do not redraw chart (call redraw() explicitly)
       */
      remove: function(id, redraw) {
         series[id] = false;

         dispatcher.dispatch(me, 'series', series);

         if(redraw || redraw === undefined)
            draw();
      },

      /**
       * Add a full series in one go. For now only works for geoitems
       * @param ids Array of IDs to set as series
       */
      series: function(ids, redraw) {
         var vals = {}
         for(var id in series)
            if(series[id] && ids.indexOf(id) == -1)
               vals[id] = false;

         for(var i = 0; i < ids.length; i++)
            vals[ids[i]] = true;

         dispatcher.dispatch(me, 'series', series = vals);

         if(redraw || redraw === undefined)
            draw();
      },

      /**
       * Returns datamanager used by chart. Useful for layers if there
       * is no global datamanager in use.
       * @return class Datamanager object
       */
      state: function() {
         return statemanager;
      },

      /**
       * Get the pixel position for a given x/y combination 
       * @param mixed x X axis value
       * @param float value Y axis value
       * @return 
       */
      position: function(x, value) {
         if(highchart)
            return { x: highchart.xAxis[0].toPixels(x), y: highchart.yAxis[0].toPixels(value) };
         else
            return { x: undefined, y: undefined };
      },

      /**
       * Update settings. Not all settings will have effect once the chart is instantiated
       * @param object values Settings to merge into current settings
       */
      set: function(values) {
         mw.support.extend(values, settings);

         // Types may differ, in which case the .extend() did not work
         if(values.xaxis.labels)
            settings.xaxis.labels = values.xaxis.labels;

         if((values.xaxis && values.xaxis.range) || (values.yaxis && values.yaxis.range))
            range = false;

         if(draw)
            draw();
      },

      /**
       * Get a chart-setting, or all settings
       * @param mixed key If not defined, return all keys, else single value
       * @return object
       */
      settings: function(key) {
         function s2a()
         {
            var r = [];
            for(var id in series)
               if(series[id])
                  r.push(id);
            return r;
         }

         // For 'geoitem' and 'indicator' settings, return the actual current state of active series,
         // not the initially set values. Note that scatter/bubble charts have arrays for both
         // settings, and geoitem is the dynamic one
         if(key == 'geoitem' && settings.geoitem instanceof Array)
            return s2a();
         else if(key == 'indicator')
         {
            if(settings.indicator instanceof Array && settings.type != 'bubble')
               return settings.xaxis.type == 'indicator' ? settings[key] : s2a();
            else if(currentIndic)
               return currentIndic;
            else
               return settings[key];
         }
         else
            return key ? settings[key] : settings;
      },

      /**
       * Type of chart.
       * @param bool base If TRUE, return "base type" of chart, else user specified type
       * @return string One of "line", "bar", "pie", "column" (base types), or additionaly "donut", "pyramid", "bubble"
       */
      type: function(base) {
         return base ? charttypes[settings.type] : settings.type;
      },

      /**
       * Return color of series
       * @param string id ID of series
       * @return CSS color
       **/
      color: function(id) {
         if(settings.legend.override && settings.legend.override[id] && settings.legend.override[id].color)
            return settings.legend.override[id].color;

         if(highchart)
         {
            var s = highchart.get(id);
            if(s)
            {
               var color = s.color;
               return !color || typeof color == "string" ? color : color.stops[0][1];
            }
         }

         return '#d5d7da';
      },

      /**
       * Highlight a chart item (as if the user hovered over it)
       * @param string id ID of item (or undefined/null to remove highlight)
       */
      highlight: function(id, secondary) {
         if(highchart)
         {
            function a2s(v)
            {
               if(v instanceof Array)
               {
                  var i = 0;
                  for(var s in series)
                  {
                     if(s == id || i == v.length - 1)
                        break;
                     i++;
                  }
                  return v[i];
               }
               else
                  return v;
            }

            // FIXME: hovers for bars
            if(lasthover)
            {
               var lw = a2s(settings.line.width);

               if(settings.type == 'line')
               {
                  var lhs = highchart.get(lasthover);
                  if(lhs && lhs.graph)
                  {
                     lhs.graph.attr('stroke', lhs.color);
                     lhs.graph.attr('stroke-width', lhs.graph.stroke == settings.line.secondary ? lw / 2 : lw);
                  }
               }

               if(lastfuture && lastfuture.graph)
               {
                  lastfuture.graph.attr('stroke', lastfuture.color);
                  lastfuture.graph.attr('stroke-width', lastfuture.graph.stroke == settings.line.secondary ? lw / 2 : lw);
               }

               if(lastsecondary)
               {
                  for(var id in lastsecondary)
                  {
                     var lhs = highchart.get(id);
                     if(lhs && lhs.graph)
                     {
                        lhs.graph.attr('stroke', lastsecondary[id]);
                        lhs.graph.attr('stroke-width', lw / 2);
                     }

                     if(future)
                     {
                        var lhs = highchart.get(id + '-future');
                        if(lhs && lhs.graph)
                        {
                           lhs.graph.attr('stroke', lastsecondary[id]);
                           lhs.graph.attr('stroke-width', lw / 2);
                        }
                     }
                  }
               }
            }

            var s = highchart.get(id);

            if(s)
            {
               lasthover = id;

               var hw = a2s(settings.line.hover.width);
               if(settings.type == 'line' && s.graph)
               {
                  if(secondary && !(secondary instanceof Array))
                     s.graph.attr('stroke', secondary);

                  s.graph.attr('stroke-width', hw);
               }

               if(future)
               {
                  lastfuture = highchart.get(id + '-future');
                  if(lastfuture && lastfuture.graph)
                  {
                     if(secondary && !(secondary instanceof Array))
                        lastfuture.graph.attr('stroke', secondary);

                     lastfuture.graph.attr('stroke-width', hw);
                  }
               }
            }

            if(secondary instanceof Array)
            {
               lastsecondary = {};
               for(var i = 0; i < secondary.length; i++)
               {
                  var id = secondary[i];
                  var lhs = highchart.get(id);
                  if(lhs && lhs.graph)
                  {
                     lastsecondary[id] = lhs.graph.attr('stroke');
                     lhs.graph.attr('stroke', settings.line.secondary);

                     if(future)
                     {
                        var lhs = highchart.get(id + '-future');
                        if(lhs && lhs.graph)
                           lhs.graph.attr('stroke', settings.line.secondary);
                     }
                  }
               }
            }
         }

         if(hover)
            hover.hide();
      },

      /**
       * Export the chart.
       * @param string type One of "png" (default) or "svg".
       * @param string download Optional ID of window/tab to show results in, or TRUE
       *                        if export is to be presented as downloadable file.
       * @param object Optional parameters to send to renderer (SVG only supports title)
       * @return If download was either TRUE or window ID, TRUE if export type was supported,
       *         FALSE otherwise. Else, SVG string or base64 encoded PNG if succesful, FALSE otherwise
       */
      'export': function(type, download, parameters) {
         type = type || 'png';

         if(parameters == undefined && download instanceof Object)
         {
            parameters = download;
            download = undefined;
         }
         else
            parameters = parameters || {};

         if(type == 'png' && !settings['export'].renderer)
            return false;

         if(type == 'png')
            return exportPNG(download, parameters);
         else if(type == 'xls' || type == 'xlsx' || type == 'csv')
            return exportXLS(type, parameters);
         else
            return exportSVG(download, parameters);
      },

      listen: function(what, callback) {
         if(what == 'ready' && dataready && chartready)
            callback();
         else
            dispatcher.register(what, callback);
      },

      unlisten: function(what, callback) {
         dispatcher.remove(what, callback);
      }
   }

   function resizeChart(forced)
   {
      if(highchart)
      {
         var width = chart.clientWidth || chart.offsetWidth;
         var height = chart.clientHeight || chart.offsetHeight;
         
         if(width)
         {
            highchart.setSize(forced || settings.resize !== 'height' ? width : null, forced || settings.resize !== 'width' ? height : null, false);
            currentWidth = width; currentHeight = height;
         }
         else
         {
            clearTimeout(resizetimer);
            resizetimer = setTimeout(resizeChart, 100);
         }
      }

      var wt = container.getBoundingClientRect().top;
      var ct = chart.getBoundingClientRect().top;

      for(var c = 0; c < container.children.length; c++)
         if(container.children[c] !== chart)
            container.children[c].style.top = (ct - wt) + 'px';
   }

   function onYear(year)
   {
      currentYear = year;

      if(settings.xaxis.type != 'timeseries')
         draw();

      dispatcher.dispatch(me, 'year', year);
   }

   function onHover(e)
   {
      clearTimeout(timer);

      if(this.id == 'bubble-dummy')
         return;

      if(e.type == "mouseOut")
      {
         timer = setTimeout(function() {
            dispatcher.dispatch(me, 'hover', null);
            highchart.xAxis[0].removePlotBand('bar-hover');
         }, 10);
      }
      else
      {
         var o = {
            x: highchart.plotLeft,
            y: highchart.plotTop,
            point: this,
            target: me
         };

         var h = settings[settings.type].hover;
         if(h && h.background)
         {
            var x = highchart.xAxis[0];
            var p = this.barX + highchart.plotLeft;

            x.addPlotBand({
               id: 'bar-hover',
               color: h.background,
               from: x.toValue(p),
               to: x.toValue(p + Math.ceil(this.pointWidth + 1)),
               zIndex: 1
            });
         }

         if(charttypes[settings.type] == 'bar')
         {
            o.x = highchart.plotWidth - this.plotY + highchart.plotLeft + (this.y < 0 ? 0.5 : -0.5) * this.shapeArgs.height;
            o.y = highchart.plotHeight - this.barX - 0.5 * this.pointWidth + 1;
         }
         else if(this.tooltipPos)
         {
            o.x += this.tooltipPos[0];
            o.y += this.tooltipPos[1];
         }
         else if(settings.type == 'column')
         {
            o.x += this.barX + 0.5 * this.pointWidth + 1;
            o.y += this.plotY;
         }
         else
         {
            o.x += this.plotX;
            o.y += this.plotY;
         }

         if(settings.type == 'pyramid' && settings.xaxis.type == 'geoitem')
            o.indicator = settings[settings.xaxis.type][this.y < 0 ? 0 : 1];
         else if(settings.type == 'bubble')
            o.indicator = settings.indicator[2];
         else if(settings.indicator instanceof Array && settings.indicator.indexOf(this.category) != -1)
            o.indicator = this.category;
         else if(settings.indicator instanceof Array && settings.xaxis.type != 'indicator')
            o.indicator = this.name || this.series.name;
         else if(currentIndic)
            o.indicator = currentIndic;
         else if(settings.indicator)
            o.indicator = settings.indicator;

         if(settings.type == 'pyramid' && settings.xaxis.type == 'indicator')
            o.geoitem = settings[settings.xaxis.type][this.y < 0 ? 0 : 1];
         else if(settings.geoitem instanceof Array && settings.geoitem.indexOf(this.category) != -1)
            o.geoitem = this.category;
         else if(settings.geoitem instanceof Array && settings.xaxis.type != 'geoitem')
            o.geoitem = this.name || this.series.name;
         else if(currentGeo)
            o.geoitem = currentGeo;
         else if(settings.geoitem)
            o.geoitem = settings.geoitem;

         if(settings.type == 'pyramid')
         {
            var indic = o.indicator;
            o.indicator = o.geoitem;
            o.geoitem = indic;
         }

         if(settings.xaxis.type == 'timeseries')
            o.year = this.year || this.x;
         else
            o.year = currentYear;

         if(this.total)
         {
            o.total = this.total;
            o.percent = this.y / this.total * 100;
         }

         timer = setTimeout(function() {
            dispatcher.dispatch(me, 'hover', o);
         }, 10);
      }
   }

   function onLineHover(e)
   {
      var id = this.userOptions['id'];
      var dp = id.indexOf('-future');

      // Fix 'unhover' of line width when using two segments
      var s = highchart.get(dp == -1 ? id + '-future' : id.substr(0, dp));
      if(s && s.graph)
         s.graph.attr('stroke-width', e.target.options.lineWidth);
   }

   function onIndicator(id)
   {
      if(!id)
      {
         draw();        // Make sure legend is drawn, even if no data
         return;
      }

      if(settings.indicator instanceof Array && settings.xaxis.type != 'indicator' && settings.type != 'bubble')
      {
         series[id] = !series[id];
         draw();

         dispatcher.dispatch(me, 'series', series);
      }
      else
      {
         if(settings.busy)
            settings.busy.style.display = 'block';

         if(!settings.geoitem)
            return;

         datamanager.load(id, function() {
            var indic = datamanager.indicators[id];

            if(settings.busy)
               settings.busy.style.display = 'none';

            if(settings.type == 'pyramid')
            {
               if(!values)
                  values = { left: false, right: false };

               var s = settings[settings.xaxis.type];
               if(id == s[0])
                  values.left = indic.values;
               else
                  values.right = indic.values;
            }
            else if(settings.type == 'bubble')
            {
               if(!values)
                  values = [ ];

               if(settings.indicator[0] == id)
                  values[0] = indic.values;

               if(settings.indicator[1] == id)
                  values[1] = indic.values;

               if(settings.indicator[2] == id)
                  values[2] = indic.values;
            }
            else if(settings.indicator instanceof Array)
               values[id] = indic.values;
            else
               values = indic.values;

            currentIndic = id;

            draw();
         });
      }
   }

   function onGeoItem(id)
   {
      if(!id)
      {
         draw();        // Make sure legend is drawn, even if no data
         return;
      }

      if(settings.geoitem instanceof Array && (settings.xaxis.type != 'geoitem' || !(settings.indicator instanceof Array)))
      {
         if(id instanceof Array)
         {
            for(var i = 0; i < id.length; i++)
               series[id[i]] = true;
         }
         else
            series[id] = true;

         draw();

         dispatcher.dispatch(me, 'series', series);
      }
      else
      {
         if(!settings.indicator)
            return;

         datamanager.values({ indicator: settings.indicator, geoitem: id }, function(r) {
            if(settings.busy)
               settings.busy.style.display = 'none';

            if(settings.type == 'pyramid')
            {
               if(!values)
                  values = { left: false, right: false };

               var s = settings[settings.xaxis.type];
               if(id == s[0])
                  values.left = r;
               else
               {
                  s[1] = id;
                  values.right = r;
               }
            }
            else if(settings.geoitem instanceof Array)
               values[id] = r;
            else
               values = r;

            currentGeo = id;
            draw();
         });
      }
   }

   function draw()
   {
      if(!values || holddraw)
         return;

      if(settings.type == 'pyramid' && (!values.left || !values.right))
         return;

      if(settings.type == 'bubble' && (!values[0] || !values[1]))
         return;

      if(!highchart)
      {
         var o = mw.support.extend(settings.options, chartOptions);

         if(o.chart.type == 'bubble' && settings.indicator.length == 2)
            o.chart.type = 'scatter';

         // Bubble chart really needs labels with axes, as chart title is not sufficient
         // FIXME: move to application code?
         if(datamanager && settings.type == 'bubble')
         {
            if(settings.indicator[0])
               container.setAttribute('data-x-axis-title', datamanager.indicators[settings.indicator[0]].label);
            if(settings.indicator[1])
               container.setAttribute('data-y-axis-title', datamanager.indicators[settings.indicator[1]].label);
            if(settings.indicator[2])
               container.setAttribute('data-z-axis-title', datamanager.indicators[settings.indicator[2]].label);
         }

         highchart = new Highcharts.Chart(o);

         // When redrawing without any series, Highchart seems to leave old plotLine labels
         // Add an empty dummy series seems to fix that
         highchart.addSeries({
            id: 'fix-empty',
            color: '#fff',
            visible: false,
            data: []
         });

         dispatcher.dispatch(me, 'initialized');
      }

      var func;
      if(values instanceof Function)
      {
         func = values;
         values = {};

         for(var id in series)
            values[id] = func(id);
      }

      var step = 1;
      if(!range || settings.xaxis.range.minimum == 'series' || settings.xaxis.range.maximum == 'series' ||
                   settings.yaxis.range.minimum == 'series' || settings.yaxis.range.maximum == 'series')
      {
         step = updateAxes();

         if(range)
         {
            range.step = step;

            currentYear = mw.support.validateYear(currentYear, range.x.min > 99999 ? 12 : range.x.min > 9999 ? 4 : 1);
            dispatcher.dispatch(me, 'year', currentYear);
         }
      }
      else if(range)
         step = range.step;

      var hasdata = false, recolor = false;
      var override = settings.legend.override || {};

      if(settings.xaxis.type == 'timeseries')
      {
         var sid = 0;
         for(var id in series)
         {
            var s = highchart.get(id);
            var color = override[id] && override[id].color ? override[id].color : null;
            if(!color && settings.colors instanceof Function)
               color = settings.colors(id);

            if(!series[id])
            {
               if(s)
               {
                  s.remove(false);

                  if(future)
                  {
                     var s2 = highchart.get(id + '-future');
                     if(s2)
                        s2.remove(false);
                  }
               }

               if(lasthover == id)
                  lasthover = lastfuture = null;

               delete series[id];
               recolor = true;

               continue;
            }

            var vals1 = [], vals2 = [];
            var allnulls = true;

            if(range.x)
            {
               var min = range.x.min;
               var max = range.x.max;
               var freq = 1;

               if(min > 99999)
               {
                  min = Math.floor(min / 100);
                  max = Math.floor(max / 100);
                  freq = 12;
               }
               else if(min > 9999)
               {
                  min = Math.floor(min / 10);
                  max = Math.floor(max / 10);
                  freq = 4;
               }

               for(var x = min; x <= max; x++)
               {
                  for(var f = 1; f <= freq; f++)
                  {
                     var y = x, i = x;
                     if(freq > 1)
                     {
                        y += (f - 1) / freq;
                        i += (freq == 12 && f < 10 ? '0' : '') + f;
                     }

                     var v = values[id] ? values[id][i] : null;
                     if(!future || x <= future)
                        vals1.push({ x: +y, y: v == undefined ? null : v, year: i });
                     if(future && x >= future)
                        vals2.push({ x: +y, y: v == undefined ? null : v, year: i });

                     if(v != undefined && v != null)
                        allnulls = false;
                  }
               }
            }

            var mo = { enabled: true, symbol: 'circle', radius: settings.line.radius, fillColor: color };
            if(!s)
            {
               var sopts = { name: id, id: id, data: vals1, zIndex: sid + 1, yAxis: settings.yaxis.count == 2 ? Math.min(1, sid) : 0 };
               var eopts = {};

               if(color)
                  sopts.color = color;

               if(settings.type == 'line')
               {
                  if(settings.line.style instanceof Array && sid < settings.line.style.length)
                     sopts.dashStyle = settings.line.style[sid];

                  if(settings.line.width instanceof Array && sid < settings.line.width.length)
                     sopts.lineWidth = settings.line.width[sid];

                  if(sopts.color == settings.line.secondary && !(settings.line.width instanceof Array))
                     sopts.lineWidth = settings.line.width / 2;

                  if(settings.line.hover.width instanceof Array && sid < settings.line.hover.width.length)
                  {
                     eopts = { states: { hover: { lineWidth: settings.line.hover.width[sid] } } };
                     sopts = mw.support.extend(eopts, sopts)
                  }

                  if(vals1.length && vals1.length + vals2.length == 1 && !settings.line.marker)
                     vals1[0].marker = mo;
               }

               s = highchart.addSeries(sopts, false);
            }
            else
            {
               var sopts = { zIndex: sid + 1 };
               if(color)
                  sopts.color = color;

               if(settings.type == 'line' && vals1.length && vals1.length + vals2.length == 1 && !settings.line.marker)
                  vals1[0].marker = mo;

               s.update(sopts, false);
               s.setData(vals1, false);
            }

            if(vals2.length)
            {
               var s2 = highchart.get(id + '-future');

               if(vals1.length + vals2.length == 1 && !settings.line.marker)
                  vals2[0].marker = mo;
               
               if(s2)
                  s2.setData(vals2, false);
               else
               {
                  var fopts = mw.support.extend(eopts || {}, {
                     name: id,
                     color: color || s.color,
                     dashStyle: settings.future.style,
                     id: id + '-future',
                     data: vals2,
                     yAxis: settings.yaxis.count == 2 ? Math.min(1, sid) : 0
                  });

                  if(settings.line.width instanceof Array)
                     fopts.lineWidth = settings.line.width[sid];

                  highchart.addSeries(fopts, false);
               }
            }
            else if(future)
            {
               var s2 = highchart.get(id + '-future');
               if(s2)
                  s2.remove();
            }

            if(!allnulls && (vals1.length || vals2.length))
               hasdata = true;

            sid++;
         }
      }
      else
      {
         if(!currentYear && range)
            currentYear = range.x.max;

         var vals = [], sum = 0;
         if(settings.type == 'pyramid')
         {
            vals[0] = [], vals[1] = [];

            for(var id in series)
            {
               var color = override[id] && override[id].color ? override[id].color : null;
               if(!color && settings.colors instanceof Function)
                  color = settings.colors(id);

               var v1opts = { id: id, name: id, y: -1 * (values.left[id] instanceof Object ? values.left[id][currentYear] : values.left[id]) };
               if(color) v1opts = color;

               var v2opts = { id: id, name: id, y: values.right[id] instanceof Object ? values.right[id][currentYear] : values.right[id] };
               if(color) v2opts = color;

               vals[0].push(v1opts);
               vals[1].push(v2opts);
            }

            if(vals[0].length || vals[1].length)
               hasdata = true;
         }
         else if(settings.type == 'bubble')
         {
            vals[0] = [];

            var axes = { x: 0, y: 1, z: 2 };

            var rcmap = {}, cindex = -1;
            var ids = series;

            for(var l = 0; l <= 1; l++)
            {
               for(var id in ids)
               {
                  if(!ids[id] || (l == 1 && ids[id].type != 'C'))
                     continue;

                  var vopts = { id: id, name: id, states: { hover: { } } };
                  if(datamanager && l == 1 && settings.bubble.color == 'region')
                  {
                     var geo = datamanager.geoitems[id];

                     if(!settings.legend.override)
                        settings.legend.override = {};

                     if(geo.region)
                     {
                        var rid = geo.region instanceof Array ? geo.region[0] : geo.region;
                        var region = datamanager.geoitems[rid] || {};

                        if(settings.legend.override[rid])
                           vopts.color = rcmap[rid] = settings.legend.override[rid].color;
                        else
                        {
                           vopts.color = region.color || rcmap[rid];
                           if(!vopts.color)
                           {
                              if(settings.color instanceof Function)
                                 vopts.color = rcmap[rid] = settings.colors(rid);
                              else
                                 vopts.color = rcmap[rid] = (settings.colors[++cindex] || '#000');
                           }
                           settings.legend.override[rid] = { color: vopts.color };
                        }
                     }
                  }
                  else if(settings.bubble.color && settings.bubble.color != 'region')
                     vopts.color = settings.bubble.color;
                  else if(settings.color instanceof Function)
                     vopts.color = settings.color(id);
                  else
                     vopts.color = settings.colors[++cindex];

                  vopts.states.hover.fillColor = vopts.color;

                  for(var d in axes)
                  {
                     var vi = axes[d];
                     if(values[vi] && values[vi][id])
                        vopts[d] = values[vi][id] instanceof Object ? values[vi][id][currentYear] : values[vi][id];
                  }

                  if(settings.indicator.length == 3 && (!vopts.hasOwnProperty('z') || vopts.z == undefined))
                     vopts.z = 0;

                  if(vopts.x != undefined && vopts.y != undefined)
                     vals[0].push(vopts);
               }

               if(vopts || !datamanager)
                  break;

               ids = datamanager.geoitems;
            }

            // Make sure there are at least some axis lines
            vals[0].push({ id: 'bubble-dummy', x: range.y.min, y: range.y2.min, z: 0, color: "transparent", marker: { states: { hover: { fillColor: "transparent" } } } })
            vals[0].push({ id: 'bubble-dummy', x: range.y.max * 1.05, y: range.y2.max, z: 0, color: "transparent", marker: { states: { hover: { fillColor: "transparent" } } } })

            if(settings.indicator.length == 3)
               vals[0].sort(function(a, b) { return a.z > b.z ? -1 : 1 });

            if(legend)
               trigger = l == 0 ? series : rcmap;
         }
         else
         {
            var stackedcat = settings.stacked && (settings.xaxis.type == 'timeseries' || (settings.indicator instanceof Array && settings.geoitem instanceof Array));
            var cats = stackedcat ? values : { dummy: values };
            var ci = 0;

            for(var c in cats)
            {
               cvalues = cats[c];

               if(!stackedcat)
                  vals[ci] = [];

               var si = 0;
               for(var id in series)
               {
                  if(!series[id])
                  {
                     delete series[id];
                     recolor = true;

                     continue;
                  }

                  var v;
                  if(settings.latest)
                  {
                     if(cvalues[id] instanceof Object)
                     {
                        var latest = mw.support.latest(cvalues[id], currentYear, settings.latest);
                        v = latest.value;
                     }
                     else
                        v = cvalues[id];
                  }
                  else
                     v = cvalues[id] instanceof Object ? cvalues[id][currentYear] : cvalues[id];

                  var color = override[id] && override[id].color ? override[id].color : null;
                  if(charttypes[settings.type] != 'pie')
                     color = settings.colors instanceof Function ? settings.colors(id) : settings.colors[0];

                  var vopts = { id: id, name: id, y: v || null };
                  if(color && !stackedcat)
                      vopts.color = color;

                  if(stackedcat)
                  {
                     if(vals.length <= si)
                        vals[si] = [];

                     vals[si].push(vopts);
                  }
                  else
                     vals[ci].push(vopts);

                  sum += v || 0;

                  if(v !== undefined)
                     hasdata = true;

                  si++;
               }

               ci++;
            }
         }

         if(settings.percentage && charttypes[settings.type] == 'pie')
         {
            var endangle = Math.max(0, Math.min(360, Math.ceil((sum / 100) * 360)));
            if(endangle != chartOptions.plotOptions.pie.endAngle)
            {
               if(chartOptions.plotOptions.pie.endAngle)
                  chartOptions.plotOptions.pie.animation = false;
               chartOptions.plotOptions.pie.endAngle = endangle;

               highchart.destroy();
               highchart = null;

               draw();
               return;
            }
         }

         for(var v = 0; v < vals.length; v++)
         {
            if(vals[v] instanceof Array && !vals[v].length)
               continue;

            var sid = 'series-' + (v + 1);
            var s = highchart.get(sid);

            if(s)
               s.setData(vals[v], false);
            else
            {
               var sopts = {
                  id: sid,
                  data: vals[v]
               };
               highchart.addSeries(sopts, false);
            }
         }
      }

      updateLabels(step);

      if(func)
         values = func;

      if(recolor && !(settings.colors instanceof Function))
      {
         var recnt = 0;
         for(var s = 1; s < highchart.series.length; s++)
         {
            var id = highchart.series[s].name, color;
            if(override[id] && override[id].color)
               color = override[id].color;
            else
            {
               recnt++;
               color =  highchart.options.colors[s - 1];
            }

            highchart.series[s].update({
               color: color
            }, false);
         }

         if(highchart.counters)
            highchart.counters.color = recnt;
      }

      highchart.redraw();

      var hasnd = node.className.indexOf('no-data') !== -1;
      if(hasdata && hasnd)
         node.className = node.className.replace(/ ?no-data/, '');
      else if(!hasdata && !hasnd)
         node.className += ' no-data';

      if(trigger)
      {
         // Make sure Highcharts has actually redrawn chart, so legend can pick up colors...
         if(legend && datamanager && settings.type == 'bubble' && settings.bubble.color == 'region')
         {
            setTimeout((function(trigger)
            {
               dispatcher.dispatch(me, 'series', trigger);
               legend.sort();
            })(trigger), 0);
         }
         else
            dispatcher.dispatch(me, 'series', trigger);

         trigger = null;
      }
   }

   function convertStyle(s1, s2)
   {
      s1 = s1 || {};
      s2 = s2 || {};

      return {
         color: s1.color || s2.color || '#000',
         fontFamily: s1.font || s2.font || 'Arial',
         fontSize: s1.size || s2.size || '10px',
         fontWeight: s1.weight || s2.weight || 'normal'
      };
   }

   function kickstart()
   {
      if(!dataready)
         return;

      if(settings.busy)
         settings.busy.style.display = 'none';

      if(hover)
         hover.init(me);

      if(legend)
         legend.init(me);

      if(settings.year === true)
      {
         slider = new mw.map.layers.Slider();
         slider.init(me);
      }
      else if(settings.year && settings.year.init)
         settings.year.init(me);

      trigger = series;

      if(settings.values)
         draw();
      else if(settings.type == 'pyramid')
      {
         if(settings.xaxis.type == 'indicator')
         {
            onIndicator(settings.indicator[0]);
            onIndicator(settings.indicator[1]);
         }
         else
         {
            onGeoItem(settings.geoitem[0]);
            onGeoItem(settings.geoitem[1]);
         }
      }
      else if(settings.type == 'bubble')
      {
         onIndicator(settings.indicator[0]);
         onIndicator(settings.indicator[1]);

         if(settings.indicator.length == 3)
            onIndicator(settings.indicator[2]);
      }
      else
      {
         holddraw = true;

         if(typeof settings.geoitem == 'string')
            onGeoItem(settings.geoitem);
         else if(settings.xaxis.type == 'geoitem')
            for(var i = 0; i < settings.geoitem.length; i++)
               onGeoItem(settings.geoitem[i])

         if(typeof settings.indicator == 'string')
            onIndicator(settings.indicator);
         else if(settings.xaxis.type == 'indicator')
            for(var i = 0; i < settings.indicator.length; i++)
               onIndicator(settings.indicator[i])

         holddraw = false;
         draw();
      }

      chartready = true;
      dispatcher.dispatch(me, 'ready');
   }

   // Set labels and ticks
   function updateLabels(step)
   {
      // Add labels, ticks and gridlines
      highchart.xAxis[0].removePlotLine('plotline');
      highchart.yAxis[0].removePlotLine('plotline');

      for(var dir in labels)
      {
         var x = dir == 'x';
         if(settings.type == 'bubble')
         {
            if(x)
               continue;
            else
               x = dir == 'y';
         }

         var b = charttypes[settings.type] == 'bar';

         var r = range[dir];
         var at = settings.type == 'bubble' ? (dir == 'y' ? 'x' : 'y') : (dir == 'y2' ? 'y' : dir);
         var ai = settings.type == 'bubble' ? 0 : (dir == 'y2' ? 1 : 0);

         var a = highchart[at + 'Axis'][ai];
         var g = settings.grid[x ? 'horizontal' : 'vertical'] || {};
         var c = convertStyle(settings[at + 'axis'].text, settings.text);
         var t = x && settings.ticks ? [] : null;
         var tl = settings.ticks.length instanceof Array ? settings.ticks.length[0] : settings.ticks.length;
         var o = settings[at + 'axis'].offset + (t ? settings.ticks.offset + tl  : 0);

         var html = false;
         if(settings[at + 'axis'].text)
         {
            for(var p in settings[at + 'axis'].text)
               if(!settings.text.hasOwnProperty(p))
               {
                  html = true;
                  c[p] = settings[at + 'axis'].text[p];
               }
         }

         if(at == 'y' && settings.yaxis.count == 2)
         {
            if(c.color == 'legend')
               c.color = me.color(settings.indicator[dir == 'y2' ? 1 : 0]);
            else if(c.backgroundColor == 'legend')
               c.backgroundColor = me.color(settings.indicator[dir == 'y2' ? 1 : 0]);
         }

         var iscat = x && settings.xaxis.type != 'timeseries';
         var yalign = settings.yaxis.labels.align == 'default' ? (settings.yaxis.position == 'left' ? 'right' : 'left') : settings.yaxis.labels.align;

         var li = false;
         var sa = g.major, si = g.minor;

         if(si && !si.major)
            si = false;

         var ci = 0, seen = {};
         var dy = 0;
         for(var i in labels[dir])
         {
            if(sa)
            {
               var l = labels[dir][i];

               if(l == undefined)
                  l = '';

               if(seen[l] !== undefined && i * seen[l] > 0)    // Do print symmetrical pyramid labels
                  continue;

               a.addPlotLine({
                  id: 'plotline',
                  value: iscat ? ci : i,
                  width: sa.width == undefined ? 1 : sa.width,
                  dashStyle: sa.style,
                  color: !sa.width || (!g.first && i == r.min) || (!g.last && i == r.max) ? settings.background : sa.color,
                  zIndex: 1,
                  label: {
                     text: dir == 'x' && ((i != r.max || (!iscat && i - li <= step)) && ci % step) ? '' : l,
                     x: (b ? -5 : (x ? -1 : -10)) + (x ? 0 : o),
                     y: (b ? (x ? 3 : 10) : (x ? 7 + dy : 3)) + (x && !b ? o : 0),
                     style: c,
                     align: dir == 'y2' ? 'right' : 'left',
                     useHTML: html,
                     rotation: x && settings.xaxis.overlap == 'rotate' ? 45 : 0,
                     verticalAlign: x || b ? 'bottom' : 'top',
                     textAlign: b ? (i < 0 ? 'left' : 'right') : (at == 'x' ? (settings.xaxis.overlap == 'rotate' ? 'left' : 'center') : (dir == 'y2' ? (yalign == 'left' ? 'right' : 'left') : yalign))
                  }
               });

               seen[l] = i;

               if(settings.xaxis.overlap == 'updown')
                  dy = dy == 0 ? 7 : 0;
            }

            if(t && settings.ticks.major && !(x && (ci % step) && !settings.ticks.minor))
               t.push(parseFloat(i));

            if(range.x.min > 9999)
            {
               if(t && settings.ticks.minor)
               {
                  var freq = range.x.min > 99999 ? 12 : 4;
                  for(var j = 1; j < freq; j++)
                     t.push(l + (j / freq))
               }
            }
            else if(si && li !== false)
            {
               var k = Math.max(1, (i - li) / si.major);
               for(var j = li + k; j < i; j += k)
               {
                  if(si.width)
                  {
                     a.addPlotLine({
                        id: 'plotline',
                        color: si.color,
                        dashStyle: si.style,
                        width: si.width,
                        value: j,
                        zIndex: 1
                     });
                  }

                  if(t && settings.ticks.minor)
                     t.push(j);
               }
            }

            li = parseFloat(i);
            ci++;
         }

         if(t && settings.ticks.minor && range && range.x.min < 9999 && li < range.x.max)
            for(var j = li + 1; j <= range.x.max; j++)
               t.push(j);

         if(t && t.length)
         {
            var o = {
               tickPositions: t,
               tickLength: tl,
               tickWidth: settings.ticks.width,
               tickColor: settings.ticks.color
            };

            if(settings.ticks.length instanceof Array)
            {
               highchart['xAxis'][1].update(o, false);

               t = t.slice(0);

               for (var ti = t.length - 1; ti >= 0; ti--)
                  if (!seen[t[ti]])
                     t[ti] = 0;

               var o = {
                  tickPositions: t,
                  tickLength: settings.ticks.length[1],
                  tickWidth: settings.ticks.width,
                  tickColor: settings.ticks.color
               };
            }

            a.update(o, false);
         }
      }
   }

   // Set ranges for current data
   function updateAxes()
   {
      labels = { x: {}, y: {} };

      function fmt(f,v)
      {
         return f ? (f instanceof Function ? f(v) : mw.support.format(f, v)) : v;
      }

      // Set range, extremes and labels for an y-axis (bubbles use x as second y)
      function updateYAxis(axis, range, labels, iid)
      {
         var autorange = true;
         var as = settings.yaxis;
         // Axis type for bubble x is in xaxis settings...
         var log = settings[axis.substr(0,1) + 'axis'].type == 'logarithmic';

         if(as.range.minimum == 'dataset')
         {
            if(datamanager)
            {
               if(typeof iid == 'string')
               {
                  var indic = datamanager.indicators[iid];

                  if(!log || as.range.minimum > 0)
                     range.min = indic.statistics.range.min;
               }
               else if(settings.stacked)
               {
                  range.min = 0;
                  if(settings.stacked !== "percent")
                  {
                     for(var i = 0; i < iid.length; i++)
                     {
                        var indic = datamanager.indicators[iid[i]];
                        var rmin = indic.statistics.range.min;

                        if(rmin < 0 && rmin < range.min)
                           range.min = rmin;
                     }
                  }
               }
            }
         }
         else if(as.range.minimum != 'series')
         {
            if(!log || as.range.minimum > 0)
               range.min = as.range.minimum;

            if(range.min != 0)
               autorange = false;
         }

         if(as.range.maximum == 'dataset')
         {
            if(datamanager)
            {
               if(typeof iid == 'string')
               {
                  var indic = datamanager.indicators[iid];
                  range.max = indic.statistics.range.max;
               }
               else if(settings.stacked)
               {
                  if(settings.stacked == "percent")
                     range.max = 100;
                  else
                  {
                     range.max = 0;
                     for(var i = 0; i < iid.length; i++)
                     {
                        var indic = datamanager.indicators[iid[i]];
                        range.max += indic.statistics.range.max;
                     }
                  }
               }
            }
         }
         else if(as.range.maximum != 'series')
         {
            range.max = as.range.maximum;
            autorange = false;
         }

         if(autorange && as.range.zero && settings.type != 'bubble')
         {
            if(range.min > 0 && !log)
               range.min = 0;
            else if(range.max < 0)
               range.max = 0;
         }

         if(settings.type == 'pyramid')
         {
            var max = Math.max(range.min, range.max);
            range = { min: -max, max: max };
         }

         if(log && range.min <= 0)
         {
            if(datamanager)
               range.min = datamanager.indicators[iid].statistics.range.min || 0.1;
            else
               range.min = 0.1;
         }

         if(as.labels)
         {
            if(as.labels.prettify)
            {
               if(log)
               {
                  var p = mw.support.prettify_log(range.min, range.max, as.labels.maximum);
                  for(var i = 0; i < p.length; i++)
                     labels[p[i]] = fmt(as.format || settings.format, p[i]);

                  range.min = p[0];
                  range.max = p[p.length - 1];
               }
               else
               {
                  // FIXME: label formatting
                  if(autorange)
                     var p = mw.support.prettify(range.min, range.max, as.labels.maximum);
                  else
                     var p = [ parseFloat(range.min), parseFloat(range.max), (range.max - range.min) / as.labels.maximum ];

                  if(p[2])
                  {
                     for(var i = p[0]; i <= p[1]; i += p[2])
                     {
                        var l = settings.type == 'pyramid' ? Math.abs(i) : i;
                        labels[i] = fmt(as.format || settings.format, l);
                     }
                  }

                  if(as.range.zero)
                     labels[0] = fmt(as.format || settings.format, 0);

                  range.min = p[0];
                  range.max = p[1];
               }
            }
            else if(as.labels instanceof Array)
            {
               for(var i in as.labels)
               {
                  var l = as.labels[i];
                  labels[l] = l;
               }
            }
            else
               mw.support.extend(as.labels, labels);
         }

         // Make sure on charts with minor y-range 0 values don't show (50 is arbitrary...)
         if(axis == 'y' && settings.stacked && settings.type == 'column' && range.max < 50)
            highchart.update({ plotOptions: { column: { minPointLength: 0 }}});

         if(settings.type != 'bubble')
            highchart[axis.substr(0, 1) + 'Axis'][axis == 'y2' ? 1 : 0].setExtremes(range.min, range.max + Math.min(1, range.max * 0.01), false);
      }
      // end updateYAxis()

      // Ranges in the current dataset
      range = { x: { min: Infinity, max: -Infinity }, y: { min: Infinity, max: -Infinity } };

      if(settings.type == 'bubble' || settings.yaxis.count == 2)
      {
         // Keep x range for currentYear etc
         if(settings.type == 'bubble' )
            range.x2  = { min: Infinity, max: -Infinity };

         range.y2  = { min: Infinity, max: -Infinity };
         labels.y2 = {};
      }

      var stackedcat = settings.stacked && (settings.xaxis.type == 'timeseries' || (settings.indicator instanceof Array && settings.geoitem instanceof Array));
      var keyed = (stackedcat  && settings.xaxis.type != 'timeseries') || settings.type == 'pyramid' || settings.type == 'bubble' ? values : { dummy: values };

      var allbubbles = settings.type == 'bubble';
      if(allbubbles)
      {
         for(var id in series)
         {
            if(series[id])
            {
               allbubbles = false;
               break;
            }
         }
      }

      var catrange = {};
      var timeseries = settings.xaxis.type == 'timeseries';

      for(var k in keyed)
      {
         if(k == 2)
            continue;

         var vals = keyed[k], stack = {}, seen = false, iidx = 0;

         for(var id in vals)
         {
            if(settings.stacked && series[id])
               stack[id] = timeseries ? { } : { min: Infinity, max: -Infinity };

            for(var x in vals[id])
            {
               if(timeseries && stack[id])
                  stack[id][x] = { min: Infinity, max: -Infinity };

               if(settings.xaxis.range.minimum == 'dataset' || series[id] || allbubbles)
               {
                  var v = parseInt(x);
                  var r = settings.type != 'bubble' || k == 0 ? range.x : range.x2;

                  if(v < r.min) r.min = v;
                  if(v > r.max) r.max = v;
               }

               if(settings.yaxis.range.minimum == 'dataset' || series[id] || allbubbles)
               {
                  var v = parseFloat(vals[id][x]);
                  var r;

                  if(settings.stacked)
                     r = timeseries ? stack[id][x] : stack[id];
                  else if((settings.type == 'bubble' && k > 0) || (settings.yaxis.count == 2 && iidx > 0))
                     r = range.y2;
                  else
                     r = range.y;

                  // Do a loop over the years of the other elements, to prevent having a max of all maximums (which each might have for different year)
                  if(settings.stacked && timeseries)
                  {
                     for(var id2 in vals)
                     {
                        if(id2 == id)
                           continue;

                        if(settings.yaxis.range.minimum == 'dataset' || series[id2])
                           if(vals[id2] && vals[id2][x])
                              v += parseFloat(vals[id2][x]);
                     }

                     seen = true;
                  }

                  if(v < r.min) r.min = v;
                  if(v > r.max) r.max = v;
               }
            }

            if(seen)
               break;

            iidx++;
         }

         if(settings.stacked)
         {
            var r;
            if((settings.type == 'bubble' && k > 0) || (settings.yaxis.count == 2 && iidx > 0))
               r = range.y2;
            else
               r = range.y;

            if(settings.stacked == 'percent')
            {
               r.min = 0;
               r.max = 100;
            }
            else
            {
               if(stackedcat)
                  r = { min: Infinity, max: -Infinity };

               for(var id in stack)
               {
                  if(timeseries)
                  {
                     for(var x in stack[id])
                     {
                        if(stack[id][x].min < 0 && stack[id][x].min < r.min)
                           r.min = stack[id][x].min;

                        if(r.max == -Infinity)
                           r.max = stack[id][x].max;
                        else
                           r.max = Math.max(r.max, stack[id][x].max)
                     }
                  }
                  else
                  {
                     if(stack[id].min < 0 && stack[id].min < r.min)
                        r.min = stack[id].min;

                     if (r.max == -Infinity)
                        r.max = stack[id].max;
                     else if(stackedcat)
                        r.max += stack[id].max;
                     else
                        r.max = Math.max(r.max, stack[id].max)
                  }
               }

               // Prevent minute float fluctuations to have percent-based values to go over 100...
               if(r.max - Math.floor(r.max) < 0.00001)
                  r.max = Math.floor(r.max);

               if(stackedcat)
                  catrange[k] = r;
            }
         }
      }

      if(stackedcat)
      {
         if(stackedcat)
            r = { min: Infinity, max: -Infinity };

         for(var k in catrange)
         {
            var r = catrange[k];

            if(r.min < 0 && r.min < range.y.min)
               range.y.min = stack[id].min;

            range.y.max = Math.max(range.y.max, r.max);
         }
      }

      // No data? Don't plot
      if(range.x.min == Infinity || (range.x2 && range.x2.min == Infinity))
      {
         range = false;
         return;
      }

      // Time series charts (line, bar)
      if(settings.xaxis.type == 'timeseries')
      {
         // X axis
         if(settings.xaxis.range.minimum == 'dataset')
         {
            if(datamanager && typeof settings.indicator == 'string')
            {
               var indic = datamanager.indicators[settings.indicator];
               range.x.min = indic.statistics.range.from;
            }
         }
         else if(settings.xaxis.range.minimum != 'series')
            range.x.min = settings.xaxis.range.minimum;

         if(settings.xaxis.range.maximum == 'dataset')
         {
            if(datamanager && typeof settings.indicator == 'string')
            {
               var indic = datamanager.indicators[settings.indicator];
               range.x.max = indic.statistics.range.to;
            }
         }
         else if(settings.xaxis.range.maximum != 'series')
            range.x.max = settings.xaxis.range.maximum;

         if(settings.xaxis.labels)
         {
            var n = parseInt(settings.xaxis.labels);
            if(settings.xaxis.labels instanceof Array)
            {
               for(var i in settings.xaxis.labels)
               {
                  var x = settings.xaxis.labels[i];
                  labels.x[x] = x;
               }
            }
            else if(!isNaN(n) || settings.xaxis.labels == 'minmax')
            {
               var min = range.x.min;
               var max = range.x.max;
               var freq = 1;

               if(min > 99999)
               {
                  min = Math.floor(min / 100);
                  max = Math.floor(max / 100);
                  freq = 12;
                  n = 1;
               }
               else if(min > 9999)
               {
                  min = Math.floor(min / 10);
                  max = Math.floor(max / 10);
                  freq = 4;
                  n = 1;
               }

               if(settings.xaxis.labels == 'minmax')
                  n = max - min;
               else if(settings.xaxis.range.extend)
               {
                  min -= min % n;
                  range.x.min = min;

                  if(max % n)
                  {
                     max -= max % n - n;
                     range.x.max = max;
                  }
               }

               for(var x = min; x <= max; x += n)
               {
                  var y = x;
                  labels.x[y] = settings.xaxis.format ? fmt(settings.xaxis.format, x) : x;
               }

               if(!settings.xaxis.range.extend && !labels.x[range.x.max] && !labels.x[range.x.max - 1])
               {
                  if(!settings.xaxis.multiples || range.x.max % n == 0)
                  {
                     if(freq == 1)
                        labels.x[range.x.max] = settings.xaxis.format ? fmt(settings.xaxis.format, range.x.max) : range.x.max;
                  }
               }
            }
            else
               labels.x = settings.xaxis.labels;
         }

         var min = range.x.min, max = range.x.max;
         if(max > 99999)
         {
            min = Math.floor(min / 100) + (min % 100 - 1) / 12;
            max = Math.floor(max / 100) + (max % 100 - 1) / 12;
         }
         else if(max > 9999)
         {
            min = Math.floor(min / 10) + (min % 10 - 1) / 4;
            max = Math.floor(max / 10) + (max % 10 - 1) / 4;
         }

         highchart.xAxis[0].setExtremes(min, max, false);

         if(highchart.xAxis.length > 1)
            highchart.xAxis[1].setExtremes(min, max, false);
      }
      else if(settings.type == 'bubble')
      {
         range.x.min = Math.max(range.x.min, range.x2.min);
         range.x.max = Math.min(range.x.max, range.x2.max);
      }
      else if(settings.xaxis.labels instanceof Object)
         labels.x = settings.xaxis.labels;

      // Constrain currentYear; set range for year slider if any
      if((settings.year && settings.year.range) || slider)
      {
         var max;
         var s = slider || settings.year;

         if(settings.xaxis.labels instanceof Array)
            s.range(settings.xaxis.range.minimum, max = settings.xaxis.range.maximum, 1);
         else
            s.range(range.x.min, max = range.x.max, range.x.min > 99999 ? 'M' : (range.x.min > 9999 ? 'Q' : 1));

         if(max < currentYear)
            currentYear = range.x.max;
      }

      // Category charts (donut, pie, bubble)
      if(settings.type == 'bubble')
      {
         if(settings.xaxis.range.minimum != 'dataset' && settings.xaxis.range.minimum != 'series')
            range.x.min = settings.xaxis.range.minimum;

         if(settings.xaxis.range.maximum != 'dataset' && settings.xaxis.range.maximum != 'series')
            range.x.max = settings.xaxis.range.maximum;
      }
      else if(settings.xaxis.type != 'timeseries')
      {
         var categories = [];

         var xkeys = series;
         var key2 = settings.xaxis.type == 'geoitem' ? 'indicator' : 'geoitem';

         if(settings.stacked && options[key2] instanceof Array)
            xkeys = values;

         var txt = document.createElement("textarea");
         for(var id in xkeys)
         {
            categories.push(id);

            if(!labels.x.hasOwnProperty(id))
            {
               labels.x[id] = id;

               if(datamanager)
               {
                  if(settings.type == 'pyramid' || settings.type == 'donut')
                     txt.innerHTML = datamanager[key2 + 's'][id].label;
                  else
                     txt.innerHTML = datamanager[settings.xaxis.type + 's'][id].label;

                  labels.x[id] = txt.value;
               }
            }
         }

         highchart.xAxis[0].setCategories(categories, false);
      }

      if(charttypes[settings.type] != 'pie')
      {
         // Y axis
         if(settings.type == 'bubble')
         {
            updateYAxis('x', range.y,  labels.y,  settings.indicator[0]);
            updateYAxis('y', range.y2, labels.y2, settings.indicator[1]);
         }
         else if(settings.yaxis.count == 2)
         {
            updateYAxis('y', range.y,  labels.y,  settings.indicator[0]);
            updateYAxis('y2', range.y2, labels.y2, settings.indicator[1]);
         }
         else
            updateYAxis('y', range.y, labels.y, settings.indicator);

         // Determine y axis width
         var yw = 0;
         if(settings.yaxis.width == 'auto')
         {
            for(var yi = 0; yi < settings.yaxis.count; yi++)
            {
               var w = 0;
               var b = charttypes[settings.type] == 'bar';
               var l = b ? labels.x : (settings.type == 'bubble' || yi == 1 ? labels.y2 : labels.y);

               for(var i in l)
               {
                  var text = highchart.renderer.text(l[i]).add();
                  var bbox = text.getBBox();

                  if(bbox.width == 0)           // Sometimes no bbox is returned? Even if chart is visible?
                     bbox.width = l[i].length * settings.text.charwidth;

                  w = Math.max(w, bbox.width);

                  text.destroy();
               }

               highchart[b ? 'xAxis' : 'yAxis'][yi].update({ offset: w }, true);
               yw += w;
            }
         }
         else
            yw = settings.yaxis.width;

         var step = 1;
         if(settings.type != 'bubble')
         {
            // Determine x axis step
            if(settings.xaxis.overlap === 'hide')
            {
               var text = highchart.renderer.text(range.x.min).add();
               var bbox = text.getBBox();

               if(bbox.width == 0)           // Sometimes no bbox is returned? Even if chart is visible?
                  bbox.width = String(range.x.min).length * settings.text.charwidth;

               var w = highchart.plotWidth - yw;
               var n = 0;

               if(settings.xaxis.labels instanceof Array)
                  n = settings.xaxis.labels.length;
               else
                  for(var l in labels.x) n++;

               step = Math.ceil((bbox.width + 1) / (w / n));

               text.destroy();
            }
         }
      }

      return step;
  }

   // Map mw.Chart series-independent options to Highchart options
   function setOptions()
   {
      Highcharts.setOptions({
         chart: {
            style: convertStyle(settings.text)
         }
      });

      if(settings.type == 'donut')
      {
         settings.xaxis.type = settings.indicator instanceof Array ? 'geoitem' : 'indicator';
         chartOptions.plotOptions.series.innerSize = settings.donut.radius;
      }

      if(settings.type == 'pyramid')
         chartOptions.plotOptions.series.stacking = 'normal';

      if(settings.type == 'bubble' && !(settings.xaxis.labels instanceof Object))
         settings.xaxis.labels = settings.yaxis.labels;

      if(settings.stacked === true)
         settings.stacked = 'normal';

      var ctype = charttypes[settings.type];

      if(ctype == 'pie')
         chartOptions.chart.margin = [0, 0, 0, 0];

      if(ctype == 'bar')
      {
         var bo = settings.options.plotOptions ? settings.options.plotOptions.bar : null;
         if(!bo || !bo.hasOwnProperty('groupPadding'))
            chartOptions.plotOptions.series.groupPadding = 0;
         if(!bo || !bo.hasOwnProperty('pointPadding'))
            chartOptions.plotOptions.series.pointPadding = 0;
      }

      if(ctype == 'bar' || ctype == 'column')
      {
         if(settings.stacked)
         {
            if(!chartOptions.plotOptions[ctype])
               chartOptions.plotOptions[ctype] = {};
            chartOptions.plotOptions[ctype].stacking = settings.stacked;
         }
      }

      chartOptions.plotOptions.series.borderWidths = ctype == 'pie' ? 0.5 : 0;

      chartOptions.chart.type = ctype;
      chartOptions.chart.renderTo = chart;
      chartOptions.chart.plotBackgroundColor = settings.background;

      chartOptions.xAxis.type = settings.xaxis.type;
      chartOptions.yAxis.type = settings.yaxis.type;
      chartOptions.yAxis.opposite = settings.yaxis.position == 'right';

      if(ctype == 'bar')
      {
         chartOptions.yAxis.opposite = !chartOptions.yAxis.opposite;
         if(settings.type == 'bar' && settings.yaxis.width != 'auto')
            chartOptions.xAxis.offset = settings.yaxis.width;
      }
      else if(settings.yaxis.width != 'auto')
         chartOptions.yAxis.offset = settings.yaxis.width;

      if(settings.xaxis.offset)
         chartOptions.xAxis.offset = settings.xaxis.offset;

      if(settings.yaxis.offset)
         chartOptions.yAxis.offset = settings.yaxis.offset;

      if(settings.xaxis.type != 'timeseries')
         chartOptions.plotOptions.series.grouping = false;

      var ls = settings.line.style;
      if(ls instanceof Array)
         ls = ls[ls.length - 1];
      chartOptions.plotOptions.series.dashStyle = ls;


      var lw = settings.line.width;
      if(lw instanceof Array)
         lw = lw[lw.length - 1];

      if(settings.type != 'bubble')
         chartOptions.plotOptions.series.lineWidth = lw;

      var mo = chartOptions.plotOptions.series.marker;

      if(settings.type == 'bubble')
      {
         if(settings.indicator.length == 2)
         {
            mo.enabled = true;
            mo.symbol = 'circle';
            mo.lineWidth = 1;

            mo.radius = parseInt(settings.bubble.radius.minimum);
         }
         else
         {
            mo.lineWidth = 0.5;
            mo.lineColor = '#fff';
            mo.fillOpacity = 1;

            chartOptions.plotOptions.series.minSize = settings.bubble.radius.minimum;
            chartOptions.plotOptions.series.maxSize = settings.bubble.radius.maximum;
         }

         mo.states = { hover: { radiusPlus: 1, lineWidth: 2, lineWidthPlus: 0, lineColor: '#fff' } };
         chartOptions.plotOptions.series.states = { hover: { halo: { opacity: 1, size: settings.indicator.length == 2 ? 9 : 3 } } };
      }
      else
      {
         if(settings.line.marker)
            mo.enabled = true;

         if(settings.line.hover && settings.line.hover.marker)
         {
            mo.states = { hover: { enabled: true, radius: settings.line.hover.radius, fillColor: null } };
            if(settings.line.hover.marker == 'circle')
            {
               mo.states.hover.lineWidth = lw;
               mo.states.hover.fillColor = settings.background;
            }
         }

         var type = settings.line.marker;
         if(!type && settings.line.hover)
            type = settings.line.hover.marker;

         if(type == 'circle' || type == 'disc')
         {
            if(type == 'circle')
            {
               mo.radius = settings.line.radius;
               mo.lineWidth = lw / 2;
               mo.fillColor = settings.background;
            }
            else
               mo.radius = settings.line.radius;

            mo.symbol = 'circle';
            mo.lineColor = null;
         }
         else
            mo.symbol = type;
      }

      if(settings.future && settings.future.from)
      {
         chartOptions.xAxis.plotBands = [ {
            color: settings.future.background || '#c0c0c0',
            from: settings.future.from,
            to: 999999
         } ];

         future = settings.type == 'line' && settings.future.style != settings.line.style ? settings.future.from : false;
      }

      if(settings.type == 'line' && settings.line.hover)
      {
         if(future)
         {
            chartOptions.plotOptions.series.events = {
               mouseOut: onLineHover
            };
         }

         var hw = settings.line.hover.width;
         if(hw instanceof Array)
            hw = hw[hw.length - 1];

         chartOptions.plotOptions.series.states.hover = {
            lineWidth: hw
         };
      }

      if(settings.ticks && settings.ticks.minor)
      {
         chartOptions.xAxis.minorTickInterval = 1;
         chartOptions.xAxis.minorTickWidth = 1;
         chartOptions.xAxis.minorTickWidth = settings.ticks.minor.width;
         chartOptions.xAxis.minorTickLength = settings.ticks.minor.length;
         chartOptions.xAxis.minorTickColor = settings.ticks.minor.color;

         if(settings.ticks.length instanceof Array)
            chartOptions.xAxis = [ chartOptions.xAxis, mw.support.extend(chartOptions.xAxis, {})];
      }

      if(settings.yaxis.count == 2)
      {
         chartOptions.yAxis = [chartOptions.yAxis, mw.support.extend(chartOptions.yAxis, {})];
         chartOptions.yAxis[1].opposite = !chartOptions.yAxis[1].opposite;
      }

      if(settings.colors)
      {
         if(settings.colors instanceof Function)
         {}
         else if(settings[settings.type].gradient)
         {
            chartOptions.colors = [];

            var l = settings[settings.type].gradient == 'lighten' ? 0.1 : -0.1;
            for(var i = 0; i < settings.colors.length; i++)
            {
               var c1 = settings.colors[i];
               var c2 = mw.support.rgb2hsl(mw.support.css2rgb(c1));

               c2[2] = Math.max(0, Math.min(1, c2[2] + l));
               c2 = mw.support.rgb2css(mw.support.hsl2rgb(c2));

               chartOptions.colors.push({
                  linearGradient: { x1: 0, y1: 0, x2: 1, y2: 0 },
                  stops: [ [ 0, c1 ], [ 1, c2 ] ]
               });
            }
         }
         else
            chartOptions.colors = settings.colors;
      }
      else
      {
         chartOptions.colors = [];

         for(var c = 0; c < 50; c++)
         {
            var rgb = mw.support.hsl2rgb([Math.random() , 0.6, 0.6 ]);
            chartOptions.colors.push(mw.support.rgb2css(rgb));
         }
      }
   }

   function getOptions()
   {
      var prev = node.previousSibling;
      while(prev && prev.nodeType != Node.ELEMENT_NODE)
         prev = prev.previousSibling;

      var options = mw.support.extend(settings['export'].parameters || {}, {});
      if(prev && (prev.tagName == 'H1' || prev.className.match('mw-chart-title')))
         options.title = prev.innerHTML;

      return options;
   }

   function exportXLS(type, parameters)
   {
      var options = mw.support.extend(settings['export'], {});
      mw.support.extend(getOptions(), options.parameters);
      mw.support.extend(parameters, options);

      // Get type of values in series object
      var etype = options['sheet'].type, ctype1, ctype2;
      if(settings.type == 'bubble')
         ctype1 = 'geoitem';
      else if(settings.xaxis.type == 'geoitem')
         ctype1 = 'indicator';
      else
         ctype1 = 'geoitem';

      ctype2 = ctype1 == 'geoitem' ? 'indicator' : 'geoitem';

      // Get actual data used
      var data = {}, keys = [];
      for(var id in series)
      {
         if(values instanceof Function)
            data[id] = func(id);
         else
            data[id] = values[id];

         keys.push(id);
      }

      // Get the arrays of keys for sheets (keys1) and rows (keys2)
      var sheets = {};
      var cval2 = me.settings(ctype2);

      if(ctype1 == etype)
      {
         var keys1 = keys;
         var keys2 =  cval2 instanceof Array ? cval2 : [ cval2 ];
      }
      else
      {
         var keys1 = cval2 instanceof Array ? cval2 : [ cval2 ];
         var keys2 = keys;
      }

      // Get property name to use for labels
      var prop1 = options.sheet['title'];
      var prop2 = prop1 == 'id' ? 'label' : prop1;

      // Expand the data and labels
      for(var k1 in keys1)
      {
         var key1 = keys1[k1];
         if(!sheets[key1])
         {
            var title = prop1 == 'id' || !datamanager ? key1 : datamanager[etype + 's'][key1][prop1];
            var label = datamanager && datamanager[etype + 's'][key1] ? datamanager[etype + 's'][key1]['label'] : key1;
            sheets[key1] = { title: label || title, values: {} };
         }

         var dm = ctype1 == etype ? ctype2 : ctype1;
         var vals = sheets[key1].values;

         for(var k2 in keys2)
         {
            var key2 = keys2[k2];
            var object = datamanager ? datamanager[dm + 's'][key2] || {} : {};
            var title = object[prop2] || key2;

            if(!vals[key2])
               vals[key2] = { values: data[ctype1 == etype ? key1 : key2], title: title };
         }
      }

      options.content = sheets;
      options.download = true;
      options.format = type;
      options.sheet = options.sheet['type'];

      mw.support.sendToServer(true, settings['export'].renderer, options);
   }

   function exportPNG(download, parameters)
   {
      var options = mw.support.extend(settings['export'], {});
      mw.support.extend(getOptions(), options.parameters);
      mw.support.extend(parameters, options);

      options.download = true;
      options.format = 'png';

      if(options.template)
         options.content = '';
      else
      {
         options.content = '<style>' + mw.support.captureCSS(node) + '</style>';
         options.content += '<style>.chart-legend-input, .chart-legend-action { display: none !important }</style>';   // TBD: in layer?
      }

      var clone = node.cloneNode(true);
      clone.style.height = me.height() + 'px';
      options.content += clone.outerHTML;

      if(options.selector === false)
         delete options.selector;
      else if(!options.template && options.selector == undefined)
         options.selector = '.chart-wrapper';

      if(!download || download !== true)
      {
         options.encoding = 'base64';

         var png = mw.support.sendToServer(false, settings['export'].renderer, options);

         if(download)
         {
            var w = window.open('', download);
            var cd = w.document;

            var img = cd.createElement('img');
            img.src = 'data:image/png;base64,' + png;

            cd.body.appendChild(img);
         }
         else
            return png;
      }
      else
      {
         mw.support.sendToServer(true, settings['export'].renderer, options);
         return true;
      }
   }

   function exportSVG(download, parameters)
   {
      var options = getOptions();
      if(parameters.parameters)
         mw.support.extend(parameters.parameters, options);

      if(options.title)
         options = { title: { text: options.title } };

      var svg = highchart.getSVG(options);
      if(download === true)
      {
         mw.support.sendToServer(true, settings['export'].renderer, { format: 'svg', download: true, content: svg });
         return true;
      }
      else if(download)
      {
         var w = window.open('', download);
         var cd = w.document;

         cd.body.innerHTML = svg;
         return true;
      }
      else
         return svg;
   }
};
mw = window.mw || {};

mw.chart = mw.chart || {};

mw.chart.Legend = function(options)
{
   var me;
   var chart;
   var container;
   var scroller;
   var input;
   var datamanager;

   var series = {};
   var key;
   var suggest;
   var suggestitems;

   var current;

   var settings = mw.support.extend(options || {}, {
      interactive: true,                    // Is user allowed to add/remove series
      sort: false,                          // Sort items
      maximum: Infinity,                    // Maximum number of items
      placeholder: {
         geoitems: 'add a country',
         indicators: 'add a dataset'
      }
   });

   return me = {
      init: initialize,
      sort: sortItems
   }

   function initialize(c)
   {
      chart = c;

      datamanager = chart.state().data();

      container = document.createElement('div');
      container.className = 'chart-legend';

      scroller = document.createElement('div');
      scroller.className = 'chart-legend-items';

      container.appendChild(scroller);

      var csettings = chart.settings();
      if(csettings.xaxis.type == 'geoitem')
         key = 'indicators';
      else if(csettings.xaxis.type == 'indicator')
         key = 'geoitems';
      else
         key = chart.settings()['geoitem'] instanceof Array ? 'geoitems' : 'indicators';
      container.className += ' chart-' + key;

      if(settings.interactive)
      {
         var item = document.createElement('div');
         item.className = 'chart-legend-item chart-legend-interactive';

         var swatch = document.createElement('div');
         swatch.className = 'chart-legend-swatch';
         item.appendChild(swatch);

         input = document.createElement('input');
         input.className = 'chart-legend-input chart-legend-label';
         input.type = 'text';
         input.placeholder = settings.placeholder[key] || settings.placeholder;

         mw.support.attachEvent(input, 'focus', onFocus);
         mw.support.attachEvent(input, 'blur', onBlur);
         mw.support.attachEvent(input, 'keydown', onKeyDown);
         mw.support.attachEvent(input, 'keyup', onKeyUp);

         item.appendChild(input);

         var action = document.createElement('div');
         action.className = 'chart-legend-action chart-legend-add';
         item.appendChild(action);

         container.appendChild(item);

         suggest = document.createElement('ul');
         suggest.className = 'chart-legend-suggest ' + key;
         suggest.style.display = 'none';

         mw.support.attachEvent(suggest, 'mousedown', onClick);

         container.appendChild(suggest);

         var pattern = /\{([^}]+)\}/g;
         var template = settings.interactive === true ? '{LABEL}' : settings.interactive;

         suggestitems = {};
         for(var id in datamanager[key])
         {
            var t = template;
            while(match = pattern.exec(t))
               t = t.replace(match[0], datamanager[key][id][match[1].toLowerCase()]);

            suggestitems[id] = '<li data-series="' + id + '">' + t + '</li>';
         }
      }

      if(settings.parent)
         settings.parent.appendChild(container);
      else
         chart.panes().appendChild(container);

      chart.listen('series', function(v) {
         var changed = false;

         for(var id in series)
            if(series[id] && !v[id])
            {
               remove(id);
               changed = true;
            }

         for(var id in v)
            if(!series[id] && v[id])
            {
               add(id);
               changed = true;
            }

         if(settings.sort)
            sortItems(false);
         //else if(changed && chart.type() == 'column' && chart.settings('stacked') !== false)
         //   sortItems(true);

         series = mw.support.extend(v, {});
      });
   }

   function sortItems(reverse)
   {
      if(!scroller)
         return;

      var sort = [];
      for(var n = scroller.firstChild; n; n = n.nextSibling)
         sort.push(n);

      if(reverse)
         sort.reverse();
      else sort.sort(function(a, b) {
         return a.innerText < b.innerText ? -1 : 1;
      });

      for(var n = 0; n < sort.length; n++)
         scroller.appendChild(sort[n]);
   }

   function updateColors()
   {
      var items = scroller.childNodes;
      for(var i = 0, icnt = items.length; i < icnt; i++)
      {
         var item = items[i];
         item.firstChild.style.borderColor = chart.color(item.getAttribute('data-series'));
      }
   }

   function add(id, propagate)
   {
      series[id] = true;

      if(propagate)
         chart.add(id);

      var item = document.createElement('div');
      item.className = 'chart-legend-item';
      item.setAttribute('data-series', id);

      var swatch = document.createElement('div');
      swatch.className = 'chart-legend-swatch chart-series-' + chart.type(true);
      swatch.style.borderColor = chart.color(id);
      item.appendChild(swatch);

      var label = document.createElement('div');
      var override = settings.override && settings.override[id] ? settings.override[id] : {};

      label.className = 'chart-legend-label';
      if(override.label)
         label.innerHTML = override.label;
      else if(datamanager[key][id])
         label.innerHTML = datamanager[key][id].label || id;
      else
         label.innerHTML = id;
      item.appendChild(label);

      var hasdata = !datamanager || datamanager[key][id];
      if(settings.interactive && hasdata)
      {
         var action = document.createElement('div');
         action.className = 'chart-legend-action chart-legend-remove';
         item.appendChild(action);

         mw.support.attachEvent(action, 'click', function(e) {
            remove(this.parentNode.getAttribute('data-series'), true);
         });
      }

      scroller.appendChild(item);

      if(scroller.childNodes.length > settings.maximum)
         remove(scroller.childNodes[0].getAttribute('data-series'), true);

      if(settings.sort && propagate)
         sortItems();

      setTimeout(function() {
         updateColors();
      }, 0);
   }

   function remove(id, propagate)
   {
      var items = scroller.childNodes;
      for(var i = 0, icnt = items.length; i < icnt; i++)
      {
         if(items[i].getAttribute('data-series') == id)
         {
            scroller.removeChild(items[i]);
            delete series[id];

            if(propagate)
               chart.remove(id, true);
            break;
         }
      }

      setTimeout(function() {
         updateColors();
      }, 0);
   }

   function onFocus(e)
   {
      if(this == document.activeElement)
         return;

      var that = this;
      setTimeout(function() {
         that.select();
      }, 100);

      suggest.innerHTML = '';
      suggest.style.display = 'none';
   }

   function onClick(e)
   {
      e = e || window.event;

      var target = e.target || e.srcElement;

      if(e.clientX >= target.clientWidth || e.clientY >= target.clientHeight)
          e.preventDefault();

      if(target === suggest)
         return;

      while(target && !target.hasAttribute('data-series'))
         target = target.parentNode;

      var id = target.getAttribute('data-series');
      if(id && !series[id])
         add(id, true);

      input.value = '';
      suggest.innerHTML = '';
      suggest.style.display = 'none';
   }

   function onBlur(e)
   {
      this.value = '';
      suggest.style.display = 'none';
   }

   function onKeyDown(e)
   {
      var key = e.keyCode;

      if(current)
      {
         current.className = '';

         if(key == 27)
         {
            suggest.innerHTML = '';
            suggest.style.display = 'none';
            mw.support.preventDefault(e);
         }
         else if(key == 13)
         {
            var id = current.getAttribute('data-series');

            if(id && !series[id])
               add(id, true);

            suggest.innerHTML = '';
            suggest.style.display = 'none';
            this.value = '';

            mw.support.preventDefault(e);
            return;
         }
         else if(key == 40 || key == 38)
         {
            var last = current;
            do {
               current = key == 40 ? current.nextSibling : current.previousSibling;
            } while(current && current.style.display == 'none')

            if(!current)
               current = last;

            mw.support.preventDefault(e);
         }
         else if(key == 36 || key == 35)
         {
            current = key == 36 ? current.firstChild : current.lastChild;
            current.scrollIntoView(key == 36);

            mw.support.preventDefault(e);
         }
      }

      if(current)
         current.className = 'selected';
   }

   function onKeyUp(e)
   {
      var l = '', values1 = false, values2 = false, values3 = false;
      var val = this.value.toLowerCase().split(' '), vcnt = val.length;

      if(key == 'geoitems' && datamanager)
      {
         var iid = chart.settings('indicator');
         if(iid instanceof Array)
         {
            if(iid[0]) values1 = datamanager.indicators[iid[0]].values;
            if(iid[1]) values2 = datamanager.indicators[iid[1]].values;
            if(iid[2]) values3 = datamanager.indicators[iid[1]].values;
         }
         else if(iid)
            values1 = datamanager.indicators[iid].values;
      }

      var ci = 0, i = 0, cid = current ? current.getAttribute('data-series') : null;
      for(var id in suggestitems)
      {
         var item = suggestitems[id];
         for(var v = 0; v < vcnt; v++)
         {
            var hide = (values1 && !values1[id]) || (values2 && !values2[id]) || (values3 && !values3[id]);

            if(!hide)
               hide = item.toLowerCase().indexOf(val[v]) == -1 && id.toLowerCase().indexOf(val[v]) == -1;

            if(hide)
               break;
         }

         if(!hide)
         {
            if(cid == id)
               ci = i;

            l += suggestitems[id];
            i++;
         }

         if(i == 100)
         {
            l += '<li class="note">Remaining matching items not shown...</li>';
            break;
         }
      }

      suggest.innerHTML = l;

      if(current)
         current = suggest.childNodes[ci];
      else
         current = suggest.firstChild;

      if(current)
         current.className = 'selected';

      suggest.style.display = 'block';
   }
}

}
