import React from 'react';
import styled from 'styled-components';

interface StartTripButtonProps {
  onPress?: () => void;
  text?: string;
  isDark?: boolean;
}

export const StartTripButton: React.FC<StartTripButtonProps> = ({
  onPress,
  text = 'Start Trip',
  isDark = false,
}) => {
  return (
    <StyledWrapper $isDark={isDark}>
      <div className="map-btn-container">
        <div className="map-btn-wrapper" onClick={onPress}>
          <svg height={0} width={0} style={{ position: 'absolute' }}>
            <filter id="land">
              <feTurbulence result="turb" numOctaves={7} baseFrequency="0.006" type="fractalNoise" />
              <feDisplacementMap yChannelSelector="G" xChannelSelector="R" scale={700} in="SourceGraphic" in2="turb" />
            </filter>
          </svg>
          <div className="map-btn">{text}</div>
          <div className="pinpoint" />
          <div className="map-container">
            <div className="map fold-1" />
            <div className="map fold-2" />
            <div className="map fold-3" />
            <div className="map fold-4" />
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div<{ $isDark: boolean }>`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 8px 0;

  .map-btn-container {
    width: 80%;
    max-width: 420px;
    min-width: 280px;
    display: flex;
    justify-content: center;
  }

  .map-btn-wrapper {
    --btn-color: ${(props) => (props.$isDark ? '#4F46E5' : '#3E6BFF')};
    --text-color: #ffffff;
    --land-color: #ffdd9f;
    --veg-color: #36ad5aa9;
    --water-color: #b3e3ff;
    --transition-dur: 0.3s;

    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;

    width: 100%;
    font-size: 16px;
    font-family: "Inter", system-ui, -apple-system, sans-serif;

    user-select: none;
    overflow: hidden;
    border-radius: 50ch;
    cursor: pointer;

    box-shadow: ${(props) =>
    props.$isDark
      ? '0px 10px 25px rgba(79, 70, 229, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
      : '0px 12px 28px rgba(62, 107, 255, 0.35), 0px 4px 12px rgba(0, 0, 0, 0.08)'};

    transition: transform var(--transition-dur) ease, box-shadow var(--transition-dur) ease;
  }

  .map-btn {
    cursor: pointer;
    width: 100%;
    text-align: center;
    padding: 1.1em 2em 1.1em 3.5em;

    border-radius: 50ch;

    background-color: var(--btn-color);

    font-size: 17px;
    font-weight: 700;
    color: var(--text-color);
    letter-spacing: 0.5px;
    text-transform: uppercase;

    transition:
      color var(--transition-dur) ease-in-out,
      background-color var(--transition-dur) ease-in-out;
  }

  .pinpoint {
    pointer-events: none;
    position: absolute;
    height: 44%;
    aspect-ratio: 1;
    top: 28%;
    left: 1.5em;

    border-radius: 50% 50% 50% 50%;
    background-color: var(--text-color);
    transform: rotateZ(45deg);

    mask-image: radial-gradient(circle at center, #0000 0%, #0000 32%, #fff 36%);
    filter: blur(0.25px);
    transition:
      background-color var(--transition-dur) ease-in-out,
      transform var(--transition-dur) ease-in-out,
      border-radius calc(var(--transition-dur) + 0.1s) ease;
    z-index: 1;
  }

  .map-container {
  pointer-events: none;
  position: absolute;
  left: 0px;
  top: 115px;
  perspective: 120px;
  transform: perspective(120px) rotateX(35deg) scaleX(0);
    transform-origin: 3em 0.5em;
    transition:
  transform 0.4s ease,
  opacity 0.4s ease;
    opacity: 0;
    z-index: 0;
  }

  .map {
    position: absolute;
    bottom: 100px;
    width: 120px;
    height: 200px;
    background-color: var(--water-color);
    background-image: linear-gradient(to bottom, #fff2, 30%, #0000);
    transform-origin: left bottom;
  }
  .map::after {
    content: "";
    top: -40px;
    left: 12px;
    width: 100%;
    height: 200%;
    background-color: var(--land-color);
    position: absolute;
    filter: url(#land);
    box-shadow: inset 0 0 48px 24px var(--veg-color);
    z-index: 0;
  }
  .fold-1,
  .fold-2,
  .fold-3,
  .fold-4 {
    mask-image: linear-gradient(to top, #fff, 97%, #0000);
    overflow: hidden;
  }

  .fold-1 {
    left: -60px;
    transform: rotateY(10deg) translateZ(30px);
  }
  .fold-2 {
    left: 60px;
    transform: rotateY(-10deg) translateZ(10px);
  }
  .fold-3 {
    left: -169px;
    transform: rotateY(-15deg) translateZ(-1px);
  }
  .fold-4 {
    left: 166px;
    transform: rotateY(15deg) translateZ(31px);
  }
  .fold-1::before,
  .fold-2::before,
  .fold-3::before,
  .fold-4::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    box-shadow: inset 0 10px 16px 3px #0004;
    z-index: 1;
  }

  /* Hover states */
  .map-btn-wrapper:has(.map-btn:hover) {
    transform: scale(1.05);
  }
  .map-btn:hover {
    background-color: var(--text-color);
    color: ${(props) => (props.$isDark ? '#090B18' : '#1E293B')};
  }
  .map-btn:hover + .pinpoint {
    background-color: var(--btn-color);
    border-radius: 50% 50% 0 50%;
    transform: rotateZ(45deg) translate(-0.3em, -0.3em);
  }

  

  /* Hover states */
.map-btn-wrapper:hover {
  transform: scale(1.05);
}

/* Change button color */
.map-btn-wrapper:hover .map-btn {
  background-color: var(--text-color);
  color: ${(props) => (props.$isDark ? '#090B18' : '#1E293B')};
}

/* Animate pin */
.map-btn-wrapper:hover .pinpoint {
  background-color: var(--btn-color);
  border-radius: 50% 50% 0 50%;
  transform: rotateZ(45deg) translate(-0.3em, -0.3em);
}

/* Show map */
.map-btn-wrapper:hover .map-container {
  transform: perspective(100px) rotateX(35deg) scaleX(0.85);
  opacity: 1;
}

  /* Active states */
  .map-btn-wrapper:has(.map-btn:active) {
    transform: scale(0.98) translateY(0.2em);
  }
  .map-btn:active + .pinpoint {
    transform: rotateZ(45deg) translate(0em, 0em);
    transition-duration: calc(var(--transition-dur) * 0.5);
  }
  .map-btn:active ~ .map-container {
    transform: perspective(95px) rotateX(35deg) scaleX(0.85);
    transition-duration: calc(var(--transition-dur) * 0.5);
  }
`;

export default StartTripButton;
