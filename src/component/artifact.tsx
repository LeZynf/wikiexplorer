import React from 'react';
import './Artifact.css';

type ArtifactProps = {
    artifact: {
        id: string;
        name: string;
        description: string;
        type: 'positive' | 'negative';
        used?: boolean;
    };
    onClick?: () => void;
    isActive?: boolean;
};

const Artifact: React.FC<ArtifactProps> = ({ artifact, onClick, isActive }) => {
    return (
        <div
            className={`artifact ${artifact.type} ${isActive ? 'active' : ''} ${artifact.used ? 'used' : ''}`}
            onClick={onClick}
            title={artifact.description}
        >
            <div className="artifact-icon">
                {/* Ici vous pouvez mettre une icône spécifique selon artifact.id */}
                {artifact.name.charAt(0)}
            </div>
            <div className="artifact-info">
                <h4>{artifact.name}</h4>
                <p>{artifact.description}</p>
                {artifact.used && <span className="used-label">Utilisé</span>}
            </div>
        </div>
    );
};

export default Artifact;