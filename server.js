const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));
let waiting = null; // Jo akela wait kar raha hai
let blocked = {}; // Report hone wale

io.on('connection', (socket) => {
  console.log('User aaya:', socket.id);

  // Random matching
  if (waiting && waiting.id!== socket.id) {
    socket.partner = waiting;
    waiting.partner = socket;
    socket.emit('connected', 'Stranger connected!');
    waiting.emit('connected', 'Stranger connected!');
    waiting = null;
  } else {
    waiting = socket;
    socket.emit('waiting', 'Finding stranger...');
  }

  socket.on('message', (msg) => {
    if (socket.partner) socket.partner.emit('message', msg);
  });

  socket.on('next', () => {
    if (socket.partner) {
      socket.partner.partner = null;
      socket.partner.emit('stranger_left');
      if(!waiting) waiting = socket.partner;
    }
    socket.partner = null;
    if (waiting && waiting.id!== socket.id) {
      socket.partner = waiting;
      waiting.partner = socket;
      socket.emit('connected', 'New stranger connected!');
      waiting.emit('connected', 'New stranger connected!');
      waiting = null;
    } else {
      waiting = socket;
      socket.emit('waiting', 'Finding new stranger...');
    }
  });

  socket.on('report', () => {
    if (socket.partner) {
      let badId = socket.partner.id;
      blocked[badId] = (blocked[badId] || 0) + 1;
      console.log('Report:', badId, 'Total:', blocked[badId]);
      socket.partner.emit('reported');
      // 3 report pe ban
      if(blocked[badId] >= 3){
        socket.partner.emit('banned');
        socket.partner.disconnect();
      }
    }
  });

  socket.on('disconnect', () => {
    if (socket.partner) socket.partner.emit('stranger_left');
    if (waiting && waiting.id === socket.id) waiting = null;
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('Server running on '+PORT));