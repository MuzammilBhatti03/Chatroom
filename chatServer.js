// class ChatServer {
//   constructor() {
//     if (ChatServer.instance) {
//       return ChatServer.instance;
//     }

//     this.express = require('express')();
//     this.http = require('http').Server(this.express);
//     this.io = require('socket.io')(this.http);

//     this.userList = [];
//     this.typingUsers = {};
//     this.initializeServer();
//     this.handleSocketConnections();
//     ChatServer.instance = this;
//     return this;
//   }

//   initializeServer() {
//     this.express.get('/', (req, res) => {
//       res.send('<h1>AppCoda - SocketChat Server</h1>');
//     });

//     this.http.listen(3000, () => {
//       console.log('Listening on *:3000');
//     });
//   }

//   handleSocketConnections() {
//     this.io.on('connection', (clientSocket) => {
//       console.log('A user connected');

//       clientSocket.on('disconnect', () => {
//         console.log('User disconnected');
//         let clientNickname;
//         for (let i = 0; i < this.userList.length; i++) {
//           if (this.userList[i]["id"] === clientSocket.id) {
//             this.userList[i]["isConnected"] = false;
//             clientNickname = this.userList[i]["nickname"];
//             break;
//           }
//         }

//         delete this.typingUsers[clientNickname];
//         this.io.emit("userList", this.userList);
//         this.io.emit("userExitUpdate", clientNickname);
//         this.io.emit("userTypingUpdate", this.typingUsers);
//       });

//       clientSocket.on("exitUser", (clientNickname) => {
//         for (let i = 0; i < this.userList.length; i++) {
//           if (this.userList[i]["id"] === clientSocket.id) {
//             this.userList.splice(i, 1);
//             break;
//           }
//         }
//         this.io.emit("userExitUpdate", clientNickname);
//       });

//       clientSocket.on('chatMessage', (clientNickname, message) => {
//         const currentDateTime = new Date().toLocaleString();
//         delete this.typingUsers[clientNickname];
//         this.io.emit("userTypingUpdate", this.typingUsers);
//         this.io.emit('newChatMessage', clientNickname, message, currentDateTime);
//       });

//       clientSocket.on("connectUser", (clientNickname) => {
//         console.log(`User ${clientNickname} connected: ${clientSocket.id}`);
        
//         let userInfo = {};
//         let foundUser = false;
//         for (let i = 0; i < this.userList.length; i++) {
//           if (this.userList[i]["nickname"] === clientNickname) {
//             this.userList[i]["isConnected"] = true;
//             this.userList[i]["id"] = clientSocket.id;
//             userInfo = this.userList[i];
//             foundUser = true;
//             break;
//           }
//         }
        
//         if (!foundUser) {
//           userInfo["id"] = clientSocket.id;
//           userInfo["nickname"] = clientNickname;
//           userInfo["isConnected"] = true;
//           this.userList.push(userInfo);
//         }

//         this.io.emit("userList", this.userList);
//         this.io.emit("userConnectUpdate", userInfo);
//         console.log("User list is: " + JSON.stringify(this.userList, null, 2));
//       });

//       clientSocket.on('privateMessage', (recipientId, senderNickname, message) => {
//         const currentDateTime = new Date().toLocaleString();
      
//         // Create a unique room for sender and recipient
//         const roomName = `room_${senderNickname}_${recipientId}`;
      
//         // Access the recipient socket
//         const recipientSocket = this.io.sockets.sockets[recipientId];
      
//         if (recipientSocket) {
//           // Join both the sender and the recipient to the room
//           clientSocket.join(roomName);
//           recipientSocket.join(roomName);
      
//           // Send the private message to the room
//           this.io.to(roomName).emit('newPrivateMessage', {
//             sender: senderNickname,
//             message: message,
//             date: currentDateTime,
//             roomName
//           });
      
//           console.log("Private message sent to room:", roomName);
//         } else {
//           console.error(`Recipient socket with ID ${recipientId} does not exist.`);
//         }
//       });
//       clientSocket.on("startType", (clientNickname) => {
//         this.typingUsers[clientNickname] = 1;
//         this.io.emit("userTypingUpdate", this.typingUsers);
//       });

//       clientSocket.on("stopType", (clientNickname) => {
//         delete this.typingUsers[clientNickname];
//         this.io.emit("userTypingUpdate", this.typingUsers);
//       });
//     });
//   }
// }

// module.exports = ChatServer;







class ChatServer {
  constructor() {
    if (ChatServer.instance) {
      return ChatServer.instance;
    }

    this.express = require('express')();
    this.http = require('http').Server(this.express);
    this.io = require('socket.io')(this.http);

    this.userList = [];
    this.typingUsers = {};
    this.initializeServer();
    this.handleSocketConnections();
    ChatServer.instance = this;
    return this;
  }

  initializeServer() {
    this.express.get('/', (req, res) => {
      res.send('<h1>AppCoda - SocketChat Server</h1>');
    });

    this.http.listen(3000, () => {
      console.log('Listening on *:3000');
    });
  }

  handleSocketConnections() {
    this.io.on('connection', (clientSocket) => {
      console.log('A user connected');

      clientSocket.on('disconnect', () => {
        console.log('User disconnected');
        this.handleUserDisconnection(clientSocket);
      });

      clientSocket.on("exitUser", (clientNickname) => {
        this.handleUserExit(clientSocket, clientNickname);
      });

      clientSocket.on('chatMessage', (clientNickname, message) => {
        this.broadcastChatMessage(clientNickname, message);
      });

      clientSocket.on("connectUser", (clientNickname) => {
        this.handleUserConnection(clientSocket, clientNickname);
      });

      clientSocket.on('privateMessage', (recipientId, senderNickname, message) => {
        this.sendPrivateMessage(clientSocket, recipientId, senderNickname, message);
      });

      clientSocket.on("startType", (clientNickname) => {
        this.typingUsers[clientNickname] = 1;
        this.io.emit("userTypingUpdate", this.typingUsers);
      });

      clientSocket.on("stopType", (clientNickname) => {
        delete this.typingUsers[clientNickname];
        this.io.emit("userTypingUpdate", this.typingUsers);
      });
    });
  }

  handleUserDisconnection(clientSocket) {
    console.log('User disconnected');
    let clientNickname;
    for (let i = 0; i < this.userList.length; i++) {
      if (this.userList[i]["id"] === clientSocket.id) {
        this.userList[i]["isConnected"] = false;
        clientNickname = this.userList[i]["nickname"];
        break;
      }
    }

    delete this.typingUsers[clientNickname];
    this.io.emit("userList", this.userList);
    this.io.emit("userExitUpdate", clientNickname);
    this.io.emit("userTypingUpdate", this.typingUsers);
  }

  handleUserExit(clientSocket, clientNickname) {
    for (let i = 0; i < this.userList.length; i++) {
      if (this.userList[i]["id"] === clientSocket.id) {
        this.userList.splice(i, 1);
        break;
      }
    }
    this.io.emit("userExitUpdate", clientNickname);
  }

  broadcastChatMessage(clientNickname, message) {
    const currentDateTime = new Date().toLocaleString();
    delete this.typingUsers[clientNickname];
    this.io.emit("userTypingUpdate", this.typingUsers);
    this.io.emit('newChatMessage', clientNickname, message, currentDateTime);
  }

  handleUserConnection(clientSocket, clientNickname) {
    console.log(`User ${clientNickname} connected: ${clientSocket.id}`);
    
    let userInfo = {};
    let foundUser = false;
    for (let i = 0; i < this.userList.length; i++) {
      if (this.userList[i]["nickname"] === clientNickname) {
        this.userList[i]["isConnected"] = true;
        this.userList[i]["id"] = clientSocket.id;
        userInfo = this.userList[i];
        foundUser = true;
        break;
      }
    }
    
    if (!foundUser) {
      userInfo["id"] = clientSocket.id;
      userInfo["nickname"] = clientNickname;
      userInfo["isConnected"] = true;
      this.userList.push(userInfo);
    }

    clientSocket.join(clientNickname); // Join a room with the nickname
    this.io.emit("userList", this.userList);
    this.io.emit("userConnectUpdate", userInfo);
    console.log("User list is: " + JSON.stringify(this.userList, null, 2));
  }

  sendPrivateMessage(clientSocket, recipientId, senderNickname, message) {
    const currentDateTime = new Date().toLocaleString();

    // Create a unique room for sender and recipient
    const roomName = `room_${senderNickname}_${recipientId}`;
    
    // Send the private message to the room
    this.io.to(roomName).emit('newPrivateMessage', {
      sender: senderNickname,
      message: message,
      date: currentDateTime,
      roomName
    });

    console.log("Private message sent to room:", roomName);
  }
}

module.exports = ChatServer;