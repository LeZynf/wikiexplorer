import { useEffect, useRef } from 'react';

let socket: WebSocket | null = null;

export const connectWebSocket = (partyCode: string, onMessage: (message: string) => void) => {
    socket = new WebSocket(`ws://localhost:5000/chat/${partyCode}`);

    socket.onopen = () => {
        console.log('WebSocket connection established');
    };

    socket.onmessage = (event) => {
        onMessage(event.data);
    };

    socket.onclose = () => {
        console.log('WebSocket connection closed');
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
};

export const sendMessage = (message: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(message);
    } else {
        console.error('WebSocket is not open. Unable to send message.');
    }
};

export const disconnectWebSocket = () => {
    if (socket) {
        socket.close();
        socket = null;
    }
};

export const subscribeToMessages = (callback: (message: { username: string; content: string }) => void) => {
    if (socket) {
        socket.onmessage = (event) => {
            try {
                const parsedMessage = JSON.parse(event.data);
                if (parsedMessage.username && parsedMessage.content) {
                    callback(parsedMessage);
                }
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };
    } else {
        console.error('WebSocket is not connected. Unable to subscribe to messages.');
    }
};