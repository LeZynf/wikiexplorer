import React, { useEffect, useState } from 'react';
import ChatMessage from './ChatMessage';
import { connectWebSocket, sendMessage, subscribeToMessages } from '../utils/websocket';

const Chat: React.FC<{ username: string }> = ({ username }) => {
    const [messages, setMessages] = useState<{ username: string; content: string; timestamp: string }[]>([]);
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        const handleNewMessage = (message: { username: string; content: string }) => {
            const enrichedMessage = { ...message, timestamp: new Date().toISOString() };
            setMessages((prevMessages) => [...prevMessages, enrichedMessage]);
        };

        const urlParams = new URLSearchParams(window.location.search);
        const partyCode = urlParams.get('partyCode');
        if (partyCode) {
            connectWebSocket(username, (message: string) => {
                console.log(`WebSocket message received: ${message}`);
            });
        } else {
            console.error('Party code is missing from the URL');
        }
        subscribeToMessages(handleNewMessage);

        return () => {
            // Clean up WebSocket connection if necessary
        };
    }, []);

    const handleSendMessage = () => {
        if (inputValue.trim()) {
            sendMessage(JSON.stringify({ username, content: inputValue, timestamp: new Date().toISOString() }));
            setInputValue('');
        }
    };

    return (
        <div className="chat-container">
            <div className="chat-messages">
                {messages.map((msg, index) => (
                    <ChatMessage key={index} username={msg.username} message={msg.content} timestamp={msg.timestamp}/>
                ))}
            </div>
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                        handleSendMessage();
                    }
                }}
                placeholder="Type your message..."
            />
            <button onClick={handleSendMessage}>Send</button>
        </div>
    );
};

export default Chat;