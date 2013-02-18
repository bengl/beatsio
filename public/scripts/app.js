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
  window.audio.scheduler.play([freqPattern], durationPattern, func);
};

var bseq = function(list, repeats, offset){
  return new PSequence(list, repeats, offset);
};

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
      }
    }
	});
};
