//Thanks John Resig!
Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

// Need to be able to handle reloads 
audioNodes = [];
AudioletNode.prototype.oldConnect = AudioletNode.prototype.connect;
AudioletNode.prototype.connect = function(node,output,input) {
  if (node instanceof AudioletDestination) audioNodes.push(this);
  return this.oldConnect(node,output,input);
}

// Kill it with fire!
var killSound = function(){
  for (var i = 0; i < audioNodes.length; i++) {
    audioNodes[i].disconnect(audio.output);
  }
  audioNodes = [];
};

// The Bs
var bfreq = function(note){
  return Note.fromLatin(note).frequency()
};
var bsine = function(note){
  return new Sine(window.audio,isNaN(note)?bfreq(note):note);
};
var bsaw = function(note){
  return new Saw(window.audio,isNaN(note)?bfreq(note):note);
};
var bcon = function(node){
  node.connect(window.audio.output);
};
var bdis = function(node){
  audioNodes.remove(node);
  node.disconnect(window.audio.output);
};

var group = function(ins, outs, initializer) {
  return new Class({
    Extends: AudioletGroup,
    initialize: function(){
      AudioletGroup.prototype.initialize.apply(this, [arguments[0], ins, outs]);
      initializer.apply(this, arguments);
    }
  });
};

// Adapted from Audiolet Demo
var Kick = group(0,1,function(audiolet){
  // Main sine oscillator
  this.sine = new Sine(audiolet, 80);

  // Pitch Envelope - from 81 to 1 hz in 0.3 seconds
  this.pitchEnv = new PercussiveEnvelope(audiolet, 1, 0.001, 0.3);
  this.pitchEnvMulAdd = new MulAdd(audiolet, 80, 1);

  // Gain Envelope
  this.gainEnv = new PercussiveEnvelope(audiolet, 1, 0.001, 0.3,
      function() {
          // Remove the group ASAP when env is complete
          this.audiolet.scheduler.addRelative(1,
                                              this.remove.bind(this));
      }.bind(this)
  );
  this.gainEnvMulAdd = new MulAdd(audiolet, 0.7);
  this.gain = new Gain(audiolet);
  this.upMixer = new UpMixer(audiolet, 2);

  // Connect oscillator
  this.sine.connect(this.gain);

  // Connect pitch envelope
  this.pitchEnv.connect(this.pitchEnvMulAdd);
  this.pitchEnvMulAdd.connect(this.sine);

  // Connect gain envelope
  this.gainEnv.connect(this.gainEnvMulAdd);
  this.gainEnvMulAdd.connect(this.gain, 0, 1);
  this.gain.connect(this.upMixer);
  this.upMixer.connect(this.outputs[0]);
});

var bkick = function() {
  return new Kick(window.audio); 
};

var bloop = function(func, time) {
  time = typeof time !== 'undefined' ? time : 1
  window.audio.scheduler.play([], time, func); 
};

var SimpleSynth = group(0,1,function(audiolet, freq){
  if (isNaN(freq)) freq = bfreq(freq);
  this.sine = new Sine(audiolet, freq);
  this.modulator = new Saw(audiolet, 2 * freq);
  this.modulatorMulAdd = new MulAdd(audiolet, freq / 2, freq);
  this.gain = new Gain(this.audiolet);
  this.envelope = new PercussiveEnvelope(this.audiolet, 1, 0.2, 0.5, 
    function(){
      this.audiolet.scheduler.addRelative(0, this.remove.bind(this));
    }.bind(this)
  );
  this.modulator.connect(this.modulatorMulAdd);
  this.modulatorMulAdd.connect(this.sine);
  this.envelope.connect(this.gain, 0, 1);
  this.sine.connect(this.gain)
  this.gain.connect(this.outputs[0]);
});

var bsimple = function(note) {
  return new SimpleSynth(window.audio, note);
};

var bplay = function(freqPattern, durationPattern, func) {
  if (freqPattern instanceof Array) freqPattern = [freqPattern];
  window.audio.scheduler.play([freqPattern], durationPattern, func);
};

var bseq = function(list, repeats, offset){
  return new PSequence(list, repeats, offset);
};

var btempo = function(tempo) {
  return window.audio.scheduler.setTempo(tempo);
}

window.onload = function () {
  // check if saved stuff
  var hash = window.location.hash;
  if (hash && hash != "") {
    var content = decodeURIComponent(hash.slice(1, hash.length));
    document.getElementById("editor").innerHTML = content;
  }
	// ACE init
	var editor = ace.edit("editor");
	editor.setTheme("ace/theme/twilight");
	var CoffeeMode = require("ace/mode/coffee").Mode;
	editor.getSession().setMode(new CoffeeMode());
  // ACE handle change
  editor.getSession().on('change', function(e) {
    window.location.hash = "#"+encodeURIComponent(editor.getSession().getValue());
  });
	// ACE style crap
	editor.setShowPrintMargin(false);
	editor.setHighlightActiveLine(false);
	editor.renderer.setHScrollBarAlwaysVisible(false);
	document.getElementById('editor').style.fontSize='16px';
	// Audiolet init.
	window.audio = new Audiolet(); // I'm okay with global scope here.
  // Handle saving
	var canon = require('pilot/canon');
	canon.addCommand({
		name: 'run',
		bindKey: {
			win: 'Esc',
			mac: 'Esc',
			sender: 'editor'
		},
		exec: function(env, args, request) {
      try {
        this.audio = window.audio;
        CoffeeScript.run(editor.getSession().getValue(),{bare:true});
      } catch (e) {
        console.log(e);
        throw e;
      }
    }
	});
};
