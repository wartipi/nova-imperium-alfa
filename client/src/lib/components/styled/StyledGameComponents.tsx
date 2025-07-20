import styled, { keyframes } from 'styled-components';

/**
 * Composants stylés pour Nova Imperium
 * Encapsulation des styles pour éviter les conflits et améliorer la réutilisabilité
 */

// Animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const glow = keyframes`
  0% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
  50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.8); }
  100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
`;

// Conteneur principal du jeu
export const GameContainer = styled.div`
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #e2e8f0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  overflow: hidden;
`;

// Panel principal avec thème médiéval
export const GamePanel = styled.div<{ variant?: 'primary' | 'secondary' | 'tertiary' }>`
  background: ${props => {
    switch (props.variant) {
      case 'secondary': return 'linear-gradient(145deg, #2d3748 0%, #4a5568 100%)';
      case 'tertiary': return 'linear-gradient(145deg, #4a5568 0%, #718096 100%)';
      default: return 'linear-gradient(145deg, #1a202c 0%, #2d3748 100%)';
    }
  }};
  border: 2px solid #d69e2e;
  border-radius: 12px;
  padding: 1.5rem;
  margin: 0.5rem;
  box-shadow: 
    0 10px 25px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  position: relative;
  
  &:before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(45deg, #d69e2e, #b7791f, #d69e2e);
    border-radius: 12px;
    z-index: -1;
  }
  
  animation: ${fadeIn} 0.5s ease-out;
`;

// Bouton avec style médiéval
export const MedievalButton = styled.button<{ 
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}>`
  background: ${props => {
    if (props.disabled) return 'linear-gradient(145deg, #4a5568, #718096)';
    switch (props.variant) {
      case 'danger': return 'linear-gradient(145deg, #e53e3e, #c53030)';
      case 'success': return 'linear-gradient(145deg, #38a169, #2f855a)';
      case 'secondary': return 'linear-gradient(145deg, #4a5568, #2d3748)';
      default: return 'linear-gradient(145deg, #d69e2e, #b7791f)';
    }
  }};
  color: ${props => props.disabled ? '#a0aec0' : '#ffffff'};
  border: 2px solid ${props => props.disabled ? '#718096' : 'rgba(255, 255, 255, 0.2)'};
  border-radius: 8px;
  padding: ${props => {
    switch (props.size) {
      case 'small': return '0.5rem 1rem';
      case 'large': return '1rem 2rem';
      default: return '0.75rem 1.5rem';
    }
  }};
  font-size: ${props => {
    switch (props.size) {
      case 'small': return '0.875rem';
      case 'large': return '1.125rem';
      default: return '1rem';
    }
  }};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
    animation: ${glow} 2s infinite;
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
    animation: ${pulse} 0.2s ease;
  }
  
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }
  
  &:hover:not(:disabled):before {
    left: 100%;
  }
`;

// Badge de ressources
export const ResourceBadge = styled.div<{ type: 'gold' | 'food' | 'wood' | 'stone' | 'iron' | 'action' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: ${props => {
    switch (props.type) {
      case 'gold': return 'linear-gradient(145deg, #f6ad55, #ed8936)';
      case 'food': return 'linear-gradient(145deg, #68d391, #48bb78)';
      case 'wood': return 'linear-gradient(145deg, #8b4513, #a0522d)';
      case 'stone': return 'linear-gradient(145deg, #718096, #4a5568)';
      case 'iron': return 'linear-gradient(145deg, #2d3748, #1a202c)';
      case 'action': return 'linear-gradient(145deg, #9f7aea, #805ad5)';
      default: return 'linear-gradient(145deg, #4a5568, #2d3748)';
    }
  }};
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  
  &:before {
    content: ${props => {
      switch (props.type) {
        case 'gold': return '"⚡"';
        case 'food': return '"🍞"';
        case 'wood': return '"🪵"';
        case 'stone': return '"🪨"';
        case 'iron': return '"⚔️"';
        case 'action': return '"🎯"';
        default: return '"💎"';
      }
    }};
    font-size: 1rem;
  }
`;

// Tooltip moderne
export const ModernTooltip = styled.div<{ position: 'top' | 'bottom' | 'left' | 'right' }>`
  position: absolute;
  z-index: 1000;
  background: rgba(26, 32, 44, 0.95);
  color: #e2e8f0;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid #4a5568;
  font-size: 0.875rem;
  max-width: 250px;
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  
  ${props => {
    switch (props.position) {
      case 'top':
        return `
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 8px;
        `;
      case 'bottom':
        return `
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-top: 8px;
        `;
      case 'left':
        return `
          right: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-right: 8px;
        `;
      case 'right':
        return `
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-left: 8px;
        `;
    }
  }}
  
  animation: ${fadeIn} 0.2s ease-out;
`;

// Carte interactive stylée
export const StyledMapContainer = styled.div`
  border: 3px solid #d69e2e;
  border-radius: 12px;
  background: linear-gradient(145deg, #f7fafc, #edf2f7);
  padding: 1rem;
  position: relative;
  overflow: hidden;
  
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 20%, rgba(214, 158, 46, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(214, 158, 46, 0.1) 0%, transparent 50%);
    pointer-events: none;
  }
`;

// Grid flexible pour layout
export const FlexGrid = styled.div<{ 
  columns?: number; 
  gap?: string; 
  align?: 'start' | 'center' | 'end';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
}>`
  display: grid;
  grid-template-columns: repeat(${props => props.columns || 'auto-fit'}, minmax(250px, 1fr));
  gap: ${props => props.gap || '1rem'};
  align-items: ${props => props.align || 'stretch'};
  justify-content: ${props => props.justify || 'start'};
`;

// Status indicator avec animation
export const StatusIndicator = styled.div<{ 
  status: 'active' | 'inactive' | 'warning' | 'error' | 'success';
  size?: 'small' | 'medium' | 'large';
}>`
  width: ${props => {
    switch (props.size) {
      case 'small': return '8px';
      case 'large': return '16px';
      default: return '12px';
    }
  }};
  height: ${props => {
    switch (props.size) {
      case 'small': return '8px';
      case 'large': return '16px';
      default: return '12px';
    }
  }};
  border-radius: 50%;
  background: ${props => {
    switch (props.status) {
      case 'active': return '#48bb78';
      case 'inactive': return '#718096';
      case 'warning': return '#ed8936';
      case 'error': return '#e53e3e';
      case 'success': return '#38a169';
      default: return '#4a5568';
    }
  }};
  animation: ${props => props.status === 'active' ? pulse : 'none'} 2s infinite;
  box-shadow: 0 0 10px ${props => {
    switch (props.status) {
      case 'active': return 'rgba(72, 187, 120, 0.5)';
      case 'warning': return 'rgba(237, 137, 54, 0.5)';
      case 'error': return 'rgba(229, 62, 62, 0.5)';
      case 'success': return 'rgba(56, 161, 105, 0.5)';
      default: return 'transparent';
    }
  }};
`;

export default {
  GameContainer,
  GamePanel,
  MedievalButton,
  ResourceBadge,
  ModernTooltip,
  StyledMapContainer,
  FlexGrid,
  StatusIndicator
};