// Need to be able to handle 
audioNodes = [];
AudioletNode.prototype.oldConnect = AudioletNode.prototype.connect;
AudioletNode.prototype.connect = function(node,output,input) {
	if (node instanceof AudioletDestination) audioNodes.push(this);
	return this.oldConnect(node,output,input);
}
var disconnectAudioNodes = function(){
	for (var i = 0; i < audioNodes.length; i++) {
		audioNodes[i].disconnect(audio.output);
	}
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
  // Handle Cmd-S
	var canon = require('pilot/canon');
	canon.addCommand({
		name: 'run',
		bindKey: {
			win: 'Ctrl-S',
			mac: 'Command-S',
			sender: 'editor'
		},
		exec: function(env, args, request) {
			try {
				window.killSound = disconnectAudioNodes;
				killSound();
				CoffeeScript.compile(editor.getSession().getValue(),{bare:true});
				CoffeeScript.run(editor.getSession().getValue(),{bare:true});
			} catch (e) {
				console.log(e);
			}
		}
	});
};

