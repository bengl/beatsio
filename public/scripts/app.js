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

window.onload = function() {
	// ACE init
	var editor = ace.edit("editor");
	editor.setTheme("ace/theme/twilight");
	var CoffeeMode = require("ace/mode/coffee").Mode;
	editor.getSession().setMode(new CoffeeMode());
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
				CoffeeScript.compile(editor.getSession().getValue(),{bare:true});
				CoffeeScript.run(editor.getSession().getValue(),{bare:true});
			} catch (e) {
				console.log(e);
			}
		}
	});
};

