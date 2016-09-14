function ifsBrightnessToUiBrightness(value) {
  return 100 * value - 2;
}

function uiBrightnessToIfsBrightness(value) {
  return (value + 2) / 100;
}

function initGuiControls() {
  $('#brightness').simpleSpinner({value: ifsBrightnessToUiBrightness(ifs.brightness)});

  $('#new-fractal').click(function() {
    initIFS();
    $('#brightness').simpleSpinner({value: ifsBrightnessToUiBrightness(ifs.brightness)});
  });

  $('#save-fractal').click(function() {
    var path = window.location.toString(), hashPos = path.indexOf('#');
    if (hashPos != -1) path = path.substring(0,hashPos+1);
    else path += "#";
    window.prompt("Fractal URL:", path + saveIFS());
  });

  $('#export-fractal').click(function() {
    $('#export-overlay').show();
    var $img = $('#export-overlay img');
    $img[0].src = glTextureToImage(ifs.fractalTexture);
  });

  $('#export-overlay').click(function() { $(this).hide(); })

  $('.simple-spinner').simpleSpinner();

  $('#animation-speed .simple-spinner').bind('change', function(e, value) {
    ifsRenderer.animationSpeed = settings.animationSpeed = value;
  });

  $('#item-rotation-speed .simple-spinner').bind('change', function(e, value) {
    ifsRenderer.selected.rotationSpeed = value;
  });

  $('#brightness').bind('change', function(e, value) {
    ifs.brightness = uiBrightnessToIfsBrightness(value);
  });

  $('#spinner-red').bind('change', function(e, value) {
    ifsRenderer.selected.color[0] = value;
  });
  $('#spinner-green').bind('change', function(e, value) {
    ifsRenderer.selected.color[1] = value;
  });
  $('#spinner-blue').bind('change', function(e, value) {
    ifsRenderer.selected.color[2] = value;
  });

  $('#animation-button').click(function() {
    var $this = $(this);
    $this.toggleClass('on');
    if ($this.hasClass('on')) {
      ifsRenderer.animating = settings.animating = true;
      $this.html('Animating...');
    }
    else {
      ifsRenderer.animating = settings.animating = false;
      $this.html('Animate!');
    }
  });

  $('#fit-to-screen').click(function() {
    ifsRenderer.fitToScreen();
    ifs.reset();
  });

  $('#item-add').click(function() {
    var angle = Math.random() * 2 * Math.PI,
        cos = Math.cos(angle) * (0.3 + 0.3 * Math.random()),
        sin = Math.sin(angle) * (0.3 + 0.3 * Math.random()),
        item = {
      matrix: new GL.Matrix([
        cos, -sin, 0.0, 0.0,
        sin, cos, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0
      ]),
      color: [Math.round(Math.random() * 100), Math.round(Math.random() * 100), Math.round(Math.random() * 100)],
      _color: [1,1,1,1],
      rotationSpeed: 50 + 0 | Math.random() * 100
    };

    var m,
        eMin = Infinity, eMax = -Infinity,
        fMin = Infinity, fMax = -Infinity;

    for (var i = 0, l = ifs.functions.length; i < l; i++) {
      m = ifs.functions[i].matrix.m;

      eMin = Math.min(m[3], eMin);
      fMin = Math.min(m[7], fMin);

      eMax = Math.max(m[3], eMax);
      fMax = Math.max(m[7], fMax);
    }

    function random(min, max) {
      return min + (max - min) * Math.random();
    }

    item.matrix.m[3] = random(eMin, eMax);
    item.matrix.m[7] = random(fMin, fMax);

    ifs.functions.push(item);
    ifsRenderer.select(item);
  });

  $('#random-color').click(function() {
    ifsRenderer.selected.color = [Math.round(Math.random() * 100), Math.round(Math.random() * 100), Math.round(Math.random() * 100)];
    updateProperties();
    ifs.reset();
  });

  $('#item-delete').click(function() {
    ifsRenderer.removeSelected();
  });

  function coeffRound(val) {
    return Math.round(val * 10000) / 10000;
  }

  function updateProperties() {
    if (!ifsRenderer.selected) {
      $('#item-editor').hide();
    }
    else {
      var m = ifsRenderer.selected.matrix.m;
      $('#item-editor').show();

      if (ifsRenderer.selected == ifs.globalTransform) {
        $('#item-color, #item-delete, #item-coeffs').hide();
      }
      else {
        $('#item-color, #item-delete, #item-coeffs').show();

        $('#spinner-red').simpleSpinner({value: ifsRenderer.selected.color[0]});
        $('#spinner-green').simpleSpinner({value: ifsRenderer.selected.color[1]});
        $('#spinner-blue').simpleSpinner({value: ifsRenderer.selected.color[2]});
      }

      $('#item-rotation-speed .simple-spinner').simpleSpinner({value: ifsRenderer.selected.rotationSpeed});


      $('#coeff-a').val(coeffRound(m[0]));
      $('#coeff-b').val(coeffRound(m[1]));
      $('#coeff-c').val(coeffRound(m[4]));
      $('#coeff-d').val(coeffRound(m[5]));
      $('#coeff-e').val(coeffRound(m[3]));
      $('#coeff-f').val(coeffRound(m[7]));
    }
  }

  var coeffs = {
    'a': 0,
    'b': 1,
    'c': 4,
    'd': 5,
    'e': 3,
    'f': 7
  };

  for (var coeff in coeffs) {
    (function(coeff) {
      var $el = $('#coeff-' + coeff);

      $el.bind('focus', function() {
        $el.data('real-value', parseFloat($el.val()));
      })
      .bind('keyup blur', function(e) {
        var prevVal = $el.data('real-value'), newVal = parseFloat($el.val());
        if (isNaN(newVal)) {
          newVal = prevVal;
          if (e.type == 'blur') $el.val(coeffRound(prevVal));
        }
        else {
          $el.data('real-value', newVal);
        }
        var m = ifsRenderer.selected.matrix.m;
        if (!m) return;
        m[coeffs[coeff]] = newVal;
      });
    })(coeff);
  }

  $canvasGl.on('change', updateProperties);
  updateProperties();

  $('#hq-fractal').click(function() {
    settings.textureSize = 2048;
    ifs.resizeTextures(settings.textureSize);
    $(this).hide();
    $('#lq-fractal').show();
  });

  $('#lq-fractal').click(function() {
    settings.textureSize = 1024;
    ifs.resizeTextures(settings.textureSize);
    $(this).hide();
    $('#hq-fractal').show();
  });

  $('#disable-flashes').click(function() {
    epilepsyCheck = true;
    $(this).hide();
    $('#enable-flashes').show();
  });
  $('#enable-flashes').click(function() {
    epilepsyCheck = false;
    $(this).hide();
    $('#disable-flashes').show();
  });
}