import React from 'react';
import styled from 'styled-components';

interface WeatherCardProps {
  city?: string;
  country?: string;
  date?: string;
  temp?: number | string;
  condition?: string;
  isLoading?: boolean;
  isDark?: boolean;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({
  city = 'Current Location',
  country = 'India',
  date = 'March 13',
  temp = 27,
  condition = 'Sunny',
  isLoading = false,
  isDark = false,
}) => {
  return (
    <StyledWrapper $isDark={isDark}>
      <div className="card">
        {isLoading ? (
          <div className="loading-state">
            <div className="skeleton-line short" />
            <div className="skeleton-line medium" />
            <div className="skeleton-temp" />
          </div>
        ) : (
          <>
            <div className="container">
              <div className="cloud front">
                <span className="left-front" />
                <span className="right-front" />
              </div>
              <span className="sun sunshine" />
              <span className="sun" />
              <div className="cloud back">
                <span className="left-back" />
                <span className="right-back" />
              </div>
            </div>
            <div className="card-header">
              <span>
                {city}
                <br />
                {country}
              </span>
              <span>
                {date} • {condition}
              </span>
            </div>
            <span className="temp">{typeof temp === 'number' ? `${temp}°` : temp}</span>
            <div className="temp-scale">
              <span>Celsius</span>
            </div>
          </>
        )}
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div<{ $isDark: boolean }>`
  width: 100%;
  height: 235px;
  display: flex;

  .card {
    width: 100%;
    height: 235px;
    position: relative;
    padding: 24px;
    background: ${(props) =>
      props.$isDark
        ? 'radial-gradient(178.94% 106.41% at 26.42% 106.41%, rgba(167, 139, 250, 0.35) 0%, rgba(21, 24, 44, 0) 71.88%), linear-gradient(135deg, #090B14 0%, #15182C 50%, #2E1F54 100%)'
        : 'radial-gradient(178.94% 106.41% at 26.42% 106.41%, #FFF7B1 0%, rgba(255, 255, 255, 0) 71.88%), #FFFFFF'};
    box-shadow: ${(props) =>
      props.$isDark
        ? '0px 15px 35px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
        : '0px 20px 40px rgba(0, 0, 0, 0.05), 0px 4px 12px rgba(0, 0, 0, 0.04)'};
    border: ${(props) => (props.$isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.04)')};
    border-radius: 24px;
    transition: all 0.4s cubic-bezier(0.15, 0.83, 0.66, 1);
    cursor: pointer;
    box-sizing: border-box;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .card:hover {
    transform: translateY(-2px);
    box-shadow: ${(props) =>
      props.$isDark
        ? '0px 20px 45px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
        : '0px 25px 45px rgba(0, 0, 0, 0.08)'};
  }

  .container {
    width: 250px;
    height: 250px;
    position: absolute;
    right: -35px;
    top: -50px;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: scale(0.7);
    pointer-events: none;
  }

  .cloud {
    width: 250px;
  }

  .front {
    padding-top: 45px;
    margin-left: 25px;
    display: inline;
    position: absolute;
    z-index: 11;
    animation: clouds 8s infinite ease-in-out;
  }

  .back {
    margin-top: -30px;
    margin-left: 150px;
    z-index: 12;
    animation: clouds 12s infinite ease-in-out;
  }

  .right-front {
    width: 45px;
    height: 45px;
    border-radius: 50% 50% 50% 0%;
    background-color: #4c9beb;
    display: inline-block;
    margin-left: -25px;
    z-index: 5;
  }

  .left-front {
    width: 65px;
    height: 65px;
    border-radius: 50% 50% 0% 50%;
    background-color: #4c9beb;
    display: inline-block;
    z-index: 5;
  }

  .right-back {
    width: 50px;
    height: 50px;
    border-radius: 50% 50% 50% 0%;
    background-color: #4c9beb;
    display: inline-block;
    margin-left: -20px;
    z-index: 5;
  }

  .left-back {
    width: 30px;
    height: 30px;
    border-radius: 50% 50% 0% 50%;
    background-color: #4c9beb;
    display: inline-block;
    z-index: 5;
  }

  .sun {
    width: 120px;
    height: 120px;
    background: linear-gradient(to right, #fcbb04, #fffc00);
    border-radius: 60px;
    display: inline;
    position: absolute;
  }

  .sunshine {
    animation: sunshines 2s infinite;
  }

  @keyframes sunshines {
    0% {
      transform: scale(1);
      opacity: 0.6;
    }
    100% {
      transform: scale(1.4);
      opacity: 0;
    }
  }

  @keyframes clouds {
    0% {
      transform: translateX(15px);
    }
    50% {
      transform: translateX(0px);
    }
    100% {
      transform: translateX(15px);
    }
  }

  .card-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    z-index: 15;
  }

  .card-header span:first-child {
    word-break: break-word;
    font-weight: 800;
    font-size: 15px;
    line-height: 135%;
    color: ${(props) => (props.$isDark ? '#F5F7FF' : 'rgba(87, 77, 51, 0.85)')};
  }

  .card-header span:last-child {
    font-weight: 700;
    font-size: 13px;
    line-height: 135%;
    color: ${(props) => (props.$isDark ? '#9AA3C7' : 'rgba(87, 77, 51, 0.45)')};
  }

  .temp {
    position: absolute;
    left: 24px;
    bottom: 16px;
    font-weight: 700;
    font-size: 60px;
    line-height: 70px;
    color: ${(props) => (props.$isDark ? '#F5F7FF' : 'rgba(87, 77, 51, 1)')};
    z-index: 15;
  }

  .temp-scale {
    width: 80px;
    height: 34px;
    position: absolute;
    right: 24px;
    bottom: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${(props) => (props.$isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)')};
    border-radius: 9px;
    z-index: 15;
  }

  .temp-scale span {
    font-weight: 700;
    font-size: 12px;
    line-height: 134.49%;
    color: ${(props) => (props.$isDark ? '#CBD5E1' : 'rgba(87, 77, 51, 0.66)')};
  }

  /* Skeleton Loading */
  .loading-state {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-top: 10px;
  }
  .skeleton-line {
    height: 14px;
    border-radius: 6px;
    background: ${(props) => (props.$isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)')};
    animation: pulse 1.5s infinite ease-in-out;
  }
  .skeleton-line.short {
    width: 40%;
  }
  .skeleton-line.medium {
    width: 70%;
  }
  .skeleton-temp {
    width: 90px;
    height: 50px;
    border-radius: 12px;
    margin-top: 40px;
    background: ${(props) => (props.$isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)')};
    animation: pulse 1.5s infinite ease-in-out;
  }

  @keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 0.3; }
    100% { opacity: 0.6; }
  }
`;

export default WeatherCard;
