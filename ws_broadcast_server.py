import asyncio
import websockets

# Set of connected clients
clients = set()

async def handle_client(websocket, path):
    # Add the new client to the set of connected clients
    clients.add(websocket)

    try:
        async for message in websocket:
            # Broadcast the received message to all other clients
            await broadcast(message, websocket)
    finally:
        # Remove the client from the set when they disconnect
        clients.remove(websocket)

async def broadcast(message, sender):
    # Send the message to all connected clients except the sender
    for client in clients:
        if client != sender:
            await client.send(message)

start_server = websockets.serve(handle_client, 'localhost', 8765)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()