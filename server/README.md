# Your-Drive Backend

A Node.js Express backend with TypeScript support.

## Prerequisites

- Node.js (v16 or higher)
- npm

## Setup

1. Clone the repository:

```bash
git clone https://github.com/co-route/Your-Drive-backend.git .
cd Your-Drive-backend
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Then edit `.env` with your configuration.

### Chat System

The chat system is integrated with rides and provides real-time communication between drivers and passengers:

- **Chat Threads**: Each ride automatically creates a chat thread when published
- **Participants**: 
  - The driver is automatically added to the thread when the ride is created
  - Passengers are added when they book the ride
- **Real-time Messaging**: Messages are delivered in real-time using WebSocket connections
- **Thread Management**:
  - Threads are automatically deleted when the associated ride is deleted
  - Users can only access threads they are participants in
  - Messages are persisted in the database for history

#### WebSocket Events

The chat system uses Socket.IO for real-time communication. Connect to the `/chat` namespace to use these events:

- **Connection Events**:
  - `join_thread`: Join a specific chat thread
  - `leave_thread`: Leave a chat thread
  - `typing_start`: Indicate that user is typing
  - `typing_stop`: Indicate that user stopped typing

- **Message Events**:
  - `send_message`: Send a new message
  - `update_message`: Update an existing message
  - `delete_message`: Delete a message

- **Received Events**:
  - `new_message`: Receive a new message
  - `message_updated`: Receive a message update
  - `message_deleted`: Receive a message deletion
  - `new_message_notification`: Receive a notification for a new message when not in the thread

#### Chat API Endpoints

- `GET /api/chat/threads` - Get all chat threads for the current user
- `GET /api/chat/threads/:threadId/messages` - Get messages in a specific thread
- `POST /api/chat/threads/:threadId/messages` - Send a message in a thread
- `PUT /api/chat/threads/:threadId/messages/:messageId` - Update a message
- `DELETE /api/chat/threads/:threadId/messages/:messageId` - Delete a message

## Available Scripts

- `npm run dev` - Start the development server with hot-reload
- `npm run build` - Build the TypeScript code
- `npm start` - Start the production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## License

MIT
