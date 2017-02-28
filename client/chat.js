var sock = new SockJS('http://cyberwarrior.ru/echo');

// On connection close
sock.onclose = function() {
	console.log('close');
	// remove chat send input container here
};

function scrollDownChat(chatDiv) {
	chatDiv.scrollTop = chatDiv.scrollHeight;
}

function generateMessage(content) {
	return '<div class="chat-messages-container-wrapper">' +
				'<div class="chat-messages-wrapper">' +
					'<div class="chat-message-container">' +
						'<div class="chat-message-avatar">' +
							'<div class="chat-message-avatar-container" title="' + content.u + '">' +
								(content.a ? ('<img src="/static/images/' + content.a + '" class="img-responsive" />') : '') +
							'</div>' +
						'</div>' +
						'<div class="chat-message-text"><p>' + content.m + '</p></div>' +
						'<div class="chat-message-time"><p>' + content.t + '</p></div>' +
					'</div>' +
				'</div>' +
			'</div>';
}

$(function() {
	var chatDiv = $('.chat-messages-container-main');
	var chatContainer = $('.chat-container');
	var channel = chatContainer.attr('data-chat-channel');

	// On receive message from server
	sock.onmessage = function(e) {
		JSON.parse(e.data);
	};

	// Open the connection
	sock.onopen = function() {
		console.log('open');
		
		// sock.send(JSON.stringify({'method': 'set-channel', 'channel': channel }));
	};
});
