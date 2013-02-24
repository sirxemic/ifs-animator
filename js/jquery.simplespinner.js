(function( $ ){

  var allowedCharCodes = [
    45, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 0
  ], SimpleSpinner = function(el, options) {
    this.$element = $(el);
    
    this.options = $.extend({}, $.fn.simpleSpinner.defaults, this.$element.data(), options);
    this.options.value = parseInt(this.options.value, 10);
    this.options.minValue = parseInt(this.options.minValue, 10);
    this.options.maxValue = parseInt(this.options.maxValue, 10);
    this.options.stepSize = parseInt(this.options.stepSize, 10);
    
    this.$buttonDecr = $('<button class="less">&#8722;</button>');
    this.$buttonIncr = $('<button class="more">+</button>');
    this.$inputField = $('<input class="small-int">');
    
    this.$inputField.val(this.options.value);
    
    this.$element.append(this.$buttonDecr, this.$inputField, this.$buttonIncr);
    
    this.$inputField
      .on('keypress', $.proxy(this.keypress, this))
      .on('keyup',    $.proxy(this.keyup, this))
      .on('blur',    $.proxy(this.blur, this));
    this.$buttonIncr
      .on('mousedown', $.proxy(this.stepUpStart, this))
      .on('mouseup', $.proxy(this.stepUpStop, this));
    this.$buttonDecr
      .on('mousedown', $.proxy(this.stepDownStart, this))
      .on('mouseup', $.proxy(this.stepDownStop, this));
      
    this.stepUpInterval = null;
    this.stepDownInterval = null;
  };
  
  SimpleSpinner.prototype = {
    keypress: function(e) {
      if (allowedCharCodes.indexOf(e.charCode) == -1) return false;
    },
    
    keyup: function(e) {
      var newVal = parseInt(this.$inputField.val(), 10);

      if (Number.isNaN(newVal) || newVal < this.options.minValue || newVal > this.options.maxValue) {
        this.$inputField.addClass('error');
      }
      else {
        this.$inputField.removeClass('error');
        this.updateValue(newVal);
      }
    },
    
    updateValue: function(val, noTrigger) {
      if (val < this.options.minValue) val = this.options.minValue;
      if (val > this.options.maxValue) val = this.options.maxValue;
      
      this.$inputField.val(this.options.value = val);

      if (!noTrigger) this.$element.trigger('change', [this.options.value]);
    },
    
    blur: function(e) {
      var newVal = parseInt(this.$inputField.val(), 10);
      if (Number.isNaN(newVal)) {
        updateValue(this.options.value);
        return false;
      }
      
      this.updateValue(newVal);
    },
    
    stepUpStart: function(e) {
      if (this.stepUpInterval) return;
      this.stepSize = this.options.stepSize;
      this.stepCounter = 0;
      this.stepUp();
      this.stepUpInterval = setInterval($.proxy(this.stepUp, this), 50);
    },
    
    stepUpStop: function(e) {
      clearInterval(this.stepUpInterval);
      this.stepUpInterval = null;
    },
    
    stepDownStart: function(e) {
      if (this.stepDownInterval) return;
      this.stepSize = this.options.stepSize;
      this.stepCounter = 0;
      this.stepDown();
      this.stepDownInterval = setInterval($.proxy(this.stepDown, this), 50);
    },
    
    stepDownStop: function(e) {
      clearInterval(this.stepDownInterval);
      this.stepDownInterval = null;
    },
    
    stepUp: function(e) {
      var newVal = this.options.value;
      
      if (this.stepCounter == 0 || this.stepCounter >= 10) {
        newVal += this.stepSize;
        
        if (this.stepCounter == 40 || this.stepCounter == 80) this.stepSize *= 2;
        
        this.updateValue(newVal);
      }
      
      this.stepCounter++;
    },
    
    stepDown: function(e) {
      var newVal = this.options.value;
      
      if (this.stepCounter == 0 || this.stepCounter >= 10) {
        newVal -= this.stepSize;
        
        if (this.stepCounter == 40 || this.stepCounter == 80) this.stepSize *= 2;
        
        this.updateValue(newVal);
      }
      
      this.stepCounter++;
    },
  };

  $.fn.simpleSpinner = function(options) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('simpleSpinner')
      if (!data) $this.data('simpleSpinner', (data = new SimpleSpinner(this, options)));
      else {
        for (var m in options) {
          options[m] = 0 | options[m];
        } 
        $.extend(data.options, options);
        data.updateValue(data.options.value, true);
      }
    })
  };
  
  $.fn.simpleSpinner.defaults = {
    value: 5,
    minValue: 0,
    maxValue : 10,
    stepSize: 1
  };

})( jQuery );