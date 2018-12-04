import os
import requests
import json
from flask import Flask, session, render_template, request, jsonify
from flask_socketio import SocketIO, emit, send, join_room, leave_room
from collections import defaultdict
# defaultdict allows to set the dict values as a list by default.


app = Flask(__name__)
app.config["SECRET_KEY"] = 'asdjadjksgs2144jk123'
socketio = SocketIO(app)

# {username: [sessionID, room]}
users = defaultdict(list)
# {room: [messages]}
messages = defaultdict(list)
# {room: [username]}
rooms = defaultdict(list)


@app.route("/")
def home():
    return render_template('index.html')


@app.route("/chat", methods=['POST'])
def login_verification():
    username = request.form.get("username")
    if users.get(username) != None:
        return jsonify({'success': False})
    else:
        users[username] = ''
        return jsonify({'success': True, 'username': username, 'rooms': rooms})


@socketio.on("join room")
def handle_join(data):
    room = data['room']
    username = data['username']
    session['room'] = room
    session['username'] = username
    if room not in rooms.keys():
        emit("rooms list add", room, broadcast=True)
    users[username] = [request.sid, room]
    rooms[room].append(username)
    join_room(room)
    print(users)
    print(rooms)
    emit('I joined a room', {'rooms': rooms, 'room': room, 'messages': messages}, room=request.sid)
    emit('user joined the room', {'message': f"Welcome to {room}, {username}.", 'username': username}, room=room)


@socketio.on("submit message")
def post_message(data):
    username = data['username']
    message = data['message']
    time = data['time']
    room = session.get('room')
    if len(messages[room]) == 100:
        messages[room].pop()
    messages[room].append(f"{time} {username}: {message}")
    emit("post message", {'username': username, 'message': message}, room=room)


@socketio.on("create room")
def handle_create(data):
    room = data['room']
    username = data['username']
    users[username] = [request.sid, room]
    if room in rooms.keys():
        emit('the room exists', room=request.sid)


@socketio.on("leave")
def handle_leave(data):
    username = data['username']
    room = session.get('room')
    rooms[room].remove(username)
    leave_room(room)
    # To change the room in the list from active to not.
    emit('I left a room', room, room=request.sid)
    emit('user left the room', {'message': username + ' has left the room.', 'username': username}, room=room)
    if (check_empty_room(room)):
        emit("rooms list remove", room, broadcast=True)


@socketio.on("disconnect")
def disconnet():
    try:
        user_id = request.sid
        username = session.get('username')
        room = session.get('room')
        # username = list(users.keys())[list(users.values()).index(user_id)]
        users.pop(username, None)
        leave_room(room)
        socketio.emit('user left the room', {'message': username + ' has left the room.', 'username': username}, room=room)
        if (check_empty_room(room)):
            socketio.emit("rooms list remove", room, broadcast=True)
    except:
        raise ValueError


def check_empty_room(room):
    counter = 0
    for info in users.values():
        if info[1] == room:
            counter += 1
    if counter == 0:
        rooms.pop(room)
        return True
    else:
        return False


if __name__ == '__main__':
    socketio.run(app, debug=True)
