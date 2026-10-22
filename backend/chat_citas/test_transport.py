"""Existing transport assertions ignore the independently tested presence stream."""
import asyncio
import json


async def next_chat_event(socket):
    async with asyncio.timeout(1):
        while True:
            event = await socket.receive_json_from()
            if event['event'] == 'chat.presence.ping':
                await socket.send_json_to({'event': 'chat.presence.heartbeat', 'data': {}})
            elif event['event'] != 'chat.presence':
                return event


async def next_chat_output(socket):
    async with asyncio.timeout(1):
        while True:
            output = await socket.receive_output()
            if output['type'] == 'websocket.send' and json.loads(output.get('text', '{}')).get('event') == 'chat.presence':
                continue
            return output


async def no_chat_event(socket, timeout=0.1):
    await asyncio.sleep(timeout)
    while not socket.output_queue.empty():
        output = socket.output_queue.get_nowait()
        if output['type'] != 'websocket.send' or json.loads(output.get('text', '{}')).get('event') != 'chat.presence':
            await socket.output_queue.put(output)
            return False
    return True
