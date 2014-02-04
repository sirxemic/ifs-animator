var __tempMatrix = new GL.Matrix(),
    __tempMatrix2 = new GL.Matrix(),
    __tempObject = {};

function IFS(gl, textureSize) {
  textureSize = textureSize || 1024;
  this.gl = gl;
	this.accumulatorTexture = new GL.Texture(textureSize, textureSize);
	this.fractalTexture = new GL.Texture(textureSize, textureSize);

  this.globalTransform = {
    matrix: new GL.Matrix(), 
    inverse: new GL.Matrix(),
    rotationSpeed: 100
  };
	this.functions = [];
  
	this.brightness = 1.0;
  
	IFS.shader = IFS.shader || new GL.Shader([
		'uniform mat4 function;',
		'uniform mat4 globalTransform;',
    'uniform mat4 globalTransformInverse;',
		'varying vec2 coord;',

		'void main() {',
			'coord = (gl_Vertex.xy + 1.0) * 0.5;',
			'gl_Position.xy = (globalTransform * function * globalTransformInverse * gl_Vertex).xy;',
			'gl_Position.wz = vec2(1.0, 1.0);',
		'}'
	].join('\n'), [
		'uniform sampler2D texture;',
		'uniform vec4 color;',
		'varying vec2 coord;',

		'void main() {',
			'gl_FragColor = texture2D(texture, coord) * color;',
		'}'
	].join('\n'));
	
	this.reset();
}

var epilepsyCheck = false;
var epilepsySafeTimer = 0;

IFS.prototype = {
  dispose: function(e) {
    this.gl.deleteTexture(this.accumulatorTexture.id);
    this.gl.deleteTexture(this.fractalTexture.id);
  },
  
  remove: function(object) {
    var i = typeof object === "number" ? object : this.functions.indexOf(object);
    if (i >= 0 && i < this.functions.length) this.functions.splice(i, 1);
  },
  
  resizeTextures: function(size) {
    this.gl.deleteTexture(this.accumulatorTexture.id);
    this.gl.deleteTexture(this.fractalTexture.id);
    
    this.accumulatorTexture = new GL.Texture(size, size);
    this.fractalTexture = new GL.Texture(size, size);
    
    this.reset();
  },
  
	reset: function() {
    var gl = this.gl;

		this.fractalTexture.drawTo(function() {
			gl.clearColor(1.0, 1.0, 1.0, 1.0);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		});

    if (epilepsyCheck) {
      epilepsySafeTimer = 5;
    }
	},
	
	update: function() {	
		var m, f, area, totalColor = [0, 0, 0];

		for (var i = 0, l = this.functions.length; i < l; i++) {
			totalColor[0] += this.functions[i].color[0];
			totalColor[1] += this.functions[i].color[1];
			totalColor[2] += this.functions[i].color[2];
		}
    
    GL.Matrix.inverse(this.globalTransform.matrix, this.globalTransform.inverse);

		for (var i = 0, l = this.functions.length; i < l; i++) {
      f = this.functions[i];
      m = f.matrix.m;
      area = Math.abs(m[0] * m[5] - m[1] * m[4]);
			f._color[0] = totalColor[0] * area != 0 ? this.brightness * f.color[0] / (totalColor[0] * area) : 0;
			f._color[1] = totalColor[1] * area != 0 ? this.brightness * f.color[1] / (totalColor[1] * area) : 0;
			f._color[2] = totalColor[2] * area != 0 ? this.brightness * f.color[2] / (totalColor[2] * area) : 0;
		}
	},
  
  getColorContribution: function(f, component) {
    var sum = 0;
    for (var i = 0, l = this.functions.length; i < l; i++) {
			sum += this.functions[i].color[component];
		}
    return f.color[component] / sum;
  },

	step: function(seconds) {
		var that = this, functions = this.functions;

		this.accumulatorTexture.drawTo(function() {
			that.gl.clearColor(0.0, 0.0, 0.0, 1.0);
			that.gl.clear(that.gl.COLOR_BUFFER_BIT | that.gl.DEPTH_BUFFER_BIT);
		
			that.fractalTexture.bind(0);
			for (var i = 0; i < functions.length; i++) {
        var uniforms = {
					'texture': 0,
					'globalTransform': that.globalTransform.matrix,
          'globalTransformInverse': that.globalTransform.inverse,
					'function': functions[i].matrix,
					'color': functions[i]._color
				};

				IFS.shader.uniforms(uniforms).draw(mesh);
			}
			that.fractalTexture.unbind(0);
		});
		
		this.accumulatorTexture.swapWith(this.fractalTexture);
    
    if (epilepsySafeTimer > 0) epilepsySafeTimer--;
	},
  
  getBoundingCircle: function(maxIt) {
    var l = this.functions.length, m, i;
    var bCircle = {
      radius: 1,
      x: 0,
      y: 0
    };
    
    maxIt = maxIt || 100;

    var newCircle = {};
    var tempCircle = {};

    var v, points, p, t;
    
    var shrinkFactor, prevShrinkFactor = 1;
    
    function circleSpanning(circle1, circle2) {
      var dx = circle1.x - circle2.x, dy = circle1.y - circle2.y,
          dis = Math.sqrt(dx * dx + dy * dy);
          
      if (dis < 1E-9) 
        return {
          radius: Math.max(circle1.radius, circle2.radius),
          x: circle1.x,
          y: circle1.y
        };
        
      if (dis + circle2.radius <= circle1.radius) 
        return {
          radius: circle1.radius,
          x: circle1.x,
          y: circle1.y
        };
        
      if (dis + circle1.radius <= circle2.radius) 
        return {
          radius: circle2.radius,
          x: circle2.x,
          y: circle2.y
        };
          
      var span = dis + circle1.radius + circle2.radius,
          half = span / 2,
          midX = circle2.x + dx * (half - circle2.radius) / dis,
          midY = circle2.y + dy * (half - circle2.radius) / dis;
      
      return {radius: half, x: midX, y: midY };
    }
    
    for (var k = 0; k < maxIt; k++) {
      m = this.functions[0].matrix.m;
      newCircle.radius = bCircle.radius * Math.sqrt(Math.max(m[0] * m[0] + m[4] * m[4], m[1] * m[1] + m[5] * m[5]));
      newCircle.x = m[0] * bCircle.x + m[1] * bCircle.y + m[3];
      newCircle.y = m[4] * bCircle.x + m[5] * bCircle.y + m[7];
      
      for (i = 1; i < l; i++) {
        m = this.functions[i].matrix.m;
        tempCircle.radius = bCircle.radius * Math.sqrt(Math.max(m[0] * m[0] + m[4] * m[4], m[1] * m[1] + m[5] * m[5]));
        tempCircle.x = m[0] * bCircle.x + m[1] * bCircle.y + m[3];
        tempCircle.y = m[4] * bCircle.x + m[5] * bCircle.y + m[7];
        
        newCircle = circleSpanning(tempCircle, newCircle);
      }
      
      shrinkFactor = newCircle.radius / bCircle;
      if (shrinkFactor > 1 && prevShrinkFactor > 1) return null;
      
      prevShrinkFactor = shrinkFactor;

      t = newCircle;
      newCircle = bCircle;
      bCircle = t;
    }

    return bCircle;
  },
  
  getBoundingBox: function() {
    var l = this.functions.length, m, i;
    var bbox = {
      xMin: -20,
      yMin: -20,
      xMax: 20,
      yMax: 20
    };

    var newBox = {};

    var v, points, p, t;
    
    var shrinkFactor, prevShrinkFactor = 1;
    
    for (var k = 0; k < 80; k++) {
      newBox.xMin = Number.POSITIVE_INFINITY;
      newBox.yMin = Number.POSITIVE_INFINITY;
      newBox.xMax = Number.NEGATIVE_INFINITY;
      newBox.yMax = Number.NEGATIVE_INFINITY;
      
      points = [
        new GL.Vector(bbox.xMin, bbox.yMin, 0),
        new GL.Vector(bbox.xMax, bbox.yMin, 0),
        new GL.Vector(bbox.xMin, bbox.yMax, 0),
        new GL.Vector(bbox.xMax, bbox.yMax, 0)
      ];
      
      for (i = 0; i < l; i++) {
        for (p = 0; p < 4; p++) {
          v = this.functions[i].matrix.transformPoint(points[p]);
          
          newBox.xMin = Math.min(newBox.xMin, v.x);
          newBox.yMin = Math.min(newBox.yMin, v.y);
          newBox.xMax = Math.max(newBox.xMax, v.x);
          newBox.yMax = Math.max(newBox.yMax, v.y);
        }
      }
      
      shrinkFactor = (newBox.xMax - newBox.xMin) * (newBox.yMax - newBox.yMin) / ((bbox.xMax - bbox.xMin) * (bbox.yMax - bbox.yMin));
      if (shrinkFactor > 1 && prevShrinkFactor > 1) return null;
      
      prevShrinkFactor = shrinkFactor;

      t = newBox;
      newBox = bbox;
      bbox = t;
    }

    return bbox;
  },
  
  animate: function(speed) {
    this.rotationSpeed = speed;
  },
};

function IFSRenderer(ifs, glCanvas, gl, ctx2d) {
  this.ifs = ifs;
  
  this.$gl = $(glCanvas);
  this.gl = gl;
  this.ctx2d = ctx2d;
  
  this.selected = null;
  this.selectedPart = null;
  this.previousSelectionAngle = 0;
  
  this.animationSpeed = 100;
  this.animating = false;
  
  this.scale = 1;
  
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  IFSRenderer.shader = IFSRenderer.shader || new GL.Shader([
    'varying vec2 coord;',
    'uniform vec2 delta;',

    'void main() {',
      'coord = (gl_Vertex.xy + 1.0) * 0.5;',
      'gl_Position.zw = gl_Vertex.zw;',
      'gl_Position.xy = gl_Vertex.xy * delta;',
    '}'
  ].join('\n'), [
    'uniform sampler2D texture;',
    'varying vec2 coord;',

    'void main() {',
      'gl_FragColor = texture2D(texture, coord);',
    '}'
  ].join('\n'));
  
  this.savedFunctions = [];
  this.lockFunctions = true;
  
  // Proxies have the same id, so using .off will remove all proxies. Therefore, use namespaces
  this.namespace = 'ns' + Math.random();
  this.$gl
    .on('mouseover.' + this.namespace, $.proxy(this.mouseover, this))
    .on('mouseout.' + this.namespace, $.proxy(this.mouseout, this))
    .on('mousedown.' + this.namespace, $.proxy(this.mousedown, this))
    .on('mousemove.' + this.namespace, $.proxy(this.mousemove, this))
    .on('mouseup.' + this.namespace, $.proxy(this.mouseup, this))
    .on('mousewheel.' + this.namespace, $.proxy(this.mousewheel, this))
    .on('dblclick.' + this.namespace, $.proxy(this.dblclick, this))
    .on('keydown.' + this.namespace, $.proxy(this.keydown, this));

  this.mouseDown = -1;
}

IFSRenderer.prototype = {
  dispose: function(e) {
    this.$gl.off('.' + this.namespace);
  },
  
  mouseover: function(e) {
    this.visible = true;
  },
  
  mouseout: function(e) {
    this.visible = false;
  },
  
  mousedown: function(e) {
    var dist0, dist1, dist2, coords, mouseX = e.originalEvent.layerX, mouseY = e.originalEvent.layerY;
    this.prevX = mouseX;
    this.prevY = mouseY;
    
    var prevSelection = this.selected;
    
    this.select(null);
    this.mouseDown = e.button;

    for (var l = this.ifs.functions.length, i = l - 1, j = i; i >= -1; i--) {
      /* Check items in the order they are drawn */
      if (i == l - 1 && prevSelection != null) {
        current = prevSelection;
      }
      else {
        if (j >= 0 && this.ifs.functions[j] == prevSelection) j--;
        if (j == -1) current = this.ifs.globalTransform;
        else current = this.ifs.functions[j]; 
        j--;
      }
      
      /* Item at this iteration is now decided */

      coords = this.objectPropertiesToScreen(current);
      
      if (distanceSquared(mouseX, mouseY, coords.cx + coords.xx, coords.cy + coords.xy) < 10*10) {
        this.select(current, 'x');
        return;
      }
      
      if (distanceSquared(mouseX, mouseY, coords.cx + coords.yx, coords.cy + coords.yy) < 10*10) {
        this.select(current, 'y');
        return;
      }
      
      dist0 = distanceSquared(mouseX, mouseY, coords.cx, coords.cy);
      dist1 = distanceToSegmentSquared(mouseX, mouseY, coords.cx, coords.cy, coords.cx + coords.xx, coords.cy + coords.xy);
      dist2 = distanceToSegmentSquared(mouseX, mouseY, coords.cx, coords.cy, coords.cx + coords.yx, coords.cy + coords.yy);

      if (dist0 < 10*10 || 
          (dist0 < 80*80 && dist1 < 10*10) ||
          (dist0 < 80*80 && dist2 < 10*10)) {
        this.select(current, 'center');
        return;
      }

      if (dist1 < 10*10) {
        this.select(current, 'midx');
        return;
      }
      
      if (dist2 < 10*10) {
        this.select(current, 'midy');
        return;
      }
    }
  },
  
  mousemove: function(e) {
    var m, mouseX = e.originalEvent.layerX, mouseY = e.originalEvent.layerY, deltaX = mouseX - this.prevX, deltaY = mouseY - this.prevY;

    if (this.mouseDown != -1 && this.selected == this.ifs.globalTransform && this.lockFunctions) {
      this.saveFunctions();
    }
    
    switch (this.mouseDown) {
      case 0:
        // Left click
        if (this.selected == null) {
          // No selection, so translate everything
          m = this.ifs.globalTransform.matrix.m;
          m[3] += deltaX / this.scale;
          m[7] += -deltaY / this.scale;
        }
        else if (this.selected == this.ifs.globalTransform && this.selectedPart == 'center') {
          // Center of reference was selected, so translate everything OR just the reference if functions are locked
          m = this.ifs.globalTransform.matrix.m;
          m[3] += deltaX / this.scale;
          m[7] += -deltaY / this.scale;
        }
        else if (this.selected != null) {
          if (this.selected != this.ifs.globalTransform && this.selectedPart == 'center') {
            m = this.ifs.globalTransform.inverse.m;
            var dx = deltaX / this.scale, 
                dy = -deltaY / this.scale,
                ddx = m[0] * dx + m[1] * dy,
                ddy = m[4] * dx + m[5] * dy;
            m = this.selected.matrix.m;
            
            m[3] += ddx;
            m[7] += ddy;
          }
          else {
            // One of the reference x or y axes was selected
            var coords = this.objectPropertiesToScreen(this.selected);
            var scale, angleDiff;
            if (this.selectedPart.indexOf('mid') != -1) {
              scale = 1; // Only rotate
            }
            else {
              scale = distance(coords.cx, coords.cy, mouseX, mouseY) / distance(coords.cx, coords.cy, this.prevX, this.prevY); // Rotate and scale
            }
            
            if (e.shiftKey && this.selectedPart.indexOf('mid') == -1) {
              angleDiff = 0;
            }
            else {
              angleDiff = Math.atan2(this.prevY - coords.cy, this.prevX - coords.cx) - Math.atan2(mouseY - coords.cy, mouseX - coords.cx);
            }
            
            m = this.selected.matrix.m;

            var co = Math.cos(angleDiff), si = Math.sin(angleDiff), a = m[0], b = m[1], c = m[4], d = m[5];
            
            m[0] = (co * a - si * c) * scale;
            m[1] = (co * b - si * d) * scale;
            m[4] = (si * a + co * c) * scale;
            m[5] = (si * b + co * d) * scale;
          }
        }

        break;
      // End case 0
      
      case 2:
        // Right click - move points independently, or rotate screen
        if (this.selected == null) {
          // No selection --> rotate screen
          var coords = this.objectPropertiesToScreen(this.ifs.globalTransform);
          var angleDiff = Math.atan2(this.prevY - coords.cy, this.prevX - coords.cx) - Math.atan2(mouseY - coords.cy, mouseX - coords.cx);
          
          m = this.ifs.globalTransform.matrix.m;

          var co = Math.cos(angleDiff), si = Math.sin(angleDiff), a = m[0], b = m[1], c = m[4], d = m[5];
          
          m[0] = co * a - si * c;
          m[1] = co * b - si * d;
          m[4] = si * a + co * c;
          m[5] = si * b + co * d;
        }
        else if (this.selected != null) {
          if (this.selectedPart == 'center') {
            if (this.selected != this.ifs.globalTransform) {
              m = this.ifs.globalTransform.inverse.m;
              var dx = deltaX / this.scale, 
                  dy = -deltaY / this.scale
                  ddx = m[0] * dx + m[1] * dy,
                  ddy = m[4] * dx + m[5] * dy;
              m = this.selected.matrix.m;
              
              m[3] += ddx;
              m[7] += ddy;
              m[0] -= ddx;
              m[1] -= ddx;
              m[4] -= ddy;
              m[5] -= ddy;
            }
          }
          else if (this.selected != this.ifs.globalTransform) {
            // One of the reference x or y axes was selected
            var coords = this.objectPropertiesToScreen(this.selected);
            var scale, angleDiff;
            if (this.selectedPart.indexOf('mid') != -1) {
              scale = 1; // Only move the axis
            }
            else {
              scale = distance(coords.cx, coords.cy, mouseX, mouseY) / distance(coords.cx, coords.cy, this.prevX, this.prevY); // Rotate and scale
            }
            
            if (e.shiftKey && this.selectedPart.indexOf('mid') == -1) {
              angleDiff = 0;
            }
            else {
              angleDiff = Math.atan2(this.prevY - coords.cy, this.prevX - coords.cx) - Math.atan2(mouseY - coords.cy, mouseX - coords.cx);
            }
            
            m = this.selected.matrix.m;

            var co = Math.cos(angleDiff), si = Math.sin(angleDiff), a = m[0], b = m[1], c = m[4], d = m[5];
            
            if (this.selectedPart.indexOf('x') != -1) {
              m[0] = (co * a - si * c) * scale;
              m[4] = (si * a + co * c) * scale;
            }
            else {
              m[1] = (co * b - si * d) * scale;
              m[5] = (si * b + co * d) * scale;
            }
          }
        }
        
        break;
      // End case 2
    }
    
    if (this.mouseDown != -1) {
      this.$gl.trigger('change', this.selected);
      
      if (this.selected == this.ifs.globalTransform && this.lockFunctions) {
        this.restoreFunctions();
      }
      
      // Clamp sizes
      if (this.selected) {
        for (var functions = this.ifs.functions, i = 0, l = functions.length; i < l; i++) {
          var m = functions[i].matrix.m, 
              dx = Math.sqrt(m[0] * m[0] + m[4] * m[4]),
              dy = Math.sqrt(m[1] * m[1] + m[5] * m[5]);
          if (dx > 1) { m[0] /= dx; m[4] /= dx; }
          if (dy > 1) { m[1] /= dy; m[5] /= dy; }
        }
      }
      
      this.ifs.reset();
    }
    
    this.prevX = mouseX;
    this.prevY = mouseY;
  },
  
  mouseup: function(e) {
    this.mouseDown = -1;
  },
  
  mousewheel: function(e, delta) {
    var m = this.ifs.globalTransform.matrix.m;
    var scale = delta > 0 ? (1 + 0.071 * delta) : (1 / (1 - 0.071 * delta));
    
    m[0] *= scale;
    m[1] *= scale;
    m[4] *= scale;
    m[5] *= scale;
    
    return false;
  },
  
  dblclick: function(e) {
    if (this.selected == null) return;

    var m = this.selected.matrix.m;
    
    if (m == null) return;
    
    if (this.selected == this.ifs.globalTransform && this.lockFunctions) {
      this.saveFunctions();
    }
    
    if (this.selectedPart == 'x') {
      m[0] = m[5];
      m[4] = -m[1];
    }
    else if (this.selectedPart == 'y') {
      m[1] = -m[4];
      m[5] = m[0];
    }
    
    if (this.selected == this.ifs.globalTransform && this.lockFunctions) {
      this.restoreFunctions();
    }
    
  },
  
  keydown: function(e) {
    if (e.keyCode == 46) {
      if (this.selected) {
        this.ifs.remove(this.selected);
        this.selected = null;
        this.$gl.trigger('remove', this.selected);
      }
    }
  },

  select: function(item, where, nobubble) {
    this.selected = item;
    this.selectedPart = where;
    if (nobubble === undefined) this.$gl.trigger('select', this.selected);
  },
  
  render: function() {
    this.width = this.$gl.width();
    this.height = this.$gl.height();
    
    this.scale = Math.max(this.height, this.width) * 0.5;
    
    this.renderFractal();
    this.renderUi();
  },
  
  renderFractal: function() {
  	this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    
    var delta;
    if (this.width < this.height) delta = [this.height/this.width, 1];
    else delta = [1, this.width / this.height];

    this.ifs.fractalTexture.bind(0);
    IFSRenderer.shader.uniforms({
      texture: 0,
      delta: delta
    }).draw(mesh);
    this.ifs.fractalTexture.unbind(0);
  }, 
  
  renderUi: function() {
    this.ctx2d.clearRect(0, 0, this.width, this.height);
    if (this.selected == null && !this.visible) return;

    var boundingCircle = this.ifs.getBoundingCircle();
    if (boundingCircle) {
      var m = this.ifs.globalTransform.matrix.m;
      
      this.ctx2d.strokeStyle = 'rgba(255,255,255,0.3)';
      this.ctx2d.lineWidth = 2;
      var realRadius = Math.sqrt(m[0] * m[0] + m[4] * m[4]) * boundingCircle.radius * this.scale;
      
      var resolution = ((realRadius >> 1) || 1) << 1;
      for (var i = 0; i < resolution; i+=2) {
        this.ctx2d.beginPath();
        this.ctx2d.arc(
          this.width * 0.5 + (boundingCircle.x * m[0] + boundingCircle.y * m[1] + m[3]) * this.scale, 
          this.height * 0.5 - (boundingCircle.x * m[4] + boundingCircle.y * m[5] + m[7]) * this.scale, 
          realRadius, 
          2 * Math.PI * (i / resolution), 2 * Math.PI * ((i+1) / resolution)
        );
        this.ctx2d.stroke();
      }
    }
    
    var selectedIndex = -1;
    
    if (this.ifs.globalTransform != this.selected) this.renderGlobalTransform();
    
		for (var i = 0, l = this.ifs.functions.length; i < l; i++) {
			if (this.ifs.functions[i] == this.selected) {
        selectedIndex = i;
        continue;
      }
      
      this.renderFunction(i);
		}
		
    if (selectedIndex != -1) this.renderFunction(selectedIndex);
    
    if (this.ifs.globalTransform == this.selected) this.renderGlobalTransform();
  }, 
  
  renderFunction: function(i) {
    this.renderObject(this.ifs.functions[i], arrayToColor(this.ifs.functions[i]._color), 6, this.selected == this.ifs.functions[i]);
  },
  
  renderGlobalTransform: function() {
    this.renderObject(this.ifs.globalTransform, '#fff', 8, this.selected == this.ifs.globalTransform);
  },
  
  renderObject: function(object, color, thickness, selected) {
    var ctx = this.ctx2d,
        coords = this.objectPropertiesToScreen(object);
        
    ctx.lineCap = 'round';
    
    if (selected) {
      ctx.lineWidth = thickness + 8;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.moveTo(coords.cx + coords.xx, coords.cy + coords.xy);
      ctx.lineTo(coords.cx, coords.cy);
      ctx.lineTo(coords.cx + coords.yx, coords.cy + coords.yy);
      ctx.stroke();
    }
        
    ctx.lineWidth = thickness + 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    
    ctx.beginPath();
    ctx.moveTo(coords.cx + coords.xx, coords.cy + coords.xy);
    ctx.lineTo(coords.cx, coords.cy);
    ctx.lineTo(coords.cx + coords.yx, coords.cy + coords.yy);
    ctx.stroke();

    ctx.lineWidth = thickness;
    ctx.strokeStyle = color;

    ctx.beginPath();
    ctx.moveTo(coords.cx + coords.xx, coords.cy + coords.xy);
    ctx.lineTo(coords.cx, coords.cy);
    ctx.lineTo(coords.cx + coords.yx, coords.cy + coords.yy);
    ctx.stroke();
    
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.fillStyle = color;
    
    ctx.beginPath();
    ctx.arc(coords.cx + coords.xx, coords.cy + coords.xy, 5, 0, 2 * Math.PI);
    ctx.closePath();
    
    ctx.stroke();
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(coords.cx + coords.yx, coords.cy + coords.yy, 5, 0, 2 * Math.PI);
    ctx.closePath();
    
    ctx.stroke();
    ctx.fill();
  },
  
	step: function(seconds) {
		var functions = this.ifs.functions;
    
    if (this.animating && this.animationSpeed != 0) {
      this.saveFunctions();
      
      var m = this.ifs.globalTransform.matrix.m,
          a = m[0],
          b = m[1],
          c = m[4],
          d = m[5],
          cos = Math.cos(seconds * 2 * Math.PI * this.ifs.globalTransform.rotationSpeed * this.animationSpeed / 100000),
          sin = Math.sin(seconds * 2 * Math.PI * this.ifs.globalTransform.rotationSpeed * this.animationSpeed / 100000);
      
      m[0] = cos * a - sin * c;
      m[1] = cos * b - sin * d;
      m[4] = sin * a + cos * c;
      m[5] = sin * b + cos * d;
      
      this.restoreFunctions();

      for (var i = 0; i < functions.length; i++) {
        m = functions[i].matrix.m;
        a = m[0];
        b = m[1];
        c = m[4];
        d = m[5];
        cos = Math.cos(seconds * 2 * Math.PI * functions[i].rotationSpeed * this.animationSpeed / 100000);
        sin = Math.sin(seconds * 2 * Math.PI * functions[i].rotationSpeed * this.animationSpeed / 100000);
        
        m[0] = cos * a - sin * c;
        m[1] = cos * b - sin * d;
        m[4] = sin * a + cos * c;
        m[5] = sin * b + cos * d;
      }
    }
	},
  
  objectPropertiesToScreen: function(object, result) {
    var m;
    
    if (object != this.ifs.globalTransform) {
      GL.Matrix.multiply(this.ifs.globalTransform.matrix, object.matrix, __tempMatrix);
      m = __tempMatrix.m;
    }
    else {
      m = object.matrix.m;
    }
    
    result = result || {}
    
    result.cx =  m[3] * this.scale + this.width * 0.5,
    result.cy = -m[7] * this.scale + this.height * 0.5,
    result.xx =  m[0] * this.scale,
    result.yx =  m[1] * this.scale,
    result.xy = -m[4] * this.scale,
    result.yy = -m[5] * this.scale;
    
    return result;
  },
  
  saveFunctions: function() {
    var functions = this.ifs.functions;
    this.savedFunctions = [];

    for (var i = 0, l = functions.length; i < l; i++) {
      this.savedFunctions.push(GL.Matrix.multiply(this.ifs.globalTransform.matrix, functions[i].matrix, new GL.Matrix()));
    }
  },
  
  restoreFunctions: function() {
    var matrix, functions = this.ifs.functions;

    GL.Matrix.inverse(this.ifs.globalTransform.matrix, this.ifs.globalTransform.inverse);
    
    for (var i = 0, l = functions.length; i < l; i++) {
      GL.Matrix.multiply(this.ifs.globalTransform.inverse, this.savedFunctions[i], functions[i].matrix);
    }
  },
  
  fitToScreen: function() {
    var bc = this.ifs.getBoundingCircle(), 
        m = this.ifs.globalTransform.matrix.m,
        scale = 1 / (bc.radius * Math.sqrt(m[0] * m[0] + m[4] * m[4]));

    m[0] *= scale;
    m[1] *= scale;
    m[4] *= scale;
    m[5] *= scale;
    
    var newX = bc.x * m[0] + bc.y * m[1] + m[3];
    var newY = bc.x * m[4] + bc.y * m[5] + m[7];
    
    m[3] -= newX;
    m[7] -= newY;
  }
}


function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

function distanceSquared(x1, y1, x2, y2) {
  return (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
}

function distanceToSegment(cx, cy, ax, ay, bx, by) {
	return Math.sqrt(distanceToSegmentSquared(cx, cy, ax, ay, bx, by));
}

function distanceToSegmentSquared(cx, cy, ax, ay, bx, by) {
	var n = (cx-ax)*(bx-ax) + (cy-ay)*(by-ay),
      d = (bx-ax)*(bx-ax) + (by-ay)*(by-ay),
      r = n / d,
      px = ax + r*(bx-ax),
      py = ay + r*(by-ay),
      s =  ((ay-cy)*(bx-ax)-(ax-cx)*(by-ay) ) / d,
      distanceLineSquared = s*s*d;

	if ((r >= 0) && (r <= 1))
	{
		return distanceLineSquared;
	}
	else
	{
		var dist1 = (cx-ax)*(cx-ax) + (cy-ay)*(cy-ay);
		var dist2 = (cx-bx)*(cx-bx) + (cy-by)*(cy-by);
		if (dist1 < dist2) return dist1;
		else return dist2;
	}
}

function arrayToColor(a) {
  return 'rgb(' + (255 * a[0] | 0) + ',' + (255 * a[1] | 0) + ',' + (255 * a[2] | 0) + ')';
}
