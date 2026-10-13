import { Server as HTTPServer } from 'http';
import { Server as ChatServer, Socket } from 'socket.io';


import prisma from '../app/shared/prisma';
import { jwtHelpers } from '../app/helper/jwtHelpers';
import config from '../app/config';


let io: ChatServer;
const onlineUsers = new Map<string, string>();

const connectSocket = (server: HTTPServer) => {
  if (!io) {
    io = new ChatServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true, 
      },
      pingInterval: 25000,
      pingTimeout: 20000,
      allowEIO3: true, 
    });
  }

  io.on('connection', async (socket: Socket) => {
    console.log('🔌 Socket connected:', socket.id);

    let currentUserId: string | null = null;

    try {
      const token = String(socket.handshake.query.token || '').trim();

      if (token) {
        const decoded = await jwtHelpers.verifyToken(
          token,
          config.jwt_access_secret as string
        );

        const userId = decoded?.id;

        // 💡 ফিক্স ১: Prisma-তে সাধারণত userId string বা UUID হয়, তাই এখানে সাধারণ চেক রাখা হয়েছে
        if (!userId) {
          socket.emit('error', { message: 'Invalid token userId' });
          setTimeout(() => socket.disconnect(), 1000); // একটু সময় দিয়ে ডিসকানেক্ট করুন যাতে ফ্রন্টএন্ড এররটি পায়
          return;
        }

        const currentUser = await prisma.user.update({
          where: { id: userId },
          data: {
            isOnline: true,
            updatedAt: new Date(),
          },
        }).catch(() => null); 

        if (!currentUser) {
          socket.emit('error', { message: 'User not found' });
          setTimeout(() => socket.disconnect(), 1000);
          return;
        }

        currentUserId = String(currentUser.id);

        onlineUsers.set(currentUserId, socket.id);
        
     
        socket.join(currentUserId);

        socket.emit('connected', {
          success: true,
          type: 'authenticated',
          message: 'User connected successfully',
          userId: currentUserId,
          socketId: socket.id,
        });

        socket.broadcast.emit('user-online', {
          userId: currentUserId,
        });

        // handleEvents(io, socket, currentUserId,  currentUser.role);

        console.log('✅ Authenticated user connected:', currentUserId);
      } else {
        socket.emit('connected', {
          success: true,
          type: 'guest',
          message: 'Guest connected (no authentication)',
          socketId: socket.id,
          userId: null,
        });

        console.log('👤 Guest connected:', socket.id);
      }
    } catch (error) {
      console.error('❌ Socket auth error:', error);

      socket.emit('error', {
        message: 'Authentication failed',
      });

      setTimeout(() => socket.disconnect(), 1000);
      return;
    }

   
    socket.on('disconnect', async (reason :any) => {
      console.log('❌ Disconnected:', socket.id, reason);

      if (!currentUserId) return;

      onlineUsers.delete(currentUserId);

      try {
        await prisma.user.update({
          where: { id: currentUserId },
          data: {
            isOnline: false,
            updatedAt: new Date(),
          },
        });

        socket.broadcast.emit('user-offline', {
          userId: currentUserId,
        });
      } catch (err) {
        console.error('❌ Error updating offline status:', err);
      }
    });
  });

  return io;
};

const getSocketIO = () => {
  if (!io) throw new Error('socket.io is not initialized');
  return io;
};

export { connectSocket, getSocketIO, onlineUsers };