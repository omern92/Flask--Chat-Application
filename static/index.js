document.addEventListener('DOMContentLoaded', () => {

    // Hides the chat wrap by default.
    document.querySelector('#chat-wrap').style.display = 'none';

    // Check if the username logged in before.
    if (!localStorage.getItem('username')) {
        document.querySelector('#login_req').innerHTML = 'Please select a username.';
    } else {
        document.querySelector('#guest_user').innerHTML = localStorage.getItem('username');
        document.querySelector('#username').value = localStorage.getItem('username');
        document.querySelector('#login_req').innerHTML = 'Would you like to change your username?';
        document.querySelector('#username_submit').value = 'Continue to chat';
    }

    // Function declaration. Checking if the input is blank or not.
    function check_Input(input_id, submit_btn_id) {
        if (document.getElementById(input_id).value.length == 0)
            document.getElementById(submit_btn_id).disabled = true;
        document.getElementById(input_id).onkeyup = () => {
            if (document.getElementById(input_id).value.length > 0)
                document.getElementById(submit_btn_id).disabled = false;
            else
                document.getElementById(submit_btn_id).disabled = true;
        };
    }

    // Check username input.
    check_Input('username', 'username_submit');

    // Login the user and sets a local storage with his username.
    document.querySelector('#username_form').onsubmit = () => {
        document.querySelector('#chat-wrap').style.display = 'none';
        const request = new XMLHttpRequest();
        const username = document.querySelector('#username').value;
        request.open('POST', '/chat');

        // Gets a response from XMLHttpRequest -----------------------!!!!
        request.onload = () => {
            const data = JSON.parse(request.responseText);
            if (data.success) {
                localStorage.setItem('username', username);
                document.querySelector('#login_div').style.display = 'none';
                document.querySelector('#chat-wrap').style.display = 'block';
                document.querySelector('#welcome').style.display = 'none';

                // When a user connects successfuly, start the chat:
                // Connect to the web socket.
                var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);
                // Connect to the previous room or to the lobby.
                var room;
                if (!localStorage.getItem('room')) {
                    localStorage.setItem('room', 'lobby');
                    room = 'lobby';
                } else {
                    room = localStorage.getItem('room');
                }

                // Displays the rooms list.
                for (var index in data.rooms) {
                    var btn_room = document.createElement('BUTTON');
                    var room_name = index;
                    btn_room.id = room_name;
                    btn_room.type = "button";
                    btn_room.className = "list-group-item list-group-item-action";
                    btn_room.innerHTML = room_name;
                    document.querySelector('#rooms_list').appendChild(btn_room);
                    if (btn_room.id == room) {
                        document.getElementById(room).className += " active";
                        document.getElementById(room).disabled = true;
                    }
                    btn_room.onclick = () => {
                        socket.emit('leave', {'username': username});
                        socket.emit('join room', {'username': username, 'room': room_name});
                        return false;
                    };
                }

                // Emits a new event which tells the server that a user has connected.
                socket.on('connect', () => {
                    socket.emit('join room', {'username': username, 'room': room});
                });


                // Check if there is a text in the message input.
                check_Input('message', 'submit');
                // Emits the message to the server.
                document.querySelector('#chat_form').onsubmit = () => {
                    const message = document.querySelector('#message').value;
                    var current_time = new Date().toLocaleTimeString();
                    socket.emit('submit message', {'username': username, 'message': message, 'time': current_time});
                    document.querySelector('#message').value = '';
                    return false;
                };

                // Adds the message to the chat list.
                socket.on('post message', data => {
                    var current_time = new Date().toLocaleTimeString();
                    var li = document.createElement('li');
                    // The Message that will be displayed:
                    li.innerHTML = `${current_time}, ${data.username}: ${data.message}`;
                    document.querySelector('#messages').append(li);
                });

                // CREATE ROOM
                check_Input('create_room', 'create_room_btn');
                document.querySelector('#create_room_btn').onclick = () => {
                    room = document.querySelector('#create_room').value;
                    // Initialize the input and emits a 'create room' request.
                    document.querySelector('#create_room').value = '';
                    socket.emit('leave', {'username': username});
                    socket.emit('create room', {'username': username, 'room': room});
                    socket.emit('join room', {'username': username, 'room': room});
                };

                // If the room exists.
                socket.on('the room exists', () => {
                    alert('The room already exists');
                });

                // New user has joined the room
                socket.on('user joined the room', data => {
                    // Adding a welcome message to the room.
                    var current_time = new Date().toLocaleTimeString();
                    var li_mes = document.createElement('li');
                    li_mes.innerHTML = `${current_time}: ${data.message}`;
                    document.querySelector('#messages').append(li_mes);
                    // Adding the user to the connected list of the room.
                    if (data.username != username) {
                        var li_user = document.createElement('li');
                        li_user.innerHTML = data.username;
                        li_user.id = data.username;
                        document.querySelector('#users_list').append(li_user);
                    }
                });

                // Adds a new room to the list.
                socket.on('rooms list add', (room) => {
                    var btn_room = document.createElement('BUTTON');
                    btn_room.id = room;
                    btn_room.type = "button";
                    btn_room.className = "list-group-item list-group-item-action";
                    btn_room.innerHTML = room;
                    document.querySelector('#rooms_list').appendChild(btn_room);
                    btn_room.onclick = () => {
                        socket.emit('leave', {'username': username});
                        socket.emit('join room', {'username': username, 'room': room});
                        return false;
                    };
                });

                // Removes a room from the list.
                socket.on('rooms list remove', (room) => {
                    var btn_room = document.getElementById(room);
                    btn_room.parentNode.removeChild(btn_room);
                });


                // User left the room message.
                socket.on('user left the room', data => {
                    var current_time = new Date().toLocaleTimeString();
                    var li = document.createElement('li');
                    // The Message that will be displayed:
                    li.innerHTML = `${current_time}: ${data.message}`;
                    document.querySelector('#messages').append(li);
                    // Removes the user from the connected list of the room.
                    var li_user = document.getElementById(data.username);
                    li_user.parentNode.removeChild(li_user);
                });

                // Change the room in the list from active to not.
                socket.on('I left a room', (room) => {
                    document.getElementById(room).className = "list-group-item list-group-item-action";
                    document.getElementById(room).disabled = false;
                });

                socket.on('I joined a room', (data) => {
                    var room = data.room;
                    // Changing the active room in the list.
                    document.getElementById(room).className += " active";
                    document.getElementById(room).disabled = true;

                    // Refreshing the connected list to that specific room.
                    var list = document.querySelector('#users_list');
                    while (list.firstChild) {
                        list.removeChild(list.firstChild);
                    }
                    data.rooms[room].forEach((user) => {
                        li_users_list = document.createElement('li');
                        li_users_list.innerHTML = user;
                        li_users_list.id = user;
                        document.querySelector('#users_list').append(li_users_list);
                    });
                    // Displaying the last 100 messages in the chat.
                    var mes_list = data.messages[room];
                    if (typeof mes_list !== "undefined") {
                        mes_list.forEach((mes) => {
                            var li_mes_list = document.createElement('li');
                            li_mes_list.innerHTML = mes;
                            document.querySelector('#messages').append(li_mes_list);
                        });
                    }
                    // Saves the current room in the local storage.
                    localStorage.setItem('room', room);
                });


            } // If (data.success) ending curly brace.
            else {
                document.querySelector('#error').innerHTML = "We're sorry. This username already exists. Please choose a different one.";
            }
        };
        document.querySelector('#header_username').innerHTML = username;
        var data = new FormData();
        data.append('username', username);
        request.send(data);
        return false;

    };

});





                // // Refreshing the rooms list with XMLRequest.
                // setInterval(() => {
                //     var rooms_request = new XMLHttpRequest();
                //     rooms_request.open('GET', '/rooms');
                //     rooms_request.onload = () => {
                //         var rooms_list = JSON.parse(rooms_request.responseText);
                //         for (var room in rooms_list[rooms]) {
                //             if ()
                //             var li_room = document.createElement('li');
                //             li_room.innerHTML = room;
                //             document.querySelector('#rooms_list').append(li_room);
                //         }

                //     };
                //     rooms_request.send();
                // }, 5000);


