$(function() {

	function sendMessage(){
		var input = $('.chat-input-mes');
		var message = input.val();
		var chatLogin = $('.chat-login');
		var username = chatLogin.attr('data-chat-login');
		input.val('');

		var send = {
			u: username,
			m: message
		};
		sock.send(JSON.stringify(send));
	}

	$('.chat-btn-send').on('click', function(e) {
		e.preventDefault();
		$(this).closest('form').submit();
	});
	$('.chat-form').on('submit', function(e) {
		e.preventDefault();
		sendMessage();
	});

});
