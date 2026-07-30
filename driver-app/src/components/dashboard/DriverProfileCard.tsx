import React from 'react';
import styled from 'styled-components';
import { getMediaUrl } from '@/utils/media';

interface DriverProfileCardProps {
  name?: string;
  role?: string;
  vehicle?: string;
  photoUrl?: string | null;
  onPressProfile?: () => void;
  isDark?: boolean;
}

export const DriverProfileCard: React.FC<DriverProfileCardProps> = ({
  name = 'Driver',
  role = 'Verified Driver',
  vehicle = 'Not Available',
  photoUrl,
  onPressProfile,
  isDark = false,
}) => {
  const resolvedPhotoUrl = getMediaUrl(photoUrl);

  return (
    <StyledWrapper $isDark={isDark}>
      <div className="card" onClick={onPressProfile}>
        <div className="card-border-top" />
        <div className="img">
          {resolvedPhotoUrl ? (
            <img src={resolvedPhotoUrl} alt={name} className="avatar-img" />
          ) : (
            <div className="avatar-letter">{name.charAt(0).toUpperCase()}</div>
          )}
        </div>
        <span>{name}</span>
        <p className="job">{role}</p>
        <p className="vehicle">🚌 {vehicle}</p>
        <button onClick={(e) => { e.stopPropagation(); onPressProfile?.(); }}>View Profile</button>
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
    background: ${(props) => (props.$isDark ? '#151A33' : '#3405a3')};
    border-radius: 24px;
    box-shadow: ${(props) =>
      props.$isDark
        ? '0px 15px 35px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
        : '0px 20px 40px rgba(52, 5, 163, 0.25), 0px 4px 12px rgba(0, 0, 0, 0.08)'};
    border: ${(props) => (props.$isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.04)')};
    padding: 16px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    transition: all 0.4s cubic-bezier(0.15, 0.83, 0.66, 1);
    cursor: pointer;
    overflow: hidden;
  }

  .card:hover {
    transform: translateY(-2px);
    box-shadow: ${(props) =>
      props.$isDark
        ? '0px 20px 45px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
        : '0px 25px 45px rgba(52, 5, 163, 0.35)'};
  }

  .card .card-border-top {
    width: 60%;
    height: 4px;
    background: #6b64f3;
    margin: 0 auto;
    border-radius: 0px 0px 15px 15px;
  }

  .card .img {
    width: 64px;
    height: 64px;
    background: #6b64f3;
    border-radius: 16px;
    margin: 12px auto 4px auto;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    flex-shrink: 0;
  }

  .avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-letter {
    color: white;
    font-size: 24px;
    font-weight: 700;
  }

  .card span {
    font-weight: 700;
    color: white;
    text-align: center;
    display: block;
    padding-top: 4px;
    font-size: 15px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }

  .card .job {
    font-weight: 500;
    color: rgba(255, 255, 255, 0.8);
    display: block;
    text-align: center;
    padding-top: 2px;
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    margin: 0;
  }

  .card .vehicle {
    font-weight: 600;
    color: #A5B4FC;
    font-size: 11px;
    margin: 4px 0 0 0;
    letter-spacing: 0.5px;
  }

  .card button {
    padding: 8px 20px;
    display: block;
    margin: auto auto 4px auto;
    border-radius: 10px;
    border: none;
    background: #6b64f3;
    color: white;
    font-weight: 600;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .card button:hover {
    background: #534bf3;
  }
`;

export default DriverProfileCard;
