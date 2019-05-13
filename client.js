console.log("client init...");

$(function () {
    "use strict";
    // for better performance - to avoid searching in DOM
    var content = $('#content');
    var userlist = $('#userlist');
    var input = $('#input');
    var status = $('#status');



    // client name sent to the server
    var myName = false;

    // if user is running mozilla then use it's built-in WebSocket
    window.WebSocket = window.WebSocket || window.MozWebSocket;

    // if browser doesn't support WebSocket, just show
    // some notification and exit
    if (!window.WebSocket) {
        content.html($('<p>',
            {text: 'Sorry, but your browser doesn\'t support WebSocket.'}
        ));
        input.hide();
        $('span').hide();
        return;
    }

    // open connection
    var connection = new WebSocket('ws://127.0.0.1:5555');

    connection.onopen = function () {
        // first we want users to enter their names
        input.removeAttr('disabled');
        status.text('Choose name:');
    };

    connection.onerror = function (error) {
        // just in there were some problems with connection...
        content.html($('<p>', {
            text: 'Sorry, but there\'s some problem with your '
                + 'connection or the server is down.'
        }));
    };
    // most important part - incoming messages
    connection.onmessage = function (message) {

        // try to parse JSON message. Because we know that the server
        // always returns JSON this should work without any problem but
        // we should make sure that the massage is not chunked or
        // otherwise damaged.
        try {
            var json = JSON.parse(message.data);
        } catch (e) {
            console.error('Invalid JSON: ', message.data);
            return;
        }

        console.log(new Date() + ' [Client] received: ' + JSON.stringify(json));

        // NOTE: if you're not sure about the JSON structure
        // check the server source code above
        // first response from the server with user's color
        if (json.type === 'status') {
            if (json.data.accepted) {
                console.log(json.data);
                input.removeAttr('disabled').focus();
                var joinMsg = new Date() + '... joined!';

                connection.send(joinMsg);
                addUserList(json.data.userList);
            } else {
                console.error("error!" + json.data.accepted);
                connection.close();
                return;
            }
            /*
            myColor = json.data;
            status.text(myName + ': ').css('color', myColor);

             */
            // from now user can start sending messages
        } else if (json.type === 'message') { // it's a single message
            // let the user write another message
            input.removeAttr('disabled');
            addMessage(json.data.author, json.data.text);
        } else if (json.type === 'newClient') {
            addUser(json.data);
        } else if (json.type === 'removeUser') {
            removeUser(json.data.user);
        } else {
            console.log('Hmm..., I\'ve never seen JSON like this:', json);
        }
    };

    /**
     * Send message when user presses Enter key
     */
    input.keydown(function (e) {
        if (e.keyCode === 13) {
            var msg = $(this).val();
            if (!msg) {
                return;
            }
            // send the message as an ordinary text
            connection.send(msg);
            $(this).val('');
            // disable the input field to make the user wait until server
            // sends back response
            input.attr('disabled', 'disabled');
            // we know that the first message sent from a user their name
            if (myName === false) {
                myName = msg;
            }
        }
    });
    /**
     * This method is optional. If the server wasn't able to
     * respond to the in 3 seconds then show some error message
     * to notify the user that something is wrong.
     */
    setInterval(function () {
        if (connection.readyState !== 1) {
            status.text('Error');
            input.attr('disabled', 'disabled').val(
                'Unable to communicate with the WebSocket server.');
        }
    }, 3000);

    /**
     * Add message to the chat window
     */
    function addMessage(author, message) {
        content.append('<p><span>'
            + author + ': </span>' + message + '</p>');
    }

    function addUserList(data) {
        for (let i = 0; i < data.length; i++) {
            addUser(data[i]);
        }
    }

    function addUser(data) {
        if ($('#' + data.id).length <= 0) {
            userlist.append('<p id="' + data.id + '"><span>'
                + data.id + ': </span>' + data.userName + '</p>');
        }
    }

    function removeUser(data) {
        addMessage(data.userName, "User left " + data.userName);
        console.log(data);
        $('#' + data.id).remove();
    }
});
