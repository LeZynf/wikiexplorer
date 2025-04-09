import React from 'react';

interface ChatMessageProps {
    username: string;
    message: string;
    timestamp: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ username, message,timestamp }) => {
    return (
        <div className="chat-message">
            <strong>{username} </strong>: {message}
            <span className="timestamp">({new Date(timestamp).toLocaleTimeString()})</span>
        </div>


    );
};

export default ChatMessage;